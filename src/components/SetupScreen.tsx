import { useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { AI_AGGRESSION, FRANCHISES } from "../lib/teams";
import {
  MAX_OVERSEAS,
  MAX_SQUAD,
  MIN_PRICE,
  MIN_SQUAD,
  TOTAL_PURSE,
  formatCr,
  overseasCount,
} from "../lib/auctionRules";
import { generateFillerPlayers, generateSampleSquads } from "../lib/generator";
import type { SetupState } from "../lib/storage";
import type { AuctionMode, Player, SquadPlayer, Team } from "../lib/types";
import { Button, Card } from "./ui";
import { SquadEditor } from "./SquadEditor";

export function SetupScreen({
  setup,
  setSetup,
  players,
  setPlayers,
  onStart,
}: {
  setup: SetupState;
  setSetup: (s: SetupState) => void;
  players: Player[];
  setPlayers: (p: Player[]) => void;
  onStart: (teams: Team[], pool: Player[], mode: AuctionMode) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const { mode, humans, squads, retainCount } = setup;

  const assigned = useMemo(() => {
    const s = new Set<string>();
    Object.values(squads).forEach((sq) => sq.forEach((p) => s.add(p.id)));
    return s;
  }, [squads]);
  const pool = useMemo(() => players.filter((p) => !assigned.has(p.id)), [players, assigned]);

  const stats = FRANCHISES.map((f) => {
    const sq = squads[f.id] ?? [];
    const spent = sq.reduce((s, p) => s + p.price, 0);
    return { f, sq, spent, purse: TOTAL_PURSE - spent, os: overseasCount({ squad: sq }) };
  });

  const needed = stats.reduce((s, x) => s + Math.max(0, MIN_SQUAD - x.sq.length), 0);
  const issues: string[] = [];
  stats.forEach(({ f, sq, purse, os }) => {
    if (purse < 0) issues.push(`${f.name}: over the ₹150 Cr purse`);
    if (os > MAX_OVERSEAS) issues.push(`${f.name}: more than ${MAX_OVERSEAS} overseas`);
    if (mode === "MEGA" && sq.length > 5) issues.push(`${f.name}: more than 5 retentions`);
    if (sq.length >= MAX_SQUAD) issues.push(`${f.name}: squad already full`);
    if (purse >= 0 && purse < Math.max(0, MIN_SQUAD - sq.length) * MIN_PRICE)
      issues.push(`${f.name}: not enough purse to reach ${MIN_SQUAD} players`);
  });
  if (pool.length === 0) issues.push("The auction pool is empty — add players in the Player Manager");
  const poolShort = pool.length < needed;

  const loadSamples = (m: AuctionMode = mode, rc = retainCount) =>
    setSetup({ ...setup, mode: m, retainCount: rc, squads: generateSampleSquads(m, rc, players) });

  const start = () => {
    const teams: Team[] = FRANCHISES.map((f) => {
      const sq = squads[f.id] ?? [];
      return {
        ...f,
        isHuman: !!humans[f.id],
        squad: sq,
        purse: TOTAL_PURSE - sq.reduce((s, p) => s + p.price, 0),
        aggression: AI_AGGRESSION[f.id] ?? 1,
      };
    });
    onStart(teams, pool, mode);
  };

  const editingTeam = FRANCHISES.find((f) => f.id === editing);
  const humanCount = FRANCHISES.filter((f) => humans[f.id]).length;

  return (
    <div className="space-y-6">
      {/* Mode */}
      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">1 · Auction Mode</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              {
                m: "MINI" as const,
                title: "Mini Auction",
                icon: "🎯",
                desc: "Teams keep pre-existing core squads. Salaries are deducted from the ₹150 Cr purse — use what's left to fix weaknesses.",
              },
              {
                m: "MEGA" as const,
                title: "Mega Auction",
                icon: "🔥",
                desc: "Retain up to 5 players (deducted from ₹150 Cr), then build a brand new squad from scratch.",
              },
            ]
          ).map((o) => (
            <button
              key={o.m}
              onClick={() => o.m !== mode && loadSamples(o.m)}
              className={cn(
                "rounded-2xl border p-5 text-left transition",
                mode === o.m
                  ? "border-indigo-400 bg-indigo-500/10 shadow-[0_0_40px_-12px_#6366f1]"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-600"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{o.icon}</span>
                <span className="text-xl font-black text-white">{o.title}</span>
                {mode === o.m && (
                  <span className="ml-auto rounded-full bg-indigo-500 px-2.5 py-0.5 text-xs font-bold text-white">
                    Selected
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-400">{o.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Teams */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">
            2 · Franchises ({humanCount} human · {8 - humanCount} AI)
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="!px-3 !py-1.5 text-xs"
              onClick={() =>
                setSetup({ ...setup, humans: Object.fromEntries(FRANCHISES.map((f) => [f.id, true])) })
              }
            >
              All Human
            </Button>
            <Button
              variant="outline"
              className="!px-3 !py-1.5 text-xs"
              onClick={() =>
                setSetup({ ...setup, humans: Object.fromEntries(FRANCHISES.map((f) => [f.id, false])) })
              }
            >
              All AI
            </Button>
            {mode === "MEGA" && (
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Sample retentions
                <select
                  value={retainCount}
                  onChange={(e) => loadSamples("MEGA", Number(e.target.value))}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100"
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            )}
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => loadSamples()}>
              ↻ Load sample {mode === "MEGA" ? "retentions" : "squads"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ f, sq, purse, os }) => {
            const isHuman = !!humans[f.id];
            return (
              <div
                key={f.id}
                className="relative overflow-hidden rounded-2xl border bg-slate-900/70 p-4"
                style={{ borderColor: `${f.color}88` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1.5"
                  style={{ backgroundColor: f.color }}
                />
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow"
                    style={{ backgroundColor: f.color }}
                  >
                    {f.short}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-black text-white">{f.name}</div>
                    <div className="text-[11px] font-mono text-slate-500">{f.color}</div>
                  </div>
                </div>

                {/* Human / AI toggle */}
                <div className="mt-3 flex overflow-hidden rounded-lg border border-slate-700 text-xs font-bold">
                  <button
                    onClick={() => setSetup({ ...setup, humans: { ...humans, [f.id]: true } })}
                    className={cn("flex-1 px-2 py-1.5", isHuman ? "text-white" : "text-slate-500 hover:bg-slate-800")}
                    style={isHuman ? { backgroundColor: f.color } : undefined}
                  >
                    👤 Human
                  </button>
                  <button
                    onClick={() => setSetup({ ...setup, humans: { ...humans, [f.id]: false } })}
                    className={cn(
                      "flex-1 px-2 py-1.5",
                      !isHuman ? "bg-slate-700 text-white" : "text-slate-500 hover:bg-slate-800"
                    )}
                  >
                    🤖 AI (Computer)
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="rounded-lg bg-slate-950/60 py-1.5">
                    <div className="text-slate-500">Purse</div>
                    <div className={cn("font-black", purse < 0 ? "text-rose-400" : "text-emerald-400")}>
                      {formatCr(purse)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 py-1.5">
                    <div className="text-slate-500">{mode === "MEGA" ? "Retained" : "Squad"}</div>
                    <div className="font-black text-slate-200">{sq.length}</div>
                  </div>
                  <div className="rounded-lg bg-slate-950/60 py-1.5">
                    <div className="text-slate-500">Overseas</div>
                    <div className="font-black text-slate-200">{os}/{MAX_OVERSEAS}</div>
                  </div>
                </div>

                <Button variant="ghost" className="mt-3 w-full !py-1.5 text-xs" onClick={() => setEditing(f.id)}>
                  ✎ Edit {mode === "MEGA" ? "retentions" : "core squad"}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pool & start */}
      <section>
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">3 · Ready?</h2>
              <p className="mt-1 text-sm text-slate-300">
                <b className="text-white">{pool.length}</b> players in the auction pool · teams need{" "}
                <b className="text-white">{needed}</b> more to reach the minimum of {MIN_SQUAD}.
              </p>
              {poolShort && (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-300">
                  ⚠ Pool is smaller than total minimum-squad demand — some teams won't reach {MIN_SQUAD}.
                  <Button
                    variant="outline"
                    className="!px-2.5 !py-1 text-xs"
                    onClick={() =>
                      setPlayers([
                        ...players,
                        ...generateFillerPlayers(Math.max(10, needed - pool.length + 20), players),
                      ])
                    }
                  >
                    ✨ Generate filler players
                  </Button>
                </div>
              )}
              {issues.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-rose-400">
                  {issues.map((i) => (
                    <li key={i}>✖ {i}</li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              variant="success"
              className="!px-8 !py-3 text-base"
              disabled={issues.length > 0}
              onClick={start}
            >
              🏏 Start Auction
            </Button>
          </div>
        </Card>
      </section>

      {editingTeam && (
        <SquadEditor
          team={editingTeam}
          mode={mode}
          squad={squads[editingTeam.id] ?? []}
          pool={pool}
          onChange={(s: SquadPlayer[]) =>
            setSetup({ ...setup, squads: { ...squads, [editingTeam.id]: s } })
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
