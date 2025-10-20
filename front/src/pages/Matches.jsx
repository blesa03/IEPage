import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { viewMatchs } from "../api/match";

function norm(s) {
  return (s || "").toUpperCase();
}

function StatusDot({ status }) {
  const map = {
    IN_PROGRESS: "bg-green-500",
  };
  const cls = map[norm(status)] || "bg-white/40";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function StatusLabel({ status }) {
  const S = norm(status);
  const map = {
    PENDING_RESULT: "text-yellow-300",
    FINISHED: "text-white/70",
    SCHEDULED: "text-blue-300",
    IN_PROGRESS: "text-green-300",
    PENDING: "text-white/50", 
  };
  const label =
    S === "PENDING_RESULT"
      ? "PEND."
      : S === "IN_PROGRESS"
      ? "EN JUEGO"
      : S === "SCHEDULED"
      ? "PROG."
      : S === "PENDING"
      ? "PEND."
      : status || "—";
  return <span className={`text-xs font-semibold ${map[S] || "text-white/50"}`}>{label}</span>;
}

export default function Matches() {
  const nav = useNavigate();
  const { leagueId } = useParams();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState([]);

  const q = new URLSearchParams(location.search);
  const draftIdFromQuery = q.get("draftId");
  const savedLeague = (() => {
    try {
      return JSON.parse(localStorage.getItem("selectedLeague") || "null");
    } catch {
      return null;
    }
  })();
  const draftId = draftIdFromQuery || savedLeague?.currentDraftId || "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await viewMatchs(leagueId);
        setMatches(Array.isArray(data) ? data : []);
      } catch (e) {
        setError("No se pudieron cargar los partidos.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leagueId]);

  const grouped = useMemo(() => {
    const byWeek = new Map();
    for (const m of matches) {
      const w = m.week ?? 0;
      if (!byWeek.has(w)) byWeek.set(w, []);
      byWeek.get(w).push(m);
    }
    return Array.from(byWeek.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0f1a] text-white">
        Cargando partidos…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0f1a] text-red-400">
        {error}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white">
      {/* Topbar */}
      <header className="sticky top-0 z-10 backdrop-blur bg-[#0b0f1a]/70 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            className="rounded-xl px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            ← Volver
          </button>
          <h1 className="text-xl font-bold tracking-wide">Partidos</h1>
          <div className="w-[80px]" />
        </div>

        {/* Chips de jornadas */}
        {grouped.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {grouped.map(([week]) => (
                <a
                  key={`chip-${week}`}
                  href={`#week-${week}`}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm hover:bg-white/10"
                >
                  S{week}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {grouped.length === 0 && (
          <div className="text-center text-white/70">No hay partidos.</div>
        )}

        {grouped.map(([week, games]) => (
          <section
            id={`week-${week}`}
            key={week}
            className="rounded-2xl border text-center border-white/10 bg-white/[0.03] shadow-sm"
          >
            <div className="px-4 py-3 border-b border-white/10 flex justify-center gap-3 text-center">
              <h2 className="text-lg font-semibold text-center">Semana {week}</h2>
            </div>

            <ul className="divide-y divide-white/10">
              {games.map((game) => {
                const showScore =  game.status === "finished"

                const score = showScore
                  ? `${game?.local_goals ?? "-"}  -  ${game?.away_goals ?? "-"}`
                  : "—";

                const when =
                  game?.kickoff_at
                    ? new Date(game.kickoff_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null;


                const toUrl = `/game/${game.id}?draftId=${draftId}`;
                const state = { draftId };

                return (
                  <li key={game.id}>
                    <Link
                      to={toUrl}
                      state={state}
                      className="block px-3 sm:px-4 py-3 hover:bg-white/[0.06] transition"
                      title="Ver detalle"
                    >
                      <div className="flex items-center">
                        <div className="w-[88px] sm:w-[96px]" />
                        <div className="flex-1">
                          {/* Línea equipos centrada */}
                          <div className="w-full mx-auto max-w-[680px]">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3">
                              <span className="min-w-0 truncate whitespace-nowrap text-right font-medium text-sm sm:text-base">
                                {game.local_team}
                              </span>

                              <span className="px-2 tabular-nums text-xl sm:text-2xl font-bold select-none">
                                {score}
                              </span>

                              <span className="min-w-0 truncate whitespace-nowrap text-left font-medium text-sm sm:text-base">
                                {game.away_team}
                              </span>
                            </div>
                          </div>

                          {/* estado/horario centrado debajo */}
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <StatusDot status={game.status} />
                            <StatusLabel status={game.status} />
                            {when && game.status === "SCHEDULED" && (
                              <span className="text-xs text-white/60">· {when}</span>
                            )}
                          </div>

                          {game?.winner && (
                            <div className="text-[11px] text-white/50 mt-1 text-center">
                              Ganador: {game.winner}
                            </div>
                          )}
                        </div>

                        {/* Flechita visual (opcional) */}
                        <div className="hidden sm:block w-[88px] sm:w-[96px] text-center ml-2 text-white/60">
                          ➜
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
