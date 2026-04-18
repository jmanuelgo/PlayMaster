import { useCallback, useRef } from "react";

export function useAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function getCtx(): AudioContext {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }

  function playBeep(ctx: AudioContext, freq: number, startAt: number, duration: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + startAt);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
    osc.start(ctx.currentTime + startAt);
    osc.stop(ctx.currentTime + startAt + duration + 0.05);
  }

  const playAlert = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();
      [0, 0.28, 0.56].forEach((t) => playBeep(ctx, 880, t, 0.22));
      playBeep(ctx, 660, 0.9, 0.5);
    } catch {
      // audio not available
    }
  }, []);

  const startLoop = useCallback((onTick?: () => void) => {
    playAlert();
    onTick?.();
    intervalRef.current = setInterval(() => {
      playAlert();
      onTick?.();
    }, 4000);
  }, [playAlert]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { playAlert, startLoop, stopLoop };
}
