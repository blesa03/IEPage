import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getLineup, saveLineup } from "../api/team";
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
const badgeClass = (el) => ELEMENT_STYLES[el] || ELEMENT_STYLES.default;

function toNumber(n) {
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/* ---------- Player Card (azulada + foco inferior sin bordes redondeados) ---------- */
function PlayerCard({ player }) {
  const value =
    "value" in player ? toNumber(player.value).toLocaleString() + "€" : "";

  return (
    <div
      className={[
        "relative w-24 sm:w-28 rounded-2xl",
        // Fondo original translúcido azulado
        "bg-white/10 backdrop-blur-md",
        // Borde y aro suaves tipo cristal
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

      {/* Contenedor de imagen con efecto foco desde abajo (sin bordes redondeados) */}
      <div className="relative mx-auto w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] overflow-hidden bg-white/20">
        {/* Foco inferior (gradiente hacia arriba) */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/30 via-white/10 to-transparent" />
        {player.sprite ? (
          <img
            src={player.sprite}
            alt={player.name}
            className="absolute inset-0 m-auto w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 m-auto w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] bg-white/10" />
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
function SortablePlayer({ id, player }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
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

/* ---------- Formaciones ---------- */
const FORMATIONS = {
  "4-4-2": [
    { top: 9, left: 35 },
    { top: 9, left: 65 },
    { top: 28, left: 18 },
    { top: 28, left: 42 },
    { top: 28, left: 58 },
    { top: 28, left: 82 },
    { top: 53, left: 16 },
    { top: 53, left: 38 },
    { top: 53, left: 62 },
    { top: 53, left: 84 },
    { top: 83, left: 50 },
  ],
  "4-3-3": [
    { top: 9, left: 20 },
    { top: 9, left: 50 },
    { top: 9, left: 80 },
    { top: 30, left: 30 },
    { top: 30, left: 50 },
    { top: 30, left: 70 },
    { top: 55, left: 16 },
    { top: 55, left: 38 },
    { top: 55, left: 62 },
    { top: 55, left: 84 },
    { top: 83, left: 50 },
  ],
  "3-5-2": [
    { top: 9, left: 35 },
    { top: 9, left: 65 },
    { top: 26, left: 12 },
    { top: 26, left: 29 },
    { top: 26, left: 50 },
    { top: 26, left: 71 },
    { top: 26, left: 88 },
    { top: 56, left: 30 },
    { top: 56, left: 50 },
    { top: 56, left: 70 },
    { top: 83, left: 50 },
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
    const rect = e.active.rect?.current?.translated || e.active.rect?.current?.initial;
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
                  <SortablePlayer id={`s-${p.id}`} player={p} />
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
                  <SortablePlayer key={`b-${p.id}`} id={`b-${p.id}`} player={p} />
                ))}
              </div>
            </DroppableList>
          </section>

          <section className="bg-white/5 rounded-xl p-4 shadow ring-1 ring-white/10 border border-white/10">
            <h2 className="text-xl font-semibold mb-3">Reserva</h2>
            <DroppableList id="reserves" itemsIds={team.reserves.map((p) => `r-${p.id}`)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.reserves.map((p) => (
                  <SortablePlayer key={`r-${p.id}`} id={`r-${p.id}`} player={p} />
                ))}
              </div>
            </DroppableList>
          </section>
        </div>

        {/* Overlay */}
        <DragOverlay>
          {activeId ? (
            (() => {
              const prefix = activeId[0];
              const key = prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
              const idNum = parseInt(activeId.split("-")[1]);
              const player = team[key].find((p) => p.id === idNum);
              return player ? (
                <div style={overlayStyle}>
                  <PlayerCard player={player} />
                </div>
              ) : null;
            })()
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}