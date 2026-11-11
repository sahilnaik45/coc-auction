import type { Player, Role, Team } from "./types";

/**
 * COC auction rules. ALL money values are in LAKHS.
 * ₹1 Cr = 100 Lakhs, ₹150 Cr = 15000 Lakhs.
 */
export const LAKHS_PER_CR = 100;
export const TOTAL_PURSE = 15000; // ₹150 Cr
export const MAX_SQUAD = 25;
export const MIN_SQUAD = 18;
export const MAX_OVERSEAS = 8;
export const MIN_PRICE = 20; // 20L floor
export const MAX_RETENTIONS = 5;
// Retention slab prices for Mega auction (Lakhs) — slot 1..5
export const RETENTION_SLABS = [1800, 1400, 1100, 1800, 1400];
export const BID_TIMER_SECONDS = 10;

/** Format Lakhs into a friendly ₹ string. */
export function formatLakhs(lakhs: number): string {
  if (lakhs >= LAKHS_PER_CR) {
    const cr = lakhs / LAKHS_PER_CR;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} Cr`;
  }
  return `₹${lakhs} L`;
}

/** Always-in-Crore format, e.g. purse display. */
export function formatCr(lakhs: number): string {
  return `₹${(lakhs / LAKHS_PER_CR).toFixed(2)} Cr`;
}

/** Bid increment slab (Lakhs) based on the current bid. */
export function getBidIncrement(currentBid: number): number {
  if (currentBid < 100) return 5; // below 1 Cr  -> +5L
  if (currentBid < 200) return 10; // 1-2 Cr      -> +10L
  if (currentBid < 500) return 20; // 2-5 Cr      -> +20L
  return 25; //                      5 Cr +      -> +25L
}

/**
 * Next legal bid. The opening bid is the base price; after that
 * the current bid is raised by the slab increment.
 */
export function getNextBidAmount(
  currentBid: number,
  basePrice: number,
  hasBid: boolean
): number {
  if (!hasBid) return Math.max(MIN_PRICE, basePrice);
  return currentBid + getBidIncrement(currentBid);
}

export function overseasCount(team: Pick<Team, "squad">): number {
  return team.squad.filter((p) => p.overseas).length;
}

export function roleCount(team: Pick<Team, "squad">, role: Role): number {
  return team.squad.filter((p) => p.role === role).length;
}

/**
 * Money that must stay in the purse so that the team can still fill the
 * minimum squad (18) at the 20L floor price, given a squad size.
 */
export function getReserveRequired(squadSizeAfterBuy: number): number {
  return Math.max(0, MIN_SQUAD - squadSizeAfterBuy) * MIN_PRICE;
}

/** Returns a human readable reason why the team can't bid, or null if it can. */
export function getBidBlockReason(
  team: Team,
  player: Player,
  nextBid: number
): string | null {
  if (team.squad.length >= MAX_SQUAD) return `Squad full (${MAX_SQUAD}/${MAX_SQUAD})`;
  if (player.overseas && overseasCount(team) >= MAX_OVERSEAS)
    return `Overseas limit reached (${MAX_OVERSEAS}/${MAX_OVERSEAS})`;
  if (nextBid > team.purse) return "Insufficient purse";
  const remaining = team.purse - nextBid;
  if (remaining < getReserveRequired(team.squad.length + 1))
    return "Must reserve purse to reach min squad of 18";
  return null;
}

/** Can this team legally bid `nextBid` on this player? */
export function canTeamBid(team: Team, player: Player, nextBid: number): boolean {
  return getBidBlockReason(team, player, nextBid) === null;
}

export function teamSpent(team: Team): number {
  return team.squad.reduce((s, p) => s + p.price, 0);
}

/** Convert an AI rating (1-100) to a fair auction value in Lakhs. */
export function ratingToValue(rating: number): number {
  if (rating >= 90) return 1800 + (rating - 90) * 150;
  if (rating >= 80) return 800 + (rating - 80) * 100;
  if (rating >= 70) return 300 + (rating - 70) * 50;
  if (rating >= 60) return 100 + (rating - 60) * 20;
  return Math.max(MIN_PRICE, (rating - 40) * 5);
}

/** Round a Lakh value to the nearest 5L. */
export function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}
