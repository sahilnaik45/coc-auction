import {
  MAX_OVERSEAS,
  MIN_SQUAD,
  canTeamBid,
  getReserveRequired,
  overseasCount,
  ratingToValue,
  roleCount,
  roundTo5,
} from "./auctionRules";
import type { Player, Role, Team } from "./types";
import { hashStr } from "./utils";

/** Ideal composition of a 20-man core — used to compute role "need". */
export const IDEAL_ROLE_COUNT: Record<Role, number> = {
  BAT: 6,
  AR: 4,
  FAST: 5,
  SPIN: 3,
  WK: 2,
};

/** Positive = team needs more of this role, <=0 = already stocked. */
export function getRoleNeed(team: Team, role: Role): number {
  return IDEAL_ROLE_COUNT[role] - roleCount(team, role);
}

/** Deterministic +/- noise so each team values each player slightly differently. */
function valuationNoise(teamId: string, playerId: string): number {
  const h = hashStr(teamId + ":" + playerId) % 1000;
  return 0.92 + (h / 1000) * 0.18; // 0.92 – 1.10
}

/**
 * The maximum price (Lakhs) an AI team is willing to pay for a player,
 * based on rating, role need, squad state, overseas pressure and budget caps.
 */
export function getAIMaxBid(team: Team, player: Player): number {
  const fair = ratingToValue(player.rating);

  const need = getRoleNeed(team, player.role);
  let needMult = 0.6;
  if (need >= 2) needMult = 1.25;
  else if (need === 1) needMult = 1.1;
  else if (need === 0) needMult = 0.85;

  let mult = needMult;
  if (team.squad.length < MIN_SQUAD) mult *= 1.05;
  if (team.squad.length >= 22) mult *= 0.6;
  if (player.overseas && MAX_OVERSEAS - overseasCount(team) <= 2) mult *= 0.8;

  const value = fair * mult * team.aggression * valuationNoise(team.id, player.id);

  // Budget cap: never spend the reserve required to fill min squad,
  // and never blow too large a share of spendable purse on one player.
  const spendable = Math.max(0, team.purse - getReserveRequired(team.squad.length + 1));
  const share = player.rating >= 90 ? 0.5 : player.rating >= 80 ? 0.35 : 0.25;
  const cap = spendable * share;

  return roundTo5(Math.min(value, cap));
}

/**
 * Should this AI team place the counter-bid `nextBid` right now?
 * Combines legality (canTeamBid), valuation (getAIMaxBid) and a
 * probability that makes bidding wars feel organic.
 */
export function shouldAIBid(
  team: Team,
  player: Player,
  nextBid: number,
  highestBidderId: string | null
): boolean {
  if (team.isHuman) return false;
  if (highestBidderId === team.id) return false;
  if (!canTeamBid(team, player, nextBid)) return false;
  const max = getAIMaxBid(team, player);
  if (nextBid > max) return false;
  const ratio = nextBid / max;
  const chance = ratio < 0.6 ? 0.9 : ratio < 0.85 ? 0.65 : 0.4;
  return Math.random() < chance;
}
