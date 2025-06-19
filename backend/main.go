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
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found. Relying on system environment variables.")
	}

	blandAPIKey := os.Getenv("BLAND_API_KEY")
	if blandAPIKey == "" {
		log.Println("Warning: BLAND_API_KEY environment variable is not set.")
	}

	r := gin.Default()

	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	handlers.InitializeBland(blandAPIKey)

	r.POST("/bland/webhook", handlers.HandleBlandWebhook)
	r.POST("/start-call", handlers.StartCall)
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
