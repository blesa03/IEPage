import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getLineup,
  saveLineup,
  myTeam,
  getPlayerTechniques,
  getTechniquesCatalog,
  addPlayerTechnique,
  deletePlayerTechnique,
  reorderPlayerTechniques,
} from "../api/team";
import toast, { Toaster } from "react-hot-toast";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ---------- Estilos / badges ---------- */
const ELEMENT_STYLES = {
  Fire: "bg-rose-700/35 text-rose-200 ring-1 ring-rose-400/40",
  Wind: "bg-teal-700/35 text-teal-200 ring-1 ring-teal-400/40",
  Earth: "bg-amber-700/35 text-amber-200 ring-1 ring-amber-400/40",
  Wood: "bg-green-700/35 text-green-200 ring-1 ring-green-400/40",
  default: "bg-slate-700/35 text-white/85 ring-1 ring-slate-400/40",
};
const GENDER_LABEL = { M: "Masculino", F: "Femenino" };
const badgeClass = (el) => ELEMENT_STYLES[el] || ELEMENT_STYLES.default;
const pill = "text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10";

function toNumber(n) {
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : 0;
}

useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      const data = await getLineup(draftId);
      setFormation(data.formation || "4-4-2");
      setTeam(prev => ({
        ...prev,
        starters: data.starters || [],
        bench: data.bench || [],
        reserves: data.reserves || [],
        name: data.team || "",
        // data.budget no existe en este endpoint; lo rellenamos luego con myTeam
      }));

      // ← Presupuesto del equipo
      const t = await myTeam(draftId);
      setTeam(prev => ({ ...prev, budget: t?.budget || 0 }));
    } catch (err) {
      console.error("Error al cargar alineación:", err);
      toast.error("Error al cargar la alineación");
    } finally {
      setLoading(false);
    }
  };
  load();
}, [draftId]);
const allPlayers = useMemo(
  () => [...team.starters, ...team.bench, ...team.reserves],
  [team]
);

const squadValue = useMemo(
  () => allPlayers.reduce((acc, p) => acc + Number(p?.value || 0), 0),
  [allPlayers]
);

