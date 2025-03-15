// frontend/hooks/useAzureSpeechSynthesis.ts
"use client";

import { useState, useRef, useCallback } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

/**
 * Return type for our Azure speech synthesis hook.
 */
export type UseAzureSpeechSynthesisReturn = {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

/**
 * Custom hook that uses Microsoft Cognitive Services Speech SDK for text-to-speech.
 * Implements a proper queue system to ensure announcements play sequentially.
 */
export function useAzureSpeechSynthesis(): UseAzureSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const queueRef = useRef<string[]>([]);
  const isProcessingRef = useRef<boolean>(false);

  // Read subscription details from environment variables
  const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || "";
  const serviceRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || "australiaeast";

  // Function to speak a single text item
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!text || !subscriptionKey || !serviceRegion) return Promise.resolve();

    console.log("[AzureSpeech] Speaking:", text);
    setIsSpeaking(true);

    try {
      // Configure the Azure Speech SDK
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
      speechConfig.speechSynthesisLanguage = "en-US";
      speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural"; // Use a modern, clear voice

      // Create the synthesizer
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
      synthesizerRef.current = synthesizer;

      return new Promise<void>((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log("[AzureSpeech] Speech synthesis completed successfully.");
              synthesizer.close();
              synthesizerRef.current = null;
              resolve();
            } else {
              const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(result);
              console.error("[AzureSpeech] Speech synthesis canceled:", cancellationDetails.errorDetails);
              synthesizer.close();
              synthesizerRef.current = null;
              reject(new Error(cancellationDetails.errorDetails));
            }
          },
          (error) => {
            console.error("[AzureSpeech] Speech synthesis error:", error);
            synthesizer.close();
            synthesizerRef.current = null;
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error("[AzureSpeech] Error during speech synthesis:", error);
      return Promise.reject(error);
    }
  }, [subscriptionKey, serviceRegion]);

  // Process the next item in the queue
  const processQueue = useCallback(async () => {
    // If already processing or no items in queue, exit
    if (isProcessingRef.current || queueRef.current.length === 0) {
      setIsSpeaking(false);
      return;
    }

    // Mark as processing
    isProcessingRef.current = true;
    
    try {
      // Get the next text to speak (but don't remove it yet)
      const nextText = queueRef.current[0];
      
      // Speak the text
      await speakText(nextText);
      
      // Remove the text from the queue only after it's been spoken
      queueRef.current.shift();
      
    } catch (error) {
      console.error("[AzureSpeech] Error processing queue item:", error);
    } finally {
      // Mark as not processing anymore
      isProcessingRef.current = false;
      
      // Small delay before processing next item
      setTimeout(() => {
        // Process the next item if any
        if (queueRef.current.length > 0) {
          processQueue();
        } else {
          setIsSpeaking(false);
        }
      }, 300);
    }
  }, [speakText]);

  /**
   * Add text to the speech queue and start processing if not already processing
   */
  const speak = useCallback((text: string): void => {
    if (!text) {
      console.log("[AzureSpeech] No text provided, skipping speech synthesis.");
      return;
    }

    if (!subscriptionKey || !serviceRegion) {
      console.error("[AzureSpeech] Subscription key or service region is missing.");
      return;
    }

    console.log("[AzureSpeech] Adding to queue:", text);

    // Add the text to the queue
    queueRef.current.push(text);
    
    // If not already processing, start processing the queue
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [processQueue, subscriptionKey, serviceRegion]);

  const stopSpeaking = useCallback(() => {
    if (synthesizerRef.current) {
      synthesizerRef.current.close();
      synthesizerRef.current = null;
    }
    
    // Clear the queue
    queueRef.current = [];
    isProcessingRef.current = false;
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    speak,
    stopSpeaking,
  };
}