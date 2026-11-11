import { useState } from "react";
import { cn } from "../utils/cn";
import {
  MAX_OVERSEAS,
  MIN_SQUAD,
  formatCr,
  formatLakhs,
  overseasCount,
  teamSpent,
} from "../lib/auctionRules";
import type { AuctionState } from "../lib/auctionEngine";
import { downloadJSON } from "../lib/storage";
import { Button, Card, OverseasBadge, RoleBadge } from "./ui";

export function AuctionSummary({
  state,
  modeLabel,
  onExit,
}: {
  state: AuctionState;
  modeLabel: string;
  onExit: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const top = [...state.sold].sort((a, b) => b.price - a.price).slice(0, 5);
  const totalSpent = state.sold.reduce((s, r) => s + r.price, 0);

  const exportResults = () =>
    downloadJSON("coc-auction-results.json", {
      tournament: "COC: Clash of Champions",
      mode: modeLabel,
      teams: state.teams.map((t) => ({
        team: t.name,
        purseRemainingLakhs: t.purse,
        squadSize: t.squad.length,
        overseas: overseasCount(t),
        squad: t.squad.map((p) => ({
          name: p.name,
          role: p.role,
          overseas: p.overseas,
          priceLakhs: p.price,
          source: p.source,
        })),
      })),
      unsold: state.unsold.map((p) => p.name),
    });

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-6 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="mt-2 text-3xl font-black text-white">Auction Complete</h2>
        <p className="mt-1 text-slate-400">
          {modeLabel} · {state.sold.length} players sold for {formatLakhs(totalSpent)} · {state.unsold.length} unsold
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button variant="ghost" onClick={exportResults}>⬇ Export Results (JSON)</Button>
          <Button onClick={onExit}>Back to Setup</Button>
        </div>
      </div>

      {top.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-300">Top Buys</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {top.map((r, i) => {
              const t = state.teams.find((x) => x.id === r.teamId)!;
              return (
                <div
                  key={r.player.id}
                  className="rounded-xl border bg-slate-950/50 p-3"
                  style={{ borderColor: `${t.color}77` }}
                >
                  <div className="text-[10px] font-bold text-slate-500">#{i + 1}</div>
                  <div className="truncate font-bold text-white">{r.player.name}</div>
                  <div className="text-lg font-black" style={{ color: t.color }}>{formatLakhs(r.price)}</div>
                  <div className="truncate text-xs text-slate-400">{t.name}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {state.teams.map((t) => {
          const os = overseasCount(t);
          const valid = t.squad.length >= MIN_SQUAD && os <= MAX_OVERSEAS;
          const isOpen = open === t.id;
          return (
            <Card key={t.id} className="overflow-hidden" >
              <button
                onClick={() => setOpen(isOpen ? null : t.id)}
                className="w-full p-4 text-left"
                style={{ borderLeft: `5px solid ${t.color}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-black text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.isHuman ? "👤 Human" : "🤖 AI"}</div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold",
                      valid ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                    )}
                  >
                    {valid ? "✔ Squad valid" : `✖ Needs ${MIN_SQUAD - t.squad.length} more`}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat label="Squad" value={`${t.squad.length}/25`} />
                  <Stat label="Overseas" value={`${os}/${MAX_OVERSEAS}`} />
                  <Stat label="Spent" value={formatCr(teamSpent(t))} />
                  <Stat label="Purse left" value={formatCr(t.purse)} />
                </div>
              </button>
              {isOpen && (
                <ul className="divide-y divide-slate-800 border-t border-slate-800 bg-slate-950/40 px-4 py-2">
                  {t.squad.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-1.5 text-xs">
                      <span className="flex items-center gap-1.5">
                        <RoleBadge role={p.role} />
                        <span className="text-slate-200">{p.name}</span>
                        {p.overseas && <OverseasBadge />}
                      </span>
                      <span className="font-bold text-slate-300">{formatLakhs(p.price)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>

      {state.unsold.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-black uppercase tracking-wider text-slate-300">
            Final Unsold ({state.unsold.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {state.unsold.map((p) => (
              <span key={p.id} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                {p.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/60 px-1 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="font-black text-slate-200">{value}</div>
    </div>
  );
}
