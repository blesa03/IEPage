import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDraftPlayers, startDraft, finishDraft } from "../api/draft";

const POS_LABEL = { GK: "Porteros", DF: "Defensas", MF: "Centrocampistas", FW: "Delanteros" };
const eur = (n=0) => new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);

function PlayerRow({ item }) {
  const p = item.player || {};
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 grid place-items-center rounded-md bg-white/10 border border-white/10 overflow-hidden">
          {p.sprite ? (
            <img src={p.sprite} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">?</span>
          )}
        </div>
        <div>
          <div className="font-semibold leading-tight">{p.name}</div>
          <div className="text-xs text-white/60">{p.position} · Orden {item.order ?? "-"}</div>
        </div>
      </div>
      <div className="text-sm font-semibold">{eur(item.clause)}</div>
    </div>
  );
}

export default function Draft() {
  const { draftId } = useParams();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState("");
  const [notStarted, setNotStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  async function load() {
    setLoading(true); setError(""); setNotStarted(false);
    try {
      const raw = await getDraftPlayers(draftId);
      const list = raw.map(r => ({
        id: r.id,
        clause: r.clause ?? 0,
        player: {
          id: r.player_id,
          name: r.name,
          position: r.position,
          element: r.element
        },
      }));
      setPlayers(list);
    } catch (e) {
      if (e.status === 409) setNotStarted(true);
      else setError(e.message || "Error al cargar jugadores");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [draftId]);

  useEffect(() => {
  if (notStarted) return;

  const sseUrl = `${import.meta.env.VITE_API_URL}/draft/${draftId}/players/stream`;

  const evtSource = new EventSource(sseUrl);

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const list = data.map(r => ({
        id: r.id,
        clause: r.clause ?? 0,
        player: {
          id: r.player_id,
          name: r.name,
          position: r.position,
          element: r.element
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

  const byPos = useMemo(() => {
    const map = { GK: [], DF: [], MF: [], FW: [] };
    for (const it of players) map[it.player.position]?.push(it);
    for (const k of Object.keys(map)) map[k].sort((a,b)=>(a.order??1e9)-(b.order??1e9));
    return map;
  }, [players]);

  const onStart = async () => {
    setStarting(true); setError("");
    try { await startDraft(draftId); await load(); } 
    catch (e) { setError(e.message || "No se pudo iniciar el draft"); }
    finally { setStarting(false); }
  };

  const onFinish = async () => {
    setFinishing(true); setError("");
    try { await finishDraft(draftId); } 
    catch (e) { setError(e.message || "No se pudo finalizar el draft"); }
    finally { setFinishing(false); }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-8">
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
          <p className="text-white/70">Inicia el draft para asignar orden y ver a los jugadores por posición.</p>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            onClick={onStart}
            disabled={starting}
            className="rounded-lg bg-cyan-400 text-black px-3 py-1.5 font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {starting ? "Iniciando…" : "Iniciar draft"}
          </button>
          <button
            onClick={onFinish}
            disabled={finishing}
            className="rounded-lg bg-red-500 text-white px-3 py-1.5 font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {finishing ? "Finalizando…" : "Finalizar draft"}
          </button>
          <button
            onClick={load}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15"
          >
            Recargar
          </button>
        </div>
      </header>

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
          {(["GK","DF","MF","FW"]).map(pos => (
            <section key={pos} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xl font-bold">{POS_LABEL[pos]}</h2>
                <span className="text-xs rounded-full px-2 py-0.5 bg-white/10 border border-white/10">
                  {byPos[pos].length}
                </span>
              </div>
              {byPos[pos].length === 0 ? (
                <div className="text-white/60">No hay jugadores en esta posición.</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {byPos[pos].map(it => <PlayerRow key={it.id} item={it} />)}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
