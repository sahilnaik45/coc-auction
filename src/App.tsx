import { useEffect, useMemo, useState } from "react";
import { cn } from "./utils/cn";
import { AuctionRoom } from "./components/AuctionRoom";
import { PlayerManager } from "./components/PlayerManager";
import { SetupScreen } from "./components/SetupScreen";
import { generateSampleSquads } from "./lib/generator";
import { loadPlayers, loadSetup, savePlayers, saveSetup, type SetupState } from "./lib/storage";
import { FRANCHISES } from "./lib/teams";
import type { AuctionMode, Player, Team } from "./lib/types";

type View = "setup" | "players" | "auction";

interface AuctionConfig {
  teams: Team[];
  pool: Player[];
  mode: AuctionMode;
  key: number;
}

function initSetup(players: Player[]): SetupState {
  const saved = loadSetup();
  if (saved) return saved;
  return {
    mode: "MINI",
    retainCount: 3,
    humans: Object.fromEntries(FRANCHISES.map((f, i) => [f.id, i === 0])),
    squads: generateSampleSquads("MINI", 3, players),
  };
}

export default function App() {
  const [players, setPlayersState] = useState<Player[]>(() => loadPlayers());
  const [setup, setSetup] = useState<SetupState>(() => initSetup(loadPlayers()));
  const [view, setView] = useState<View>("setup");
  const [auction, setAuction] = useState<AuctionConfig | null>(null);

  const setPlayers = (p: Player[]) => {
    setPlayersState(p);
    savePlayers(p);
  };

  useEffect(() => {
    saveSetup(setup);
  }, [setup]);

  const lockedIds = useMemo(() => {
    const s = new Set<string>();
    Object.values(setup.squads).forEach((sq) => sq.forEach((p) => s.add(p.id)));
    return s;
  }, [setup.squads]);

  const inAuction = view === "auction" && auction !== null;

  const tabs: { id: View; label: string }[] = [
    { id: "setup", label: "Setup" },
    { id: "players", label: "Player Manager" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.15),transparent_55%)] text-slate-200">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600 text-xl font-black text-slate-950 shadow-lg shadow-orange-500/20">
              🏏
            </div>
            <div className="leading-tight">
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-500 bg-clip-text text-transparent">
                  COC
                </span>
                : Clash of Champions
              </h1>
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Live Cricket Auction Simulator
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                disabled={inAuction}
                onClick={() => setView(t.id)}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40",
                  view === t.id && !inAuction ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
            {auction && (
              <button
                onClick={() => setView("auction")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-bold transition",
                  inAuction ? "bg-rose-500 text-white" : "text-rose-300 hover:text-white"
                )}
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> Live Auction
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6">
        {view === "setup" && (
          <SetupScreen
            setup={setup}
            setSetup={setSetup}
            players={players}
            setPlayers={setPlayers}
            onStart={(teams, pool, mode) => {
              setAuction({ teams, pool, mode, key: Date.now() });
              setView("auction");
            }}
          />
        )}
        {view === "players" && (
          <PlayerManager players={players} setPlayers={setPlayers} lockedIds={lockedIds} />
        )}
        {auction && (
          <div className={view === "auction" ? "" : "hidden"}>
            <AuctionRoom
              key={auction.key}
              initialTeams={auction.teams}
              pool={auction.pool}
              modeLabel={auction.mode === "MEGA" ? "Mega Auction" : "Mini Auction"}
              onExit={() => {
                setAuction(null);
                setView("setup");
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
