import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getLeague } from "../api/league";

export default function League() {
  const { leagueId } = useParams();
  const nav = useNavigate();

  // Carga inicial desde cache (si existe) para no parpadear el nombre
  const [league, setLeague] = useState(() => {
    const saved = localStorage.getItem("selectedLeague");
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return parsed && `${parsed.id}` === `${leagueId}` ? parsed : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!league);
  const [error, setError] = useState("");

  // Fetch real al backend
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    getLeague(leagueId)
      .then((data) => {
        if (!alive) return;
        setLeague(data);
        // refrescamos la cache local
        localStorage.setItem("selectedLeague", JSON.stringify(data));
      })
      .catch((e) => {
        if (!alive) return;
        const status = e?.response?.status;
        if (status === 401) {
          // no autenticado -> a login
          nav("/login");
          return;
        }
        if (status === 403) setError("No tienes acceso a esta liga.");
        else if (status === 404) setError("Liga no encontrada.");
        else setError("No se pudo cargar la liga.");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [leagueId, nav]);

  const leagueName = league?.name ?? "tu liga";
  // Si en el futuro el backend devuelve draft actual, úsalo aquí
  const draftLink = league?.currentDraftId ? `/draft/${league.currentDraftId}` : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Banner */}
      <header className="relative bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-3">
               <div className="max-w-3xl mx-auto px-4 pb-10">
                <button
                  onClick={() => nav("/")}
                  className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15"
                >
                  Volver al inicio
                </button>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                <span className="text-cyan-400">
                  {leagueName}
                </span>
                
              </h1>
              <p className="mt-2 text-white/80">Selecciona una sección para continuar.</p>

              
              <div className="mt-6 space-y-1 text-white/70">
                <p className="font-semibold">Miembros:</p>
                <ul className="list-disc list-inside">
                  {league?.members?.map((member) => (
                    <li key={member.id}>
                      {member.username} {member.id === league.owner.id && <span className="text-yellow-400 font-bold">(Propietario)</span>}
                    </li>
                  )) ?? "–"}
                </ul>
              </div>

              {error && <div className="mt-3 text-red-400">{error}</div>}
            </div>

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

      {/* Menú */}
      <main className="max-w-6xl mx-auto px-4 py-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {draftLink ? (
          <Link
            to={draftLink}
            className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
          >
            <div className="text-xl font-semibold">Draft</div>
            <div className="text-white/70 mt-1">Selección de jugadores</div>
          </Link>
        ) : (
          <button
            disabled
            className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 opacity-60 cursor-not-allowed"
            title="Draft no disponible aún"
          >
            <div className="text-xl font-semibold">Draft</div>
            <div className="text-white/70 mt-1">Próximamente</div>
          </button>
        )}

        <Link
          to={`/ranking/${league.id}`}
          className="rounded-2xl px-6 py-6 border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
        >
          <div className="text-xl font-semibold">Clasificación</div>
          <div className="text-white/70 mt-1">Estadísticas y posiciones</div>
        </Link>

        {/* <Link
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
          <div className="text-white/70 mt-1">Presupuesto y traspasos</div>
        </Link> */}
      </main>

      

      {loading && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center text-white/70">
          Cargando liga…
        </div>
      )}
    </div>
  );
}