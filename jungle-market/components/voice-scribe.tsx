"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Wand2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';

interface VoiceScribeProps {
  onTranscriptComplete: (transcript: string) => void;
  isProcessing?: boolean;
}

export default function VoiceScribe({ onTranscriptComplete, isProcessing = false }: VoiceScribeProps) {
  const { currentLanguage, t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API with selected regional language
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = currentLanguage.speechCode;

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
          setIsRecording(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentLanguage]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Your browser does not support voice recognition. Please use Chrome.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (transcript.trim().length > 3) {
        onTranscriptComplete(transcript.trim());
      } else {
        toast.info("Recording was too short.");
      }
    } else {
      setTranscript("");
      try {
        recognitionRef.current.lang = currentLanguage.speechCode;
        recognitionRef.current.start();
        setIsRecording(true);
        toast.success(`${currentLanguage.nativeName}: ${t('voice_listening', 'Listening... Speak about your craft.')}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px' }}>
            <Wand2 size={16} color="#059669" /> {t('voice_scribe_title', 'Voice AI Scribe')}
            <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: '#E8F8E7', color: '#004525', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={12} /> {currentLanguage.nativeName}
            </span>
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            {t('voice_scribe_desc', 'Speak in your regional language. AI will automatically write your ONDC listing.')}
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
            backgroundColor: isRecording ? '#ef4444' : '#0E4C3A',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '24px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
            boxShadow: isRecording ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : '0 2px 6px rgba(0,0,0,0.1)'
          }}
        >
          {isProcessing ? (
            <><Loader2 size={18} className="animate-spin" /> Processing AI...</>
          ) : isRecording ? (
            <><Square size={16} fill="white" /> {t('voice_stop', 'Stop & Fill')}</>
          ) : (
            <><Mic size={18} /> {t('voice_start', 'Tap to Speak')} ({currentLanguage.nativeName})</>
          )}
        </button>
      </div>

      {isRecording && (
        <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '8px', border: '1px dashed #059669', minHeight: '60px' }}>
          <p style={{ margin: 0, color: '#065F46', fontStyle: 'italic', fontWeight: 500 }}>
            {transcript || `🎙️ ${t('voice_listening', 'Listening...')}`}
          </p>
        </div>
      )}
      
      {!isRecording && transcript && !isProcessing && (
        <div style={{ padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>
          ✓ Voice captured in {currentLanguage.nativeName}. AI is updating the listing.
        </div>
      )}
    </div>
  );
}
