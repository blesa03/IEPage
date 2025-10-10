import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";

export default function League() {
  const { leagueId } = useParams();
  const nav = useNavigate();
  const [league, setLeague] = useState(() => {
    const saved = localStorage.getItem("selectedLeague");
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Si entran por URL directa y no hay datos guardados, al menos
  // persistimos el id para futuros fetches (opcional)
  useEffect(() => {
    if (league && `${league.id}` !== `${leagueId}`) {
      // Si hay mismatch, ajusta el id local
      setLeague((prev) => (prev ? { ...prev, id: leagueId } : prev));
    }
  }, [leagueId]);

  const title = useMemo(
    () => (league?.name ? `¡Bienvenido a ${league.name}!` : "¡Bienvenido!"),
    [league?.name]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Banner con saludo */}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-12 flex items-center gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-white/70">
              Selecciona una sección para continuar.
            </p>
          </div>
          <div className="w-56 h-28 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center">
            <span className="text-sm text-white/70">Banner</span>
          </div>
        </div>
      </header>

      {/* Menú de secciones (los 4 botones del home actual) */}
      <main className="max-w-6xl mx-auto px-4 py-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Link
          to="/draft/1" // TODO: sustituye 1 por el draftId real si lo tienes
          className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
        >
          <div className="text-xl font-semibold">Draft</div>
          <div className="text-white/70 mt-1">Selección de jugadores</div>
        </Link>

        <Link
          to="/ranking"
          className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
        >
          <div className="text-xl font-semibold">Ranking</div>
          <div className="text-white/70 mt-1">Estadísticas y posiciones</div>
        </Link>

        <Link
          to="/team"
          className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
        >
          <div className="text-xl font-semibold">Mi equipo</div>
          <div className="text-white/70 mt-1">Visualiza tu plantilla</div>
        </Link>

        <Link
          to="/market"
          className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
        >
          <div className="text-xl font-semibold">Fichajes</div>
          <div className="text-white/70 mt-1">
            Presupuesto y traspasos entre equipos
          </div>
        </Link>
      </main>

      <div className="max-w-6xl mx-auto px-4 pb-10">
        <button
          onClick={() => nav("/")}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
