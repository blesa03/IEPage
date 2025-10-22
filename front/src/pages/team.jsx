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
  arrayMove, // ya no la usamos para swap, pero la dejo por si quieres reordenación clásica
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ---------- Utilidades ---------- */

const ELEMENT_STYLES = {
  Fire: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30",
  Wind: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  Earth: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  Wood: "bg-lime-500/15 text-lime-300 ring-1 ring-inset ring-lime-500/30",
  default: "bg-white/10 text-white/70 ring-1 ring-inset ring-white/20",
};
const badge = (el) => ELEMENT_STYLES[el] || ELEMENT_STYLES.default;

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

/* ---------- UI de fila ---------- */

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

function SortablePlayer({ id, player }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab",
    width: "100%",
    boxSizing: "border-box",
  };

  // Importante: el ref va sobre un contenedor con w-full para que el ancho no cambie
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

  const LIMITS = { starters: 11, bench: 5, reserves: Infinity };

  const [team, setTeam] = useState({
    starters: [],
    bench: [],
    reserves: [],
    name: "",
    budget: "0",
  });

  // DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const [activeId, setActiveId] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState({ width: 0 });

  const allMaps = useMemo(() => {
    const startersIds = team.starters.map((p) => `s-${p.id}`);
    const benchIds = team.bench.map((p) => `b-${p.id}`);
    const reservesIds = team.reserves.map((p) => `r-${p.id}`);
    return { startersIds, benchIds, reservesIds };
  }, [team]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await myTeam(draftId);
      const all = (data.players || []).map((p) => ({
        ...p,
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

  useEffect(() => {
    load();
  }, [draftId]);

  const totals = useMemo(() => {
    const all = [...team.starters, ...team.bench, ...team.reserves];
    const totalValue = all.reduce((acc, p) => acc + toNumber(p.value), 0);
    const budgetNum = toNumber(team.budget);
    const remaining = Math.max(budgetNum - totalValue, 0);

    const tStarters = team.starters.reduce((a, p) => a + toNumber(p.value), 0);
    const tBench = team.bench.reduce((a, p) => a + toNumber(p.value), 0);
    const tRes = team.reserves.reduce((a, p) => a + toNumber(p.value), 0);

    return {
      totalValue,
      budgetNum,
      remaining,
      byBlock: { starters: tStarters, bench: tBench, reserves: tRes },
    };
  }, [team]);

  /* ---------- Helpers DnD & lógica de swap ---------- */

  const containerIds = ["starters", "bench", "reserves"];

  const isContainerId = (id) => containerIds.includes(id);
  const isItemId = (id) => typeof id === "string" && id.includes("-");

  const findLocationByItemId = (itemId) => {
    if (!itemId) return null;
    const prefix = itemId.slice(0, 1);
    const idNum = Number(itemId.split("-")[1]);

    const listKey = prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
    const list = team[listKey];
    const index = list.findIndex((p) => p.id === idNum);
    return { container: listKey, index, idNum };
  };

  const getOverContainer = (overId) => {
    if (!overId) return null;
    if (isContainerId(overId)) return overId;
    const loc = findLocationByItemId(overId);
    return loc ? loc.container : null;
  };

  const removeFrom = (arr, idx) => arr.slice(0, idx).concat(arr.slice(idx + 1));
  const insertAt = (arr, idx, item) => {
    const i = idx < 0 || idx > arr.length ? arr.length : idx;
    return [...arr.slice(0, i), item, ...arr.slice(i)];
  };

  // Colisión: primero busca contenedores bajo el puntero; si no, ítems
  const collisionStrategy = (args) => {
    const containerHits = pointerWithin(args).filter((c) => isContainerId(c.id));
    if (containerHits.length) return containerHits;
    return rectIntersection(args);
  };

  /* ---------- Handlers DnD ---------- */

  const handleDragStart = (event) => {
    setActiveId(event.active.id);

    // Congela ancho del overlay
    const r =
      event.active?.rect?.current?.translated || event.active?.rect?.current?.initial;
    if (r && r.width) setOverlayStyle({ width: `${Math.round(r.width)}px` });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setOverlayStyle({ width: 0 });

    if (!over) return;

    const fromLoc = findLocationByItemId(active.id);
    const overId = over.id;
    const toContainer = getOverContainer(overId);

    if (!fromLoc || !toContainer) return;

    const fromKey = fromLoc.container;

    // 1) Si suelto SOBRE UN ITEM -> SWAP con ese item (aunque el destino esté lleno)
    if (isItemId(overId)) {
      const toLoc = findLocationByItemId(overId);
      if (!toLoc) return;

      const toKey = toLoc.container;

      setTeam((prev) => {
        const next = { ...prev };
        const fromList = [...next[fromKey]];
        const toList = fromKey === toKey ? fromList : [...next[toKey]];

        const a = fromList[fromLoc.index];
        const b = toList[toLoc.index];

        // Intercambio
        fromList[fromLoc.index] = b;
        toList[toLoc.index] = a;

        next[fromKey] = fromList;
        next[toKey] = toList;
        return next;
      });
      return;
    }

    // 2) Si suelto SOBRE EL CONTENEDOR (área vacía) -> mover al final si hay hueco
    const toKey = toContainer;
    if (fromKey === toKey) return; // nada que hacer

    // Respetar límites solo en movimiento "puro" (no swap)
    if (team[toKey].length >= LIMITS[toKey]) return;

    const movingPlayer = team[fromKey][fromLoc.index];
    setTeam((prev) => {
      const fromArr = removeFrom(prev[fromKey], fromLoc.index);
      const toArr = insertAt(prev[toKey], prev[toKey].length, movingPlayer);
      return { ...prev, [fromKey]: fromArr, [toKey]: toArr };
    });
  };

  /* ---------- Loading UI ---------- */

  if (loading) {
    return (
      <main className="p-5 bg-slate-950 min-h-screen text-white">
        <div className="max-w-6xl mx-auto mb-6">
          <div className="h-10 w-28 rounded bg-white/10" />
          <div className="mt-4 text-center">
            <div className="h-8 w-60 bg-white/10 rounded mx-auto" />
            <div className="h-4 w-44 bg-white/10 rounded mx-auto mt-2" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto grid gap-6">
          {["Titulares", "Banquillo", "Reserva"].map((_, i) => (
            <section key={i} className="bg-white/5 rounded-xl p-4 shadow">
              <div className="h-6 w-40 bg-white/10 rounded mb-3" />
              <ul className="space-y-2">
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </ul>
            </section>
          ))}
        </div>
      </main>
    );
  }

  /* ---------- UI ---------- */

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
          >
            ← Volver
          </button>

          <div className="hidden sm:flex gap-2 text-sm text-white/70">
            <span className="px-2 py-1 rounded bg-white/5 ring-1 ring-white/10">
              Presupuesto: {totals.budgetNum.toLocaleString()}€
            </span>
            <span className="px-2 py-1 rounded bg-white/5 ring-1 ring-white/10">
              Valor plantilla: {totals.totalValue.toLocaleString()}€
            </span>
            <span className="px-2 py-1 rounded bg-white/5 ring-1 ring-white/10">
              Restante: {totals.remaining.toLocaleString()}€
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <h1 className="text-3xl font-bold">{team.name || "Mi equipo"}</h1>
          <p className="text-white/70 sm:hidden mt-1">
            Presupuesto: {totals.budgetNum.toLocaleString()}€ · Valor:{" "}
            {totals.totalValue.toLocaleString()}€ · Restante:{" "}
            {totals.remaining.toLocaleString()}€
          </p>
        </div>

        {error && (
          <div className="mt-4 max-w-3xl mx-auto rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">
            {error}
            <button
              onClick={load}
              className="ml-3 inline-flex items-center rounded bg-red-500/20 px-2 py-1 text-xs hover:bg-red-500/30"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* DnD con colisiones personalizadas */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-5xl mx-auto grid gap-6">
          {/* Titulares */}
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Titulares</h2>
              <div className="text-xs text-white/60">
                {team.starters.length}/{LIMITS.starters} · Valor:{" "}
                {totals.byBlock.starters.toLocaleString()}€
              </div>
            </header>

            <DroppableList id="starters" itemsIds={allMaps.startersIds}>
              {team.starters.map((p) => (
                <SortablePlayer key={`s-${p.id}`} id={`s-${p.id}`} player={p} />
              ))}
              {team.starters.length === 0 && (
                <p className="text-white/50 text-sm py-4 text-center">
                  Arrastra jugadores aquí.
                </p>
              )}
            </DroppableList>
          </section>

          {/* Banquillo */}
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Banquillo</h2>
              <div className="text-xs text-white/60">
                {team.bench.length}/{LIMITS.bench} · Valor:{" "}
                {totals.byBlock.bench.toLocaleString()}€
              </div>
            </header>

            <DroppableList id="bench" itemsIds={allMaps.benchIds}>
              {team.bench.map((p) => (
                <SortablePlayer key={`b-${p.id}`} id={`b-${p.id}`} player={p} />
              ))}
              {team.bench.length === 0 && (
                <p className="text-white/50 text-sm py-4 text-center">
                  Arrastra jugadores aquí.
                </p>
              )}
            </DroppableList>
          </section>

          {/* Reserva */}
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Reserva</h2>
              <div className="text-xs text-white/60">
                {team.reserves.length} jugadores · Valor:{" "}
                {totals.byBlock.reserves.toLocaleString()}€
              </div>
            </header>

            <DroppableList id="reserves" itemsIds={allMaps.reservesIds}>
              {team.reserves.map((p) => (
                <SortablePlayer key={`r-${p.id}`} id={`r-${p.id}`} player={p} />
              ))}
              {team.reserves.length === 0 && (
                <p className="text-white/50 text-sm py-4 text-center">Vacío.</p>
              )}
            </DroppableList>
          </section>
        </div>

        {/* Overlay con ancho fijado */}
        <DragOverlay>
          {activeId ? (
            (() => {
              const loc = activeId.split("-")[0]; // "s" | "b" | "r"
              const idNum = Number(activeId.split("-")[1]);
              const source =
                loc === "s"
                  ? team.starters
                  : loc === "b"
                  ? team.bench
                  : team.reserves;
              const player = source.find((p) => p.id === idNum);
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

/* ---------- Estrategia de colisiones ---------- */
// Prioriza contenedores bajo el puntero; si no hay, usa intersección de rectángulos.
function collisionStrategy(args) {
  const isContainer = (id) => ["starters", "bench", "reserves"].includes(id);
  const containers = pointerWithin(args).filter((c) => isContainer(c.id));
  if (containers.length) return containers;
  return rectIntersection(args);
}