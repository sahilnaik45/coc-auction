import {
  BID_TIMER_SECONDS,
  canTeamBid,
  formatLakhs,
  getNextBidAmount,
} from "./auctionRules";
import type { Player, Team } from "./types";
import { SETS } from "./types";
import { shuffle } from "./utils";

export type Phase = "BIDDING" | "RESULT" | "ACCEL_PROMPT" | "DONE";

export interface SoldRecord {
  player: Player;
  teamId: string;
  price: number;
}

export interface AuctionResult {
  type: "SOLD" | "UNSOLD";
  player: Player;
  teamId?: string;
  price?: number;
}

export interface BidEvent {
  teamId: string;
  amount: number;
}

export interface LogEntry {
  id: number;
  kind: "bid" | "sold" | "unsold" | "info" | "pass";
  text: string;
  color?: string;
}

export interface AuctionState {
  teams: Team[];
  queue: Player[];
  current: Player | null;
  currentBid: number;
  highestBidder: string | null;
  bids: BidEvent[];
  passed: string[];
  timer: number;
  phase: Phase;
  result: AuctionResult | null;
  unsold: Player[];
  sold: SoldRecord[];
  round: "MAIN" | "ACCELERATED";
  log: LogEntry[];
  logSeq: number;
  paused: boolean;
  speed: number;
  totalPlayers: number;
  processed: number;
}

