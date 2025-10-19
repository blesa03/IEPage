// src/pages/MatchDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  viewMatch,
  addMatchResultRequest,
  getMatchResultRequests,
  approveMatchResultRequest,
  rejectMatchResultRequest,
} from "../api/match";
import { viewTeam } from "../api/team";

// ——— UI helpers ———
function Field({ label, children }) {
  return (
    <div className="flex justify-between bg-white/10 rounded-md px-3 py-2">
      <span className="text-white/70">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

// Mapa de posiciones consideradas portero (ajusta a tus valores reales si difieren)
const GK_SET = new Set(["GK", "PORTERO", "POR"]);
const isGK = (pos) => GK_SET.has((pos || "").toUpperCase());
const isFieldPlayer = (pos) => !isGK(pos || "");

export default function MatchDetail() {
  const nav = useNavigate();
  const { gameId } = useParams();
  const location = useLocation();

  // IDs desde state o query (solo necesitamos draftId por URL)
  const search = new URLSearchParams(location.search);
  const state = location.state || {};
  const draftId = state.draftId ?? search.get("draftId");

  // Carga partido
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [game, setGame] = useState(null);

  // IDs de equipos (se rellenan tras cargar el partido)
  const [localTeamId, setLocalTeamId] = useState(null);
  const [awayTeamId, setAwayTeamId] = useState(null);

  // Plantillas
  const [localTeam, setLocalTeam] = useState(null);
  const [awayTeam, setAwayTeam] = useState(null);
  const [teamsErr, setTeamsErr] = useState("");

  // Solicitudes
  const [reqs, setReqs] = useState([]);
  const [reqsError, setReqsError] = useState("");

  // Form envío solicitud
  const [localGoals, setLocalGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [localKeeperId, setLocalKeeperId] = useState("");
  const [awayKeeperId, setAwayKeeperId] = useState("");
  const [rows, setRows] = useState([{ playerId: "", goals: 1 }]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  const parseErr = (e) =>
    (e?.response?.data?.error || e?.response?.data?.message || e?.message || "").toString() || null;

  // ——— CARGA PARTIDO + SOLICITUDES ———
  useEffect(() => {
    let alive = true;

    const loadMatch = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await viewMatch(gameId);
        if (!alive) return;
        setGame(data ?? null);
        // Derivamos los IDs de equipo de la respuesta del partido
        setLocalTeamId(data?.local_team_id ?? null);
        setAwayTeamId(data?.away_team_id ?? null);
      } catch (e) {
        if (!alive) return;
        setError(parseErr(e) || "No se pudo cargar el partido.");
      } finally {
        if (alive) setLoading(false);
      }
    };

    const loadReqs = async () => {
      setReqsError("");
      try {
        const data = await getMatchResultRequests(gameId);
        if (!alive) return;
        setReqs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!alive) return;
        setReqsError(parseErr(e) || "No se pudieron cargar las solicitudes.");
      }
    };

    loadMatch();
    loadReqs();

    return () => {
      alive = false;
    };
  }, [gameId]);

  // ——— CARGA EQUIPOS ———
  useEffect(() => {
    let alive = true;
    const loadTeams = async () => {
      setTeamsErr("");
      if (!draftId || !localTeamId || !awayTeamId) return;
      try {
        const [lt, at] = await Promise.all([
          viewTeam(draftId, localTeamId),
          viewTeam(draftId, awayTeamId),
        ]);
        if (!alive) return;
        setLocalTeam(lt || null);
        setAwayTeam(at || null);
      } catch (e) {
        if (!alive) return;
        setTeamsErr(parseErr(e) || "No se pudieron cargar los equipos.");
      }
    };
    loadTeams();
    return () => {
      alive = false;
    };
  }, [draftId, localTeamId, awayTeamId]);

  // ——— MEMOS DE JUGADORES ———
  // Porteros: si no hay posición, mostramos todos (fallback) para no bloquear UX.
  const localKeepers = useMemo(() => {
    const ps = localTeam?.players ?? [];
    const gks = ps.filter((p) => isGK(p.position));
    return gks.length ? gks : ps;
  }, [localTeam]);

  const awayKeepers = useMemo(() => {
    const ps = awayTeam?.players ?? [];
    const gks = ps.filter((p) => isGK(p.position));
    return gks.length ? gks : ps;
  }, [awayTeam]);

  // Goleadores (excluye porteros si hay posición; si no la hay, no excluye a nadie)
  const scorersLocal = useMemo(() => {
    const ps = localTeam?.players ?? [];
    const f = ps.filter((p) => (p.position ? isFieldPlayer(p.position) : true));
    return f;
  }, [localTeam]);

  const scorersAway = useMemo(() => {
    const ps = awayTeam?.players ?? [];
    const f = ps.filter((p) => (p.position ? isFieldPlayer(p.position) : true));
    return f;
  }, [awayTeam]);

  // ——— HANDLERS FORM ———
  const onAddRow = () => setRows((p) => [...p, { playerId: "", goals: 1 }]);
  const onRemoveRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));
  const onChangeRow = (i, key, val) =>
    setRows((p) =>
      p.map((r, idx) => (idx === i ? { ...r, [key]: key === "goals" ? Number(val) : val } : r))
    );

  const onCreateRequest = async (e) => {
    e.preventDefault();
    setCreateMsg("");
    setCreating(true);
    try {
      if (!draftId) throw new Error("Falta draftId en la URL.");
      if (localGoals === "" || awayGoals === "" || !localKeeperId || !awayKeeperId) {
        throw new Error("Faltan parámetros: goles y porteros son obligatorios.");
      }

      // Construir objeto de goles con claves = DraftPlayer.id (string/number)
      const goalsObj = {};
      for (const r of rows) {
        if (!r.playerId) continue;
        if (!Number.isInteger(Number(r.goals)) || r.goals < 0) {
          throw new Error("Goles por jugador: usa enteros ≥ 0.");
        }
        const key = String(r.playerId);
        goalsObj[key] = (goalsObj[key] ?? 0) + Number(r.goals);
      }

      const payload = {
        local_goals: Number(localGoals),
        away_goals: Number(awayGoals),
        local_goalkeeper_id: Number(localKeeperId), 
        away_goalkeeper_id: Number(awayKeeperId),  
        goals: goalsObj,
      };

      await addMatchResultRequest(gameId, payload);
      setCreateMsg("Solicitud enviada correctamente.");
    } catch (e) {
      setCreateMsg(parseErr(e) || "No se pudo enviar la solicitud.");
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await approveMatchResultRequest(requestId);
      setReqs((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "APPROVED" } : r)));
    } catch (e) {
      alert(parseErr(e) || "No se pudo aprobar la solicitud.");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectMatchResultRequest(requestId);
      setReqs((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r)));
    } catch (e) {
      alert(parseErr(e) || "No se pudo rechazar la solicitud.");
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Cargando partido…</div>;
  if (error)   return <div className="flex items-center justify-center min-h-screen text-red-400">{error}</div>;
  if (!game)   return <div className="flex items-center justify-center min-h-screen text-white/70">Partido no encontrado.</div>;

  const showScore =
    game.status === "FINISHED" || game.status === "PENDING_RESULT" || game.status === "IN_PROGRESS";
  const score = showScore ? `${game?.local_goals ?? "-"} — ${game?.away_goals ?? "-"}` : "—";
  const winnerLabel =
    typeof game.winner === "string" ? game.winner : (game.winner?.name ?? game.winner?.id ?? "—");

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-lg px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/15"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-center flex-1">
          {game.local_team} vs {game.away_team}
        </h1>
        <div className="w-20" />
      </div>

      {/* Aviso si falta draftId para cargar equipos */}
      {!draftId ? (
        <div className="max-w-4xl mx-auto text-yellow-300 bg-yellow-300/10 border border-yellow-300/30 rounded-lg p-4 mb-6">
          Pasa <b>draftId</b> por query (?draftId=) o por <code>state</code> para cargar las plantillas.
        </div>
      ) : null}

      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Datos del partido + solicitudes */}
        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 shadow space-y-3">
            <Field label="Jornada">{game.week}</Field>
            <Field label="Estado">{game.status?.replaceAll("_", " ")}</Field>
            <Field label="Marcador">{score}</Field>
            <Field label="Local">{game.local_team}</Field>
            <Field label="Visitante">{game.away_team}</Field>
            <Field label="Ganador">{winnerLabel}</Field>
          </div>

          <div className="bg-white/5 rounded-xl p-4 shadow">
            <h2 className="font-semibold mb-3">Solicitudes de resultado</h2>
            {reqsError && <div className="text-yellow-300 text-sm mb-2">{reqsError}</div>}
            {!reqs?.length ? (
              <div className="text-white/60 text-sm">Sin solicitudes.</div>
            ) : (
              <ul className="space-y-2">
                {reqs.map((r) => (
                  <li key={r.id} className="bg-white/10 rounded-lg px-3 py-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <div>
                        <div>Propuesto: {r.local_goals} — {r.away_goals}</div>
                        {r.local_goalkeeper != null && (
                          <div className="text-white/60">Portero local (DraftPlayer ID): {r.local_goalkeeper}</div>
                        )}
                        {r.away_goalkeeper != null && (
                          <div className="text-white/60">Portero visitante (DraftPlayer ID): {r.away_goalkeeper}</div>
                        )}
                        {r.goals && Object.keys(r.goals).length > 0 && (
                          <div className="text-white/60">
                            Goles por jugador (DraftPlayer IDs):{" "}
                            {Object.entries(r.goals).map(([pid, g]) => `${pid}(${g})`).join(", ")}
                          </div>
                        )}
                        <div className="text-white/60">Estado: {r.status ?? "PENDING"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(r.id)}
                          className="rounded-md px-3 py-1.5 bg-green-400 text-black font-semibold hover:opacity-90"
                          title={`Aprobar solicitud ${r.id}`}
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className="rounded-md px-3 py-1.5 bg-red-400 text-black font-semibold hover:opacity-90"
                          title={`Rechazar solicitud ${r.id}`}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Formulario de creación de solicitud */}
        <div className="space-y-6">
          <form onSubmit={onCreateRequest} className="bg-white/5 rounded-xl p-4 shadow space-y-3">
            <h2 className="font-semibold">Enviar solicitud de resultado</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Goles local *</label>
                <input
                  type="number"
                  value={localGoals}
                  onChange={(e) => setLocalGoals(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-md px-2 py-1.5"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Goles visitante *</label>
                <input
                  type="number"
                  value={awayGoals}
                  onChange={(e) => setAwayGoals(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-md px-2 py-1.5"
                  required
                />
              </div>
            </div>

            {/* Porteros */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/70 mb-1">Portero local *</label>
                <select
                  value={localKeeperId}
                  onChange={(e) => setLocalKeeperId(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-md px-2 py-1.5"
                  disabled={!localKeepers.length}
                  required
                >
                  <option value="">— Selecciona —</option>
                  {localKeepers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/70 mb-1">Portero visitante *</label>
                <select
                  value={awayKeeperId}
                  onChange={(e) => setAwayKeeperId(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-md px-2 py-1.5"
                  disabled={!awayKeepers.length}
                  required
                >
                  <option value="">— Selecciona —</option>
                  {awayKeepers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Goleadores */}
            <div>
              <label className="block text-xs text-white/70 mb-1">Goleadores</label>
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={r.playerId}
                      onChange={(e) => onChangeRow(i, "playerId", e.target.value)}
                      className="flex-1 bg-white/10 border border-white/10 rounded-md px-2 py-1.5"
                    >
                      <option value="">— Jugador —</option>
                      <optgroup label={localTeam?.name ? `Local: ${localTeam.name}` : "Local"}>
                        {scorersLocal.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={awayTeam?.name ? `Visitante: ${awayTeam.name}` : "Visitante"}>
                        {scorersAway.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={r.goals}
                      onChange={(e) => onChangeRow(i, "goals", e.target.value)}
                      className="w-24 bg-white/10 border border-white/10 rounded-md px-2 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveRow(i)}
                      className="px-2 rounded-md bg-white/10 border border-white/10 hover:bg-white/15"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={onAddRow}
                  className="rounded-md px-3 py-1.5 bg-white/10 border border-white/10 hover:bg-white/15"
                >
                  + Añadir goleador
                </button>
              </div>
            </div>

            {/* Avisos de plantillas */}
            {localTeam && (localTeam.players?.length ?? 0) === 0 && (
              <div className="text-yellow-300 text-sm">El {localTeam.name} no tiene jugadores cargados.</div>
            )}
            {awayTeam && (awayTeam.players?.length ?? 0) === 0 && (
              <div className="text-yellow-300 text-sm">El {awayTeam.name} no tiene jugadores cargados.</div>
            )}
            {localTeam && !localKeepers.length && (
              <div className="text-yellow-300 text-sm">El {localTeam.name} no tiene porteros asignados.</div>
            )}
            {awayTeam && !awayKeepers.length && (
              <div className="text-yellow-300 text-sm">El {awayTeam.name} no tiene porteros asignados.</div>
            )}

            <button
              disabled={creating}
              className="rounded-md px-4 py-2 bg-yellow-400 text-black font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {creating ? "Enviando…" : "Enviar solicitud"}
            </button>

            {createMsg && <div className="text-sm text-white/80 mt-1">{createMsg}</div>}
            {teamsErr && <div className="text-sm text-yellow-300 mt-2">{teamsErr}</div>}
          </form>
        </div>
      </div>
    </main>
  );
}
