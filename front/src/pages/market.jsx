import { useState } from "react";

export default function Market() {
  const [expandedTeam, setExpandedTeam] = useState(null);

  // Datos de ejemplo
  const teams = [
    {
      id: 1,
      name: "Equipo A",
      owner: "Varo",
      logo: "https://raw.githubusercontent.com/realt0w/team-builder/refs/heads/main/images/emblems/ie3/Neo_Japan_Emblem.png",
      players: [
        { name: "Jugador 1", clause: 10_000 },
        { name: "Jugador 2", clause: 8_500 },
      ],
    },
    {
      id: 2,
      name: "Equipo B",
      owner: "Manu",
      logo: "https://raw.githubusercontent.com/realt0w/team-builder/refs/heads/main/images/emblems/ie3/Inazuma_Japan.png",
      players: [
        { name: "Jugador 3", clause: 12_000 },
        { name: "Jugador 4", clause: 9_500 },
      ],
    },
  ];

  const toggleTeam = (id) => {
    setExpandedTeam(expandedTeam === id ? null : id);
  };

  return (
    <main className="p-8 bg-slate-950 min-h-screen text-white">
      {/* Encabezado con botón atrás */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => window.history.back()}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold">Market</h1>
        <div className="w-20">{/* Espacio para centrar título */}</div>
      </div>

      <div className="space-y-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white/5 rounded-2xl p-4 shadow-md hover:bg-white/10 transition cursor-pointer"
          >
            {/* Fila del equipo */}
            <div
              className="flex items-center justify-between"
              onClick={() => toggleTeam(team.id)}
            >
              <div className="flex items-center gap-3">
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-12 h-12 rounded-full object-cover border border-white/20"
                />
                <span className="font-semibold text-lg">{team.name}</span>
                <span className="text-white/70">| {team.owner}</span>
              </div>
              <div className="text-white/70">
                {expandedTeam === team.id ? "▲" : "▼"}
              </div>
            </div>

            {/* Desplegable jugadores */}
            {expandedTeam === team.id && (
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                {team.players.map((player, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between px-2 py-1 bg-white/5 rounded-lg hover:bg-white/10 transition"
                  >
                    <span>{player.name}</span>
                    <span>€{player.clause.toLocaleString()}</span>
                    <span className="justify-end">Comprar</span>

                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
