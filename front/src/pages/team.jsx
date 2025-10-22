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
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ---------- Estilos de elemento ---------- */
const ELEMENT_STYLES = {
  Fire: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30",
  Wind: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  Earth: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  Wood: "bg-lime-500/15 text-lime-300 ring-1 ring-inset ring-lime-500/30",
  default: "bg-white/10 text-white/70 ring-1 ring-inset ring-white/20",
};
const badge = (el) => ELEMENT_STYLES[el] || ELEMENT_STYLES.default;

/* ---------- Funciones auxiliares ---------- */
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

/* ---------- Componente de fila de jugador ---------- */
function PlayerRow({ player }) {
  return (
    <div className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2 w-full">
      <div className="flex items-center gap-3 min-w-0">
        {player.sprite ? (
          <img
            src={player.sprite}
            alt={player.name}
            className="w-10 h-10 rounded object-cover shrink-0"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="truncate">{player.name}</p>
          <p className="text-xs text-white/50">{player.position}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge(player.element)}`}>
          {player.element || "—"}
        </span>
        {"value" in player && (
          <span className="text-white/70">
            {toNumber(player.value).toLocaleString()}€
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Sortable player ---------- */
function SortablePlayer({ id, player }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab",
    width: "100%",
    minWidth: "100%",
    boxSizing: "border-box",
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PlayerRow player={player} />
    </li>
  );
}

/* ---------- Contenedor droppable ---------- */
function DroppableList({ id, itemsIds, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[56px] rounded-lg border p-2 transition ${
        isOver ? "border-white/30 bg-white/5" : "border-white/10"
      }`}
    >
      <SortableContext items={itemsIds} strategy={rectSortingStrategy}>
        <ul className="space-y-2">{children}</ul>
      </SortableContext>
    </div>
  );
}

/* ---------- Skeleton ---------- */
function RowSkeleton() {
  return (
    <li className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-white/10" />
        <div className="h-4 w-28 bg-white/10 rounded" />
      </div>
      <div className="h-4 w-16 bg-white/10 rounded" />
      <div className="h-4 w-20 bg-white/10 rounded" />
    </li>
  );
}

/* ---------- Componente principal ---------- */
export default function Team() {
  const { draftId } = useParams();
  const nav = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState({ width: 0 });

  const LIMITS = { starters: 11, bench: 5, reserves: Infinity };
  const [team, setTeam] = useState({
    starters: [],
    bench: [],
    reserves: [],
    name: "",
    budget: "0",
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /* ---------- Cargar equipo ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await myTeam(draftId);
        const all = (data.players || []).map((p) => ({
          ...p,
          element: p.element === "Air" ? "Wind" : p.element, // ✅ Air → Wind
          sprite: normalizeUrl(p.sprite),
          value: toNumber(p.value),
        }));

        const starters = all.slice(0, 11);
        const bench = all.slice(11, 16);
        const reserves = all.slice(16);

        setTeam({
          starters,
          bench,
          reserves,
          name: data.name ?? "",
          budget: data.budget ?? "0",
        });
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar el equipo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [draftId]);

  /* ---------- Totales ---------- */
  const totals = useMemo(() => {
    const all = [...team.starters, ...team.bench, ...team.reserves];
    const totalValue = all.reduce((acc, p) => acc + toNumber(p.value), 0);
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

  /* ---------- Funciones auxiliares ---------- */
  const containers = ["starters", "bench", "reserves"];

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

  /* ---------- Drag & Drop ---------- */
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

    // 1. Si suelto sobre otro jugador -> SWAP
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
        return next;
      });
      return;
    }

    // 2. Si suelto en un contenedor vacío -> mover
    const container = containers.find((c) => c === over.id);
    if (container) {
      if (team[container].length >= LIMITS[container]) return;
      setTeam((prev) => {
        const next = { ...prev };
        const fromArr = [...next[from.key]];
        const player = fromArr.splice(from.index, 1)[0];
        next[from.key] = fromArr;
        next[container] = [...next[container], player];
        return next;
      });
    }
  };

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <main className="p-5 bg-slate-950 min-h-screen text-white">
        <div className="text-center">Cargando equipo...</div>
      </main>
    );
  }

  /* ---------- UI ---------- */
  const sections = [
    { id: "starters", label: "Titulares", limit: 11 },
    { id: "bench", label: "Banquillo", limit: 5 },
    { id: "reserves", label: "Reserva", limit: "∞" },
  ];

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      <div className="max-w-6xl mx-auto mb-6 text-center">
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
        <div className="max-w-5xl mx-auto grid gap-6">
          {sections.map((sec) => (
            <section key={sec.id} className="bg-white/5 rounded-xl p-4 shadow">
              <header className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-semibold">{sec.label}</h2>
                <div className="text-xs text-white/60">
                  {team[sec.id].length}/{sec.limit} · Valor:{" "}
                  {totals.byBlock[sec.id].toLocaleString()}€
                </div>
              </header>

              <DroppableList id={sec.id} itemsIds={team[sec.id].map((p) => `${sec.id[0]}-${p.id}`)}>
                {team[sec.id].map((p) => (
                  <SortablePlayer key={`${sec.id[0]}-${p.id}`} id={`${sec.id[0]}-${p.id}`} player={p} />
                ))}
                {team[sec.id].length === 0 && (
                  <p className="text-white/50 text-sm py-4 text-center">
                    Arrastra jugadores aquí.
                  </p>
                )}
              </DroppableList>
            </section>
          ))}
        </div>

        <DragOverlay>
          {activeId ? (
            (() => {
              const prefix = activeId[0];
              const key = prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
              const idNum = parseInt(activeId.split("-")[1]);
              const player = team[key].find((p) => p.id === idNum);
              return player ? (
                <div style={overlayStyle}>
                  <PlayerRow player={player} />
                </div>
              ) : null;
            })()
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
}