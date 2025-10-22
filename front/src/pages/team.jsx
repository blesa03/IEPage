import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { viewTeam } from "../api/team";

/**
 * Tarjeta pequeña para el campo
 */
function PitchCard({ p }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-yellow-300/90 rounded-xl px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          {p?.sprite && (
            <img
              src={p.sprite}
              alt={p.name}
              className="w-10 h-10 rounded-md object-contain"
            />
          )}
          <div className="leading-4">
            <div className="font-semibold text-slate-900 text-sm">{p?.name}</div>
            <div className="text-[11px] text-slate-700">
              {p?.element} · {Number(p?.value || 0).toLocaleString()}€
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Tarjeta de lista (fuera de plantilla)
 */
function ListRow({ p }) {
  return (
    <li className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2">
      <div className="flex items-center gap-3">
        {p.sprite && <img src={p.sprite} alt={p.name} className="w-10 h-10 rounded object-contain" />}
        <div className="flex flex-col">
          <span className="font-medium">{p.name}</span>
          <span className="text-white/60 text-sm">{p.element}</span>
        </div>
      </div>
      <span className="text-white/70">{Number(p.value || 0).toLocaleString()}€</span>
    </li>
  );
}

/**
 * Fila del campo: reparte equidistante las cartas
 */
function PitchRow({ players }) {
  return (
    <div className="absolute left-0 right-0 flex justify-center gap-5 px-4">
      {players.length === 0 ? (
        <div className="text-white/60 text-sm bg-white/10 rounded px-2 py-1">
          — libre —
        </div>
      ) : (
        players.map((p) => <PitchCard key={p.id} p={p} />)
      )}
    </div>
  );
}

export default function Team() {
  const { draftId } = useParams();
  const nav = useNavigate();

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState({
    GK: [],
    DF: [],
    MF: [],
    FW: [],
    substitutes: [],
    name: "",
    budget: "0",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await viewTeam(draftId);

        const grouped = {
          GK: [],
          DF: [],
          MF: [],
          FW: [],
          substitutes: [],
          name: data.name,
          budget: data.budget,
        };

        data.players?.forEach((p) => {
          if (grouped[p.position]) grouped[p.position].push(p);
          else grouped.substitutes.push(p);
        });

        setTeam(grouped);
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar el equipo.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [draftId]);

  // Reagrupa los “fuera de plantilla” por posición como en la 1ª imagen
  const outsideByPos = useMemo(() => {
    const buckets = { GK: [], DF: [], MF: [], FW: [], OTR: [] };
    (team.substitutes || []).forEach((p) => {
      if (buckets[p.position]) buckets[p.position].push(p);
      else buckets.OTR.push(p);
    });
    return buckets;
  }, [team.substitutes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Cargando equipo…
      </div>
    );
  }

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>

        <div className="mt-4 text-center">
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-white/70">
            Presupuesto: {parseFloat(team.budget).toLocaleString()}€
          </p>
          {error && (
            <p className="text-red-300 mt-2 text-sm">{error}</p>
          )}
        </div>
      </div>

      {/* Campo y alineación */}
      <section className="max-w-6xl mx-auto">
        <div
          className="
            relative w-full rounded-3xl overflow-hidden shadow-xl border border-white/10
            aspect-[5/3] mx-auto
          "
          style={{
            background:
              "repeating-linear-gradient(90deg, #0f5f24 0 80px, #115a24 80px 160px)",
          }}
        >
          {/* Líneas del campo */}
          <div className="absolute inset-3 rounded-2xl border-4 border-white/60 pointer-events-none" />
          {/* Media */}
          <div className="absolute left-1/2 top-3 bottom-3 w-0.5 bg-white/60" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 border-4 border-white/60 rounded-full" />
          {/* Áreas */}
          <div className="absolute left-3 right-3 top-10 bottom-10 pointer-events-none">
            {/* área superior */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-28 border-4 border-white/60 rounded-b-3xl" />
            {/* área inferior */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 h-28 border-4 border-white/60 rounded-t-3xl" />
          </div>

          {/* Filas (top -> FW -> MF -> DF -> GK bottom) */}
          <div className="absolute inset-0">
            <div className="top-[12%]"><PitchRow players={team.FW} /></div>
            <div className="top-[35%]"><PitchRow players={team.MF} /></div>
            <div className="top-[60%]"><PitchRow players={team.DF} /></div>
            <div className="top-[85%]"><PitchRow players={team.GK} /></div>
          </div>
        </div>
      </section>

      {/* Fuera de la plantilla */}
      <section className="max-w-4xl mx-auto mt-8 space-y-6">
        <h2 className="text-2xl font-semibold text-center">Fuera de la plantilla</h2>

        {["GK", "DF", "MF", "FW"].map((k) => (
          <div key={k} className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition">
            <h3 className="text-lg font-semibold mb-2">
              {k === "GK" && "Portero"}
              {k === "DF" && "Defensas"}
              {k === "MF" && "Centrocampistas"}
              {k === "FW" && "Delanteros"}
            </h3>
            {outsideByPos[k].length ? (
              <ul className="space-y-2">
                {outsideByPos[k].map((p) => <ListRow key={p.id} p={p} />)}
              </ul>
            ) : (
              <div className="text-white/60 text-sm">No hay jugadores en esta categoría.</div>
            )}
          </div>
        ))}

        {/* Si hubiera otros sin posición reconocida */}
        {outsideByPos.OTR.length > 0 && (
          <div className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition">
            <h3 className="text-lg font-semibold mb-2">Otros</h3>
            <ul className="space-y-2">
              {outsideByPos.OTR.map((p) => <ListRow key={p.id} p={p} />)}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}