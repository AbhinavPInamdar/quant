package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type BlandPayload struct {
	Utterance      string `json:"utterance"`
	CallID         string `json:"call_id"`
	ConversationID string `json:"conversation_id"`
}

func HandleBlandWebhook(c *gin.Context) {
	var payload BlandPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"response": "Invalid payload"})
		return
	}

	utterance := strings.ToLower(payload.Utterance)

	if strings.Contains(utterance, "binance") {
		symbols, err := fetchBinanceSymbols()
		if err != nil || len(symbols) == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{
				"response": "There was a problem fetching Binance trading pairs.",
			})
			return
		}

		topSymbols := strings.Join(symbols[:5], ", ")
		c.JSON(http.StatusOK, gin.H{
			"response": "Binance selected. Example symbols: " + topSymbols,
		})
		return
	}

	// Default fallback
	c.JSON(http.StatusOK, gin.H{
		"response": "You said: " + payload.Utterance,
	})
}

func fetchBinanceSymbols() ([]string, error) {
	resp, err := http.Get("https://api.binance.com/api/v3/exchangeInfo")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var data struct {
		Symbols []struct {
			Symbol string `json:"symbol"`
		} `json:"symbols"`
	}

	err = json.NewDecoder(resp.Body).Decode(&data)
	if err != nil {
		return nil, err
	}

	var symbols []string
	for _, s := range data.Symbols {
		if strings.HasSuffix(s.Symbol, "USDT") {
			symbols = append(symbols, s.Symbol)
		}
	}

	return symbols, nil
}
