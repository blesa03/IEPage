import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { viewMatch } from "../api/match";

function Field({ label, children }) {
  return (
    <div className="flex justify-between bg-white/10 rounded-md px-3 py-2">
      <span className="text-white/70">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

export default function MatchDetail() {
  const nav = useNavigate();
  const { gameId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [game, setGame] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await viewMatch(gameId);
        setGame(data ?? null);
      } catch (e) {
        setError("No se pudo cargar el partido.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [gameId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        Cargando partido…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-400">
        {error}
      </div>
    );
  }
  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white/70">
        Partido no encontrado.
      </div>
    );
  }

  const showScore =
    game.status === "FINISHED" || game.status === "PENDING_RESULT" || game.status === "IN_PROGRESS";
  const score = showScore
    ? `${game?.local_goals ?? "-"} — ${game?.away_goals ?? "-"}`
    : "—";

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-center flex-1">
          {game.local_team} vs {game.away_team}
        </h1>
        <div className="w-20" />
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white/5 rounded-xl p-4 shadow space-y-3">
          <Field label="Jornada">{game.week}</Field>
          <Field label="Estado">{game.status?.replaceAll("_", " ")}</Field>
          <Field label="Marcador">{score}</Field>
          <Field label="Local">{game.local_team}</Field>
          <Field label="Visitante">{game.away_team}</Field>
          <Field label="Ganador">{game.winner ?? "—"}</Field>
        </div>
      </div>
    </main>
  );
}
