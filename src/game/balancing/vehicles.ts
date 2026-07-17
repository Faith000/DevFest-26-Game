import type { VehicleId, VehicleSpec } from "@/types/game";

export const VEHICLES: Record<VehicleId, VehicleSpec> = {
  shuttle: {
    id: "shuttle",
    name: "DevFest Shuttle",
    description: "Reliable, prepared and suspiciously on schedule.",
    speedFactor: 1.0,
    laneChangeMs: 150,
    hitboxScale: 0.86,
    startingShield: true,
    nearMissBonus: 1.0,
    scoreMultiplier: 1.0,
    stats: { speed: 3, handling: 3, toughness: 5 },
  },
  danfo: {
    id: "danfo",
    name: "Lagos Danfo",
    description: "Fast, fearless and operating on an undocumented route.",
    speedFactor: 1.07,
    laneChangeMs: 195,
    hitboxScale: 0.9,
    startingShield: false,
    nearMissBonus: 1.5,
    scoreMultiplier: 1.08,
    stats: { speed: 5, handling: 2, toughness: 3 },
  },
  bike: {
    id: "bike",
    name: "Delivery Bike",
    description: "Built for shortcuts, speed and questionable weather decisions.",
    speedFactor: 1.02,
    laneChangeMs: 105,
    hitboxScale: 0.62,
    startingShield: false,
    nearMissBonus: 1.2,
    scoreMultiplier: 1.12,
    stats: { speed: 4, handling: 5, toughness: 2 },
  },
};

export const VEHICLE_IDS: VehicleId[] = ["shuttle", "danfo", "bike"];

export const isValidVehicle = (v: string): v is VehicleId =>
  v in VEHICLES;
