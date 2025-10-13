import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDraftPlayers, startDraft, finishDraft,selectPlayer,viewDraft } from "../api/draft";

const POS_LABEL = { GK: "Porteros", DF: "Defensas", MF: "Centrocampistas", FW: "Delanteros" };
const eur = (n = 0) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function PlayerRow({ item, onSelect, selecting }) {
  const p = item.player || {};
  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/10 to-white/5 
                 shadow-md backdrop-blur-sm transition-transform hover:-translate-y-1 hover:shadow-xl flex flex-col"
    >
      <div className="relative w-full h-40 bg-white/5">
        <img
          src= {p.sprite}
          alt={p.name}
          className="absolute inset-0 w-full h-full object-contain p-4"
        />
      </div>

      <div className="p-4 flex flex-col flex-grow justify-between">
        <div>
          <h3 className="text-lg font-semibold leading-tight text-center">{p.name}</h3>
          <p className="text-sm text-white/60 text-center">
            {p.position} · {p.element ?? "-"}
          </p>
        </div>

        <div className="mt-3 flex flex-col items-center gap-2">
          <span className="text-base font-semibold text-cyan-300">
            {eur(p.value)}
          </span>

          <button
            onClick={() => onSelect(p.id)}
            disabled={selecting}
            className={`w-32 text-center rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200 ${
              selecting
                ? "bg-cyan-400/30 text-white/60 cursor-not-allowed"
                : "bg-cyan-400/20 hover:bg-cyan-400/40 text-cyan-200 hover:text-white"
            }`}
          >
            {selecting ? "Drafteando…" : "Draftearlo"}
          </button>
        </div>
      </div>
    </div>
  );
}




export default function Draft() {
  const { draftId } = useParams();
  const { playerId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [draftPlayer, setDraftPlayer] = useState([]);
  const [error, setError] = useState("");
  const [notStarted, setNotStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [openSections, setOpenSections] = useState({
    GK: true,
    DF: true,
    MF: true,
    FW: true,
  });

  const toggleSection = (pos) => {
    setOpenSections((prev) => ({ ...prev, [pos]: !prev[pos] }));
  };
  // 👇 opción rápida: tomar el rol de la liga desde localStorage
  const [isOwner, setIsOwner] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedLeague");
      const league = saved ? JSON.parse(saved) : null;
      return league?.role === "owner";
    } catch {
      return false;
    }
  });

  // Recalcular si cambia el draft (p.ej., otra liga seleccionada previamente)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedLeague");
      const league = saved ? JSON.parse(saved) : null;
      setIsOwner(league?.role === "owner");
    } catch {
      setIsOwner(false);
    }
  }, [draftId]);

  async function load() {
    setLoading(true);
    setError("");
    setNotStarted(false);
    try {
      const raw = await getDraftPlayers(draftId);
      const list = raw.map((r) => ({
        id: r.id,
        player: {
          id: r.player_id,
          name: r.name,
          position: r.position,
          element: r.element,
          value: r.value,
          sprite: r.sprite
        },
      }));
      setPlayers(list);
      const draftPlayer = await viewDraft(draftId);
      setDraftPlayer(draftPlayer);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 409) setNotStarted(true);
      else if (status === 401) setError("No autenticado. Inicia sesión.");
      else if (status === 403) setError("No autorizado para ver este draft.");
      else setError(e?.response?.data?.error || e.message || "Error al cargar jugadores");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [draftId]);

  useEffect(() => {
  if (notStarted) return;

  const sseUrl = `${import.meta.env.VITE_API_URL}/draft/${draftId}/players/stream`;

  const evtSource = new EventSource(sseUrl);

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const list = data.map(r => ({
        id: r.id,
        player: {
          id: r.player_id,
          name: r.name,
          position: r.position,
          element: r.element,
          value: r.value,
          sprite: r.sprite
        },
      }));
      setPlayers(list);
    } catch (err) {
      console.error("Error parsing SSE data:", err);
    }
  };

  evtSource.onerror = (err) => {
    console.error("Error en conexión SSE:", err);
    evtSource.close();
  };

  return () => evtSource.close();
}, [draftId, notStarted]);

