"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { GameHandle } from "./index";
import type { RunFinishedPayload, RunSceneConfig } from "./types";

export interface PhaserGameRef {
  restart: (cfg: RunSceneConfig) => void;
}

interface Props {
  config: RunSceneConfig;
  onFinished: (payload: RunFinishedPayload) => void;
  onQuit: () => void;
  onSettingChanged: (key: "music" | "sfx", value: boolean) => void;
}

/**
 * Mounts the Phaser game. Phaser is imported dynamically so the landing
 * page never pays for the game bundle, and the game canvas never re-renders
 * through React.
 */
export const PhaserGame = forwardRef<PhaserGameRef, Props>(function PhaserGame(
  { config, onFinished, onQuit, onSettingChanged },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const callbacksRef = useRef({ onFinished, onQuit, onSettingChanged });
  useEffect(() => {
    callbacksRef.current = { onFinished, onQuit, onSettingChanged };
  });
  const initialConfigRef = useRef(config);

  useImperativeHandle(ref, () => ({
    restart: (cfg: RunSceneConfig) => handleRef.current?.restart(cfg),
  }));

  useEffect(() => {
    let cancelled = false;
    const parent = containerRef.current;
    if (!parent) return;

    (async () => {
      // fonts must be ready before Phaser rasterises text
      if (typeof document !== "undefined" && "fonts" in document) {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 1500)),
          ]);
        } catch {
          /* keep going with fallback fonts */
        }
      }
      if (cancelled) return;
      const { createGame } = await import("./index");
      if (cancelled) return;
      handleRef.current = createGame({
        parent,
        config: initialConfigRef.current,
        onFinished: (p) => callbacksRef.current.onFinished(p),
        onQuit: () => callbacksRef.current.onQuit(),
        onSettingChanged: (k, v) => callbacksRef.current.onSettingChanged(k, v),
      });
    })();

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="game-canvas-host h-full w-full touch-none select-none [&_canvas]:!mx-auto"
      role="application"
      aria-label="Escape the Lagos Tech Traffic driving game. Use arrow keys or swipe to change lanes."
    />
  );
});