export type Action =
  | { type: "BID"; teamId: string }
  | { type: "PASS"; teamId: string }
  | { type: "TICK" }
  | { type: "HAMMER" }
  | { type: "NEXT" }
  | { type: "START_ACCEL" }
  | { type: "SKIP_ACCEL" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_SPEED"; speed: number };

/** Sets in order; players shuffled within a set. */
export function buildQueue(players: Player[]): Player[] {
  const out: Player[] = [];
  for (const s of SETS) {
    out.push(...shuffle(players.filter((p) => p.set === s)));
  }
  return out;
}

function addLog(state: AuctionState, kind: LogEntry["kind"], text: string, color?: string): Pick<AuctionState, "log" | "logSeq"> {
  const seq = state.logSeq + 1;
  return {
    logSeq: seq,
    log: [{ id: seq, kind, text, color }, ...state.log].slice(0, 60),
  };
}

function startPlayer(state: AuctionState, queue: Player[]): AuctionState {
  const [first, ...rest] = queue;
  return {
    ...state,
    queue: rest,
    current: first,
    currentBid: first.basePrice,
    highestBidder: null,
    bids: [],
    passed: [],
    timer: BID_TIMER_SECONDS,
    phase: "BIDDING",
    result: null,
  };
}

export function createInitialState(teams: Team[], pool: Player[]): AuctionState {
  const queue = buildQueue(pool);
  const base: AuctionState = {
    teams,
    queue: [],
    current: null,
    currentBid: 0,
    highestBidder: null,
    bids: [],
    passed: [],
    timer: BID_TIMER_SECONDS,
    phase: "DONE",
    result: null,
    unsold: [],
    sold: [],
    round: "MAIN",
    log: [],
    logSeq: 0,
    paused: false,
    speed: 1,
    totalPlayers: queue.length,
    processed: 0,
  };
  if (queue.length === 0) return base;
  const started = startPlayer(base, queue);
  return {
    ...started,
    ...addLog(started, "info", `Auction begins — ${queue.length} players in the pool`),
  };
}

function resolve(state: AuctionState): AuctionState {
  const p = state.current;
  if (!p || state.phase !== "BIDDING") return state;
  if (state.highestBidder) {
    const buyer = state.teams.find((t) => t.id === state.highestBidder)!;
    const price = state.currentBid;
    const teams = state.teams.map((t) =>
      t.id === buyer.id
        ? {
            ...t,
            purse: t.purse - price,
            squad: [...t.squad, { ...p, price, source: "AUCTION" as const }],
          }
        : t
    );
    const next: AuctionState = {
      ...state,
      teams,
      sold: [...state.sold, { player: p, teamId: buyer.id, price }],
      phase: "RESULT",
      result: { type: "SOLD", player: p, teamId: buyer.id, price },
      processed: state.processed + 1,
    };
    return {
      ...next,
      ...addLog(next, "sold", `SOLD! ${p.name} → ${buyer.name} for ${formatLakhs(price)}`, buyer.color),
    };
  }
  const next: AuctionState = {
    ...state,
    unsold: [...state.unsold, p],
    phase: "RESULT",
    result: { type: "UNSOLD", player: p },
    processed: state.processed + 1,
  };
  return { ...next, ...addLog(next, "unsold", `UNSOLD — ${p.name} receives no bids`) };
}

/** If nobody left can (or wants to) bid, close the lot immediately. */
function resolveIfAllOut(state: AuctionState): AuctionState {
  const p = state.current;
  if (!p || state.phase !== "BIDDING") return state;
  const hasBid = state.highestBidder !== null;
  const next = getNextBidAmount(state.currentBid, p.basePrice, hasBid);
  const anyoneLeft = state.teams.some(
    (t) =>
      t.id !== state.highestBidder &&
      !state.passed.includes(t.id) &&
      canTeamBid(t, p, next)
  );
  return anyoneLeft ? state : resolve(state);
}

export function auctionReducer(state: AuctionState, action: Action): AuctionState {
  switch (action.type) {
    case "BID": {
      const p = state.current;
      if (!p || state.phase !== "BIDDING" || state.paused) return state;
      const team = state.teams.find((t) => t.id === action.teamId);
      if (!team) return state;
      if (state.passed.includes(team.id) || state.highestBidder === team.id) return state;
      const hasBid = state.highestBidder !== null;
      const amount = getNextBidAmount(state.currentBid, p.basePrice, hasBid);
      if (!canTeamBid(team, p, amount)) return state;
      const next: AuctionState = {
        ...state,
        currentBid: amount,
        highestBidder: team.id,
        bids: [...state.bids, { teamId: team.id, amount }],
        timer: BID_TIMER_SECONDS,
      };
      return resolveIfAllOut({
        ...next,
        ...addLog(next, "bid", `${team.name} bids ${formatLakhs(amount)}`, team.color),
      });
    }
    case "PASS": {
      if (state.phase !== "BIDDING" || state.paused) return state;
      if (state.passed.includes(action.teamId) || state.highestBidder === action.teamId) return state;
      const team = state.teams.find((t) => t.id === action.teamId);
      const next: AuctionState = { ...state, passed: [...state.passed, action.teamId] };
      return resolveIfAllOut(
        team && team.isHuman ? { ...next, ...addLog(next, "pass", `${team.name} passes`, team.color) } : next
      );
    }
    case "TICK": {
      if (state.phase !== "BIDDING" || state.paused) return state;
      const timer = state.timer - 1;
      if (timer <= 0) return resolve({ ...state, timer: 0 });
      return { ...state, timer };
    }
    case "HAMMER":
      return resolve(state);
    case "NEXT": {
      if (state.phase !== "RESULT") return state;
      if (state.queue.length > 0) return startPlayer(state, state.queue);
      if (state.round === "MAIN" && state.unsold.length > 0) {
        return {
          ...state,
          current: null,
          phase: "ACCEL_PROMPT",
          ...addLog(state, "info", `Main sets complete — ${state.unsold.length} unsold players in the pool`),
        };
      }
      return { ...state, current: null, phase: "DONE", ...addLog(state, "info", "Auction complete!") };
    }
    case "START_ACCEL": {
      if (state.phase !== "ACCEL_PROMPT") return state;
      const queue = [...state.unsold].sort((a, b) => b.rating - a.rating);
      const base: AuctionState = {
        ...state,
        unsold: [],
        round: "ACCELERATED",
        totalPlayers: state.totalPlayers + queue.length,
      };
      const started = startPlayer(base, queue);
      return { ...started, ...addLog(started, "info", `⚡ Accelerated Round — ${queue.length} players return`) };
    }
    case "SKIP_ACCEL":
      if (state.phase !== "ACCEL_PROMPT") return state;
      return { ...state, phase: "DONE", ...addLog(state, "info", "Auction complete!") };
    case "TOGGLE_PAUSE":
      return { ...state, paused: !state.paused };
    case "SET_SPEED":
      return { ...state, speed: action.speed };
    default:
      return state;
  }
}
