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

  useEffect(() => {
    if (league && `${league.id}` !== `${leagueId}`) {
      setLeague((prev) => (prev ? { ...prev, id: leagueId } : prev));
    }
  }, [leagueId]);

  const leagueName = league?.name ?? "tu liga";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Banner con saludo */}
      <header className="relative bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Columna texto (50%) */}
            <div className="space-y-3">
                <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                    ¡Bienvenido a{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500 drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
                        {leagueName}
                    </span>
                    !
                </h1>
                <p className="mt-2 text-white/80">
                Selecciona una sección para continuar.
                </p>
                
                <div className="mt-6 space-y-2 text-white/70">
                  <p>Equipos inscritos: {league?.teams?.length ?? "–"}</p>
                  <p>Jugadores totales: {league?.players?.length ?? "–"}</p>
                  <p>Última actualización: {league?.lastUpdated ?? "–"}</p>
                </div>
            </div>

            {/* Columna imagen (50%) */}
            <div className="relative">
                <div className="aspect-[16/10] w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-lg">
                <img
                    src="https://i.pinimg.com/736x/2c/10/62/2c10620b1c9c85229f8ff46cce795fcf.jpg"
                    alt="Inazuma Eleven"
                    className="w-full h-full object-cover"
                />
                </div>
            </div>
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
