import { useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { MIN_PRICE, formatLakhs } from "../lib/auctionRules";
import { generateFillerPlayers } from "../lib/generator";
import { buildSamplePlayers } from "../lib/samplePlayers";
import { downloadJSON, parsePlayersJSON, setRoleFromSet, validatePlayer } from "../lib/storage";
import type { Player, Role, SetCategory } from "../lib/types";
import { ROLES, ROLE_LABELS, SETS, SET_LABELS } from "../lib/types";
import { uid } from "../lib/utils";
import { Button, Card, OverseasBadge, RatingBadge, RoleBadge } from "./ui";

interface FormState {
  id: string | null;
  name: string;
  set: SetCategory;
  role: Role;
  overseas: boolean;
  basePrice: string;
  rating: string;
}

const EMPTY: FormState = {
  id: null,
  name: "",
  set: "CAPPED_BAT",
  role: "BAT",
  overseas: false,
  basePrice: "50",
  rating: "70",
};

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-60";

export function PlayerManager({
  players,
  setPlayers,
  lockedIds,
}: {
  players: Player[];
  setPlayers: (p: Player[]) => void;
  lockedIds: Set<string>;
}) {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SetCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of players) c[p.set] = (c[p.set] ?? 0) + 1;
    return c;
  }, [players]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .filter((p) => (filter === "ALL" ? true : p.set === filter))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .sort((a, b) => SETS.indexOf(a.set) - SETS.indexOf(b.set) || b.rating - a.rating);
  }, [players, filter, search]);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 4000);
  };

  const save = () => {
    if (!form) return;
    const forced = setRoleFromSet(form.set);
    const res = validatePlayer(
      {
        id: form.id ?? uid("p"),
        name: form.name,
        set: form.set,
        role: forced ?? form.role,
        overseas: form.overseas,
        basePrice: form.basePrice,
        rating: form.rating,
      },
      true
    );
    if (typeof res === "string") {
      setError(res);
      return;
    }
    if (res.basePrice % 5 !== 0) {
      setError("Base price should be a multiple of 5L");
      return;
    }
    if (form.id) setPlayers(players.map((p) => (p.id === form.id ? res : p)));
    else setPlayers([...players, res]);
    flash(form.id ? `Updated ${res.name}` : `Added ${res.name}`);
    setForm(null);
    setError(null);
  };

  const remove = (p: Player) => {
    if (!confirm(`Delete ${p.name}?`)) return;
    setPlayers(players.filter((x) => x.id !== p.id));
  };

  const doImport = (text: string, replace: boolean) => {
    const { players: imported, errors } = parsePlayersJSON(text);
    if (imported.length === 0) {
      setError(errors[0] ?? "Nothing to import");
      return;
    }
    if (replace) setPlayers(imported);
    else {
      const ids = new Set(players.map((p) => p.id));
      setPlayers([...players, ...imported.map((p) => (ids.has(p.id) ? { ...p, id: uid("p") } : p))]);
    }
    setError(errors.length ? `${errors.length} rows skipped: ${errors.slice(0, 3).join(" | ")}` : null);
    flash(`Imported ${imported.length} players${errors.length ? ` (${errors.length} skipped)` : ""}`);
    setImportText("");
    setShowImport(false);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    doImport(text, confirm("Replace the current player list? (Cancel = merge/append)"));
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white">Admin · Player Manager</h2>
          <p className="text-sm text-slate-400">
            {players.length} players in the auction database · saved automatically to localStorage
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setForm({ ...EMPTY });
              setError(null);
            }}
          >
            ＋ Add Player
          </Button>
          <Button variant="ghost" onClick={() => setShowImport((s) => !s)}>⬆ Import JSON</Button>
          <Button variant="ghost" onClick={() => downloadJSON("coc-players.json", players)}>⬇ Export JSON</Button>
          <Button
            variant="ghost"
            onClick={() => {
              const extra = generateFillerPlayers(40, players);
              setPlayers([...players, ...extra]);
              flash("Added 40 generated filler players");
            }}
          >
            ✨ +40 Filler
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm("Reset to the default sample dataset? Your custom players will be lost.")) {
                setPlayers(buildSamplePlayers());
                flash("Reset to default sample dataset");
              }
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
          ✔ {notice}
        </div>
      )}
      {error && !form && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300">
          ⚠ {error}
        </div>
      )}

      {showImport && (
        <Card className="space-y-3 p-4">
          <div className="text-sm text-slate-400">
            Paste a JSON array of players, or choose a file. Fields:{" "}
            <code className="text-indigo-300">name, set, role, overseas, basePrice, rating</code>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={6}
            placeholder='[{"name":"Sample","set":"CAPPED_BAT","role":"BAT","overseas":false,"basePrice":100,"rating":80}]'
            className={cn(inputCls, "font-mono text-xs")}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="success" disabled={!importText.trim()} onClick={() => doImport(importText, false)}>
              Append
            </Button>
            <Button variant="danger" disabled={!importText.trim()} onClick={() => doImport(importText, true)}>
              Replace All
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-200"
            />
          </div>
        </Card>
      )}

      {form && (
        <Card className="border-indigo-500/40 p-5">
          <h3 className="mb-4 text-lg font-black text-white">{form.id ? "Edit Player" : "Add Player"}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Name
              <input
                className={cn(inputCls, "mt-1 normal-case")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Player name"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Set Category
              <select
                className={cn(inputCls, "mt-1")}
                value={form.set}
                onChange={(e) => {
                  const set = e.target.value as SetCategory;
                  setForm({ ...form, set, role: setRoleFromSet(set) ?? form.role });
                }}
              >
                {SETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Role {form.set !== "MARQUEE" && <span className="font-normal normal-case text-slate-500">(set by category)</span>}
              <select
                className={cn(inputCls, "mt-1")}
                value={form.role}
                disabled={form.set !== "MARQUEE"}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r} — {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Base Price (Lakhs, min {MIN_PRICE})
              <input
                type="number"
                min={MIN_PRICE}
                step={5}
                className={cn(inputCls, "mt-1")}
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              AI Rating (1-100)
              <input
                type="number"
                min={1}
                max={100}
                className={cn(inputCls, "mt-1")}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
              />
            </label>
            <div className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Overseas
              <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-700">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setForm({ ...form, overseas: v })}
                    className={cn(
                      "flex-1 px-3 py-2 text-sm font-bold",
                      form.overseas === v ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-slate-800"
                    )}
                  >
                    {v ? "true (Overseas)" : "false (Indian)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <div className="mt-3 text-sm font-semibold text-rose-400">⚠ {error}</div>}
          <div className="mt-4 flex gap-2">
            <Button variant="success" onClick={save}>{form.id ? "Save Changes" : "Add Player"}</Button>
            <Button
              variant="outline"
              onClick={() => {
                setForm(null);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name…"
          className={cn(inputCls, "!w-48")}
        />
        <button
          onClick={() => setFilter("ALL")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            filter === "ALL" ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          ALL ({players.length})
        </button>
        {SETS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-bold",
              filter === s ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700",
              !counts[s] && "ring-1 ring-rose-500/50"
            )}
          >
            {s} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-3 py-3">Set</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3 text-right">Base</th>
                <th className="px-3 py-3 text-center">Rating</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-slate-100">{p.name}</span>{" "}
                    {p.overseas && <OverseasBadge className="ml-1" />}
                    {lockedIds.has(p.id) && (
                      <span className="ml-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        IN SQUAD
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-400">{p.set}</td>
                  <td className="px-3 py-2.5"><RoleBadge role={p.role} /></td>
                  <td className="px-3 py-2.5 text-right font-bold tabular-nums text-slate-300">
                    {formatLakhs(p.basePrice)}
                  </td>
                  <td className="px-3 py-2.5 text-center"><RatingBadge rating={p.rating} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      className="mr-1 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-500/15"
                      onClick={() => {
                        setForm({
                          id: p.id,
                          name: p.name,
                          set: p.set,
                          role: p.role,
                          overseas: p.overseas,
                          basePrice: String(p.basePrice),
                          rating: String(p.rating),
                        });
                        setError(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg px-2.5 py-1 text-xs font-bold text-rose-400 hover:bg-rose-500/15"
                      onClick={() => remove(p)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No players match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="text-xs text-slate-500">
        Sets without players are outlined in red. {SETS.length} sets: {SETS.map((s) => SET_LABELS[s]).join(" · ")}
      </div>
    </div>
  );
}
