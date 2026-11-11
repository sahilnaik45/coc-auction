import { MIN_PRICE } from "./auctionRules";
import { buildSamplePlayers } from "./samplePlayers";
import type { AuctionMode, Player, Role, SquadPlayer } from "./types";
import { ROLES, SETS } from "./types";
import { uid } from "./utils";

const PLAYERS_KEY = "coc_players_v1";
const SETUP_KEY = "coc_setup_v1";

export function setRoleFromSet(set: string): Role | null {
  if (set === "MARQUEE") return null;
  const r = set.split("_")[1];
  return (ROLES as readonly string[]).includes(r) ? (r as Role) : null;
}

/** Validate/normalise a raw object into a Player, or return an error string. */
export function validatePlayer(raw: unknown, keepId = true): Player | string {
  if (!raw || typeof raw !== "object") return "Not an object";
  const r = raw as Record<string, unknown>;
  const name = String(r.name ?? "").trim();
  if (!name) return "Name is required";
  const set = String(r.set ?? "");
  if (!(SETS as readonly string[]).includes(set)) return `${name}: invalid set "${set}"`;
  const role = String(r.role ?? "");
  if (!(ROLES as readonly string[]).includes(role)) return `${name}: invalid role "${role}"`;
  const forced = setRoleFromSet(set);
  if (forced && forced !== role) return `${name}: role ${role} doesn't match set ${set}`;
  const basePrice = Number(r.basePrice);
  if (!Number.isFinite(basePrice) || basePrice < MIN_PRICE)
    return `${name}: base price must be at least ${MIN_PRICE}L`;
  const rating = Number(r.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 100)
    return `${name}: rating must be 1-100`;
  const overseas = r.overseas === true || r.overseas === "true";
  const id = keepId && typeof r.id === "string" && r.id ? r.id : uid("p");
  return {
    id,
    name,
    set: set as Player["set"],
    role: role as Role,
    overseas,
    basePrice: Math.round(basePrice),
    rating: Math.round(rating),
  };
}

export function parsePlayersJSON(text: string): { players: Player[]; errors: string[] } {
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { players: [], errors: ["Invalid JSON"] };
  }
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { players?: unknown }).players)
      ? (data as { players: unknown[] }).players
      : null;
  if (!arr) return { players: [], errors: ["Expected an array of players or { players: [] }"] };
  const players: Player[] = [];
  const ids = new Set<string>();
  arr.forEach((item, i) => {
    const res = validatePlayer(item);
    if (typeof res === "string") errors.push(`#${i + 1}: ${res}`);
    else {
      if (ids.has(res.id)) res.id = uid("p");
      ids.add(res.id);
      players.push(res);
    }
  });
  return { players, errors };
}

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(PLAYERS_KEY);
    if (raw) {
      const { players } = parsePlayersJSON(raw);
      if (players.length > 0) return players;
    }
  } catch {
    /* ignore */
  }
  return buildSamplePlayers();
}

export function savePlayers(players: Player[]) {
  try {
    localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  } catch {
    /* ignore */
  }
}

export interface SetupState {
  mode: AuctionMode;
  humans: Record<string, boolean>;
  squads: Record<string, SquadPlayer[]>;
  retainCount: number;
}

export function loadSetup(): SetupState | null {
  try {
    const raw = localStorage.getItem(SETUP_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SetupState;
    if (!s || !s.mode || !s.humans || !s.squads) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSetup(s: SetupState) {
  try {
    localStorage.setItem(SETUP_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
