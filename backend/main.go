package main

import (
	"github.com/abhinavpinamdar/quantbot-backend/handlers"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.POST("/bland", handlers.HandleBlandWebhook)
	r.Run(":8080")
}
