// frontend/hooks/useAzureSpeechSynthesis.ts
"use client";

import { useState, useRef, useCallback } from "react";

/**
 * Return type for our speech synthesis hook.
 */
export type UseAzureSpeechSynthesisReturn = {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

/**
 * Custom hook that uses the Web Speech API for text-to-speech.
 * Implements a proper queue system to ensure announcements play sequentially.
 */
export function useAzureSpeechSynthesis(): UseAzureSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Queue to hold pending utterances
  const speechQueue = useRef<SpeechSynthesisUtterance[]>([]);
  // Flag to check if an utterance is currently being processed
  const isProcessing = useRef(false);

  // Process the next utterance in the queue
  const processQueue = useCallback(() => {
    if (speechQueue.current.length === 0) {
      isProcessing.current = false;
      setIsSpeaking(false);
      return;
    }
    
    isProcessing.current = true;
    setIsSpeaking(true);
    const utterance = speechQueue.current.shift()!;
    
    // When the utterance finishes (or errors), process the next one
    utterance.onend = () => {
      console.log("[SpeechSynthesis] Utterance ended");
      setTimeout(() => processQueue(), 300); // Small delay between phrases
    };
    
    utterance.onerror = (event) => {
      console.error("[SpeechSynthesis] Error:", event);
      setTimeout(() => processQueue(), 300);
    };
    
    // Configure the utterance
    utterance.rate = 1.3; // Slightly slower for better clarity
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume
    
    // Try to set a female voice if available
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Look for a US English female voice
      const femaleVoice = voices.find(voice => 
        (voice.lang === 'en-US' && voice.name.toLowerCase().includes('female')) || 
        (voice.lang === 'en-GB' && voice.name.toLowerCase().includes('female'))
      );
      
      // Fallback to any English voice if no female voice found
      const anyEnglishVoice = voices.find(voice => 
        voice.lang === 'en-US' || voice.lang === 'en-GB'
      );
      
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        console.log("[SpeechSynthesis] Using female voice:", femaleVoice.name);
      } else if (anyEnglishVoice) {
        utterance.voice = anyEnglishVoice;
        console.log("[SpeechSynthesis] Using voice:", anyEnglishVoice.name);
      }
    };
    
    // Try to set the voice
    try {
      // In some browsers, getVoices might not be loaded yet
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) {
        setVoice();
      } else {
        // If voices aren't loaded yet, try again when they are
        window.speechSynthesis.onvoiceschanged = setVoice;
      }
    } catch (error) {
      console.warn("[SpeechSynthesis] Error setting voice:", error);
    }
    
    console.log("[SpeechSynthesis] Speaking:", utterance.text);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Adds an utterance to the queue and starts processing if idle
  const speak = useCallback((text: string): void => {
    if (!text) {
      console.log("[SpeechSynthesis] No text provided, skipping speech synthesis.");
      return;
    }

    console.log("[SpeechSynthesis] Adding to queue:", text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    speechQueue.current.push(utterance);
    setIsSpeaking(true);
    
    if (!isProcessing.current) {
      processQueue();
    }
  }, [processQueue]);

  // Cancel current speech and clear the queue
  const stopSpeaking = useCallback(() => {
    console.log("[SpeechSynthesis] Stopping speech");
    window.speechSynthesis.cancel();
    speechQueue.current = [];
    isProcessing.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    speak,
    stopSpeaking,
  };
}