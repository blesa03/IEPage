import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { myTeam } from "../api/team";

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
        const data = await myTeam(draftId);

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

  const positions = [
    { key: "GK", label: "Portero" },
    { key: "DF", label: "Defensas" },
    { key: "MF", label: "Centrocampistas" },
    { key: "FW", label: "Delanteros" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-white">
      Cargando equipo…
    </div>
  );

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
          <p className="text-white/70">Presupuesto: {parseFloat(team.budget).toLocaleString()}€</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Titulares */}
        {positions.map((pos) => (
          <div key={pos.key} className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition">
            <h2 className="text-xl font-semibold mb-2">{pos.label}</h2>
            <ul className="space-y-2">
              {team[pos.key].map((p) => (
                <li key={p.id} className="flex items-center justify-between bg-white/10 rounded-md px-3 py-1">
                  <div className="flex items-center gap-2">
                    {p.sprite && <img src={p.sprite} alt={p.name} className="w-10 h-10 rounded" />}
                    <span>{p.name}</span>
                  </div>
                  <span className="text-white/60">{p.element}</span>
                  <span className="text-white/60">{parseFloat(p.value).toLocaleString()}€</span>

                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Banquillo */}
        {team.substitutes.length > 0 && (
          <div className="bg-white/5 rounded-xl p-4 shadow hover:bg-white/10 transition">
            <h2 className="text-xl font-semibold mb-2 text-center">Banquillo</h2>
            <ul className="space-y-2">
              {team.substitutes.map((p) => (
                <li key={p.id} className="flex items-center justify-between bg-white/10 rounded-md px-3 py-1">
                  <div className="flex items-center gap-2">
                    {p.sprite && <img src={p.sprite} alt={p.name} className="w-10 h-10 rounded" />}
                    <span>{p.name}</span>
                  </div>
                  <span className="text-white/60">{p.element}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
