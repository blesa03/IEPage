import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { myTeam } from "../api/team";

// Mapas de etiquetas/estilos
const POSITIONS = [
  { key: "GK", label: "Portero" },
  { key: "DF", label: "Defensas" },
  { key: "MF", label: "Centrocampistas" },
  { key: "FW", label: "Delanteros" },
];

const ELEMENT_STYLES = {
  Fire: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30",
  Wind: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
  Earth: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
  Wood: "bg-lime-500/15 text-lime-300 ring-1 ring-inset ring-lime-500/30",
  // fallback
  default: "bg-white/10 text-white/70 ring-1 ring-inset ring-white/20",
};

function badgeClass(el) {
  return ELEMENT_STYLES[el] || ELEMENT_STYLES.default;
}

// Normaliza URL de imagen: si viene relativa, la prefija con el origen del API
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

// Skeleton simple para listas
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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await myTeam(draftId);

      const grouped = {
        GK: [],
        DF: [],
        MF: [],
        FW: [],
        substitutes: [],
        name: data.name ?? "",
        budget: data.budget ?? "0",
      };

      data.players?.forEach((p) => {
        const pos = p.position;
        const player = {
          ...p,
          sprite: normalizeUrl(p.sprite),
          value: toNumber(p.value),
        };
        if (grouped[pos]) grouped[pos].push(player);
        else grouped.substitutes.push(player);
      });

      setTeam(grouped);
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
    const all = [...team.GK, ...team.DF, ...team.MF, ...team.FW, ...team.substitutes];
    const totalValue = all.reduce((acc, p) => acc + toNumber(p.value), 0);
    const budgetNum = toNumber(team.budget);
    const remaining = Math.max(budgetNum - totalValue, 0);
    return { totalValue, remaining, budgetNum };
  }, [team]);

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

        <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2">
          {POSITIONS.map((pos) => (
            <div key={pos.key} className="bg-white/5 rounded-xl p-4 shadow">
              <div className="h-6 w-40 bg-white/10 rounded mb-3" />
              <ul className="space-y-2">
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </ul>
            </div>
          ))}
          <div className="bg-white/5 rounded-xl p-4 shadow">
            <div className="h-6 w-32 bg-white/10 rounded mb-3" />
            <ul className="space-y-2">
              <RowSkeleton />
              <RowSkeleton />
            </ul>
          </div>
        </div>
      </main>
    );
  }

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

      {/* Grid principal */}
      <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2">
        {/* Titulares por línea */}
        {POSITIONS.map((pos) => {
          const players = team[pos.key] || [];
          return (
            <section
              key={pos.key}
              className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition"
            >
              <header className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">{pos.label}</h2>
                <span className="text-xs text-white/60">
                  {players.length} jugador{players.length === 1 ? "" : "es"}
                </span>
              </header>

              {players.length === 0 ? (
                <div className="text-white/50 text-sm py-6 text-center">
                  Aún no hay {pos.label.toLowerCase()}.
                </div>
              ) : (
                <ul className="space-y-2">
                  {players.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {p.sprite ? (
                          <img
                            src={p.sprite}
                            alt={p.name}
                            className="w-10 h-10 rounded object-cover shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
                        )}
                        <span className="truncate">{p.name}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass(p.element)}`}>
                          {p.element || "—"}
                        </span>
                        <span className="text-white/70">
                          {toNumber(p.value).toLocaleString()}€
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {/* Banquillo */}
        <section className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition sm:col-span-2">
          <h2 className="text-xl font-semibold mb-2 text-center">Banquillo</h2>

          {team.substitutes.length === 0 ? (
            <div className="text-white/50 text-sm py-6 text-center">
              No hay jugadores en el banquillo.
            </div>
          ) : (
            <ul className="space-y-2 max-w-3xl mx-auto">
              {team.substitutes.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {p.sprite ? (
                      <img
                        src={p.sprite}
                        alt={p.name}
                        className="w-10 h-10 rounded object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-white/10 shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>

                  <span className={`text-xs px-2 py-0.5 rounded-full ${badgeClass(p.element)}`}>
                    {p.element || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}