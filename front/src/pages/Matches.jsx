import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { viewMatchs } from "../api/match";

// ——— UI helpers ———
function StatusDot({ status }) {
  const map = {
    IN_PROGRESS: "bg-green-500",
  };
  const cls = map[status] || "bg-white/40";
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

function StatusLabel({ status }) {
  const map = {
    PENDING_RESULT: "text-yellow-300",
    FINISHED: "text-white/70",
    SCHEDULED: "text-blue-300",
    IN_PROGRESS: "text-green-300",
  };
  const label =
    status === "PENDING_RESULT"
      ? "PEND."
      : status === "IN_PROGRESS"
      ? "EN JUEGO"
      : status === "SCHEDULED"
      ? "PROG."
      : status || "—";
  return <span className={`text-xs font-semibold ${map[status] || "text-white/50"}`}>{label}</span>;
}


export default function Matches() {
  const nav = useNavigate();
  const { leagueId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState([]);

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
              
              <h2 className="text-lg font-semibold text-center" >Semana {week}</h2>
            </div>

            <ul className="divide-y divide-white/10">
              {games.map((game) => {
                const showScore =
                  game.status === "FINISHED" ||
                  game.status === "PENDING_RESULT" ||
                  game.status === "IN_PROGRESS";

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

                return (
                  <li key={game.id} className="px-3 sm:px-4 py-3 hover:bg-white/[0.06] transition">
                    <div className="flex items-center">
                      <div className="w-[88px] sm:w-[96px]" />
               <div className="flex-1">
                        {/* Línea equipos centrada y con ancho limitado */}
                        <div className="w-full mx-auto max-w-[680px]">
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3">
                            <span className="min-w-0 truncate whitespace-nowrap text-right font-medium text-sm sm:text-base">
                              {game.local_team}
                            </span>

                            {/* separador o marcador centrado */}
                            <span className="px-2 tabular-nums text-xl sm:text-2xl font-bold select-none">
                              — {/* o {score} */}
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
                          {when && game.status === 'SCHEDULED' && (
                            <span className="text-xs text-white/60">· {when}</span>
                          )}
                        </div>

                        {game?.winner && (
                          <div className="text-[11px] text-white/50 mt-1 text-center">
                            Ganador: {game.winner}
                          </div>
                        )}
                      </div>
                      {/* botón a la derecha */}
                      <Link
                        to={`/game/${game.id}`}
                        className="w-[88px] sm:w-[96px] text-center ml-2 px-3 py-1.5 rounded-lg bg-yellow-400 text-black text-xs sm:text-sm font-semibold hover:opacity-90"
                        title="Ver detalle"
                      >
                        Detalle
                      </Link>
                    </div>
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
