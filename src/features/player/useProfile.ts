"use client";

import { useCallback, useEffect, useState } from "react";
import type { VehicleId } from "@/types/game";
import { STORAGE_KEYS, loadJson, saveJson } from "@/utils/storage";

export interface PlayerProfile {
  displayName: string;
  track: string;
  avatar: string;
  /** set once the player has claimed a leaderboard account */
  playerId?: string;
  token?: string;
}

export interface PersonalBest {
  score: number;
  distance: number;
  remainingTime: number;
  vehicleId: VehicleId;
  achievedAt: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setProfile(loadJson<PlayerProfile | null>(STORAGE_KEYS.profile, null));
      setPersonalBest(loadJson<PersonalBest | null>(STORAGE_KEYS.personalBest, null));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback((p: PlayerProfile) => {
    setProfile(p);
    saveJson(STORAGE_KEYS.profile, p);
  }, []);

  const recordBest = useCallback((candidate: PersonalBest): boolean => {
    // read from storage (not state) so the answer is synchronous and correct
    const prev = loadJson<PersonalBest | null>(STORAGE_KEYS.personalBest, null);
    if (!prev || candidate.score > prev.score) {
      saveJson(STORAGE_KEYS.personalBest, candidate);
      setPersonalBest(candidate);
      return true;
    }
    return false;
  }, []);

  return { profile, saveProfile, personalBest, recordBest, loaded };
}
