import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { myTeam } from "../api/team";

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
  Fire: "bg-red-500/20 text-red-200 ring-1 ring-inset ring-red-400/30",
  Wind: "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/30",
  Earth: "bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-400/30",
  Wood: "bg-lime-500/20 text-lime-200 ring-1 ring-inset ring-lime-400/30",
  default: "bg-white/15 text-white/80 ring-1 ring-inset ring-white/20",
};
const badgeClass = (el) => ELEMENT_STYLES[el] || ELEMENT_STYLES.default;

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = import.meta.env.VITE_API_ORIGIN || "";
  return `${base}${url}`;
}
function toNumber(n) {
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : 0;
}

/* ---------- Player Card (nuevo diseño) ---------- */
function PlayerCard({ player }) {
  const value = "value" in player ? toNumber(player.value).toLocaleString() + "€" : "";

  return (
    <div
      className={[
        "relative w-28 sm:w-32",
        "rounded-2xl",
        "bg-white/10",
        "backdrop-blur-md",
        "border border-white/15",
        "ring-1 ring-white/10",
        "shadow-lg",
        "hover:shadow-xl hover:bg-white/12 transition",
      ].join(" ")}
    >
      {/* Badges superiores */}
      <div className="absolute top-2 left-2 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/15 border border-white/20 text-white/90">
        {player.position}
      </div>
      <div
        className={[
          "absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full",
          badgeClass(player.element),
        ].join(" ")}
      >
        {player.element || "—"}
      </div>

      {/* Imagen en recuadro más claro */}
      <div className="p-2">
        <div className="rounded-xl bg-white/20 border border-white/20 aspect-square flex items-center justify-center overflow-hidden">
          {player.sprite ? (
            <img
              src={player.sprite}
              alt={player.name}
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-white/15" />
          )}
        </div>

        {/* Nombre y valor */}
        <div className="mt-2 text-center px-1">
          <div className="text-sm font-semibold truncate">{player.name}</div>
          {value && <div className="text-xs text-white/70 mt-0.5">{value}</div>}
        </div>
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
    width: "100%",
    minWidth: "100%",
    boxSizing: "border-box",
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
  const [activeId, setActiveId] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState({ width: 0 });
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await myTeam(draftId);
        const players = (data.players || []).map((p) => ({
          ...p,
          element: p.element === "Air" ? "Wind" : p.element, // normalize
          sprite: normalizeUrl(p.sprite),
          value: toNumber(p.value),
        }));
        setTeam({
          starters: players.slice(0, 11),
          bench: players.slice(11, 16),
          reserves: players.slice(16),
          name: data.name ?? "",
          budget: data.budget ?? "0",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [draftId]);

  const totals = useMemo(() => {
    const all = [...team.starters, ...team.bench, ...team.reserves];
    const totalValue = all.reduce((a, p) => a + toNumber(p.value), 0);
    const budgetNum = toNumber(team.budget);
    const remaining = Math.max(budgetNum - totalValue, 0);
    return {
      totalValue,
      budgetNum,
      remaining,
      byBlock: {
        starters: team.starters.reduce((a, p) => a + toNumber(p.value), 0),
        bench: team.bench.reduce((a, p) => a + toNumber(p.value), 0),
        reserves: team.reserves.reduce((a, p) => a + toNumber(p.value), 0),
      },
    };
  }, [team]);

  /* ---------- DnD helpers (swap) ---------- */
  const findItem = (id) => {
    const prefix = id[0];
    const key = prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
    const itemId = parseInt(id.split("-")[1]);
    const index = team[key].findIndex((p) => p.id === itemId);
    return { key, index, item: team[key][index] };
  };

  const collisionStrategy = (args) => {
    const c = pointerWithin(args);
    if (c.length > 0) return c;
    return rectIntersection(args);
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
      // Swap
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
        return next;
      });
      return;
    }

    // Si suelta sobre contenedor vacío (poco probable en starters), mover al final
    const containers = ["starters", "bench", "reserves"];
    const container = containers.find((c) => c === over.id);
    if (container) {
      // límites solo si no es swap
      const LIMITS = { starters: 11, bench: 5, reserves: Infinity };
      if (team[container].length >= LIMITS[container]) return;
      setTeam((prev) => {
        const next = { ...prev };
        const src = [...next[from.key]];
        const [player] = src.splice(from.index, 1);
        next[from.key] = src;
        next[container] = [...next[container], player];
        return next;
      });
    }
  };

  if (loading) {
    return (
      <main className="p-5 bg-slate-950 min-h-screen text-white flex items-center justify-center">
        Cargando equipo…
      </main>
    );
  }

  /* ---------- Layout del campo (posiciones 4-4-2 por defecto) ---------- */
  const fieldPositions = [
    { top: "5%", left: "50%" }, // GK
    { top: "22%", left: "15%" },
    { top: "22%", left: "35%" },
    { top: "22%", left: "65%" },
    { top: "22%", left: "85%" },
    { top: "45%", left: "22%" },
    { top: "45%", left: "40%" },
    { top: "45%", left: "60%" },
    { top: "45%", left: "78%" },
    { top: "70%", left: "40%" },
    { top: "70%", left: "60%" },
  ];

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      <div className="max-w-6xl mx-auto text-center mb-6">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold mt-4">{team.name}</h1>
        <p className="text-white/70 mt-1">
          Presupuesto: {totals.budgetNum.toLocaleString()}€ · Valor:{" "}
          {totals.totalValue.toLocaleString()}€ · Restante:{" "}
          {totals.remaining.toLocaleString()}€
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* CAMPO DE FÚTBOL */}
        <div
          className="relative mx-auto rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 border border-white/10"
          style={{
            backgroundImage: "url('/campo_futbol.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            width: "100%",
            maxWidth: "780px",
            height: "780px",
          }}
        >
          <DroppableList id="starters" itemsIds={team.starters.map((p) => `s-${p.id}`)}>
            {team.starters.map((p, i) => (
              <div
                key={`s-${p.id}`}
                style={{
                  position: "absolute",
                  top: fieldPositions[i]?.top,
                  left: fieldPositions[i]?.left,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <SortablePlayer id={`s-${p.id}`} player={p} />
              </div>
            ))}
          </DroppableList>
        </div>

        {/* BANQUILLO / RESERVA */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6 mt-10">
          <section className="bg-white/5 rounded-xl p-4 shadow ring-1 ring-white/10 border border-white/10">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Banquillo</h2>
              <span className="text-xs text-white/60">
                {team.bench.length}/5 · Valor: {totals.byBlock.bench.toLocaleString()}€
              </span>
            </header>
            <DroppableList id="bench" itemsIds={team.bench.map((p) => `b-${p.id}`)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.bench.map((p) => (
                  <SortablePlayer key={`b-${p.id}`} id={`b-${p.id}`} player={p} />
                ))}
              </div>
            </DroppableList>
          </section>

          <section className="bg-white/5 rounded-xl p-4 shadow ring-1 ring-white/10 border border-white/10">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Reserva</h2>
              <span className="text-xs text-white/60">
                {team.reserves.length} jugadores · Valor:{" "}
                {totals.byBlock.reserves.toLocaleString()}€
              </span>
            </header>
            <DroppableList id="reserves" itemsIds={team.reserves.map((p) => `r-${p.id}`)}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.reserves.map((p) => (
                  <SortablePlayer key={`r-${p.id}`} id={`r-${p.id}`} player={p} />
                ))}
              </div>
            </DroppableList>
          </section>
        </div>

        {/* Overlay (ignoramos issue visual por ahora) */}
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