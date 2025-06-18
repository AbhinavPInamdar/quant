package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	// blandAPIKey is stored but not used in the simplified web-based flow.
	blandAPIKey string
	// sessions safely stores the state of each active conversation.
	sessions    = make(map[string]*TradingSession)
	sessionsMux = sync.RWMutex{}
)

// TradingSession holds all the context for a single conversation.
type TradingSession struct {
	CallID     string            `json:"call_id"`
	State      string            `json:"state"`
	Exchange   string            `json:"exchange"`
	Symbol     string            `json:"symbol"`
	Price      float64           `json:"price"`
	Quantity   float64           `json:"quantity"`
	OrderPrice float64           `json:"order_price"`
	Context    map[string]string `json:"context"`
}

// BlandPayload is the structure of the data we expect from the frontend's webhook call.
type BlandPayload struct {
	Utterance string `json:"utterance"`
	CallID    string `json:"call_id"`
}

// PriceResponse structures for parsing exchange API data.
type PriceResponse struct {
	Symbol string `json:"symbol"`
	Price  string `json:"price"`
}

// InitializeBland stores the API key globally.
func InitializeBland(apiKey string) {
	blandAPIKey = apiKey
}

// generateSessionID creates a new unique ID for a web conversation.
func generateSessionID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		// A simple fallback in the rare case of an error.
		return "fallback-session-id"
	}
	return hex.EncodeToString(bytes)
}

// StartCall is the simplified endpoint for beginning a web session.
func StartCall(c *gin.Context) {
	callID := generateSessionID()

	session := &TradingSession{
		CallID:  callID,
		State:   "greeting",
		Context: make(map[string]string),
	}
	updateSession(session)

	log.Printf("New web session started with ID: %s", callID)

	initialMessage := "Hello! Welcome to GoQuant's OTC trading service. To get started, please choose an exchange from the following options: OKX, Bybit, Deribit, or Binance."

	c.JSON(http.StatusOK, gin.H{
		"call_id": callID,
		"message": initialMessage,
	})
}

// HandleBlandWebhook processes the user's speech from the frontend.
func HandleBlandWebhook(c *gin.Context) {
	var payload BlandPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"response": "Invalid payload"})
		return
	}

	session := getOrCreateSession(payload.CallID)
	utterance := strings.ToLower(strings.TrimSpace(payload.Utterance))

	response := processUserInput(session, utterance)

	updateSession(session)

	c.JSON(http.StatusOK, gin.H{"response": response})
}

// --- State Management ---
func getOrCreateSession(callID string) *TradingSession {
	sessionsMux.Lock()
	defer sessionsMux.Unlock()

	if session, exists := sessions[callID]; exists {
		return session
	}

	session := &TradingSession{
		CallID:  callID,
		State:   "greeting",
		Context: make(map[string]string),
	}
	sessions[callID] = session
	return session
}

func updateSession(session *TradingSession) {
	sessionsMux.Lock()
	defer sessionsMux.Unlock()
	sessions[session.CallID] = session
}

// --- State Machine Logic ---
func processUserInput(session *TradingSession, utterance string) string {
	switch session.State {
	case "greeting":
		return handleExchangeSelection(session, utterance)
	case "exchange_selected":
		return handleSymbolSelection(session, utterance)
	case "symbol_selected":
		return handleOrderDetails(session, utterance)
	case "awaiting_quantity":
		return handleQuantity(session, utterance)
	case "awaiting_price":
		return handleOrderPrice(session, utterance)
	case "confirming":
		return handleConfirmation(session, utterance)
	default:
		session.State = "greeting"
		return "I'm sorry, I seem to have lost track. Let's start over. Which exchange would you like to trade on: OKX, Bybit, Deribit, or Binance?"
	}
}

// --- Handler for each state ---

func handleExchangeSelection(session *TradingSession, utterance string) string {
	exchanges := map[string]string{
		"okx":     "OKX",
		"bybit":   "Bybit",
		"deribit": "Deribit",
		"binance": "Binance",
	}

	for key, name := range exchanges {
		if strings.Contains(utterance, key) {
			session.Exchange = name
			session.State = "exchange_selected"
			return fmt.Sprintf("Great! You've selected %s. Which trading symbol would you like to trade?", name)
		}
	}
	return "I didn't catch that. Please choose from: OKX, Bybit, Deribit, or Binance."
}

