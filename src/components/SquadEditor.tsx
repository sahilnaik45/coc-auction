import { useState } from "react";
import { cn } from "../utils/cn";
import {
  MAX_OVERSEAS,
  MAX_RETENTIONS,
  MAX_SQUAD,
  MIN_PRICE,
  RETENTION_SLABS,
  TOTAL_PURSE,
  formatCr,
  formatLakhs,
  overseasCount,
} from "../lib/auctionRules";
import type { AuctionMode, Franchise, Player, Role, SquadPlayer } from "../lib/types";
import { ROLES } from "../lib/types";
import { uid } from "../lib/utils";
import { Button, OverseasBadge, RoleBadge } from "./ui";

const inputCls =
  "rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500";

const SET_FOR_ROLE = {
  BAT: "CAPPED_BAT",
  AR: "CAPPED_AR",
  FAST: "CAPPED_FAST",
  SPIN: "CAPPED_SPIN",
  WK: "CAPPED_WK",
} as const;

export function SquadEditor({
  team,
  mode,
  squad,
  pool,
  onChange,
  onClose,
}: {
  team: Franchise;
  mode: AuctionMode;
  squad: SquadPlayer[];
  pool: Player[];
  onChange: (s: SquadPlayer[]) => void;
  onClose: () => void;
}) {
  const limit = mode === "MEGA" ? MAX_RETENTIONS : MAX_SQUAD - 1;
  const noun = mode === "MEGA" ? "Retained" : "Core";
  const source = mode === "MEGA" ? "RETAINED" : "CORE";
  const spent = squad.reduce((s, p) => s + p.price, 0);
  const defaultPrice = (idx: number) => (mode === "MEGA" ? RETENTION_SLABS[idx] ?? 1100 : 100);

  const [poolPick, setPoolPick] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("BAT");
  const [overseas, setOverseas] = useState(false);
  const [price, setPrice] = useState("100");
  const [err, setErr] = useState<string | null>(null);

  const add = (p: SquadPlayer): boolean => {
    if (squad.length >= limit) {
      setErr(`${noun} limit reached (${limit})`);
      return false;
    }
    if (p.overseas && overseasCount({ squad }) >= MAX_OVERSEAS) {
      setErr(`Overseas limit reached (${MAX_OVERSEAS})`);
      return false;
    }
    if (spent + p.price > TOTAL_PURSE) {
      setErr("This would exceed the ₹150 Cr purse");
      return false;
    }
    setErr(null);
    onChange([...squad, p]);
    return true;
  };

  const addFromPool = () => {
    const p = pool.find((x) => x.id === poolPick);
    if (!p) return;
    if (add({ ...p, price: Math.max(MIN_PRICE, defaultPrice(squad.length)), source })) setPoolPick("");
  };

  const addCustom = () => {
    const pr = Number(price);
    if (!name.trim()) return setErr("Enter a name");
    if (!Number.isFinite(pr) || pr < MIN_PRICE) return setErr(`Price must be at least ${MIN_PRICE}L`);
    const ok = add({
      id: uid("core"),
      name: name.trim(),
      set: SET_FOR_ROLE[role],
      role,
      overseas,
      basePrice: Math.max(MIN_PRICE, Math.round(pr / 5) * 5),
      rating: 70,
      price: Math.round(pr),
      source,
    });
    if (ok) {
      setName("");
      setOverseas(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-slate-900 shadow-2xl"
        style={{ borderColor: team.color }}
      >
        <div className="flex items-center justify-between gap-3 p-4" style={{ background: `${team.color}22` }}>
          <div>
            <div className="text-lg font-black text-white">{team.name}</div>
            <div className="text-xs text-slate-400">
              {mode === "MEGA" ? "Retentions" : "Core squad"} · {squad.length}/{limit} · Spent{" "}
              <b className="text-slate-200">{formatCr(spent)}</b> · Purse left{" "}
              <b className={TOTAL_PURSE - spent < 0 ? "text-rose-400" : "text-emerald-400"}>
                {formatCr(TOTAL_PURSE - spent)}
              </b>
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>Done</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {squad.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
              No {noun.toLowerCase()} players. Add some below.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {squad.map((p, i) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-5 text-xs text-slate-600">{i + 1}</span>
                    <RoleBadge role={p.role} />
                    <span className="truncate text-sm font-semibold text-slate-100">{p.name}</span>
                    {p.overseas && <OverseasBadge />}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={MIN_PRICE}
                      step={5}
                      value={p.price}
                      onChange={(e) =>
                        onChange(
                          squad.map((x) =>
                            x.id === p.id ? { ...x, price: Math.max(0, Math.round(Number(e.target.value))) } : x
                          )
                        )
                      }
                      className={cn(inputCls, "w-24 text-right")}
                    />
                    <span className="w-16 text-right text-xs text-slate-500">{formatLakhs(p.price)}</span>
                    <button
                      onClick={() => onChange(squad.filter((x) => x.id !== p.id))}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-rose-400 hover:bg-rose-500/15"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Add from auction pool
              </div>
              <div className="flex gap-2">
                <select
                  value={poolPick}
                  onChange={(e) => setPoolPick(e.target.value)}
                  className={cn(inputCls, "min-w-0 flex-1")}
                >
                  <option value="">Select player…</option>
                  {[...pool]
                    .sort((a, b) => b.rating - a.rating)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.role} · {p.rating}
                        {p.overseas ? " ✈" : ""}
                      </option>
                    ))}
                </select>
                <Button variant="ghost" disabled={!poolPick} onClick={addFromPool}>Add</Button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Add custom player
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={cn(inputCls, "col-span-2")}
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
                <input
                  type="number"
                  className={inputCls}
                  value={price}
                  min={MIN_PRICE}
                  step={5}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Price (L)"
                />
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input type="checkbox" checked={overseas} onChange={(e) => setOverseas(e.target.checked)} />
                  Overseas
                </label>
                <Button variant="ghost" onClick={addCustom}>Add</Button>
              </div>
            </div>
          </div>
          {err && <div className="mt-3 text-sm font-semibold text-rose-400">⚠ {err}</div>}
          <div className="mt-3 flex justify-end">
            <Button variant="outline" disabled={squad.length === 0} onClick={() => onChange([])}>
              Clear all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
