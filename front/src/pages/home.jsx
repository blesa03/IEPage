import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyLeagues, createLeague, getLeague } from "../api/league";
import { me } from "../api";

export default function Home({ user, onLogout }) {
  const nav = useNavigate();

  const [showMyLeagues, setShowMyLeagues] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [newLeagueName, setNewLeagueName] = useState("");
  const [err, setErr] = useState("");

  // Asegurar sesión al entrar (y log del user actual si existe)
  useEffect(() => {
    me()
      .then((u) => {
      })
      .catch(() => {
      });
  }, []);

  // Log cuando cambia el prop user
  useEffect(() => {
    if (user) {
    }
  }, [user]);

  const openMyLeagues = async () => {
    setErr("");
    setShowCreate(false);
    setShowMyLeagues(true);
    setLoadingLeagues(true);
    try {
      const data = await getMyLeagues();
      const arr = Array.isArray(data) ? data : [];
      setLeagues(arr);

   
    } catch (e) {
      setErr(e?.response?.data?.error || "No se pudieron cargar tus ligas");
    } finally {
      setLoadingLeagues(false);
    }
  };

  const openCreate = () => {
    setErr("");
    setShowMyLeagues(false);
    setShowCreate(true);
  };

  const closePopups = () => {
    setShowCreate(false);
    setShowMyLeagues(false);
    setErr("");
  };

  const logLeagueContext = (leagueBasic) => {
    // leagueBasic proviene de /league/mine → {id, name, role}
    const leagueId = leagueBasic?.id;


    // Pedimos detalle para conocer owner real (no bloquea la navegación)
    if (leagueId) {
      getLeague(leagueId)
        .then((full) => {
         
        })
        .catch((e) => {
        });
    }
  };

  const enterLeague = (league) => {
    // Persistimos selección y navegamos
    localStorage.setItem("selectedLeague", JSON.stringify(league));

    // LOGs: leagueId, userId, owner (via getLeague) y rol
    logLeagueContext(league);

    nav(`/league/${league.id}`);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setErr("");
    if (!newLeagueName.trim()) {
      setErr("Ponle un nombre a la liga");
      return;
    }
    try {
      const created = await createLeague(newLeagueName.trim());
      setNewLeagueName("");

      enterLeague(created);
    } catch (e) {
      setErr(e?.response?.data?.error || "No se pudo crear la liga");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section importada de home_old */}
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Inazuma Eleven: <span className="text-cyan-400">La liguilla</span>
          </h1>
          <div className="mt-8 flex flex-wrap gap-3">
            {!user ? (
              <button
                onClick={() => nav("/login")}
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-cyan-400 text-black shadow hover:opacity-90 transition"
              >
                Iniciar sesión
              </button>
            ) : (
              <>
                <span className="px-4 py-3 rounded-xl bg-white/10 border border-white/10">
                  Hola, <b>{user.username}</b>
                </span>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-red-500 text-white shadow hover:opacity-90 transition"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
        <div className="relative">
          <div className="aspect-[16/10] w-full rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-lg">
            <img
              src="https://wallpapers.com/images/hd/inazuma-eleven-team-group-shot-xv11xpcg61x3dq0j.jpg"
              alt="Chrono Stone"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={openMyLeagues}
            className="rounded-2xl px-6 py-6 text-left border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
          >
            <div className="text-xl font-semibold">Mis ligas</div>
            <div className="text-white/70 mt-1">Ver a cuáles perteneces</div>
          </button>

          <button
            onClick={openCreate}
            className="rounded-2xl px-6 py-6 text-left border border-white/10 bg-white/5 hover:bg-white/10 transition shadow-sm"
          >
            <div className="text-xl font-semibold">Crear liga</div>
            <div className="text-white/70 mt-1">Abrir formulario</div>
          </button>
        </div>
      </main>

      {/* Overlay: Mis ligas */}
      {showMyLeagues && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">Tus ligas</h2>
              <button onClick={closePopups} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15">
                Cerrar
              </button>
            </div>

            <div className="p-4">
              {loadingLeagues ? (
                <div className="text-white/70">Cargando…</div>
              ) : leagues.length === 0 ? (
                <div className="text-white/70">No perteneces a ninguna liga todavía.</div>
              ) : (
                <ul className="space-y-3">
                  {leagues.map((lg) => (
                    <li
                      key={lg.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <div className="font-semibold">{lg.name}</div>
                        <div className="text-xs text-white/60">Rol: {lg.role || "jugador"}</div>
                      </div>
                      <button
                        onClick={() => enterLeague(lg)}
                        className="px-4 py-2 rounded-lg bg-cyan-400 text-black font-semibold hover:opacity-90"
                      >
                        Entrar
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {err && <div className="mt-3 text-red-400">{err}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Crear liga */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold">Crear liga</h2>
              <button onClick={closePopups} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15">
                Cerrar
              </button>
            </div>

            <form onSubmit={submitCreate} className="p-4 space-y-3">
              <input
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 outline-none focus:ring-2 focus:ring-cyan-400"
                placeholder="Nombre de la liga"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
              />
              <button type="submit" className="w-full rounded-lg px-4 py-2 font-semibold bg-cyan-400 text-black hover:opacity-90">
                Crear
              </button>
              {err && <div className="text-red-400">{err}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}