/* ---------- Player Card ---------- */
function PlayerCard({ player }) {
  const value =
    "value" in player ? toNumber(player.value).toLocaleString() + "€" : "";

  return (
    <div
      className={[
        "relative w-24 sm:w-28 rounded-2xl",
        "bg-white/10 backdrop-blur-md",
        "border border-white/15 ring-1 ring-white/10",
        "shadow-lg hover:shadow-xl hover:bg-white/12 transition",
        "px-2 pt-5 pb-2",
      ].join(" ")}
    >
      {/* Badges superiores */}
      <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-white/90">
        {player.position}
      </div>
      <div
        className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md ${badgeClass(
          player.element
        )}`}
      >
        {player.element || "—"}
      </div>

      {/* Contenedor de imagen */}
      <div
        className="relative mx-auto w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] overflow-hidden bg-white/20 flex items-end justify-center"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.12) 45%, rgba(255,255,255,0) 60%)",
        }}
      >
        {player.sprite ? (
          <img
            src={player.sprite}
            alt={player.name}
            className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] object-contain object-bottom"
            loading="lazy"
          />
        ) : (
          <div className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] bg-white/10" />
        )}
      </div>

      {/* Nombre y valor */}
      <div className="mt-1 text-center px-1">
        <div className="text-[13px] font-semibold truncate">{player.name}</div>
        {value && <div className="text-[11px] text-white/70 mt-0.5">{value}</div>}
      </div>
    </div>
  );
}

/* ---------- Sortable wrapper ---------- */
function SortablePlayer({ id, player, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
      <PlayerCard player={player} />
    </div>
  );
}

/* ---------- Droppable list ---------- */
function DroppableList({ id, itemsIds, children }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef}>
      <SortableContext items={itemsIds} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

/* ---------- Popup de ST por jugador ---------- */
function PlayerTechPopup({
  open,
  onClose,
  draftId,
  players,
  index,
  setIndex,
}) {
  const player = players?.[index];
  const dpId = player?.id;

  const prevIdx = (index - 1 + players.length) % players.length;
  const nextIdx = (index + 1) % players.length;

  const [loading, setLoading] = useState(false);
  const [techs, setTechs] = useState([]); // {id,name,type,element,power,order}
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");

  const remaining = useMemo(() => Math.max(0, 6 - techs.length), [techs]);

  useEffect(() => {
    if (!open || !dpId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getPlayerTechniques(draftId, dpId);
        setTechs((data.techniques || []).sort((a, b) => a.order - b.order));
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
        excludeAssigned: true,
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
        const merged = [...techs, res.added].sort((a, b) => a.order - b.order);
        setTechs(merged);
        toast.success("SuperTécnica añadida");
        loadCatalog();
        return;
      }
      // Si está lleno: intercambio simple con prompt
      const idxStr = window.prompt(
        `Ya tienes 6/6. ¿Cuál reemplazas?\n` +
          techs.map((t, i) => `${i + 1}) ${t.name}`).join("\n") +
          `\n\nEscribe un número 1-6`
      );
      const idx = Number(idxStr) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx > 5) return;

      const target = techs[idx];
      await deletePlayerTechnique(draftId, dpId, target.id);
      await addPlayerTechnique(draftId, dpId, tech.id, target.order);

      const fresh = (await getPlayerTechniques(draftId, dpId)).techniques || [];
      setTechs(fresh.sort((a, b) => a.order - b.order));
      toast.success(`Reemplazada '${target.name}' por '${tech.name}'`);
      loadCatalog();
    } catch (e) {
      toast.error(e.message || "No se pudo añadir");
    }
  }

  async function handleDelete(t) {
    try {
      await deletePlayerTechnique(draftId, dpId, t.id);
      const fresh = (await getPlayerTechniques(draftId, dpId)).techniques || [];
      setTechs(fresh.sort((a, b) => a.order - b.order));
      toast.success("Eliminada");
      loadCatalog();
    } catch (e) {
      toast.error(e.message || "Error al eliminar");
    }
  }

  function move(i, dir) {
    const j = i + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= techs.length) return;
    const copy = [...techs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setTechs(copy.map((t, k) => ({ ...t, order: k })));
  }

  async function handleSave() {
    try {
      await reorderPlayerTechniques(draftId, dpId, techs.map((t) => t.id));
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

        {/* Tarjeta de info + lista */}
        <div className="px-6 pb-5">
          <div className="mt-4 grid grid-cols-[220px_1fr] gap-4 rounded-2xl overflow-hidden border border-white/10">
            {/* Imagen */}
            <div className="bg-white/5 p-6 flex items-center justify-center">
              <div className="w-40 h-40 rounded-full bg-white/10 flex items-end justify-center overflow-hidden">
                {player.sprite ? (
                  <img
                    src={player.sprite}
                    alt={player.name}
                    className="w-36 h-36 object-contain object-bottom"
                  />
                ) : (
                  <div className="w-36 h-36" />
                )}
              </div>
            </div>

            {/* Datos */}
            <div className="bg-white/5 p-6">
              {/* Título = nombre del jugador */}
              <h3 className="text-2xl font-semibold">{player.name}</h3>

              {/* Info en 2 columnas */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="px-3 py-2 rounded border border-white/10 bg-white/10">
                  <span className="text-white/60">Sexo:</span>{" "}
                  <span className="font-medium">{GENDER_LABEL[player.gender] || "—"}</span>
                </div>

                <div className="px-3 py-2 rounded border border-white/10 bg-white/10">
                  <span className="text-white/60">Posición:</span>{" "}
                  <span className="font-medium">{player.position || "—"}</span>
                </div>

                <div className="px-3 py-2 rounded border border-white/10 bg-white/10">
                  <span className="text-white/60">Elemento:</span>{" "}
                  <span className="font-medium">{player.element || "—"}</span>
                </div>

                <div className="px-3 py-2 rounded border border-white/10 bg-white/10">
                  <span className="text-white/60">Valor:</span>{" "}
                  <span className="font-medium">
                    {Number(player.value || 0).toLocaleString()}€
                  </span>
                </div>
              </div>
            </div>

            {/* Separador */}
            <div className="col-span-2 h-[1px] bg-white/10" />

            {/* Lista ST */}
            <div className="col-span-2 px-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">SuperTécnicas ({techs.length}/6)</h4>
                <span className="text-sm text-white/70">
                  Slots libres: {remaining}
                </span>
              </div>

              {loading ? (
                <div className="py-6 text-center">Cargando…</div>
              ) : (
                <ul className="divide-y divide-white/10 rounded-xl overflow-hidden border border-white/10">
                  {[0, 1, 2, 3, 4, 5].map((slot) => {
                    const t = techs[slot];
                    return (
                      <li
                        key={slot}
                        className="flex items-center justify-between px-4 py-3 bg-white/[0.03]"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white/50 w-6 text-right">
                            {slot + 1}.
                          </span>
                          {t ? (
                            <>
                              <span className="font-medium">{t.name}</span>
                              <span className={pill}>{t.type}</span>
                              <span className={pill}>{t.element}</span>
                              <span className="text-xs text-white/70">
                                Poder: {t.power}
                              </span>
                            </>
                          ) : (
                            <span className="text-white/50">— Vacío —</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {t && (
                            <>
                              <button
                                onClick={() => move(slot, "up")}
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => move(slot, "down")}
                                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() => handleDelete(t)}
                                className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
                              >
                                Eliminar
                              </button>
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
              onClick={() => {
                setCatalogOpen(true);
                loadCatalog();
              }}
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

      {/* Panel Catálogo */}
      {catalogOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/70 flex items-center justify-center">
          <div className="w-[720px] max-w-[95vw] bg-slate-900 text-white rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Catálogo (sin duplicadas)</h4>
              <button
                onClick={() => setCatalogOpen(false)}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre…"
                className="px-3 py-2 rounded bg-white text-black flex-1"
              />
              <button
                onClick={loadCatalog}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
              >
                Buscar
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-auto divide-y divide-white/10">
              {catalog.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2">
                  <div className="space-x-2">
                    <span className="font-medium">{t.name}</span>
                    <span className={pill}>{t.type}</span>
                    <span className={pill}>{t.element}</span>
                    <span className="text-xs text-white/70">
                      Poder: {t.power}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAdd(t)}
                    className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500"
                  >
                    {techs.length < 6 ? "Añadir" : "Intercambiar…"}
                  </button>
                </div>
              ))}
              {catalog.length === 0 && (
                <div className="py-6 text-center text-white/70">Sin resultados</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Formaciones ---------- */
const FORMATIONS = {
  "4-4-2": [
    { top: 15, left: 35 },
    { top: 15, left: 65 },
    { top: 40, left: 18 },
    { top: 40, left: 42 },
    { top: 40, left: 58 },
    { top: 40, left: 82 },
    { top: 65, left: 16 },
    { top: 65, left: 38 },
    { top: 65, left: 62 },
    { top: 65, left: 84 },
    { top: 90, left: 50 },
  ],
  "4-3-3": [
    { top: 15, left: 20 },
    { top: 15, left: 50 },
    { top: 15, left: 80 },
    { top: 40, left: 30 },
    { top: 40, left: 50 },
    { top: 40, left: 70 },
    { top: 65, left: 16 },
    { top: 65, left: 38 },
    { top: 65, left: 62 },
    { top: 65, left: 84 },
    { top: 90, left: 50 },
  ],
  "3-5-2": [
    { top: 15, left: 35 },
    { top: 15, left: 65 },
    { top: 40, left: 12 },
    { top: 40, left: 29 },
    { top: 40, left: 50 },
    { top: 40, left: 71 },
    { top: 40, left: 88 },
    { top: 65, left: 30 },
    { top: 65, left: 50 },
    { top: 65, left: 70 },
    { top: 90, left: 50 },
  ],
};

/* ---------- Componente principal ---------- */
export default function Team() {
  const { draftId } = useParams();
  const nav = useNavigate();

  const [team, setTeam] = useState({
    starters: [],
    bench: [],
    reserves: [],
    name: "",
    budget: "0",
  });
  const [formation, setFormation] = useState("4-4-2");
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState({ width: 0 });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Popup ST
  const [techOpen, setTechOpen] = useState(false);
  const [techIndex, setTechIndex] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  /* ---------- Cargar alineación ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getLineup(draftId);
        setFormation(data.formation || "4-4-2");
        setTeam({
          starters: data.starters || [],
          bench: data.bench || [],
          reserves: data.reserves || [],
          name: data.team || "",
          budget: data.budget || "0",
        });
      } catch (err) {
        console.error("Error al cargar alineación:", err);
        toast.error("Error al cargar la alineación");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [draftId]);

  /* ---------- Guardar alineación ---------- */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        formation,
        starters: team.starters.map((p, i) => ({ id: p.id, order: i })),
        bench: team.bench.map((p, i) => ({ id: p.id, order: i })),
        reserves: team.reserves.map((p, i) => ({ id: p.id, order: i })),
      };
      await saveLineup(draftId, payload);
      setHasChanges(false);
      toast.success("Alineación guardada correctamente");
    } catch (err) {
      console.error("Error al guardar alineación:", err);
      toast.error("Error al guardar la alineación");
    } finally {
      setSaving(false);
    }
  }, [draftId, formation, team]);

  /* ---------- Navegación del popup: lista plana ---------- */
  const allPlayers = useMemo(
    () => [...team.starters, ...team.bench, ...team.reserves],
    [team]
  );

  /* ---------- Drag & Drop ---------- */
  const findItem = (id) => {
    const prefix = id[0];
    const key = prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
    const itemId = parseInt(id.split("-")[1]);
    const index = team[key].findIndex((p) => p.id === itemId);
    return { key, index, item: team[key][index] };
  };

  const handleDragStart = (e) => {
    setActiveId(e.active.id);
    const rect =
      e.active.rect?.current?.translated || e.active.rect?.current?.initial;
    if (rect?.width) setOverlayStyle({ width: `${rect.width}px` });
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveId(null);
    setOverlayStyle({ width: 0 });
    if (!over) return;

    const from = findItem(active.id);
    const to = findItem(over.id);

    if (to.item) {
      setTeam((prev) => {
        const next = { ...prev };
        const fromList = [...next[from.key]];
        const toList = from.key === to.key ? fromList : [...next[to.key]];
        const a = from.item;
        const b = to.item;
        fromList[from.index] = b;
        toList[to.index] = a;
        next[from.key] = fromList;
        next[to.key] = toList;
        setHasChanges(true);
        return next;
      });
      return;
    }

    const containers = ["starters", "bench", "reserves"];
    const container = containers.find((c) => c === over.id);
    if (container) {
      const LIMITS = { starters: 11, bench: 5, reserves: Infinity };
      if (team[container].length >= LIMITS[container]) return;
      setTeam((prev) => {
        const next = { ...prev };
        const src = [...next[from.key]];
        const [player] = src.splice(from.index, 1);
        next[from.key] = src;
        next[container] = [...next[container], player];
        setHasChanges(true);
        return next;
      });
    }
  };

  const collisionStrategy = (args) => {
    const c = pointerWithin(args);
    if (c.length > 0) return c;
    return rectIntersection(args);
  };

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <main className="p-5 bg-slate-950 min-h-screen text-white flex items-center justify-center">
        <Toaster />
        Cargando equipo…
      </main>
    );
  }

  const fieldPositions = FORMATIONS[formation] || FORMATIONS["4-4-2"];

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      {/* Toasts */}
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />

      <div className="max-w-6xl mx-auto text-center mb-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => nav(-1)}
            className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
          >
            ← Volver
          </button>

          <div className="flex items-center gap-3">
            <select
              className="bg-white text-black border border-slate-300 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              value={formation}
              onChange={(e) => {
                setFormation(e.target.value);
                setHasChanges(true);
              }}
            >
              <option>4-4-2</option>
              <option>4-3-3</option>
              <option>3-5-2</option>
            </select>

            <button
              disabled={!hasChanges || saving}
              onClick={handleSave}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                hasChanges
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-white/10 text-white/60 cursor-not-allowed"
              }`}
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold mt-4">{team.name}</h1>
        <div className="mt-2 flex items-center justify-center gap-3 text-sm">
        <span className="px-3 py-1 rounded bg-white/10 border border-white/10">
          Presupuesto: {Number(team.budget || 0).toLocaleString()}€
        </span>
        <span className="px-3 py-1 rounded bg-white/10 border border-white/10">
          Valor plantilla: {squadValue.toLocaleString()}€
        </span>
      </div>
      </div>

      {/* Campo de fútbol */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="relative mx-auto rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 border border-white/10"
          style={{
            backgroundImage:
              "url('https://i.pinimg.com/564x/02/f0/a0/02f0a04d141f9159906da402d942ec83.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            width: "100%",
            maxWidth: "780px",
            height: "780px",
          }}
        >
          <DroppableList id="starters" itemsIds={team.starters.map((p) => `s-${p.id}`)}>
            {team.starters.map((p, i) => {
              const pos = fieldPositions[i] || { top: 50, left: 50 };
              return (
                <div
                  key={`s-${p.id}`}
                  style={{
                    position: "absolute",
                    top: `${pos.top}%`,
                    left: `${pos.left}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <SortablePlayer
                    id={`s-${p.id}`}
                    player={p}
                    onClick={() => {
                      const idx = allPlayers.findIndex((x) => x.id === p.id);
                      if (idx >= 0) {
                        setTechIndex(idx);
                        setTechOpen(true);
                      }
                    }}
                  />
                </div>
              );
            })}
          </DroppableList>
        </div>

        {/* Banquillo / Reserva */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 mt-10">
          <section className="bg-white/5 rounded-xl p-4 shadow ring-1 ring-white/10 border border-white/10">
            <h2 className="text-xl font-semibold mb-3">Banquillo</h2>
            <DroppableList id="bench" itemsIds={team.bench.map((p) => `b-${p.id}`)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.bench.map((p) => (
                  <SortablePlayer
                    key={`b-${p.id}`}
                    id={`b-${p.id}`}
                    player={p}
                    onClick={() => {
                      const idx = allPlayers.findIndex((x) => x.id === p.id);
                      if (idx >= 0) {
                        setTechIndex(idx);
                        setTechOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
            </DroppableList>
          </section>

          <section className="bg-white/5 rounded-xl p-4 shadow ring-1 ring-white/10 border border-white/10">
            <h2 className="text-xl font-semibold mb-3">Reserva</h2>
            <DroppableList id="reserves" itemsIds={team.reserves.map((p) => `r-${p.id}`)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.reserves.map((p) => (
                  <SortablePlayer
                    key={`r-${p.id}`}
                    id={`r-${p.id}`}
                    player={p}
                    onClick={() => {
                      const idx = allPlayers.findIndex((x) => x.id === p.id);
                      if (idx >= 0) {
                        setTechIndex(idx);
                        setTechOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
            </DroppableList>
          </section>
        </div>

        {/* Overlay */}
        <DragOverlay>
          {activeId
            ? (() => {
                const prefix = activeId[0];
                const key =
                  prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
                const idNum = parseInt(activeId.split("-")[1]);
                const player = team[key].find((p) => p.id === idNum);
                return player ? (
                  <div style={overlayStyle}>
                    <PlayerCard player={player} />
                  </div>
                ) : null;
              })()
            : null}
        </DragOverlay>
      </DndContext>

      {/* Popup ST */}
      {techOpen && (
        <PlayerTechPopup
          open={techOpen}
          onClose={() => setTechOpen(false)}
          draftId={draftId}
          players={allPlayers}
          index={techIndex}
          setIndex={setTechIndex}
        />
      )}
    </main>
  );
}