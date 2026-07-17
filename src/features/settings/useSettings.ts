"use client";

import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS, loadJson, saveJson } from "@/utils/storage";

export interface AppSettings {
  music: boolean;
  sfx: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largeUi: boolean;
}

const DEFAULTS: AppSettings = {
  music: true,
  sfx: true,
  reducedMotion: false,
  highContrast: false,
  largeUi: false,
};

function systemDefaults(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  return {
    ...DEFAULTS,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

/** Applies preference classes to <html> so CSS can respond too. */
function applyToDocument(s: AppSettings): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.classList.toggle("pref-reduced-motion", s.reducedMotion);
  el.classList.toggle("pref-high-contrast", s.highContrast);
  el.classList.toggle("pref-large-ui", s.largeUi);
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // async so hydration never causes a cascading render
    queueMicrotask(() => {
      if (cancelled) return;
      const stored = loadJson<AppSettings | null>(STORAGE_KEYS.settings, null);
      const initial = stored ? { ...systemDefaults(), ...stored } : systemDefaults();
      setSettings(initial);
      applyToDocument(initial);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveJson(STORAGE_KEYS.settings, next);
      applyToDocument(next);
      return next;
    });
  }, []);

  return { settings, update, loaded };
}
