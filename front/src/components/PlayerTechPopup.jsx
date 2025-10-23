import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  getPlayerTechniques,
  getTechniquesCatalog,
  addPlayerTechnique,
  deletePlayerTechnique,
  reorderPlayerTechniques,
} from "../api/team";

const pill = "text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10";

export default function PlayerTechPopup({
  open,
  onClose,
  draftId,
  players,        // array plano de jugadores {id,name,gender,position,element,sprite,value}
  index,          // índice actual dentro de players
  setIndex,       // setIndex(nuevo)
}) {
  const player = players?.[index];
  const dpId = player?.id;

  const prevIdx = (index - 1 + players.length) % players.length;
  const nextIdx = (index + 1) % players.length;

  const [loading, setLoading] = useState(false);
  const [techs, setTechs] = useState([]);          // técnicas actuales (máx 6), con {id,name,type,element,power,order}
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");

  const remaining = useMemo(() => Math.max(0, 6 - techs.length), [techs]);

  // carga técnicas del jugador al abrir/cambiar jugador
  useEffect(() => {
    if (!open || !dpId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getPlayerTechniques(draftId, dpId);
        setTechs((data.techniques || []).sort((a,b)=>a.order-b.order));
      } catch (e) {
        toast.error(e.message || "Error cargando ST");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, dpId, draftId]);

  async function loadCatalog() {
    try {
      const res = await getTechniquesCatalog(draftId, dpId, {
        search,
        excludeAssigned: true, // no duplicadas en UI
      });
      setCatalog(res.results || []);
    } catch (e) {
      toast.error(e.message || "Error cargando catálogo");
    }
  }

  async function handleAdd(tech) {
    try {
      if (techs.length < 6) {
        const res = await addPlayerTechnique(draftId, dpId, tech.id);
        const merged = [...techs, res.added].sort((a,b)=>a.order-b.order);
        setTechs(merged);
        toast.success("SuperTécnica añadida");
        loadCatalog();
        return;
      }
      // lleno: pedir reemplazo (intercambio)
      const idxStr = window.prompt(
        `Ya tienes 6/6. ¿Cuál reemplazas?\n` +
        techs.map((t,i)=>`${i+1}) ${t.name}`).join("\n") +
        `\n\nEscribe un número 1-6`
      );
      const idx = Number(idxStr) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx > 5) return;

      const target = techs[idx];
      await deletePlayerTechnique(draftId, dpId, target.id);
      // mantener el hueco con el mismo order
      await addPlayerTechnique(draftId, dpId, tech.id, target.order);

      // recargar limpio
      const fresh = (await getPlayerTechniques(draftId, dpId)).techniques || [];
      setTechs(fresh.sort((a,b)=>a.order-b.order));
      toast.success(`Reemplazada '${target.name}' por '${tech.name}'`);
      loadCatalog();
    } catch (e) {
      toast.error(e.message || "No se pudo añadir");
    }
  }

  async function handleDelete(t) {
    try {
      await deletePlayerTechnique(draftId, dpId, t.id);
      // compactación la hace el back: refrescamos
      const fresh = (await getPlayerTechniques(draftId, dpId)).techniques || [];
      setTechs(fresh.sort((a,b)=>a.order-b.order));
      toast.success("Eliminada");
      loadCatalog();
    } catch (e) {
      toast.error(e.message || "Error al eliminar");
    }
  }

  async function move(i, dir) {
    const j = i + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= techs.length) return;
    const copy = [...techs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setTechs(copy.map((t, k) => ({ ...t, order: k })));
  }

  async function handleSave() {
    try {
      await reorderPlayerTechniques(draftId, dpId, techs.map(t=>t.id));
      toast.success("Guardado");
      onClose();
    } catch (e) {
      toast.error(e.message || "Error al guardar");
    }
  }

  if (!open || !player) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center">
      <div className="w-[900px] max-w-[95vw] bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl">
        {/* Header navegación */}
        <div className="flex items-center justify-between px-5 pt-4">
          <button
            onClick={() => setIndex(prevIdx)}
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/20"
            title="Jugador anterior"
          >
            {players[prevIdx]?.name || "—"}
          </button>

          <button
            onClick={onClose}
            className="rounded-full w-9 h-9 bg-white/10 hover:bg-white/20 grid place-items-center"
            title="Cerrar"
          >
            ✕
          </button>

          <button
            onClick={() => setIndex(nextIdx)}
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/20"
            title="Siguiente jugador"
          >
            {players[nextIdx]?.name || "—"}
          </button>
        </div>

        {/* Tarjeta de info */}
        <div className="px-6 pb-5">
          <div className="mt-4 grid grid-cols-[220px_1fr] gap-4 rounded-2xl overflow-hidden border border-white/10">
            {/* Imagen */}
            <div className="bg-white/5 p-6 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-white/10 flex items-end justify-center overflow-hidden">
                {player.sprite ? (
                  <img src={player.sprite} alt={player.name} className="w-36 h-36 object-contain object-bottom" />
                ) : (
                  <div className="w-36 h-36" />
                )}
              </div>
            </div>

            {/* Datos */}
            <div className="bg-white/5 p-6">
              <h3 className="text-2xl font-semibold">{player.name}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={pill}>Sexo: {player.gender || "—"}</span>
                <span className={pill}>Posición: {player.position || "—"}</span>
                <span className={pill}>Elemento: {player.element || "—"}</span>
                {"value" in player && (
                  <span className={pill}>
                    Valor: {Number(player.value || 0).toLocaleString()}€
                  </span>
                )}
              </div>
            </div>

            {/* Línea separadora completa */}
            <div className="col-span-2 h-[1px] bg-white/10" />
            {/* Lista ST */}
            <div className="col-span-2 px-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">SuperTécnicas ({techs.length}/6)</h4>
                <span className="text-sm text-white/70">Slots libres: {remaining}</span>
              </div>

              {loading ? (
                <div className="py-6 text-center">Cargando…</div>
              ) : (
                <ul className="divide-y divide-white/10 rounded-xl overflow-hidden border border-white/10">
                  {[0,1,2,3,4,5].map((slot) => {
                    const t = techs[slot];
                    return (
                      <li key={slot} className="flex items-center justify-between px-4 py-3 bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <span className="text-white/50 w-6 text-right">{slot+1}.</span>
                          {t ? (
                            <>
                              <span className="font-medium">{t.name}</span>
                              <span className={pill}>{t.type}</span>
                              <span className={pill}>{t.element}</span>
                              <span className="text-xs text-white/70">Poder: {t.power}</span>
                            </>
                          ) : (
                            <span className="text-white/50">— Vacío —</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {t && (
                            <>
                              <button onClick={() => move(slot, "up")} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">↑</button>
                              <button onClick={() => move(slot, "down")} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">↓</button>
                              <button onClick={() => handleDelete(t)} className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500">Eliminar</button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Footer botones */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => { setCatalogOpen(true); loadCatalog(); }}
              className="rounded-xl px-4 py-2 bg-sky-600 hover:bg-sky-500"
            >
              Añadir/Intercambiar ST
            </button>

            <button
              onClick={handleSave}
              className="rounded-xl px-6 py-2 bg-emerald-600 hover:bg-emerald-500"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Panel catálogo simple */}
      {catalogOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/70 flex items-center justify-center">
          <div className="w-[720px] max-w-[95vw] bg-slate-900 text-white rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Catálogo (sin duplicadas)</h4>
              <button onClick={() => setCatalogOpen(false)} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20">Cerrar</button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Buscar por nombre…"
                className="px-3 py-2 rounded bg-white text-black flex-1"
              />
              <button onClick={loadCatalog} className="px-3 py-2 rounded bg-white/10 hover:bg-white/20">
                Buscar
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-auto divide-y divide-white/10">
              {catalog.map((t)=>(
                <div key={t.id} className="flex items-center justify-between py-2">
                  <div className="space-x-2">
                    <span className="font-medium">{t.name}</span>
                    <span className={pill}>{t.type}</span>
                    <span className={pill}>{t.element}</span>
                    <span className="text-xs text-white/70">Poder: {t.power}</span>
                  </div>
                  <button
                    onClick={()=>handleAdd(t)}
                    className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500"
                  >
                    {techs.length < 6 ? "Añadir" : "Intercambiar…"}
                  </button>
                </div>
              ))}
              {catalog.length === 0 && <div className="py-6 text-center text-white/70">Sin resultados</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