useEffect(() => {
  if (notStarted) return;

  const sseUrl = `${import.meta.env.VITE_API_URL}/draft/${draftId}/stream`;

  const evtSource = new EventSource(sseUrl);

  evtSource.onmessage = (event) => {
    try {
      console.log('hola')
      console.log(event.data)
      const data = JSON.parse(event.data);
      const draftData = {
        id: data.id,
        name: data.name,
        current_user: data.current_user,
        status: data.status
      };
      setDraftPlayer(draftData);

    } catch (err) {
      console.error("Error parsing SSE data:", err);
    }
  };

  evtSource.onerror = (err) => {
    console.error("Error en conexión SSE:", err);
    evtSource.close();
  };

  return () => evtSource.close();
}, [draftId, notStarted]);

  const byPos = useMemo(() => {
    const map = { GK: [], DF: [], MF: [], FW: [] };
    for (const it of players) map[it.player.position]?.push(it);
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));
    return map;
  }, [players]);

  const onStart = async () => {
    setStarting(true);
    setError("");
    try {
      await startDraft(draftId);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "No se pudo iniciar el draft");
    } finally {
      setStarting(false);
    }
  };

  const onFinish = async () => {
    setFinishing(true);
    setError("");
    try {
      await finishDraft(draftId);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "No se pudo finalizar el draft");
    } finally {
      setFinishing(false);
    }
  };

const onSelect = async (playerId) => {
  setSelecting(true);
  setError("");
  try {
    await selectPlayer(draftId, playerId);
    await load();
  } catch (e) {
    setError(e?.response?.data?.error || e.message || "No se pudo seleccionar el jugador");
  } finally {
    setSelecting(false);
  }
};
  return (
    <main className="min-h-[calc(100vh-4rem)] px-6 py-8">
      {/* Encabezado con botón Volver */}
      <header className="mx-auto max-w-6xl mb-6 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight">Draft</h1>
          <p className="text-white/70">
            Inicia el draft para asignar orden y ver a los jugadores por posición.
          </p>
        </div>
       <div className="flex items-center gap-2 mt-2 sm:mt-0">
        {isOwner && (
          <>
            <button
              onClick={onStart}
              disabled={starting}
              className="rounded-lg bg-cyan-400 text-black px-3 py-1.5 font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {starting ? "Iniciando…" : "Iniciar draft"}
            </button>
            <button
              onClick={onFinish}
              disabled={finishing || notStarted}
              className="rounded-lg bg-red-500 text-white px-3 py-1.5 font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {finishing ? "Finalizando…" : "Finalizar draft"}
            </button>
          </>
        )}
      </div>
      </header>
      {draftPlayer?.current_user && (
        <div className="mx-auto max-w-6xl mb-6 rounded-xl bg-cyan-400/10 border border-cyan-400/30 p-4 text-center">
          <span className="font-semibold text-cyan-300">
            Turno de {draftPlayer.current_user}
          </span>
        </div>
      )}
      {error && (
        <div className="mx-auto max-w-6xl mb-4 rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-3">
          {error}
        </div>
      )}

      {notStarted ? (
        <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-white/80">
            El draft aún no ha comenzado. Pulsa <span className="font-semibold">“Iniciar draft”</span> para empezar.
          </div>
        </div>
      ) : loading ? (
        <div className="mx-auto max-w-6xl text-white/70">Cargando…</div>
      ) : (
       <div className="mx-auto max-w-6xl grid gap-6">
          {["GK", "DF", "MF", "FW"].map((pos) => {
            const isOpen = openSections[pos];

            return (
              <section
                key={pos}
                className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden transition-all"
              >
                {/* Header de la sección */}
                <button
                  onClick={() => toggleSection(pos)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/10 transition"
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold">{POS_LABEL[pos]}</h2>
                    <span className="text-xs rounded-full px-2 py-0.5 bg-white/10 border border-white/10">
                      {byPos[pos].length}
                    </span>
                  </div>

                  <svg
                    className={`w-5 h-5 transform transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Contenido desplegable */}
                <div
                  className={`transition-[max-height,opacity] duration-500 ease-in-out ${
                    isOpen ? "max-h-[100rem] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-5 pb-5">
                    {byPos[pos].length === 0 ? (
                      <div className="text-white/60 text-center py-6">
                        No hay jugadores en esta posición.
                      </div>
                    ) : (
                      <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 py-3">
                          {byPos[pos].map((it) => (
                            <PlayerRow
                              key={it.id}
                              item={it}
                              onSelect={onSelect}
                              selecting={selecting}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}