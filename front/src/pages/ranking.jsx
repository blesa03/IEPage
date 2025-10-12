import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { viewRanking } from "../api/ranking";

export default function Ranking() {
  const nav = useNavigate();
  const { leagueId } = useParams();

  const [statTab, setStatTab] = useState("goles");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ goles: [], asistencias: [], golesEncajados: [] });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await viewRanking(leagueId);
        setTeams(data ?? []);
      } catch (e) {
        setError("No se pudo cargar el ranking.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [leagueId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-white">
      Cargando ranking…
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen text-red-400">
      {error}
    </div>
  );

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-center flex-1">Clasificación</h1>
        <div className="w-20" />
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Bloques de equipos */}
        <div className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition">
          <h2 className="text-xl font-semibold mb-2 text-center">Clasificación de la liga</h2>
          <ul className="space-y-2">
            {teams.map((team, idx) => (
              <li key={idx} className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2">
                <span className="font-medium">{idx + 1}. {team.name}</span>
                <div className="flex gap-4 text-white/60">
                  <span>Pts: {team.points}</span>
                  <span>G: {team.wins}</span>
                  <span>E: {team.draws}</span>
                  <span>P: {team.losses}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Bloques de estadísticas */}
        <div className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition">
          <h2 className="text-xl font-semibold mb-4 text-center">Clasificación de estadísticas</h2>

          <div className="flex gap-4 mb-4 justify-center">
            {["goles", "asistencias", "golesEncajados"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatTab(tab)}
                className={`px-3 py-1 rounded-lg font-medium ${
                  statTab === tab
                    ? "bg-yellow-400 text-black"
                    : "bg-white/10 text-white/70"
                } transition`}
              >
                {tab === "goles"
                  ? "Goles"
                  : tab === "asistencias"
                  ? "Asistencias"
                  : "Goles encajados"}
              </button>
            ))}
          </div>

          <ul className="space-y-2">
            {stats[statTab]?.length > 0 ? stats[statTab].map((item, idx) => (
              <li key={idx} className="flex items-center justify-between bg-white/10 rounded-md px-3 py-2">
                <span>{idx + 1}. {item.player}</span>
                <span className="text-white/60">{item.value}</span>
              </li>
            )) : (
              <li className="text-center text-white/60">No hay datos</li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
