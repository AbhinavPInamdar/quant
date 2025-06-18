import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // The backend URL should be stored in an environment variable for security and flexibility.
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    
    // Forward the request to the Go backend's /start-call endpoint.
    const response = await fetch(`${backendUrl}/start-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // The body is empty, as the backend will generate the session ID.
      body: JSON.stringify({}), 
    });

    if (!response.ok) {
      // If the backend returns an error, log it and forward it.
      const errorBody = await response.json();
      console.error('Backend error:', errorBody);
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Send the successful response from the Go backend back to the frontend.
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
