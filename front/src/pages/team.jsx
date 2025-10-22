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
  Fire: "bg-rose-700/35 text-rose-200 ring-1 ring-rose-400/40",
  Wind: "bg-teal-700/35 text-teal-200 ring-1 ring-teal-400/40",
  Earth: "bg-amber-700/35 text-amber-200 ring-1 ring-amber-400/40",
  Wood: "bg-green-700/35 text-green-200 ring-1 ring-green-400/40",
  default: "bg-slate-700/35 text-white/85 ring-1 ring-slate-400/40",
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

/* ---------- Player Card (compacta + cristal) ---------- */
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

      {/* Imagen (más pequeña) */}
      <div className="rounded-xl bg-white/20 border border-white/20 mx-auto w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] flex items-center justify-center overflow-hidden">
        {player.sprite ? (
          <img
            src={player.sprite}
            alt={player.name}
            className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] object-cover rounded-lg"
            loading="lazy"
          />
        ) : (
          <div className="w-[56px] h-[56px] sm:w-[64px] sm:h-[64px] rounded-lg bg-white/10" />
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

/* ---------- Util: evitar solapes (en %) ---------- */
function spreadPositions(points, minDeltaPct = 12, bounds = { min: 1.5, max: 98.5 }) {
  const out = [];
  for (const p of points) {
    let x = p.left;
    let y = p.top;
    let tries = 0;
    while (tries < 80) {
      let ok = true;
      for (const q of out) {
        const tooCloseX = Math.abs(x - q.left) < minDeltaPct;
        const tooCloseY = Math.abs(y - q.top) < minDeltaPct;
        if (tooCloseX && tooCloseY) {
          ok = false;
          // desplaza alternando ejes
          if (tries % 2 === 0) x += minDeltaPct * 0.6;
          else y += (tries % 4 === 1 ? 1 : -1) * minDeltaPct * 0.6;
          x = Math.max(bounds.min, Math.min(bounds.max, x));
          y = Math.max(bounds.min, Math.min(bounds.max, y));
          break;
        }
      }
      if (ok) break;
      tries++;
    }
    out.push({ top: y, left: x });
  }
  return out;
}

/* ---------- Formaciones (GK abajo) ---------- */
const FORMATIONS = {
  "4-4-2": [
    // 2 delanteros
    { top: 9, left: 35 },
    { top: 9, left: 65 },
    // 4 medios
    { top: 28, left: 18 },
    { top: 28, left: 42 },
    { top: 28, left: 58 },
    { top: 28, left: 82 },
    // 4 defensas
    { top: 53, left: 16 },
    { top: 53, left: 38 },
    { top: 53, left: 62 },
    { top: 53, left: 84 },
    // portero
    { top: 83, left: 50 },
  ],
  "4-3-3": [
    // 3 delanteros
    { top: 9, left: 20 },
    { top: 9, left: 50 },
    { top: 9, left: 80 },
    // 3 medios
    { top: 30, left: 30 },
    { top: 30, left: 50 },
    { top: 30, left: 70 },
    // 4 defensas
    { top: 55, left: 16 },
    { top: 55, left: 38 },
    { top: 55, left: 62 },
    { top: 55, left: 84 },
    // portero
    { top: 83, left: 50 },
  ],
  "3-5-2": [
    // 2 delanteros
    { top: 9, left: 35 },
    { top: 9, left: 65 },
    // 5 medios
    { top: 26, left: 12 },
    { top: 26, left: 29 },
    { top: 26, left: 50 },
    { top: 26, left: 71 },
    { top: 26, left: 88 },
    // 3 defensas
    { top: 56, left: 30 },
    { top: 56, left: 50 },
    { top: 56, left: 70 },
    // portero
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
  const [activeId, setActiveId] = useState(null);
  const [overlayStyle, setOverlayStyle] = useState({ width: 0 });
  const [loading, setLoading] = useState(true);
  const [formation, setFormation] = useState("4-4-2"); // ✅ por defecto

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
          element: p.element === "Air" ? "Wind" : p.element,
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
    return {
      totalValue,
      budgetNum,
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
      // Intercambio
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

    // mover a contenedor vacío (si ocurre)
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

  /* ---------- Campo ---------- */
  const SAFE_INSET_PX = 8;
  const MIN_SEPARATION_PCT = 12;
  const base = FORMATIONS[formation] || FORMATIONS["4-4-2"];
  const fieldPositions = spreadPositions(base, MIN_SEPARATION_PCT, {
    min: 1.5,
    max: 98.5,
  });

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      <div className="max-w-6xl mx-auto text-center mb-6">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => nav(-1)}
            className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
          >
            ← Volver
          </button>

          {/* Selector de formación (fuente negra) */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/70 hidden sm:inline">Formación:</label>
            <select
              className="bg-white text-black border border-slate-300 rounded-md px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
            >
              <option>4-4-2</option>
              <option>4-3-3</option>
              <option>3-5-2</option>
            </select>
          </div>
        </div>

        <h1 className="text-3xl font-bold mt-4">{team.name}</h1>
        <p className="text-white/70 mt-1">
          Presupuesto: {totals.budgetNum.toLocaleString()}€ · Valor:{" "}
          {totals.totalValue.toLocaleString()}€
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Campo con zona segura mínima y fondo por URL */}
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
          <div className="absolute" style={{ inset: `${SAFE_INSET_PX}px` }}>
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