import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {viewRanking } from "../api/ranking";
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
        setTeams(data.teams ?? []);
        setStats({
          goles: data.goles ?? [],
          asistencias: data.asistencias ?? [],
          golesEncajados: data.golesEncajados ?? [],
        });
      } catch (e) {
        setError("No se pudo cargar el ranking.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [leagueId]);

  return (
    <main className="p-8 bg-slate-950 min-h-screen text-white">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-center flex-1">Clasificación</h1>
        <div className="w-20"></div>
      </div>

      {loading ? (
        <div className="text-center text-white/70">Cargando ranking…</div>
      ) : error ? (
        <div className="text-center text-red-400">{error}</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 mb-6">
          {/* Clasificación de la liga */}
          <div className="bg-white/5 rounded-2xl p-6 shadow-md hover:bg-white/10 transition">
            <h2 className="text-xl font-semibold mb-4">Clasificación de la liga</h2>
            <table className="w-full text-left text-white/80">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Equipo</th>
                  <th>Pts</th>
                  <th>G</th>
                  <th>E</th>
                  <th>P</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td>{idx + 1}</td>
                    <td>{team.name}</td>
                    <td>{team.pts}</td>
                    <td>{team.wins}</td>
                    <td>{team.draws}</td>
                    <td>{team.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ranking de estadísticas */}
          <div className="bg-white/5 rounded-2xl p-6 shadow-md hover:bg-white/10 transition">
            <h2 className="text-xl font-semibold mb-4">Clasificación de estadísticas</h2>

            <div className="flex gap-4 mb-4">
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

            <table className="w-full text-left text-white/80">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Jugador</th>
                  <th>
                    {statTab === "goles"
                      ? "Goles"
                      : statTab === "asistencias"
                      ? "Asistencias"
                      : "Goles encajados"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats[statTab]?.map((item, idx) => (
                  <tr key={idx} className="border-t border-white/10">
                    <td>{idx + 1}</td>
                    <td>{item.player}</td>
                    <td>{item.value}</td>
                  </tr>
                )) ?? <tr><td colSpan={3}>No hay datos</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
