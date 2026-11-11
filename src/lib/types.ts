export const SETS = [
  "MARQUEE",
  "CAPPED_BAT",
  "CAPPED_AR",
  "CAPPED_FAST",
  "CAPPED_SPIN",
  "CAPPED_WK",
  "UNCAPPED_BAT",
  "UNCAPPED_AR",
  "UNCAPPED_FAST",
  "UNCAPPED_SPIN",
  "UNCAPPED_WK",
] as const;
export type SetCategory = (typeof SETS)[number];

export const ROLES = ["BAT", "AR", "FAST", "SPIN", "WK"] as const;
export type Role = (typeof ROLES)[number];

export interface Player {
  id: string;
  name: string;
  set: SetCategory;
  role: Role;
  overseas: boolean;
  basePrice: number; // Lakhs
  rating: number; // 1-100
}

export type AcquireSource = "CORE" | "RETAINED" | "AUCTION";

export interface SquadPlayer extends Player {
  price: number; // Lakhs
  source: AcquireSource;
}

export interface Franchise {
  id: string;
  name: string;
  short: string;
  color: string;
}

export interface Team extends Franchise {
  isHuman: boolean;
  purse: number; // Lakhs remaining
  squad: SquadPlayer[];
  aggression: number; // AI personality multiplier
}

export type AuctionMode = "MINI" | "MEGA";

export const SET_LABELS: Record<SetCategory, string> = {
  MARQUEE: "Marquee",
  CAPPED_BAT: "Capped Batters",
  CAPPED_AR: "Capped All-Rounders",
  CAPPED_FAST: "Capped Fast Bowlers",
  CAPPED_SPIN: "Capped Spinners",
  CAPPED_WK: "Capped Wicket-Keepers",
  UNCAPPED_BAT: "Uncapped Batters",
  UNCAPPED_AR: "Uncapped All-Rounders",
  UNCAPPED_FAST: "Uncapped Fast Bowlers",
  UNCAPPED_SPIN: "Uncapped Spinners",
  UNCAPPED_WK: "Uncapped Wicket-Keepers",
};

export const ROLE_LABELS: Record<Role, string> = {
  BAT: "Batter",
  AR: "All-Rounder",
  FAST: "Fast Bowler",
  SPIN: "Spinner",
  WK: "Wicket-Keeper",
};

export const ROLE_COLORS: Record<Role, string> = {
  BAT: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  AR: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  FAST: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  SPIN: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  WK: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};
