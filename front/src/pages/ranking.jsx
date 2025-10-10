import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Ranking() {
  const nav = useNavigate();
  const [statTab, setStatTab] = useState("goles");

  const teams = [
    { name: "Equipo A", pts: 24, wins: 8, draws: 0, losses: 2 },
    { name: "Equipo B", pts: 20, wins: 6, draws: 2, losses: 2 },
    { name: "Equipo C", pts: 18, wins: 5, draws: 3, losses: 2 },
  ];

  const stats = {
    goles: [
      { player: "Jugador 1", value: 12 },
      { player: "Jugador 2", value: 9 },
      { player: "Jugador 3", value: 7 },
    ],
    asistencias: [
      { player: "Jugador 2", value: 8 },
      { player: "Jugador 4", value: 6 },
      { player: "Jugador 5", value: 5 },
    ],
    golesEncajados: [
      { player: "Portero 1", value: 3 },
      { player: "Portero 2", value: 5 },
      { player: "Portero 3", value: 7 },
    ],
  };

  return (
    <main className="p-8 bg-slate-950 min-h-screen text-white">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-center flex-1">Ranking</h1>
        <div className="w-20"></div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Card 1: Clasificación de la liga */}
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

        {/* Card 2: Ranking de estadísticas */}
        <div className="bg-white/5 rounded-2xl p-6 shadow-md hover:bg-white/10 transition">
          <h2 className="text-xl font-semibold mb-4">Ranking de estadísticas</h2>

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
              {stats[statTab].map((item, idx) => (
                <tr key={idx} className="border-t border-white/10">
                  <td>{idx + 1}</td>
                  <td>{item.player}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
