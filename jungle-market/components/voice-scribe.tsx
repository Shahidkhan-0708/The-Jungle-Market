"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceScribeProps {
  onTranscriptComplete: (transcript: string) => void;
  isProcessing?: boolean;
}

export default function VoiceScribe({ onTranscriptComplete, isProcessing = false }: VoiceScribeProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        // Allows the user to speak in Hindi, English, etc.
        recognitionRef.current.lang = 'hi-IN'; // Defaults to Hindi/English mix in India

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " ";
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
          toast.error("Microphone error. Please ensure permissions are granted.");
        };

        recognitionRef.current.onend = () => {
          // If stopped intentionally, this is fine.
          setIsRecording(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Your browser does not support voice recognition. Please use Chrome.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (transcript.trim().length > 5) {
        onTranscriptComplete(transcript.trim());
      } else {
        toast.info("Recording was too short.");
      }
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success("Listening... Speak about your craft.");
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px' }}>
            <Wand2 size={16} color="#059669" /> Voice AI Scribe
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            Speak in Hindi or English. AI will automatically write your ONDC listing.
          </p>
        </div>
        
        <button
          type="button"
          onClick={toggleRecording}
          disabled={isProcessing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            backgroundColor: isRecording ? '#ef4444' : '#111827',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '24px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
            boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : 'none'
          }}
        >
          {isProcessing ? (
            <><Loader2 size={18} className="animate-spin" /> Processing AI...</>
          ) : isRecording ? (
            <><Square size={16} fill="white" /> Stop & Generate</>
          ) : (
            <><Mic size={18} /> Tap to Speak</>
          )}
        </button>
      </div>

      {isRecording && (
        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #d1d5db', minHeight: '60px' }}>
          <p style={{ margin: 0, color: '#374151', fontStyle: 'italic' }}>
            {transcript || "Listening..."}
          </p>
        </div>
      )}
      
      {!isRecording && transcript && !isProcessing && (
        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>
          ✓ Voice captured. The AI is applying this to your listing.
        </div>
      )}
    </div>
  );
}
