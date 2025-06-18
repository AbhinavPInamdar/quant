package main

import (
	"log"
	"os"

	"github.com/abhinavpinamdar/quantbot-backend/handlers"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found. Relying on system environment variables.")
	}

	blandAPIKey := os.Getenv("BLAND_API_KEY")
	// Note: We don't exit if the API key is missing because our web-flow doesn't use it.
	// It's good practice to have it for potential future use or other call types.
	if blandAPIKey == "" {
		log.Println("Warning: BLAND_API_KEY environment variable is not set.")
	}

	r := gin.Default()

	// Configure CORS for frontend integration
	config := cors.DefaultConfig()
	// IMPORTANT: Update with your actual frontend domain in production
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// Initialize handlers (passing the API key, though not used in the web flow)
	handlers.InitializeBland(blandAPIKey)

	// --- API Routes ---
	// Handles the conversation logic
	r.POST("/bland/webhook", handlers.HandleBlandWebhook)
	// Starts a new web-based session
	r.POST("/start-call", handlers.StartCall)
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
