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
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
  onspeechstart: () => void;
  onspeechend: () => void;
  onnomatch: () => void;
}

export default function Home() {
  const [callStatus, setCallStatus] = useState<CallStatus>({ isActive: false, status: 'idle' });
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => {
    checkBrowserSupport();
    checkMicrophonePermission();
  }, []);

  const checkBrowserSupport = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      addDebugInfo("✅ Speech Recognition API supported");
    } else {
      setSpeechSupported(false);
      addDebugInfo("❌ Speech Recognition API not supported in this browser");
      setError("Speech Recognition not supported. Please use Chrome, Edge, or Safari.");
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      addDebugInfo("✅ Speech Synthesis supported");
    } else {
      addDebugInfo("⚠️ Speech Synthesis not supported");
    }
  };

  const checkMicrophonePermission = async () => {
    try {
      if (!navigator.permissions) {
        addDebugInfo("⚠️ Permissions API not available");
        return;
      }

      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicPermission(permission.state as any);
      addDebugInfo(`🎤 Microphone permission: ${permission.state}`);

      permission.addEventListener('change', () => {
        setMicPermission(permission.state as any);
        addDebugInfo(`🎤 Microphone permission changed to: ${permission.state}`);
      });
    } catch (err) {
      addDebugInfo("⚠️ Could not check microphone permission");
      console.error('Permission check error:', err);
    }
  };

  const addDebugInfo = (info: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), `[${timestamp}] ${info}`]);
  };

  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Enhanced configuration
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      addDebugInfo("🎙️ Speech recognition started");
      setIsListening(true);
      setError("");
    };

    recognition.onspeechstart = () => {
      addDebugInfo("🗣️ Speech detected");
    };

    recognition.onspeechend = () => {
      addDebugInfo("🔇 Speech ended");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          addDebugInfo(`✅ Final: "${transcript}" (confidence: ${confidence?.toFixed(2) || 'N/A'})`);
        } else {
          interimTranscript += transcript;
        }
      }

      setInterimTranscript(interimTranscript);

      if (finalTranscript) {
        handleUserSpeech(finalTranscript);
        setInterimTranscript("");
      }
    };

    recognition.onerror = (event: any) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      addDebugInfo(`❌ ${errorMessage}`);
      console.error('Speech recognition error:', event);
      
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setError("No speech detected. Please try speaking closer to the microphone.");
          if (callStatus.isActive) {
            restartTimeoutRef.current = setTimeout(() => {
              startListening();
            }, 1000);
          }
          break;
        case 'audio-capture':
          setError("Microphone not accessible. Please check your microphone permissions.");
          break;
        case 'not-allowed':
          setError("Microphone permission denied. Please allow microphone access and refresh the page.");
          break;
        case 'network':
          setError("Network error. Please check your internet connection.");
          break;
        default:
          setError(errorMessage);
      }
    };

    recognition.onend = () => {
      addDebugInfo("🛑 Speech recognition ended");
      setIsListening(false);
      if (callStatus.isActive && !error) {
        restartTimeoutRef.current = setTimeout(() => {
          if (callStatus.isActive) {
            addDebugInfo("🔄 Auto-restarting recognition");
            startListening();
          }
        }, 100);
      }
    };

    recognition.onnomatch = () => {
      addDebugInfo("❓ No speech match found");
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      recognition.stop();
    };
  }, [speechSupported, callStatus.isActive, error]);

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
      if (callStatus.isActive) {
        setTimeout(() => startListening(), 2000); 
      }
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
      setTimeout(() => {
        startListening();
      }, 3000);
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
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    addToConversation('bot', "Thank you for using the trading service. Goodbye!");
    setTimeout(() => {
      setCallStatus({ isActive: false, status: 'idle' });
    }, 1000);
  };

  const startListening = async () => {
    if (!speechSupported) {
      setError("Speech recognition not supported in this browser");
      return;
    }

    const recognition = recognitionRef.current;
    if (!isListening && recognition && callStatus.isActive) {
      try {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          addDebugInfo("🎤 Microphone access granted");
        } catch (micError) {
          console.error('Microphone access error:', micError);
          setError("Please allow microphone access to use voice features");
          return;
        }

        recognition.start();
        addDebugInfo("🎯 Attempting to start recognition");
      } catch (err) {
        console.error("Could not start listening:", err);
        addDebugInfo(`❌ Failed to start: ${err}`);
        setError("Failed to start voice recognition. Please try again.");
      }
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      addDebugInfo("⏹️ Manually stopped recognition");
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
      utterance.volume = 0.8;
      
      utterance.onend = () => {
        addDebugInfo("🔊 TTS finished");
      };
      
      synthRef.current.speak(utterance);
      addDebugInfo("🔊 Speaking response");
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addDebugInfo("🎤 Microphone test successful");
      stream.getTracks().forEach(track => track.stop());
      setError("");
    } catch (err) {
      console.error('Microphone test failed:', err);
      setError("Microphone test failed. Please check your microphone permissions.");
      addDebugInfo(`❌ Microphone test failed: ${err}`);
    }
  };

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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  callStatus.status === 'active' ? 'bg-green-400 animate-pulse' :
                  callStatus.status === 'starting' ? 'bg-yellow-400 animate-pulse' :
                  'bg-slate-500'
                }`}></div>
                <span className="text-sm font-medium">Status: {callStatus.status.charAt(0).toUpperCase() + callStatus.status.slice(1)}</span>
                {isListening && <span className="text-xs text-green-400 animate-pulse">🎤 Listening...</span>}
              </div>
              <div className="flex gap-3">
                {!callStatus.isActive ? (
                  <>
                    <button
                      onClick={testMicrophone}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Test Mic
                    </button>
                    <button
                      onClick={startCall}
                      disabled={callStatus.status === 'starting' || !speechSupported}
                      className="goquant-btn"
                    >
                      {callStatus.status === 'starting' ? 'Starting...' : 'Start Call'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
                    >
                      {isListening ? 'Stop Listening' : 'Start Listening'}
                    </button>
                    <button
                      onClick={endCall}
                      className="goquant-btn"
                      style={{ background: 'linear-gradient(90deg, #ff5f6d, #ffc371)' }}
                    >
                      End Call
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 mb-2">
              Speech Recognition: {speechSupported ? '✅ Supported' : '❌ Not Supported'} | 
              Microphone: {micPermission === 'granted' ? '✅ Granted' : micPermission === 'denied' ? '❌ Denied' : '⏳ ' + micPermission}
            </div>


            {interimTranscript && (
              <div className="p-2 bg-slate-700/50 rounded-lg text-slate-300 text-sm mb-2">
                <em>Listening: "{interimTranscript}"</em>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>


          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700 h-96 flex flex-col mb-6">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold">Conversation Transcript</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {conversation.length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  Click "Start Call" to begin! Make sure to allow microphone access.
                </div>
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


          <div className="bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-700">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-sm font-semibold">Debug Information</h3>
            </div>
            <div className="p-4 max-h-40 overflow-y-auto">
              {debugInfo.length === 0 ? (
                <p className="text-slate-400 text-xs">Debug information will appear here...</p>
              ) : (
                <div className="space-y-1">
                  {debugInfo.map((info, index) => (
                    <p key={index} className="text-xs font-mono text-slate-300">{info}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}