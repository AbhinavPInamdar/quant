"use client";
import { useState, useEffect, useRef } from "react";

interface ConversationMessage {
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
}

interface CallStatus {
  isActive: boolean;
  callId?: string;
  status: 'idle' | 'starting' | 'active' | 'ending' | 'error';
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: Event) => void;
  onend: () => void;
}

export default function Home() {
  const [hover, setHover] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>({ isActive: false, status: 'idle' });
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        handleUserSpeech(transcript);
      };

      recognition.onerror = (event: Event) => {
        console.error('Speech recognition error:', event);
        setError(`Speech recognition error.`);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (callStatus.isActive && isListening) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [callStatus.isActive, isListening]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleUserSpeech = async (transcript: string) => {
    if (!transcript.trim() || !callStatus.callId) return;

    addToConversation('user', transcript);
    stopListening();

    try {
      const response = await fetch('/api/process-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utterance: transcript,
          call_id: callStatus.callId,
        }),
      });

      if (!response.ok) throw new Error('Failed to process speech');

      const data = await response.json();
      addToConversation('bot', data.response);
      speakText(data.response);
    } catch (err: any) {
      console.error('Error processing speech:', err);
      setError(err.message || 'Failed to process your request');
      addToConversation('bot', "I'm having trouble connecting to the server.");
    } finally {
      if (callStatus.isActive) startListening();
    }
  };

  const startCall = async () => {
    try {
      setCallStatus({ isActive: false, status: 'starting' });
      setError("");
      setConversation([]);

      const response = await fetch('/api/start-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to start session with backend.');

      const data = await response.json();

      setCallStatus({ isActive: true, status: 'active', callId: data.call_id });

      addToConversation('bot', data.message);
      speakText(data.message);
      startListening();
    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(err.message || 'Failed to start call.');
      setCallStatus({ isActive: false, status: 'error' });
    }
  };

  const endCall = () => {
    setCallStatus({ isActive: false, status: 'ending' });
    stopListening();
    synthRef.current?.cancel();
    addToConversation('bot', "Thank you for using the trading service. Goodbye!");
    setTimeout(() => {
      setCallStatus({ isActive: false, status: 'idle' });
    }, 1000);
  };

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!isListening && recognition) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error("Could not start listening:", err);
      }
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const addToConversation = (type: 'user' | 'bot', message: string) => {
    setConversation(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const speakText = (text: string) => {
    if (synthRef.current && text) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      synthRef.current.speak(utterance);
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            GoQuant OTC Trading Bot
          </h1>
          <p className="text-slate-300 text-lg">Web-Based Voice Trading Assistant</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 mb-6 border border-slate-700">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  callStatus.status === 'active' ? 'bg-green-400 animate-pulse' :
                  callStatus.status === 'starting' ? 'bg-yellow-400 animate-pulse' :
                  'bg-slate-500'
                }`}></div>
                <span className="text-sm font-medium">Status: {callStatus.status.charAt(0).toUpperCase() + callStatus.status.slice(1)}</span>
              </div>
              <div className="flex gap-3">
                {!callStatus.isActive ? (
                  <button
                    onClick={startCall}
                    disabled={callStatus.status === 'starting'}
                    className="goquant-btn"
                  >
                    {callStatus.status === 'starting' ? 'Starting...' : 'Start Call'}
                  </button>
                ) : (
                  <button
                    onClick={endCall}
                    className="goquant-btn"
                    style={{ background: 'linear-gradient(90deg, #ff5f6d, #ffc371)' }}
                  >
                    End Call
                  </button>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 h-96 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold">Conversation Transcript</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversation.length === 0 ? (
                <div className="text-center text-slate-400 py-8">Click "Start Call" to begin!</div>
              ) : (
                conversation.map((msg, index) => (
                  <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${msg.type === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                      <p className="text-sm mb-1">{msg.message}</p>
                      <p className={`text-xs opacity-70 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={conversationEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
