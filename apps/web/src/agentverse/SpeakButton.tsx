import { synthesizeEnvironmentSpeech } from "@t3tools/client-runtime/voice-input";
import type { EnvironmentId } from "@t3tools/contracts";
import * as Option from "effect/Option";
import { Loader2Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { toastManager } from "~/components/ui/toast";
import { runEnvironmentSpeech } from "~/speech/runEnvironmentSpeech";
import { usePreparedConnection } from "~/state/session";
import { spokenText } from "./speak.logic";

type Phase = "idle" | "preparing" | "speaking";

const hasBrowserVoice = () => typeof window !== "undefined" && "speechSynthesis" in window;

function speakWithBrowser(text: string, onEnd: () => void) {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length === 0) {
    toastManager.add({
      type: "error",
      title: "No speech voice available",
      description:
        "This browser exposes no text-to-speech voices, and the server's Piper voice could not be used.",
    });
    return false;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = navigator.language.toLowerCase();
  const voice =
    voices.find((v) => v.lang.toLowerCase() === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.split("-")[0] ?? "")) ??
    voices.find((v) => v.default);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  // Chrome drops a speak() queued right behind a cancel(), so only clear a stuck queue.
  if (synth.speaking || synth.pending) synth.cancel();
  synth.speak(utterance);
  return true;
}

/**
 * Reads a reply aloud. The environment's Piper voice is tried first (the first use downloads it);
 * if that fails, the browser's own voice reads it.
 */
export function SpeakButton(p: { environmentId: string; text: string | null }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const connection = usePreparedConnection(p.environmentId as EnvironmentId);
  const abort = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    abort.current?.abort();
    abort.current = null;
    audio.current?.pause();
    audio.current = null;
    if (hasBrowserVoice()) window.speechSynthesis.cancel();
  };
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- stops playback when the button unmounts; callers key it by reply text
  useEffect(() => stop, [stop]);

  if (!p.text) return null;
  const text = spokenText(p.text);

  const play = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setPhase("preparing");
    if (Option.isSome(connection)) {
      try {
        const wav = await runEnvironmentSpeech(
          synthesizeEnvironmentSpeech(connection.value, text),
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(new Blob([new Uint8Array(wav)], { type: "audio/wav" }));
        const element = new Audio(url);
        const done = () => {
          URL.revokeObjectURL(url);
          setPhase("idle");
        };
        element.onended = done;
        element.onerror = done;
        audio.current = element;
        setPhase("speaking");
        await element.play();
        return;
      } catch {
        if (controller.signal.aborted) return;
        audio.current = null;
      }
    }
    if (hasBrowserVoice() && speakWithBrowser(text, () => setPhase("idle"))) {
      setPhase("speaking");
      return;
    }
    setPhase("idle");
  };

  return (
    <Button
      size="compact"
      variant="ghost"
      onClick={() => {
        if (phase !== "idle") {
          stop();
          setPhase("idle");
        } else void play();
      }}
    >
      {phase === "preparing" ? (
        <Loader2Icon className="animate-spin" />
      ) : phase === "speaking" ? (
        <VolumeXIcon />
      ) : (
        <Volume2Icon />
      )}
      {phase === "preparing" ? "Preparing voice..." : phase === "speaking" ? "Stop" : "Speak"}
    </Button>
  );
}
