# GoQuant OTC Trading Bot

A voice-based OTC (Over-The-Counter) trading assistant built with Next.js frontend and Go backend. The bot allows users to place simulated trading orders through voice commands using speech recognition and text-to-speech capabilities.

## 🏗️ Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Go with Gin framework
- **Speech Recognition**: Web Speech API
- **Text-to-Speech**: Web Speech Synthesis API
- **Price Data**: CoinGecko API

## ✨ Features

- Voice-based trading interface
- Real-time speech recognition
- Text-to-speech responses
- Support for multiple exchanges (OKX, Bybit, Deribit, Binance)
- Real-time cryptocurrency price fetching
- Session management
- Debug console for troubleshooting

## 🔧 Prerequisites

- **Node.js** (v18 or higher)
- **Go** (v1.24.1 or higher)
- **Modern web browser** with Web Speech API support (Chrome, Edge, Safari)
- **Microphone access** for voice features

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd <your-repo-name>
```

### 2. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install Go dependencies:
```bash
go mod download
```

Create a `.env` file in the backend directory:
```bash
touch .env
```

Add the following environment variables to `.env`:
```env
BLAND_API_KEY=your_bland_api_key_here
PORT=8080
```

> **Note**: The BLAND_API_KEY is optional for basic functionality. The bot will work without it, but you'll see a warning in the logs.

### 3. Frontend Setup

Navigate to the frontend directory:
```bash
cd ../quantbot
```

Install dependencies:
```bash
npm install
```

Create a `.env.local` file in the quantbot directory:
```bash
touch .env.local
```

Add the following environment variable:
```env
BACKEND_URL=http://localhost:8080
```

## 🚀 Running the Application

### 1. Start the Backend Server

In the `backend` directory:
```bash
go run main.go
```

The backend will start on `http://localhost:8080`

You should see:
```
Server starting on port 8080
```

### 2. Start the Frontend Development Server

In a new terminal, navigate to the `quantbot` directory:
```bash
cd quantbot
npm run dev
```

The frontend will start on `http://localhost:3000`

### 3. Access the Application

Open your browser and go to `http://localhost:3000`

## 🎤 Using the Trading Bot

### Initial Setup
1. **Allow microphone access** when prompted by your browser
2. **Test your microphone** using the "Test Mic" button
3. **Start a call** by clicking the "Start Call" button

### Voice Commands Flow
1. **Choose Exchange**: Say "OKX", "Bybit", "Deribit", or "Binance"
2. **Select Symbol**: Say the trading symbol (e.g., "Bitcoin", "BTC", "Ethereum")
3. **Specify Order Details**: Say quantity and price (e.g., "1.5 Bitcoin at 65000 dollars")
4. **Confirm Order**: Say "yes" to confirm or "no" to modify

### Example Conversation
```
Bot: "Hello! Welcome to GoQuant's OTC trading service. Please choose an exchange: OKX, Bybit, Deribit, or Binance."
You: "OKX"
Bot: "Great! You've selected OKX. Which trading symbol would you like to trade?"
You: "Bitcoin"
Bot: "The current price for BITCOIN on OKX is $65,123.45. Now, what quantity and price for the order?"
You: "1.5 Bitcoin at 65000 dollars"
Bot: "Got it. To confirm, you want to trade 1.5000 BITCOIN at $65000.0000 per unit on OKX. Is that correct?"
You: "Yes"
Bot: "Excellent! Your simulated order has been recorded. Thank you for using GoQuant!"
```

## 🔍 Troubleshooting

### Common Issues

**1. Microphone Not Working**
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome, Edge, Safari recommended)
- Test microphone using the "Test Mic" button

**2. Speech Recognition Errors**
- Speak clearly and at a moderate pace
- Ensure good microphone quality
- Check for background noise

**3. Backend Connection Issues**
- Verify backend is running on port 8080
- Check that CORS is properly configured
- Ensure no firewall blocking the connection

**4. Price Fetching Issues**
- Check internet connection
- CoinGecko API might be rate-limited
- Fallback mock prices will be used if API fails

### Debug Information
The application includes a debug console that shows:
- Speech recognition status
- Microphone permissions
- API calls and responses
- Error messages

## 🌐 API Endpoints

### Backend Endpoints
- `POST /start-call` - Initialize a new trading session
- `POST /bland/webhook` - Process voice commands
- `GET /health` - Health check endpoint

### Frontend API Routes
- `POST /api/start-call` - Proxy to backend start-call
- `POST /api/process-speech` - Proxy to backend webhook

## 📁 Project Structure

```
├── backend/
│   ├── handlers/
│   │   └── bland.go          # Main trading logic
│   ├── main.go               # Server entry point
│   ├── go.mod                # Go dependencies
│   └── .env                  # Environment variables
├── quantbot/
│   ├── app/
│   │   ├── api/              # Next.js API routes
│   │   ├── globals.css       # Global styles
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Main application
│   ├── next.config.ts        # Next.js configuration
│   └── .env.local            # Environment variables
└── README.md
```

## 🔒 Security Notes

- This is a **simulation/demo** - no real trades are executed
- Microphone access is required for voice features
- All trading data is stored in memory (sessions are not persistent)
- No sensitive trading credentials are handled

## 🚀 Deployment

### Backend Deployment
- Set environment variables in your deployment platform
- Ensure PORT environment variable is set correctly
- Configure CORS for your frontend domain

### Frontend Deployment
- Update BACKEND_URL in environment variables
- Ensure your deployment platform supports Web Speech API
- Configure proper HTTPS (required for microphone access in production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is for educational/demonstration purposes.

## 🆘 Support

If you encounter issues:
1. Check the debug console in the application
2. Verify all prerequisites are met
3. Ensure proper browser permissions
4. Check backend logs for detailed error messages

---

**Note**: This trading bot is for simulation purposes only and does not execute real trades. Always use proper risk management and consult with financial professionals for real trading decisions.