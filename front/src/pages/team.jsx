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

/* ---------- Estilos de elemento ---------- */
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

/* ---------- Componente del jugador ---------- */
function PlayerCard({ player }) {
  return (
    <div className="flex flex-col items-center justify-center bg-yellow-400 rounded-md shadow-lg border border-black/10 text-black font-semibold w-24 h-28">
      {player.sprite ? (
        <img
          src={player.sprite}
          alt={player.name}
          className="w-16 h-16 rounded object-cover border-2 border-white"
          loading="lazy"
        />
      ) : (
        <div className="w-16 h-16 bg-white/30 rounded" />
      )}
      <div className="text-xs text-center mt-1 px-1 truncate">{player.name}</div>
    </div>
  );
}

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

/* ---------- Contenedor droppable ---------- */
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    const load = async () => {
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

  if (loading)
    return (
      <main className="p-5 bg-slate-950 min-h-screen text-white flex items-center justify-center">
        Cargando equipo...
      </main>
    );

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
    }
  };

  const fieldPositions = [
    { top: "5%", left: "45%" }, // portero
    { top: "20%", left: "15%" },
    { top: "20%", left: "35%" },
    { top: "20%", left: "55%" },
    { top: "20%", left: "75%" },
    { top: "45%", left: "15%" },
    { top: "45%", left: "35%" },
    { top: "45%", left: "55%" },
    { top: "45%", left: "75%" },
    { top: "70%", left: "35%" },
    { top: "70%", left: "55%" },
  ];

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      <div className="text-center mb-4">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold mt-3">{team.name}</h1>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* CAMPO DE FÚTBOL */}
        <div
          className="relative mx-auto rounded-xl overflow-hidden shadow-lg"
          style={{
            backgroundImage: "url('/campo_futbol.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            width: "100%",
            maxWidth: "600px",
            height: "700px",
          }}
        >
          <DroppableList
            id="starters"
            itemsIds={team.starters.map((p) => `s-${p.id}`)}
          >
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

        {/* BANQUILLO Y RESERVA */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mt-10">
          <section className="bg-white/5 rounded-xl p-4 shadow">
            <h2 className="text-xl font-semibold mb-2">Banquillo</h2>
            <DroppableList id="bench" itemsIds={team.bench.map((p) => `b-${p.id}`)}>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.bench.map((p) => (
                  <SortablePlayer key={`b-${p.id}`} id={`b-${p.id}`} player={p} />
                ))}
              </ul>
            </DroppableList>
          </section>

          <section className="bg-white/5 rounded-xl p-4 shadow">
            <h2 className="text-xl font-semibold mb-2">Reserva</h2>
            <DroppableList id="reserves" itemsIds={team.reserves.map((p) => `r-${p.id}`)}>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {team.reserves.map((p) => (
                  <SortablePlayer key={`r-${p.id}`} id={`r-${p.id}`} player={p} />
                ))}
              </ul>
            </DroppableList>
          </section>
        </div>

        {/* OVERLAY */}
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