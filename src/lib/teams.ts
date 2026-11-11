import type { Franchise } from "./types";

export const FRANCHISES: Franchise[] = [
  { id: "sahil", name: "Sahil Thunderbolts", short: "SAT", color: "#3b82f6" },
  { id: "abhishek", name: "Abhishek Strategist", short: "ABS", color: "#06b6d4" },
  { id: "atharva", name: "Atharva Rising Fury", short: "ARF", color: "#ef4444" },
  { id: "ganesh", name: "Ganesh Firestorm", short: "GFS", color: "#f97316" },
  { id: "mudra", name: "Mudra Mystiq Roses", short: "MMR", color: "#ec4899" },
  { id: "prathamesh", name: "Prathamesh Royals", short: "PRR", color: "#eab308" },
  { id: "pratik", name: "Pratik Spin Masters", short: "PSM", color: "#a855f7" },
  { id: "omkar", name: "Omkar Predators", short: "OMP", color: "#991b1b" },
];

/** Stable pseudo-personality per franchise for the AI. */
export const AI_AGGRESSION: Record<string, number> = {
  sahil: 1.1,
  abhishek: 0.95,
  atharva: 1.15,
  ganesh: 1.0,
  mudra: 0.9,
  prathamesh: 1.05,
  pratik: 0.95,
  omkar: 1.2,
};
