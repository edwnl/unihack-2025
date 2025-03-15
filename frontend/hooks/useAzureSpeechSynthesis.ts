// frontend/hooks/useAzureSpeechSynthesis.ts
"use client";

import { useState, useRef } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

/**
 * Return type for our Azure speech synthesis hook.
 */
export type UseAzureSpeechSynthesisReturn = {
  isSpeaking: boolean;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
};

/**
 * Custom hook that uses Microsoft Cognitive Services Speech SDK for text-to-speech.
 */
export function useAzureSpeechSynthesis(): UseAzureSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);

  // Read subscription details from environment variables
  const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || "";
  const serviceRegion = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || "australiaeast";

  /**
   * Speaks the provided text using Azure Speech SDK.
   */
  const speak = async (text: string): Promise<void> => {
    console.log("[AzureSpeech] speak called with text:", text);

    if (!text) {
      console.log("[AzureSpeech] No text provided, skipping speech synthesis.");
      return;
    }

    if (isSpeaking) {
      console.log("[AzureSpeech] Already speaking, stopping current speech.");
      stopSpeaking();
    }

    if (!subscriptionKey || !serviceRegion) {
      console.error("[AzureSpeech] Subscription key or service region is missing.");
      return;
    }

    try {
      // Configure the Azure Speech SDK
      console.log("[AzureSpeech] Creating speech configuration...");
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
      speechConfig.speechSynthesisLanguage = "en-US";
      speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural"; // Use a modern, clear voice
      console.log("[AzureSpeech] Speech configuration created.");

      // Create the synthesizer
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
      synthesizerRef.current = synthesizer;

      console.log("[AzureSpeech] Speaking:", text);
      setIsSpeaking(true);

      return new Promise<void>((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              console.log("[AzureSpeech] Speech synthesis completed successfully.");
              setIsSpeaking(false);
              synthesizer.close();
              synthesizerRef.current = null;
              resolve();
            } else {
              const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(result);
              console.error("[AzureSpeech] Speech synthesis canceled:", cancellationDetails.errorDetails);
              setIsSpeaking(false);
              synthesizer.close();
              synthesizerRef.current = null;
              reject(new Error(cancellationDetails.errorDetails));
            }
          },
          (error) => {
            console.error("[AzureSpeech] Speech synthesis error:", error);
            setIsSpeaking(false);
            synthesizer.close();
            synthesizerRef.current = null;
            reject(error);
          }
        );
      });
    } catch (error) {
      console.error("[AzureSpeech] Error during speech synthesis:", error);
      setIsSpeaking(false);
      return Promise.reject(error);
    }
  };

  const stopSpeaking = () => {
    if (synthesizerRef.current) {
      synthesizerRef.current.close();
      synthesizerRef.current = null;
      setIsSpeaking(false);
    }
  };

  return {
    isSpeaking,
    speak,
    stopSpeaking,
  };
}