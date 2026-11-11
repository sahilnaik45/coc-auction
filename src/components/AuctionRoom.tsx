import { useEffect, useReducer, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { getAIMaxBid, shouldAIBid } from "../lib/aiLogic";
import {
  BID_TIMER_SECONDS,
  canTeamBid,
  formatLakhs,
  getBidBlockReason,
  getNextBidAmount,
} from "../lib/auctionRules";
import { auctionReducer, createInitialState, type AuctionState } from "../lib/auctionEngine";
import type { Player, Team } from "../lib/types";
import { SET_LABELS, SETS } from "../lib/types";
import { shuffle } from "../lib/utils";
import { TeamsPanel } from "./TeamsPanel";
import { AuctionSummary } from "./AuctionSummary";
import { Button, Card, OverseasBadge, RatingBadge, RoleBadge } from "./ui";

export function AuctionRoom({
  initialTeams,
  pool,
  modeLabel,
  onExit,
}: {
  initialTeams: Team[];
  pool: Player[];
  modeLabel: string;
  onExit: () => void;
}) {
  const [state, dispatch] = useReducer(auctionReducer, undefined, () =>
    createInitialState(initialTeams, pool)
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const [aiTick, setAiTick] = useState(0);

  const { phase, paused, speed, current } = state;

  // ---- Countdown timer: one tick per second (scaled by speed) ----
  useEffect(() => {
    if (phase !== "BIDDING" || paused) return;
    const id = setTimeout(() => dispatch({ type: "TICK" }), 1000 / speed);
    return () => clearTimeout(id);
  }, [phase, paused, speed, state.timer, state.bids.length, current?.id]);

  // ---- AI bidding loop: every 1.5–2.5s ----
  useEffect(() => {
    if (phase !== "BIDDING" || paused) return;
    const delay = (1500 + Math.random() * 1000) / speed;
    const id = setTimeout(() => {
      const s = stateRef.current;
      const p = s.current;
      if (!p || s.phase !== "BIDDING" || s.paused) return;
      const next = getNextBidAmount(s.currentBid, p.basePrice, s.highestBidder !== null);
      const ais = shuffle(
        s.teams.filter((t) => !t.isHuman && !s.passed.includes(t.id) && t.id !== s.highestBidder)
      );
      let bidder: string | null = null;
      const drops: string[] = [];
      for (const t of ais) {
        if (!canTeamBid(t, p, next) || next > getAIMaxBid(t, p)) {
          drops.push(t.id);
          continue;
        }
        if (!bidder && shouldAIBid(t, p, next, s.highestBidder)) bidder = t.id;
      }
      if (bidder) dispatch({ type: "BID", teamId: bidder });
      drops.forEach((d) => dispatch({ type: "PASS", teamId: d }));
      setAiTick((n) => n + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [phase, paused, speed, state.bids.length, state.passed.length, current?.id, aiTick]);

  // ---- Auto-advance after SOLD / UNSOLD stamp ----
  useEffect(() => {
    if (phase !== "RESULT" || paused) return;
    const id = setTimeout(() => dispatch({ type: "NEXT" }), 2200 / speed);
    return () => clearTimeout(id);
  }, [phase, paused, speed, state.processed]);

  const teamById = (id: string | null) => state.teams.find((t) => t.id === id) ?? null;
  const leader = teamById(state.highestBidder);
  const humans = state.teams.filter((t) => t.isHuman);

  if (phase === "DONE") {
    return <AuctionSummary state={state} modeLabel={modeLabel} onExit={onExit} />;
  }

  const hasBid = state.highestBidder !== null;
  const nextBid = current ? getNextBidAmount(state.currentBid, current.basePrice, hasBid) : 0;
  const accent = leader?.color ?? "#6366f1";
  const timerPct = (state.timer / BID_TIMER_SECONDS) * 100;
  const urgent = state.timer <= 3 && phase === "BIDDING";
  const setIdx = current ? SETS.indexOf(current.set) : -1;
  const remainingInSet = current ? state.queue.filter((p) => p.set === current.set).length : 0;
  const upcoming = state.queue.slice(0, 5);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* LEFT: stage */}
      <div className="space-y-5">
        {/* Progress / controls bar */}
        <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-indigo-300">{modeLabel}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-1",
                state.round === "ACCELERATED"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-slate-800 text-slate-300"
              )}
            >
              {state.round === "ACCELERATED" ? "⚡ Accelerated Round" : "Main Round"}
            </span>
            <span className="text-slate-400">
              Lot {Math.min(state.processed + (phase === "BIDDING" ? 1 : 0), state.totalPlayers)} / {state.totalPlayers}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-700">
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: "SET_SPEED", speed: s })}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold",
                    speed === s ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-slate-800"
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => dispatch({ type: "TOGGLE_PAUSE" })}>
              {paused ? "▶ Resume" : "⏸ Pause"}
            </Button>
            <Button
              variant="outline"
              className="!px-3 !py-1.5 text-xs"
              onClick={() => {
                if (confirm("Exit the auction? Progress will be lost.")) onExit();
              }}
            >
              Exit
            </Button>
          </div>
        </Card>

        {/* Set progress strip */}
        <div className="flex gap-1">
          {SETS.map((s, i) => (
            <div
              key={s}
              title={SET_LABELS[s]}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                setIdx === -1
                  ? "bg-slate-700"
                  : i < setIdx
                    ? "bg-indigo-500"
                    : i === setIdx
                      ? "animate-pulse bg-amber-400"
                      : "bg-slate-800"
              )}
            />
          ))}
        </div>

        {/* CENTER STAGE */}
        {phase === "ACCEL_PROMPT" ? (
          <Card className="relative overflow-hidden p-8 text-center">
            <div className="text-5xl">⚡</div>
            <h2 className="mt-3 text-3xl font-black text-white">Accelerated Round</h2>
            <p className="mx-auto mt-2 max-w-md text-slate-400">
              All main sets are done. <b className="text-amber-300">{state.unsold.length}</b> unsold
              player{state.unsold.length === 1 ? "" : "s"} can re-enter the pool for one more shot,
              ordered by rating.
            </p>
            <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-1.5">
              {state.unsold.map((p) => (
                <span key={p.id} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                  {p.name} · {formatLakhs(p.basePrice)}
                </span>
              ))}
            </div>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="success" onClick={() => dispatch({ type: "START_ACCEL" })}>
                ⚡ Start Accelerated Round
              </Button>
              <Button variant="outline" onClick={() => dispatch({ type: "SKIP_ACCEL" })}>
                Skip &amp; Finish
              </Button>
            </div>
          </Card>
        ) : (
          current && (
            <div
              className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl transition-colors sm:p-7"
              style={{ borderColor: `${accent}88`, boxShadow: `0 0 60px -20px ${accent}` }}
            >
              <div
                className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl transition-colors"
                style={{ backgroundColor: accent }}
              />

              {/* top row */}
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-amber-400/15 px-2 py-1 text-[11px] font-black tracking-widest text-amber-300">
                      SET · {current.set.replace("_", " ")}
                    </span>
                    <RoleBadge role={current.role} className="!px-2 !py-1 !text-[11px]" />
                    {current.overseas && <OverseasBadge className="!px-2 !py-1 !text-[11px]" />}
                    <span className="text-[11px] text-slate-500">{remainingInSet} more in set</span>
                  </div>
                  <h2 className="mt-3 break-words text-4xl font-black tracking-tight text-white sm:text-5xl">
                    {current.name}
                  </h2>
                  <div className="mt-1 text-sm text-slate-400">{SET_LABELS[current.set]}</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <RatingBadge rating={current.rating} size="lg" />
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      AI Rating
                    </div>
                  </div>
                  {/* timer */}
                  <div className="text-center">
                    <div
                      className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-full border-4 text-3xl font-black tabular-nums transition-colors",
                        urgent
                          ? "animate-pulse border-rose-500 text-rose-400"
                          : "border-slate-700 text-white"
                      )}
                      style={!urgent ? { borderColor: accent } : undefined}
                    >
                      {state.timer}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {paused ? "Paused" : "Seconds"}
                    </div>
                  </div>
                </div>
              </div>

              {/* timer bar */}
              <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-linear", urgent && "bg-rose-500")}
                  style={{ width: `${timerPct}%`, backgroundColor: urgent ? undefined : accent }}
                />
              </div>

              {/* price row */}
              <div className="relative mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Base Price</div>
                  <div className="mt-1 text-2xl font-black text-slate-200">{formatLakhs(current.basePrice)}</div>
                </div>
                <div
                  className="rounded-2xl border bg-slate-950/60 p-4 sm:col-span-1"
                  style={{ borderColor: `${accent}66` }}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {hasBid ? "Current Bid" : "Opening Bid"}
                  </div>
                  <div
                    key={state.currentBid}
                    className="mt-1 animate-[pop_0.35s_ease-out] text-4xl font-black tabular-nums"
                    style={{ color: hasBid ? accent : "#e2e8f0" }}
                  >
                    {formatLakhs(state.currentBid)}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Highest Bidder
                  </div>
                  {leader ? (
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: leader.color }}
                      />
                      <span className="text-lg font-black leading-tight text-white">{leader.name}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-lg font-bold text-slate-600">— No bids yet —</div>
                  )}
                </div>
              </div>

              {/* admin hammer */}
              <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>Next legal bid: <b className="text-slate-300">{formatLakhs(nextBid)}</b></span>
                <div className="flex gap-2">
                  {!hasBid ? (
                    <Button
                      variant="outline"
                      className="!px-3 !py-1 text-xs"
                      disabled={phase !== "BIDDING"}
                      onClick={() => dispatch({ type: "HAMMER" })}
                      title="No bids? Move this player to the unsold pool"
                    >
                      Mark Unsold
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="!px-3 !py-1 text-xs"
                      disabled={phase !== "BIDDING"}
                      onClick={() => dispatch({ type: "HAMMER" })}
                    >
                      🔨 Hammer Down
                    </Button>
                  )}
                </div>
              </div>

              {/* result overlay */}
              {phase === "RESULT" && state.result && (
                <ResultOverlay state={state} />
              )}
              {paused && phase === "BIDDING" && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                  <div className="text-3xl font-black tracking-widest text-slate-300">⏸ PAUSED</div>
                </div>
              )}
            </div>
          )
        )}

        {/* HUMAN CONTROLS */}
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300">Human Controls</h3>
            {humans.length === 0 && (
              <span className="text-xs text-slate-500">All teams are AI — sit back and watch 🍿</span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {humans.map((t) => {
              const live = state.teams.find((x) => x.id === t.id)!;
              const reason =
                current && phase === "BIDDING" ? getBidBlockReason(live, current, nextBid) : "Waiting…";
              const isLeader = state.highestBidder === t.id;
              const hasPassed = state.passed.includes(t.id);
              const canBid = !!current && phase === "BIDDING" && !paused && reason === null && !isLeader && !hasPassed;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border bg-slate-950/50 p-3"
                  style={{ borderColor: `${t.color}66` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-sm font-bold text-slate-100">{t.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{formatLakhs(live.purse)}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={!canBid}
                      onClick={() => dispatch({ type: "BID", teamId: t.id })}
                      className="flex-1 rounded-lg px-3 py-2 text-sm font-black text-white transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                      style={canBid ? { backgroundColor: t.color } : undefined}
                    >
                      {isLeader
                        ? "✔ You lead"
                        : hasPassed
                          ? "Passed"
                          : `Place Bid · ${formatLakhs(nextBid)}`}
                    </button>
                    <button
                      disabled={phase !== "BIDDING" || paused || isLeader || hasPassed}
                      onClick={() => dispatch({ type: "PASS", teamId: t.id })}
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Pass
                    </button>
                  </div>
                  {reason && !isLeader && !hasPassed && phase === "BIDDING" && (
                    <div className="mt-1.5 text-[11px] font-semibold text-rose-400">⚠ {reason}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* LOG + QUEUE */}
        <div className="grid gap-5 md:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-300">Live Feed</h3>
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1 text-xs">
              {state.log.map((l) => (
                <li
                  key={l.id}
                  className={cn(
                    "rounded-md border-l-2 bg-slate-950/40 px-2 py-1.5",
                    l.kind === "sold" && "font-bold text-emerald-300",
                    l.kind === "unsold" && "text-rose-300",
                    l.kind === "info" && "text-amber-300",
                    (l.kind === "bid" || l.kind === "pass") && "text-slate-300"
                  )}
                  style={{ borderLeftColor: l.color ?? "#475569" }}
                >
                  {l.text}
                </li>
              ))}
            </ul>
          </Card>
          <div className="space-y-5">
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-300">Up Next</h3>
              {upcoming.length === 0 ? (
                <div className="text-xs text-slate-500">Final lot of this round.</div>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {upcoming.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <RoleBadge role={p.role} />
                        <span className="truncate text-slate-200">{p.name}</span>
                      </span>
                      <span className="shrink-0 text-slate-500">{formatLakhs(p.basePrice)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="mb-2 flex items-center justify-between text-sm font-black uppercase tracking-wider text-slate-300">
                <span>Unsold Pool</span>
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">
                  {state.unsold.length}
                </span>
              </h3>
              {state.unsold.length === 0 ? (
                <div className="text-xs text-slate-500">No unsold players yet.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {state.unsold.map((p) => (
                    <span key={p.id} className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-300">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
              {state.unsold.length > 0 && state.round === "MAIN" && (
                <p className="mt-2 text-[11px] text-amber-300/80">
                  ⚡ Accelerated Round unlocks after the final set.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* RIGHT: teams */}
      <aside className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
        <h3 className="mb-2 px-1 text-sm font-black uppercase tracking-wider text-slate-300">
          Franchise Dashboard
        </h3>
        <TeamsPanel teams={state.teams} highestBidder={state.highestBidder} passed={state.passed} />
      </aside>
    </div>
  );
}

function ResultOverlay({ state }: { state: AuctionState }) {
  const r = state.result!;
  const team = r.teamId ? state.teams.find((t) => t.id === r.teamId) : null;
  const sold = r.type === "SOLD" && team;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm">
      <div
        className={cn(
          "-rotate-6 rounded-xl border-4 px-8 py-2 text-5xl font-black tracking-widest sm:text-6xl",
          sold ? "text-white" : "border-rose-500 text-rose-500"
        )}
        style={sold ? { borderColor: team!.color, color: team!.color } : undefined}
      >
        {sold ? "SOLD!" : "UNSOLD"}
      </div>
      {sold ? (
        <div className="mt-5 text-center">
          <div className="text-lg text-slate-300">{r.player.name} joins</div>
          <div className="text-3xl font-black text-white">{team!.name}</div>
          <div className="mt-1 text-2xl font-black" style={{ color: team!.color }}>
            {formatLakhs(r.price!)}
          </div>
        </div>
      ) : (
        <div className="mt-5 text-slate-400">{r.player.name} moves to the unsold pool</div>
      )}
    </div>
  );
}
