"use client";

import { useState, useRef, useEffect } from "react";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

/**
 * Return type for our Azure speech hook.
 */
export type UseAzureSpeechRecognitionReturn = {
  isListening: boolean;
  recognizedText: string;
  startListening: () => void;
  stopListening: () => void;
  clearRecognizedText: () => void;
};

/**
 * Custom hook that uses Microsoft Cognitive Services Speech SDK for real-time recognition.
 * `onTranscriptReceived` is a callback that runs each time new text is recognized.
 */
export function useAzureSpeechRecognition(
  onTranscriptReceived?: (transcript: string) => void,
): UseAzureSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);

  // Read subscription details from environment variables.
  // Make sure these are set in .env.local with the NEXT_PUBLIC_ prefix.
  const subscriptionKey = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || "";
  const serviceRegion = "australiaeast";

  /**
   * Start listening continuously using Azure Speech SDK.
   */
  const startListening = () => {
    console.log("[AzureSpeech] startListening called");
    if (isListening) {
      console.log("[AzureSpeech] Already listening, skipping start.");
      return;
    }

    if (!subscriptionKey || !serviceRegion) {
      console.error(
        "[AzureSpeech] Subscription key or service region is missing.",
      );
      return;
    }

    // Configure the Azure Speech SDK
    console.log("[AzureSpeech] Creating speech configuration...");
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion,
    );
    speechConfig.speechRecognitionLanguage = "en-US"; // Adjust language as needed
    speechConfig.endpointId = "de96dcbf-e1b3-4373-bdad-5a7d4ef91f2a";
    console.log("[AzureSpeech] Speech configuration created:", speechConfig);

    console.log(
      "[AzureSpeech] Creating audio configuration from default microphone...",
    );
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    console.log("[AzureSpeech] Audio configuration created:", audioConfig);

    const recognizer = new SpeechSDK.SpeechRecognizer(
      speechConfig,
      audioConfig,
    );
    recognizerRef.current = recognizer;
    console.log("[AzureSpeech] SpeechRecognizer instance created.");

    // This fires when the service has recognized (finalized) some speech
    recognizer.recognized = (_sender, event) => {
      console.log(
        "[AzureSpeech] Recognized event fired with result:",
        event.result,
      );
      if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        console.log("[AzureSpeech] Recognized speech:", event.result.text);
        setRecognizedText(event.result.text);
        if (onTranscriptReceived) {
          onTranscriptReceived(event.result.text);
        }
      } else {
        console.warn(
          "[AzureSpeech] Recognized event reason not RecognizedSpeech:",
          event.result.reason,
        );
      }
    };

    // Start continuous recognition
    console.log("[AzureSpeech] Starting continuous recognition...");
    recognizer.startContinuousRecognitionAsync(
      () => {
        console.log(
          "[AzureSpeech] Continuous recognition started successfully.",
        );
        setIsListening(true);
      },
      (error) => {
        console.error(
          "[AzureSpeech] Error starting continuous recognition:",
          error,
        );
        setIsListening(false);
      },
    );
  };

  /**
   * Stop listening and release the recognizer.
   */
  const stopListening = () => {
    console.log("[AzureSpeech] stopListening called");
    if (!recognizerRef.current) {
      console.log("[AzureSpeech] No active recognizer to stop.");
      return;
    }

    recognizerRef.current.stopContinuousRecognitionAsync(
      () => {
        console.log(
          "[AzureSpeech] Continuous recognition stopped successfully.",
        );
        setIsListening(false);
        if (recognizerRef.current) {
          recognizerRef.current.close();
          console.log("[AzureSpeech] Recognizer closed.");
        }
        recognizerRef.current = null;
      },
      (error) => {
        console.error(
          "[AzureSpeech] Error stopping continuous recognition:",
          error,
        );
        setIsListening(false);
      },
    );
  };

  /**
   * Clears out recognized text in the UI.
   */
  const clearRecognizedText = () => {
    console.log("[AzureSpeech] clearRecognizedText called.");
    setRecognizedText("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[AzureSpeech] Cleanup effect triggered.");
      if (recognizerRef.current) {
        recognizerRef.current.close();
        console.log("[AzureSpeech] Recognizer closed during cleanup.");
        recognizerRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    recognizedText,
    startListening,
    stopListening,
    clearRecognizedText,
  };
}
