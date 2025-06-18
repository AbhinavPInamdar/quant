import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // The backend URL should be stored in an environment variable
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    // Forward the request to the Go backend's /start-call endpoint
    const response = await fetch(`${backendUrl}/start-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), 
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Backend error:', errorBody);
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in /api/start-call proxy:', error);
    
    return NextResponse.json(
      { 
        message: "Failed to start a new session with the backend." 
      },
      { status: 500 }
    );
  }
}