import {
  MIN_PRICE,
  RETENTION_SLABS,
  ratingToValue,
  roundTo5,
} from "./auctionRules";
import { FRANCHISES } from "./teams";
import type { AuctionMode, Player, Role, SetCategory, SquadPlayer } from "./types";
import { SETS } from "./types";
import { mulberry32, uid } from "./utils";

const IN_FIRST = ["Aarav", "Vihaan", "Arjun", "Rohan", "Kabir", "Ishaan", "Dev", "Karan", "Nikhil", "Rahul", "Siddharth", "Tanmay", "Yash", "Aditya", "Varun", "Pranav", "Harsh", "Mihir", "Kunal", "Sagar", "Omkar", "Ketan", "Rutvik", "Chetan", "Vedant", "Amit", "Sumit", "Tejas", "Ajinkya", "Shardul"];
const IN_LAST = ["Patil", "Deshmukh", "Jadhav", "Kulkarni", "Pawar", "Shinde", "More", "Joshi", "Bhosale", "Gaikwad", "Kale", "Sawant", "Naik", "Thakur", "Chavan", "Rane", "Mehta", "Verma", "Yadav", "Reddy", "Nair", "Iyer", "Singh", "Gupta", "Sharma", "Kamat", "Bhat", "Pillai", "Dange", "Phadke"];
const OS_FIRST = ["Liam", "Noah", "Jack", "Ryan", "Cameron", "Tom", "Ben", "Matt", "Kyle", "Dan", "Adil", "Naveen", "Wanindu", "Tabraiz", "Rassie", "Jofra"];
const OS_LAST = ["Walker", "Henderson", "Carter", "Mitchell", "Bailey", "Harris", "Foster", "Coleman", "Hughes", "Duffy", "Rahimi", "Perera", "Khan", "Nel", "Archer", "Bowes"];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function makeName(rng: () => number, overseas: boolean, used: Set<string>): string {
  for (let i = 0; i < 60; i++) {
    const n = overseas
      ? `${pick(OS_FIRST, rng)} ${pick(OS_LAST, rng)}`
      : `${pick(IN_FIRST, rng)} ${pick(IN_LAST, rng)}`;
    if (!used.has(n.toLowerCase())) {
      used.add(n.toLowerCase());
      return n;
    }
  }
  const fallback = `Player ${Math.floor(rng() * 9000 + 1000)}`;
  used.add(fallback.toLowerCase());
  return fallback;
}

function roleOfSet(set: SetCategory, rng: () => number): Role {
  if (set === "MARQUEE") return pick<Role>(["BAT", "AR", "FAST", "SPIN", "WK"], rng);
  return set.split("_")[1] as Role;
}

/** Generate filler auction-pool players across the 10 non-marquee sets. */
export function generateFillerPlayers(count: number, existing: Player[]): Player[] {
  const rng = mulberry32(Date.now() % 100000);
  const used = new Set(existing.map((p) => p.name.toLowerCase()));
  const sets = SETS.filter((s) => s !== "MARQUEE");
  const out: Player[] = [];
  for (let i = 0; i < count; i++) {
    const set = sets[i % sets.length];
    const capped = set.startsWith("CAPPED");
    const overseas = rng() < (capped ? 0.22 : 0.05);
    const rating = Math.round((capped ? 58 : 45) + rng() * (capped ? 22 : 24));
    out.push({
      id: uid("g"),
      name: makeName(rng, overseas, used),
      set,
      role: roleOfSet(set, rng),
      overseas,
      basePrice: capped ? (rng() < 0.5 ? 50 : 75) : rng() < 0.6 ? 20 : 30,
      rating,
    });
  }
  return out;
}

const CORE_ROLES: Role[] = ["BAT", "BAT", "BAT", "BAT", "WK", "AR", "AR", "AR", "FAST", "FAST", "FAST", "FAST", "SPIN", "SPIN"];

/** Mini auction: 14-man core squads whose salaries are deducted from the purse. */
function sampleMiniSquad(teamIndex: number, used: Set<string>): SquadPlayer[] {
  const rng = mulberry32(777 + teamIndex * 131);
  // 3 overseas picks among the core roles
  const osIdx = new Set([1, 6, 10]);
  return CORE_ROLES.map((role, i) => {
    const overseas = osIdx.has(i);
    const rating = Math.round(60 + rng() * 30);
    const price = Math.min(1500, Math.max(MIN_PRICE, roundTo5(ratingToValue(rating) * 0.9)));
    return {
      id: uid("core"),
      name: makeName(rng, overseas, used),
      set: role === "BAT" ? "CAPPED_BAT" : role === "AR" ? "CAPPED_AR" : role === "FAST" ? "CAPPED_FAST" : role === "SPIN" ? "CAPPED_SPIN" : "CAPPED_WK",
      role,
      overseas,
      basePrice: Math.max(MIN_PRICE, roundTo5(price / 4)),
      rating,
      price,
      source: "CORE" as const,
    };
  });
}

const RETAIN_ROLES: Role[] = ["BAT", "FAST", "AR", "SPIN", "WK"];

/** Mega auction: up to 5 retained stars at IPL-style slab prices. */
function sampleMegaRetentions(teamIndex: number, count: number, used: Set<string>): SquadPlayer[] {
  const rng = mulberry32(4242 + teamIndex * 97);
  const out: SquadPlayer[] = [];
  for (let i = 0; i < Math.min(5, count); i++) {
    const role = RETAIN_ROLES[(i + teamIndex) % 5];
    const overseas = i === 3;
    out.push({
      id: uid("ret"),
      name: makeName(rng, overseas, used),
      set: role === "BAT" ? "CAPPED_BAT" : role === "AR" ? "CAPPED_AR" : role === "FAST" ? "CAPPED_FAST" : role === "SPIN" ? "CAPPED_SPIN" : "CAPPED_WK",
      role,
      overseas,
      basePrice: 200,
      rating: Math.round(84 + rng() * 10),
      price: RETENTION_SLABS[i],
      source: "RETAINED",
    });
  }
  return out;
}

export function generateSampleSquads(
  mode: AuctionMode,
  retainCount: number,
  pool: Player[]
): Record<string, SquadPlayer[]> {
  const used = new Set(pool.map((p) => p.name.toLowerCase()));
  const res: Record<string, SquadPlayer[]> = {};
  FRANCHISES.forEach((f, i) => {
    res[f.id] = mode === "MINI" ? sampleMiniSquad(i, used) : sampleMegaRetentions(i, retainCount, used);
  });
  return res;
}
