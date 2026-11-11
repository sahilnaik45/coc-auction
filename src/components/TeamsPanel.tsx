import { useState } from "react";
import { cn } from "../utils/cn";
import {
  MAX_OVERSEAS,
  MAX_SQUAD,
  MIN_SQUAD,
  formatCr,
  formatLakhs,
  overseasCount,
} from "../lib/auctionRules";
import type { Team } from "../lib/types";
import { ROLES } from "../lib/types";
import { OverseasBadge, RoleBadge } from "./ui";

export function TeamsPanel({
  teams,
  highestBidder,
  passed,
  showMinWarning,
}: {
  teams: Team[];
  highestBidder: string | null;
  passed: string[];
  showMinWarning?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-2.5">
      {teams.map((t) => {
        const os = overseasCount(t);
        const isTop = highestBidder === t.id;
        const hasPassed = passed.includes(t.id);
        const isOpen = !!open[t.id];
        const sorted = [...t.squad].sort(
          (a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || b.price - a.price
        );
        const pct = Math.min(100, (t.squad.length / MAX_SQUAD) * 100);
        const minPct = (MIN_SQUAD / MAX_SQUAD) * 100;
        const short = t.squad.length < MIN_SQUAD;
        return (
          <div
            key={t.id}
            className={cn(
              "overflow-hidden rounded-xl border bg-slate-900/80 transition",
              isTop ? "shadow-lg" : "border-slate-800",
              hasPassed && "opacity-60"
            )}
            style={
              isTop
                ? { borderColor: t.color, boxShadow: `0 0 24px -6px ${t.color}` }
                : { borderLeftColor: t.color, borderLeftWidth: 4 }
            }
          >
            <button
              onClick={() => setOpen((o) => ({ ...o, [t.id]: !o[t.id] }))}
              className="w-full px-3 py-2.5 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.short}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-100">{t.name}</div>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <span>{t.isHuman ? "👤 Human" : "🤖 AI"}</span>
                      {isTop && (
                        <span className="rounded px-1 py-px text-white" style={{ backgroundColor: t.color }}>
                          Highest bid
                        </span>
                      )}
                      {hasPassed && <span className="text-slate-400">Passed</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black tabular-nums text-emerald-400">
                    {formatCr(t.purse)}
                  </div>
                  <div className="text-[10px] text-slate-500">{isOpen ? "▲ hide" : "▼ squad"}</div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="mb-1 flex justify-between text-slate-400">
                    <span>Squad</span>
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        short && showMinWarning ? "text-rose-400" : "text-slate-200"
                      )}
                    >
                      {t.squad.length}/{MAX_SQUAD}{" "}
                      <span className="font-normal text-slate-500">(min {MIN_SQUAD})</span>
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: t.color }}
                    />
                    <div
                      className="absolute -top-0.5 h-2.5 w-px bg-slate-300/70"
                      style={{ left: `${minPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-slate-400">
                    <span>Overseas</span>
                    <span className="font-bold tabular-nums text-slate-200">
                      {os}/{MAX_OVERSEAS}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: MAX_OVERSEAS }).map((_, i) => (
                      <div
                        key={i}
                        className={cn("h-1.5 flex-1 rounded-full", i < os ? "bg-fuchsia-400" : "bg-slate-800")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-800 bg-slate-950/50 px-3 py-2">
                {sorted.length === 0 ? (
                  <div className="py-2 text-center text-xs text-slate-500">No players yet</div>
                ) : (
                  <ul className="divide-y divide-slate-800/70">
                    {sorted.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 py-1.5 text-xs">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <RoleBadge role={p.role} />
                          <span className="truncate font-medium text-slate-200">{p.name}</span>
                          {p.overseas && <OverseasBadge />}
                          {p.source !== "AUCTION" && (
                            <span className="rounded bg-slate-800 px-1 text-[9px] font-bold uppercase text-slate-400">
                              {p.source === "CORE" ? "Core" : "Ret"}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 font-bold tabular-nums text-slate-300">
                          {formatLakhs(p.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
