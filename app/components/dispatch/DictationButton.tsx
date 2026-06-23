"use client";

import { useState, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DictationButtonProps {
  driverId: string;
  loadId?: string;
  organizationId: string;
  onMessageSent?: () => void;
}

/**
 * Dictation Button Component
 * Allows dispatchers to dictate messages instead of typing
 * IMPORTANT: Messages are delivered as text/system voice, NOT live dispatcher voice
 */
export default function DictationButton({
  driverId,
  loadId,
  organizationId,
  onMessageSent,
}: DictationButtonProps) {
  const [isDictating, setIsDictating] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [reviewedText, setReviewedText] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"text" | "system_voice" | "both">("text");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Start dictation session
  const startDictation = async () => {
    try {
      setError(null);
      
      // Start API session
      const response = await fetch("/api/dictation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        throw new Error("Failed to start dictation session");
      }

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);

      // Use Web Speech API for client-side STT
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
          (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          setTranscribedText((prev) => prev + finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setError(`Speech recognition error: ${event.error}`);
          stopDictation();
        };

        recognition.onend = () => {
          if (isDictating) {
            // Restart if still dictating
            recognition.start();
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsDictating(true);
      } else {
        // Fallback: Manual input if Web Speech API not available
        setError("Speech recognition not available. Please type your message.");
        setTranscribedText("");
        setIsReviewOpen(true);
      }
    } catch (err: any) {
      console.error("Error starting dictation:", err);
      setError(err.message || "Failed to start dictation");
    }
  };

  // Stop dictation
  const stopDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsDictating(false);
    if (transcribedText.trim()) {
      setReviewedText(transcribedText);
      setIsReviewOpen(true);
    }
  };

  // Cancel dictation
  const cancelDictation = () => {
    stopDictation();
    setTranscribedText("");
    setReviewedText("");
    setSessionId(null);
    setIsReviewOpen(false);
    setError(null);
  };

  // Send message
  const sendMessage = async () => {
    if (!sessionId || !reviewedText.trim()) {
      setError("Please review and confirm the message text");
      return;
    }

    try {
      setIsSending(true);
      setError(null);

      // Review/update session with edited text
      await fetch("/api/dictation/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          editedText: reviewedText.trim(),
        }),
      });

      // Send message
      const response = await fetch("/api/dictation/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          driverId,
          loadId,
          deliveryMethod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      // Success
      setIsReviewOpen(false);
      setTranscribedText("");
      setReviewedText("");
      setSessionId(null);
      onMessageSent?.();
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        variant={isDictating ? "destructive" : "outline"}
        size="sm"
        onClick={isDictating ? stopDictation : startDictation}
        className="gap-2"
      >
        {isDictating ? (
          <>
            <MicOff className="h-4 w-4" />
            Stop Dictating
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" />
            Dictate Message
          </>
        )}
      </Button>

      {isReviewOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Review Message</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message-text">Message Text</Label>
                <Textarea
                  id="message-text"
                  value={reviewedText}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (text.length <= 500) {
                      setReviewedText(text);
                    }
                  }}
                  placeholder="Review and edit your dictated message..."
                  rows={4}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 text-right">
                  {reviewedText.length}/500 characters
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-method">Delivery Method</Label>
                <select
                  id="delivery-method"
                  value={deliveryMethod}
                  onChange={(e) =>
                    setDeliveryMethod(
                      e.target.value as "text" | "system_voice" | "both"
                    )
                  }
                  className="w-full border rounded-md px-3 py-2 text-sm"
                >
                  <option value="text">Text only</option>
                  <option value="system_voice">System voice (synthetic)</option>
                  <option value="both">Both text and system voice</option>
                </select>
                <p className="text-xs text-gray-500">
                  Note: Driver will receive text/system voice only. Live dispatcher voice is not transmitted.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6 justify-end">
              <Button variant="outline" onClick={cancelDictation} disabled={isSending}>
                Cancel
              </Button>
              <Button onClick={sendMessage} disabled={isSending || !reviewedText.trim()}>
                {isSending ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Add SpeechRecognition type
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}
