"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { VehicleId } from "@/types/game";
import type { RunStats } from "@/types/game";
import type { RunFinishedPayload, RunSceneConfig } from "@/game/types";
import { PhaserGame, type PhaserGameRef } from "@/game/PhaserGame";
import { gameAudio } from "@/game/systems/audio";
import { useProfile, type PlayerProfile } from "@/features/player/useProfile";
import { useSettings } from "@/features/settings/useSettings";
import { PlayerSetup } from "./PlayerSetup";
import { VehicleSelect } from "./VehicleSelect";
import { ResultsScreen, type SubmissionState } from "@/features/results/ResultsScreen";
import { ApiError, registerPlayer, submitScore } from "@/services/api";
import { site } from "@/config/site";
import { track } from "@/services/analytics";
import { STORAGE_KEYS, loadJson, removeKey, saveJson } from "@/utils/storage";

type Stage = "loading" | "setup" | "vehicle" | "game" | "results";

interface PendingRun {
  run: RunStats;
  savedAt: number;
}

export function PlayFlow() {
  const router = useRouter();
  const { profile, saveProfile, personalBest, recordBest, loaded } = useProfile();
  const { settings, update: updateSettings, loaded: settingsLoaded } = useSettings();

  const [stage, setStage] = useState<Stage>("loading");
  const [vehicle, setVehicle] = useState<VehicleId>("shuttle");
  const [payload, setPayload] = useState<RunFinishedPayload | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [shareCopied, setShareCopied] = useState(false);

  const gameRef = useRef<PhaserGameRef>(null);
  const profileRef = useRef<PlayerProfile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!loaded || !settingsLoaded || stage !== "loading") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setVehicle(loadJson<VehicleId>(STORAGE_KEYS.vehicle, "shuttle"));
      // the driver name step always comes first — it's the leaderboard name
      setStage("setup");
      track("game_started");
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, settingsLoaded, stage, profile]);

  // shut the audio engine down when leaving the play flow entirely
  useEffect(() => {
    return () => {
      gameAudio.stopMusic();
      gameAudio.stopEngine();
      gameAudio.setRain(false);
    };
  }, []);

  const gameConfig = useCallback(
    (v: VehicleId): RunSceneConfig => ({
      vehicleId: v,
      settings: {
        music: settings.music,
        sfx: settings.sfx,
        reducedMotion: settings.reducedMotion,
        highContrast: settings.highContrast,
        largeUi: settings.largeUi,
      },
      showTutorial: !loadJson(STORAGE_KEYS.tutorialDone, false),
    }),
    [settings],
  );

  /* ------------------------------ submission --------------------------- */

  /**
   * Submitting needs no sign-in: the first submission silently registers a
   * device identity (name + avatar from the driver form) and reuses it from
   * then on. `retried` guards the one automatic recovery after a stale token.
   */
  const doSubmit = useCallback(async (run: RunStats) => {
    const attempt = async (retried: boolean): Promise<void> => {
    let p = profileRef.current;
    if (!p) return;
    setSubmission({ status: "submitting" });
    if (!retried) track("score_submission_started", { vehicle: run.vehicleId });
    try {
      if (!p.playerId || !p.token) {
        const reg = await registerPlayer({ displayName: p.displayName, avatar: p.avatar });
        p = { ...p, playerId: reg.playerId, token: reg.token };
        profileRef.current = p;
        saveProfile(p);
      }
      const result = await submitScore(
        run,
        { playerId: p.playerId!, token: p.token! },
        { displayName: p.displayName, avatar: p.avatar },
      );
      removeKey(STORAGE_KEYS.pendingRun);
      setSubmission({ status: "done", result });
      track("score_submitted", {
        score: result.score,
        rank: result.weeklyRank,
        status: result.status,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && !retried) {
        // stale token (e.g. server reset): drop it and re-register once
        const cleared = { ...p, playerId: undefined, token: undefined };
        profileRef.current = cleared;
        saveProfile(cleared);
        return attempt(true);
      }
      if (err instanceof ApiError && err.code === "network") {
        saveJson<PendingRun>(STORAGE_KEYS.pendingRun, { run, savedAt: Date.now() });
        setSubmission({
          status: "pending",
          message:
            "The leaderboard is stuck in traffic. Your score is safe, and we will try again.",
        });
      } else {
        const msg =
          err instanceof ApiError && err.status === 422
            ? "That run didn't pass validation, so it can't go public."
            : "Submission failed. Your score is still saved on this device.";
        if (err instanceof ApiError && err.status === 422) {
          removeKey(STORAGE_KEYS.pendingRun);
        } else {
          saveJson<PendingRun>(STORAGE_KEYS.pendingRun, { run, savedAt: Date.now() });
        }
        setSubmission({ status: "error", message: msg });
      }
    }
    };
    return attempt(false);
  }, [saveProfile]);

  // retry a stranded submission when connectivity returns
  useEffect(() => {
    const retry = () => {
      const pending = loadJson<PendingRun | null>(STORAGE_KEYS.pendingRun, null);
      if (pending && profileRef.current) void doSubmit(pending.run);
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [doSubmit]);

  /* ------------------------------ handlers ----------------------------- */

  const handleSetupDone = (p: PlayerProfile) => {
    // nothing to sync now — the next submission carries the new name/avatar
    saveProfile(p);
    profileRef.current = p;
    setStage("vehicle");
  };

  const handleStart = (v: VehicleId) => {
    setVehicle(v);
    saveJson(STORAGE_KEYS.vehicle, v);
    track("vehicle_selected", { vehicle: v });
    // user gesture: safe to unlock audio
    gameAudio.unlock();
    gameAudio.setMusicOn(settings.music);
    gameAudio.setSfxOn(settings.sfx);
    gameAudio.startMusic();
    setPayload(null);
    setSubmission({ status: "idle" });
    setStage("game");
    track("run_started", { vehicle: v });
  };

  const handleFinished = useCallback(
    (p: RunFinishedPayload) => {
      saveJson(STORAGE_KEYS.tutorialDone, true);
      const best = recordBest({
        score: p.breakdown.total,
        distance: p.stats.distance,
        remainingTime: p.stats.remainingTime,
        vehicleId: p.stats.vehicleId,
        achievedAt: new Date().toISOString(),
      });
      setIsNewBest(best);
      setPayload(p);
      setSubmission({ status: "idle" });
      setStage("results");
      track(p.stats.result === "arrived" ? "run_completed" : "run_failed", {
        vehicle: p.stats.vehicleId,
        score: p.breakdown.total,
        distance: p.stats.distance,
        duration: Math.round((p.stats.endedAt - p.stats.startedAt) / 1000),
        result: p.stats.result,
      });
      if (best) {
        gameAudio.play("personalBest");
        track("personal_best_achieved", { score: p.breakdown.total });
      }
      // every run is recorded automatically — no sign-in, no button. The
      // first submission silently registers a device identity from the
      // driver name; the leaderboard keeps only each player's best.
      if (profileRef.current) void doSubmit(p.stats);
    },
    [recordBest, doSubmit],
  );

  const handlePlayAgain = () => {
    track("play_again_clicked", { vehicle });
    setPayload(null);
    setSubmission({ status: "idle" });
    setStage("game");
    gameRef.current?.restart(gameConfig(vehicle));
  };

  const handleQuit = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleShare = async () => {
    if (!payload) return;
    const text = `I scored ${payload.breakdown.total.toLocaleString()} escaping Lagos tech traffic on my way to ${site.eventName}. Can you beat me?`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    track("result_shared", { score: payload.breakdown.total });
    try {
      if (navigator.share) {
        await navigator.share({ title: site.gameName, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const handleSettingChanged = useCallback(
    (key: "music" | "sfx", value: boolean) => {
      updateSettings({ [key]: value });
    },
    [updateSettings],
  );

  /* -------------------------------- render ----------------------------- */

  if (stage === "loading") {
    return (
      <main className="dot-grid flex min-h-dvh items-center justify-center">
        <p className="df-chip bg-pastel-yellow">WARMING UP THE ENGINE…</p>
      </main>
    );
  }

  if (stage === "setup") {
    return (
      <main className="dot-grid flex min-h-dvh items-center justify-center">
        <PlayerSetup initial={profile} onBack={() => router.push("/")} onDone={handleSetupDone} />
      </main>
    );
  }

  if (stage === "vehicle") {
    return (
      <main className="dot-grid min-h-dvh">
        <VehicleSelect initial={vehicle} onStart={handleStart} onBack={() => setStage("setup")} />
      </main>
    );
  }

  // game + results share a mount so replays never reload the game
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-paper-deep">
      <PhaserGame
        ref={gameRef}
        config={gameConfig(vehicle)}
        onFinished={handleFinished}
        onQuit={handleQuit}
        onSettingChanged={handleSettingChanged}
      />
      {stage === "results" && payload && (
        <ResultsScreen
          payload={payload}
          isNewBest={isNewBest}
          bestScore={personalBest?.score ?? 0}
          submission={submission}
          onSubmit={() => payload && doSubmit(payload.stats)}
          onPlayAgain={handlePlayAgain}
          onChangeVehicle={() => setStage("vehicle")}
          onShare={handleShare}
          shareCopied={shareCopied}
        />
      )}
    </main>
  );
}
