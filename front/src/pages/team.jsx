import { useState } from "react";

export default function Team() {
  const [players, setPlayers] = useState({
    GK: { name: "Portero", info: "?" },
    DF: [
      { name: "Defensa 1", info: "?" },
      { name: "Defensa 2", info: "?" },
      { name: "Defensa 3", info: "?" },
      { name: "Defensa 4", info: "?" },
    ],
    MF: [
      { name: "Centrocampista 1", info: "?" },
      { name: "Centrocampista 2", info: "?" },
      { name: "Centrocampista 3", info: "?" },
    ],
    FW: [
      { name: "Delantero 1", info: "?" },
      { name: "Delantero 2", info: "?" },
      { name: "Delantero 3", info: "?" },
    ],
    substitutes: [
      { name: "Reserva 1", info: "?" },
      { name: "Reserva 2", info: "?" },
      { name: "Reserva 3", info: "?" },
      { name: "Reserva 4", info: "?" },
    ],
  });

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white flex flex-col items-center">
      {/* Encabezado con botón atrás */}
      <div className="flex items-center justify-between w-full max-w-6xl mb-6">
        <button
          onClick={() => window.history.back()}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15 transition"
        >
          ← Volver
        </button>
        <h1 className="text-3xl font-bold text-center flex-1">Team</h1>
        <div className="w-20">{/* Espacio para centrar título */}</div>
      </div>

      <div className="flex w-full max-w-6xl h-[80vh] gap-6">
        {/* Campo */}
        <div className="relative flex-1 bg-green-700/70 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
          <div className="flex justify-center mb-1">
            <PlayerCard player={players.GK} />
          </div>

          <div className="flex justify-between mb-1">
            {players.DF.map((p, idx) => (
              <PlayerCard key={idx} player={p} />
            ))}
          </div>

          <div className="flex justify-between mb-1">
            {players.MF.map((p, idx) => (
              <PlayerCard key={idx} player={p} />
            ))}
          </div>

          <div className="flex justify-between">
            {players.FW.map((p, idx) => (
              <PlayerCard key={idx} player={p} />
            ))}
          </div>
        </div>

        {/* Banquillo */}
        <div className="w-64 flex flex-col">
          <h2 className="text-xl font-semibold mb-2 text-center">Banquillo</h2>
          <div className="flex flex-col gap-3 items-center">
            {players.substitutes.map((p, idx) => (
              <PlayerCard key={idx} player={p} small />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function PlayerCard({ player, small }) {
  return (
    <div
      className={`flex flex-col items-center justify-center bg-white/10 border border-white/20 rounded-lg text-center px-3 py-2 min-w-[60px] transition hover:bg-white/20 hover:scale-105 ${
        small ? "min-w-[50px] px-2 py-1 text-sm" : "min-w-[80px]"
      }`}
    >
      <div className="font-semibold">{player.name}</div>
      <div className="text-white/60">{player.info}</div>
    </div>
  );
}
