import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { myTeam } from "../api/team";

import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ---------- Utilidades de estilo/normalización ---------- */

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

/* ---------- Ítem de jugador sortable ---------- */

function PlayerRow({ player }) {
  return (
    <div className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2">
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
          <span className="text-white/70">{toNumber(player.value).toLocaleString()}€</span>
        )}
      </div>
    </div>
  );
}

function SortablePlayer({ id, player }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab",
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PlayerRow player={player} />
    </li>
  );
}

/* ---------- Componente principal ---------- */

export default function Team() {
  const { draftId } = useParams();
  const nav = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Estructura con límites
  const LIMITS = { starters: 11, bench: 5, reserves: Infinity };

  const [team, setTeam] = useState({
    starters: [],
    bench: [],
    reserves: [],
    name: "",
    budget: "0",
  });

  // DnD state
  const [activeId, setActiveId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // evita drags accidentales
    })
  );

  const allMaps = useMemo(() => {
    // Mapas de ids por lista, necesarios para SortableContext
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ---------- Helpers DnD ---------- */

  // Devuelve {container, index} del itemId (ej: "s-12" | "b-33" | "r-44")
  const findLocationByItemId = (itemId) => {
    if (!itemId) return null;
    const prefix = itemId.slice(0, 1);
    const idNum = Number(itemId.split("-")[1]);

    const listKey = prefix === "s" ? "starters" : prefix === "b" ? "bench" : "reserves";
    const list = team[listKey];
    const index = list.findIndex((p) => p.id === idNum);
    return { container: listKey, index, idNum };
  };

  // Si over.id es un contenedor ("starters" | "bench" | "reserves") o un item ("s-12"...)
  const getOverContainer = (overId) => {
    if (!overId) return null;
    if (overId === "starters" || overId === "bench" || overId === "reserves") return overId;
    const loc = findLocationByItemId(overId);
    return loc ? loc.container : null;
  };

  const removeFrom = (arr, idx) => arr.slice(0, idx).concat(arr.slice(idx + 1));
  const insertAt = (arr, idx, item) => [...arr.slice(0, idx), item, ...arr.slice(idx)];

  const getIndexInContainer = (containerKey, overId) => {
    // Si arrastras encima de un item, usa su índice; si encima del contenedor, va al final.
    if (!overId || overId === containerKey) return team[containerKey].length;
    const loc = findLocationByItemId(overId);
    if (!loc || loc.container !== containerKey) return team[containerKey].length;
    return loc.index;
  };

  /* ---------- Handlers DnD ---------- */

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = () => {
    // No hacemos nada en hover; resolvemos todo en onDragEnd para evitar jitter.
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const fromLoc = findLocationByItemId(active.id);
    const toContainer = getOverContainer(over.id);
    if (!fromLoc || !toContainer) return;

    const fromKey = fromLoc.container;
    const toKey = toContainer;

    // Reordenar dentro del mismo contenedor
    if (fromKey === toKey) {
      const fromIndex = fromLoc.index;
      const toIndex = getIndexInContainer(toKey, over.id);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      setTeam((prev) => ({
        ...prev,
        [toKey]: arrayMove(prev[toKey], fromIndex, toIndex),
      }));
      return;
    }

    // Mover entre contenedores con límite
    if (team[toKey].length >= LIMITS[toKey]) {
      // lleno -> no mover
      return;
    }

    // Extraer el jugador
    const movingPlayer = team[fromKey][fromLoc.index];
    const insertIndex = getIndexInContainer(toKey, over.id);

    setTeam((prev) => {
      const fromArr = removeFrom(prev[fromKey], fromLoc.index);
      const toArr = insertAt(prev[toKey], insertIndex, movingPlayer);
      return {
        ...prev,
        [fromKey]: fromArr,
        [toKey]: toArr,
      };
    });
  };

  /* ---------- Loading / Error ---------- */

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
                <li className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/10" />
                    <div className="h-4 w-28 bg-white/10 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-white/10 rounded" />
                  <div className="h-4 w-20 bg-white/10 rounded" />
                </li>
                <li className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-white/10" />
                    <div className="h-4 w-28 bg-white/10 rounded" />
                  </div>
                  <div className="h-4 w-16 bg-white/10 rounded" />
                  <div className="h-4 w-20 bg-white/10 rounded" />
                </li>
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
            Presupuesto: {totals.budgetNum.toLocaleString()}€ · Valor: {totals.totalValue.toLocaleString()}€ · Restante: {totals.remaining.toLocaleString()}€
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

      {/* Drag & Drop Context */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="max-w-5xl mx-auto grid gap-6">
          {/* Titulares */}
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Titulares</h2>
              <div className="text-xs text-white/60">
                {team.starters.length}/{LIMITS.starters} · Valor: {totals.byBlock.starters.toLocaleString()}€
              </div>
            </header>
            <div
              // Contenedor droppable
              id="starters"
              className="min-h-[56px] rounded-lg border border-white/10 p-2"
            >
              <SortableContext items={allMaps.startersIds} strategy={rectSortingStrategy}>
                <ul className="space-y-2">
                  {team.starters.map((p) => (
                    <SortablePlayer key={`s-${p.id}`} id={`s-${p.id}`} player={p} />
                  ))}
                </ul>
              </SortableContext>
              {team.starters.length === 0 && (
                <p className="text-white/50 text-sm py-4 text-center">Arrastra jugadores aquí.</p>
              )}
            </div>
          </section>

          {/* Banquillo */}
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Banquillo</h2>
              <div className="text-xs text-white/60">
                {team.bench.length}/{LIMITS.bench} · Valor: {totals.byBlock.bench.toLocaleString()}€
              </div>
            </header>
            <div id="bench" className="min-h-[56px] rounded-lg border border-white/10 p-2">
              <SortableContext items={allMaps.benchIds} strategy={rectSortingStrategy}>
                <ul className="space-y-2">
                  {team.bench.map((p) => (
                    <SortablePlayer key={`b-${p.id}`} id={`b-${p.id}`} player={p} />
                  ))}
                </ul>
              </SortableContext>
              {team.bench.length === 0 && (
                <p className="text-white/50 text-sm py-4 text-center">Arrastra jugadores aquí.</p>
              )}
            </div>
          </section>

          {/* Reserva */}
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <header className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Reserva</h2>
              <div className="text-xs text-white/60">
                {team.reserves.length} jugadores · Valor: {totals.byBlock.reserves.toLocaleString()}€
              </div>
            </header>
            <div id="reserves" className="min-h-[56px] rounded-lg border border-white/10 p-2">
              <SortableContext items={allMaps.reservesIds} strategy={rectSortingStrategy}>
                <ul className="space-y-2">
                  {team.reserves.map((p) => (
                    <SortablePlayer key={`r-${p.id}`} id={`r-${p.id}`} player={p} />
                  ))}
                </ul>
              </SortableContext>
              {team.reserves.length === 0 && (
                <p className="text-white/50 text-sm py-4 text-center">Vacío.</p>
              )}
            </div>
          </section>
        </div>

        {/* Overlay del ítem arrastrado */}
        <DragOverlay>
          {activeId ? (
            (() => {
              const loc = activeId && activeId.includes("-") ? activeId.split("-")[0] : null;
              const idNum = Number(activeId.split("-")[1]);
              const source =
                loc === "s"
                  ? team.starters
                  : loc === "b"
                  ? team.bench
                  : loc === "r"
                  ? team.reserves
                  : [];
              const player = source.find((p) => p.id === idNum);
              return player ? (
                <div className="w-[560px] max-w-[92vw]">
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