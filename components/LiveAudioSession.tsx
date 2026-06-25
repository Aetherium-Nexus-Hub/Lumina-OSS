import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Loader2, Square } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const LiveAudioSession = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  
  // Playback queue
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // API Key Safeguard Check
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not defined. Please verify the environment configuration in the Settings menu.");
      }

      // 1. Setup Audio Context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // 2. Setup Microphone
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      
      // We use ScriptProcessorNode for simplicity in this example, though AudioWorklet is better for production
      processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      sourceNodeRef.current.connect(processorNodeRef.current);
      processorNodeRef.current.connect(audioContextRef.current.destination);

      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful, conversational AI assistant.",
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Start sending audio
            processorNodeRef.current!.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32Array to Int16Array
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Base64 encode
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true); // true for little-endian
              }
              
              const bytes = new Uint8Array(buffer);
              let binary = '';
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              // Stop playback, clear queue
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              // Decode base64 to PCM
              const binaryString = atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              // Convert Int16 to Float32
              const pcm16 = new Int16Array(bytes.buffer);
              const float32 = new Float32Array(pcm16.length);
              for (let i = 0; i < pcm16.length; i++) {
                float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
              }
              
              audioQueueRef.current.push(float32);
              playNextInQueue();
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            stopSession();
          },
          onclose: () => {
            stopSession();
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error("Failed to start session:", err);
      setError(err.message || "Failed to access microphone or connect.");
      setIsConnecting(false);
      stopSession();
    }
  };

  const playNextInQueue = () => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) return;
    
    // If we are already playing and the next play time is in the future, wait
    if (isPlayingRef.current && nextPlayTimeRef.current > audioContextRef.current.currentTime) {
      return;
    }

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000); // Output from Gemini is 24kHz
    audioBuffer.getChannelData(0).set(audioData);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    const startTime = Math.max(audioContextRef.current.currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    
    nextPlayTimeRef.current = startTime + audioBuffer.duration;
    
    source.onended = () => {
      isPlayingRef.current = false;
      playNextInQueue();
    };
  };

  const stopSession = () => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current.onaudioprocess = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (sessionRef.current) {
      sessionRef.current.then((s: any) => s.close());
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextPlayTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="flex-1 flex items-center justify-center flex-col gap-6 p-6">
      <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
        isConnected 
          ? 'bg-emerald-500/10 border-4 border-emerald-500/30 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
          : isConnecting
            ? 'bg-yellow-500/10 border-4 border-yellow-500/30 animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.2)]'
            : 'bg-cyan-500/15 border-4 border-cyan-500/30 shadow-[0_0_25px_rgba(0,242,255,0.25)]'
      }`}>
        {isConnecting ? (
          <Loader2 className="w-12 h-12 text-yellow-400 animate-spin" />
        ) : isConnected ? (
          <Mic className="w-12 h-12 text-emerald-400" />
        ) : (
          <MicOff className="w-12 h-12 text-cyan-400" />
        )}
      </div>
      
      <div className="text-center font-sans">
        <h2 className="text-xl font-bold mb-1 font-orbitron text-[#00f2ff] tracking-widest uppercase">CO-PILOT AI COMMS</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto tracking-wide leading-relaxed font-medium">
          {isConnected 
            ? "Intercom Active! Speak naturally to direct the Ship's Core systems." 
            : isConnecting 
              ? "Establishing quantum secure comm-link..." 
              : "Connect with the Gemini 2.5 Live co-pilot module for real-time conversational commands."}
        </p>
        {error && <p className="text-rose-400 text-xs mt-3 font-mono bg-rose-950/20 border border-rose-900/40 p-2 rounded max-w-sm mx-auto">{error}</p>}
      </div>

      {!isConnected && !isConnecting ? (
        <button 
          onClick={startSession}
          className="px-6 py-3 bg-cyan-500/15 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-400 font-orbitron font-bold text-xs tracking-widest rounded-md shadow-[0_0_10px_rgba(0,242,255,0.15)] hover:shadow-[0_0_20px_rgba(0,242,255,0.25)] transition-all duration-300 flex items-center gap-2 uppercase cursor-pointer"
        >
          <Mic className="w-4 h-4 text-cyan-400" /> ENGAGE COMMS
        </button>
      ) : (
        <button 
          onClick={stopSession}
          className="px-6 py-3 bg-rose-500/15 hover:bg-rose-500/35 border border-rose-400/45 text-rose-400 font-orbitron font-bold text-xs tracking-widest rounded-md shadow-[0_0_10px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.25)] transition-all duration-300 flex items-center gap-2 uppercase cursor-pointer"
        >
          <Square className="w-4 h-4 fill-current text-rose-400" /> DISENGAGE COMMS
        </button>
      )}
    </div>
  );
};