func handleSymbolSelection(session *TradingSession, utterance string) string {
	potentialSymbol := strings.ToUpper(utterance) // Normalize user input
	price, err := fetchCurrentPrice(session.Exchange, potentialSymbol)
	if err != nil {
		log.Printf("Failed to fetch price for %s on %s: %v", potentialSymbol, session.Exchange, err)
		return fmt.Sprintf("Sorry, I couldn't get the price for %s. Please try a different symbol.", potentialSymbol)
	}

	session.Symbol = potentialSymbol
	session.Price = price
	session.State = "symbol_selected"
	return fmt.Sprintf("The current price for %s on %s is $%.4f. Now, what quantity and price for the order?", potentialSymbol, session.Exchange, price)
}

func handleOrderDetails(session *TradingSession, utterance string) string {
	quantity, hasQuantity := extractNumber(utterance, []string{"quantity", "amount", "size"})
	price, hasPrice := extractNumber(utterance, []string{"price", "at", "for"})

	if hasQuantity {
		session.Quantity = quantity
	}
	if hasPrice {
		session.OrderPrice = price
	}

	if session.Quantity > 0 && session.OrderPrice > 0 {
		session.State = "confirming"
		return confirmOrder(session)
	} else if session.Quantity > 0 {
		session.State = "awaiting_price"
		return "And at what price?"
	} else if session.OrderPrice > 0 {
		session.State = "awaiting_quantity"
		return "And what quantity?"
	}

	return "I need the quantity and the price. For example, '1.5 Bitcoin at 65,000 dollars'."
}

func handleQuantity(session *TradingSession, utterance string) string {
	quantity, hasQuantity := extractNumber(utterance, []string{})
	if !hasQuantity {
		return "I didn't catch that. How much do you want to trade?"
	}
	session.Quantity = quantity
	session.State = "confirming"
	return confirmOrder(session)
}

func handleOrderPrice(session *TradingSession, utterance string) string {
	price, hasPrice := extractNumber(utterance, []string{})
	if !hasPrice {
		return "Sorry, what was the price?"
	}
	session.OrderPrice = price
	session.State = "confirming"
	return confirmOrder(session)
}

func handleConfirmation(session *TradingSession, utterance string) string {
	if strings.Contains(utterance, "yes") || strings.Contains(utterance, "correct") {
		session.State = "completed"
		return "Excellent! Your simulated order has been recorded. Thank you for using GoQuant!"
	} else if strings.Contains(utterance, "no") || strings.Contains(utterance, "wrong") {
		session.State = "symbol_selected" // Go back to order details
		session.Quantity = 0
		session.OrderPrice = 0
		return "No problem, let's correct it. What quantity and at what price?"
	}
	return "Please confirm with 'yes' or 'no'."
}

func confirmOrder(session *TradingSession) string {
	return fmt.Sprintf("Got it. To confirm, you want to trade %.4f %s at $%.4f per unit on %s. Is that correct?",
		session.Quantity, session.Symbol, session.OrderPrice, session.Exchange)
}

// --- Helper Functions ---

func extractNumber(text string, keywords []string) (float64, bool) {
	// A simple number extractor. A real-world app would use a more robust NLP library.
	words := strings.Fields(strings.ReplaceAll(text, ",", ""))
	for _, word := range words {
		cleanWord := strings.Trim(word, ".,!?$")
		if num, err := strconv.ParseFloat(cleanWord, 64); err == nil {
			return num, true
		}
	}
	return 0, false
}

func fetchCurrentPrice(exchange, symbol string) (float64, error) {
	log.Printf("Fetching price for %s on %s", symbol, exchange)

	// Simple implementation using CoinGecko API (free tier)
	// For production, you'd want to use the specific exchange APIs

	client := &http.Client{Timeout: 10 * time.Second}

	// Convert symbol to CoinGecko format (this is simplified)
	coinId := strings.ToLower(symbol)
	if strings.Contains(coinId, "btc") || strings.Contains(coinId, "bitcoin") {
		coinId = "bitcoin"
	} else if strings.Contains(coinId, "eth") || strings.Contains(coinId, "ethereum") {
		coinId = "ethereum"
	}

	url := fmt.Sprintf("https://api.coingecko.com/api/v3/simple/price?ids=%s&vs_currencies=usd", coinId)

	resp, err := client.Get(url)
	if err != nil {
		log.Printf("Error fetching price: %v", err)
		return 0, fmt.Errorf("failed to fetch price data")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("API returned status: %d", resp.StatusCode)
	}

	var priceData map[string]map[string]float64
	if err := json.NewDecoder(resp.Body).Decode(&priceData); err != nil {
		return 0, fmt.Errorf("failed to decode price response")
	}

	if price, exists := priceData[coinId]["usd"]; exists {
		return price, nil
	}

	// Fallback to mock price if not found
	log.Printf("Price not found for %s, using mock price", symbol)
	return 65123.45, nil
}
