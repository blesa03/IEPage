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

// ——— UI components ———
function Badge({ children, intent = "neutral" }) {
  const map = {
    neutral: "bg-white/10 text-white",
    info: "bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30",
    success: "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30",
    warn: "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30",
    danger: "bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${map[intent]}`}>
      {children}
    </span>
  );
}

function PillButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-1.5 font-semibold ring-1 ring-white/10 " +
        "bg-white/10 hover:bg-white/15 transition " + className
      }
    >
      {children}
    </button>
  );
}

function IconButton({ title, children, className = "", ...props }) {
  return (
    <button
      {...props}
      title={title}
      className={
        "inline-flex items-center justify-center rounded-lg h-9 w-9 ring-1 ring-white/10 " +
        "bg-white/10 hover:bg-white/15 transition " +
        className
      }
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 ring-1 ring-white/10">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold">{children}</span>
    </div>
  );
}

function Avatar({ src, alt, size = 32 }) {
  return (
    <img
      src={src || "/imgs/placeholder.png"}
      alt={alt || ""}
      width={size}
      height={size}
      className="rounded-full object-cover bg-white/10 ring-1 ring-white/10"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

// Select estilizado (evita fondo blanco nativo)
function Select({ className = "", children, ...props }) {
  return (
    <div className={"relative " + className}>
      <select
        {...props}
        className={
          "block w-full appearance-none bg-white/10 text-white " +
          "ring-1 ring-white/10 rounded-lg px-3 py-2 pr-9 " +
          "focus:outline-none focus:ring-2 focus:ring-amber-400/40 " +
          "disabled:opacity-60"
        }
      >
        {children}
      </select>
      <svg
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 opacity-70"
        aria-hidden="true"
      >
        <path d="M6 8l4 4 4-4" fill="currentColor" />
      </svg>
    </div>
  );
}

// Mapa de posiciones consideradas portero (ajústalo si difiere)
const GK_SET = new Set(["GK", "PORTERO", "POR"]);
const isGK = (pos) => GK_SET.has((pos || "").toUpperCase());

// ——— Helpers de datos ———
const normStatus = (s) => {
  if (!s) return "—";
  const x = String(s).toLowerCase();
  if (["finished", "fin", "finalizado"].includes(x)) return "Finalizado";
  if (["in_progress", "en_juego", "jugando"].includes(x)) return "En juego";
  if (["pending_result", "pendiente", "pending"].includes(x)) return "Pend. resultado";
  if (["approved", "aprobada"].includes(x)) return "Aprobada";
  if (["rejected", "rechazada"].includes(x)) return "Rechazada";
  return s[0].toUpperCase() + s.slice(1).replaceAll("_", " ");
};

const statusIntent = (s) => {
  const x = String(s || "").toLowerCase();
  if (["approved", "aprobada", "finished", "finalizado"].includes(x)) return "success";
  if (["rejected", "rechazada"].includes(x)) return "danger";
  if (["pending_result", "pending", "pendiente", "in_progress", "en_juego"].includes(x)) return "info";
  return "neutral";
};

export default function MatchDetail() {
  const nav = useNavigate();
  const { gameId } = useParams();
  const location = useLocation();

  const search = new URLSearchParams(location.search);
  const state = location.state || {};
  const draftId = state.draftId ?? search.get("draftId");

  // Carga partido
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [game, setGame] = useState(null);

  // IDs de equipos
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
  const [localKeeperId, setLocalKeeperId] = useState("");
  const [awayKeeperId, setAwayKeeperId] = useState("");

  // Goleadores separados por equipo
  const [rowsLocal, setRowsLocal] = useState([{ playerId: "", goals: 1 }]);
  const [rowsAway, setRowsAway] = useState([{ playerId: "", goals: 1 }]);

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
  const keepersOnly = (ps = []) => ps.filter((p) => isGK(p.position));
  const fieldOnly   = (ps = []) => ps.filter((p) => !isGK(p.position));
  // ——— MEMOS DE JUGADORES ———
  const localKeepers = useMemo(() => keepersOnly(localTeam?.players), [localTeam]);
  const awayKeepers  = useMemo(() => keepersOnly(awayTeam?.players),  [awayTeam]);

  const scorersLocal = useMemo(() => localTeam?.players ?? [], [localTeam]);
  const scorersAway  = useMemo(() => awayTeam?.players ?? [], [awayTeam]);
  // Mapa de jugadores por id (ambos equipos)
  const playerById = useMemo(() => {
    const m = new Map();
    for (const p of localTeam?.players ?? []) m.set(String(p.id), { ...p, teamSide: "local" });
    for (const p of awayTeam?.players ?? []) m.set(String(p.id), { ...p, teamSide: "away" });
    return m;
  }, [localTeam, awayTeam]);

  // ——— Handlers de goleadores ———
  const addRowLocal = () => setRowsLocal((p) => [...p, { playerId: "", goals: 1 }]);
  const addRowAway = () => setRowsAway((p) => [...p, { playerId: "", goals: 1 }]);

  const removeRowLocal = (i) => setRowsLocal((p) => p.filter((_, idx) => idx !== i));
  const removeRowAway = (i) => setRowsAway((p) => p.filter((_, idx) => idx !== i));

  const changeRowLocal = (i, key, val) =>
    setRowsLocal((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: key === "goals" ? Number(val) : val } : r)));
  const changeRowAway = (i, key, val) =>
    setRowsAway((p) => p.map((r, idx) => (idx === i ? { ...r, [key]: key === "goals" ? Number(val) : val } : r)));


  // ——— Submit ———
  const onCreateRequest = async (e) => {
    e.preventDefault();
    setCreateMsg("");
    setCreating(true);
    try {
      if (!draftId) throw new Error("Falta draftId en la URL.");
      

      // Construir objeto de goles con claves DraftPlayer.id (suma local+visitante)
      const goalsObj = {};
      const pushRows = (rows) => {
        for (const r of rows) {
          if (!r.playerId) continue;
          if (!Number.isInteger(Number(r.goals)) || r.goals < 0) {
            throw new Error("Goles por jugador: usa enteros ≥ 0.");
          }
          const key = String(r.playerId);
          goalsObj[key] = (goalsObj[key] ?? 0) + Number(r.goals);
        }
      };
      pushRows(rowsLocal);
      pushRows(rowsAway);

      const payload = {
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
      setReqs((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "approved" } : r)));
    } catch (e) {
      alert(parseErr(e) || "No se pudo aprobar la solicitud.");
    }
  };

  const handleReject = async (requestId) => {
    try {
      await rejectMatchResultRequest(requestId);
      setReqs((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: "rejected" } : r)));
    } catch (e) {
      alert(parseErr(e) || "No se pudo rechazar la solicitud.");
    }
  };

  // ——— Render ———
  if (loading) return <div className="flex items-center justify-center min-h-screen text-white">Cargando partido…</div>;
  if (error)   return <div className="flex items-center justify-center min-h-screen text-rose-300">{error}</div>;
  if (!game)   return <div className="flex items-center justify-center min-h-screen text-white/70">Partido no encontrado.</div>;

  const showScore = ["finished", "pending_result", "in_progress"].includes(
    String(game.status || "").toLowerCase()
  );
  const score = showScore ? `${game?.local_goals ?? "-"} — ${game?.away_goals ?? "-"}` : "—";
  const winnerLabel =
    typeof game.winner === "string" ? game.winner : (game.winner?.name ?? game.winner?.id ?? "—");

  // Tarjeta de solicitud
  function RequestCard({ r }) {
    const lgk = r.local_goalkeeper_id ?? r.local_goalkeeper;   // compat
    const agk = r.away_goalkeeper_id ?? r.away_goalkeeper;     // compat
    const intent = statusIntent(r.status);

    return (
      <li className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge intent="info">Propuesta</Badge>
              <span className="text-xl tabular-nums font-bold">{r.local_goals} — {r.away_goals}</span>
              <Badge intent={intent}>{normStatus(r.status)}</Badge>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              {lgk != null && (
                <div className="inline-flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1 ring-1 ring-white/10">
                  <span className="text-white/50">Portero local</span>
                  {playerById.has(String(lgk)) && (
                    <Avatar size={20} src={playerById.get(String(lgk)).sprite} alt={playerById.get(String(lgk)).name} />
                  )}
                  <span className="font-medium">
                    {playerById.get(String(lgk))?.name ?? `#${lgk}`}
                  </span>
                </div>
              )}
              {agk != null && (
                <div className="inline-flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1 ring-1 ring-white/10">
                  <span className="text-white/50">Portero visitante</span>
                  {playerById.has(String(agk)) && (
                    <Avatar size={20} src={playerById.get(String(agk)).sprite} alt={playerById.get(String(agk)).name} />
                  )}
                  <span className="font-medium">
                    {playerById.get(String(agk))?.name ?? `#${agk}`}
                  </span>
                </div>
              )}
            </div>

            {r.goals && Object.keys(r.goals).length > 0 && (
              <div className="space-y-1">
                <div className="text-white/60 text-xs">Goleadores</div>
                <ul className="flex flex-col gap-1">
                  {Object.entries(r.goals).map(([pid, g]) => {
                    const pl = playerById.get(String(pid));
                    return (
                      <li key={pid} className="flex items-center gap-3">
                        <Avatar size={24} src={pl?.sprite} alt={pl?.name} />
                        <span className="font-medium">{pl?.name ?? `#${pid}`}</span>
                        {pl?.position && <span className="text-white/50 text-xs">({pl.position})</span>}
                        <span className="ml-auto text-sm tabular-nums bg-white/10 rounded-md px-2 py-0.5 ring-1 ring-white/10">
                          {g} gol{Number(g) === 1 ? "" : "es"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <PillButton
              onClick={() => handleApprove(r.id)}
              className="bg-emerald-400/90 hover:bg-emerald-400 text-black ring-0"
            >
              ✓ Aprobar
            </PillButton>
            <PillButton
              onClick={() => handleReject(r.id)}
              className="bg-rose-400/90 hover:bg-rose-400 text-black ring-0"
            >
              ✕ Rechazar
            </PillButton>
          </div>
        </div>
      </li>
    );
  }

  return (
    <main className="p-5 bg-slate-950 min-h-screen text-white">
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <PillButton onClick={() => nav(-1)}>← Volver</PillButton>
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {game.local_team} <span className="text-white/50">vs</span> {game.away_team}
          </h1>
          <div className="mt-1">
            <Badge intent={statusIntent(game.status)}>{normStatus(game.status)}</Badge>
          </div>
        </div>
        <div className="w-24" />
      </div>

      {!draftId ? (
        <div className="max-w-5xl mx-auto text-amber-300 bg-amber-300/10 ring-1 ring-amber-300/30 rounded-xl p-4 mb-6">
          Pasa <b>draftId</b> por query (?draftId=) o por <code>state</code> para cargar las plantillas.
        </div>
      ) : null}

      <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.1fr,1fr] gap-6">
        {/* Columna izquierda: datos partido + solicitudes */}
        <div className="space-y-4">
          <div className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <Field label="Semana ">{ game.week}</Field>
              <div className="text-3xl font-black tabular-nums">{score}</div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Local">{game.local_team}</Field>
              <Field label="Visitante">{game.away_team}</Field>
            </div>
            <Field label="Ganador">{winnerLabel}</Field>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10">
            <h2 className="font-semibold mb-3">Solicitudes de resultado</h2>
            {reqsError && <div className="text-amber-300 text-sm mb-2">{reqsError}</div>}
            {!reqs?.length ? (
              <div className="text-white/60 text-sm">Sin solicitudes.</div>
            ) : (
              <ul className="space-y-3">
                {reqs.map((r) => (
                  <RequestCard key={r.id} r={r} />
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Columna derecha: formulario creación */}
        <div className="space-y-6">
          <form onSubmit={onCreateRequest} className="bg-white/5 rounded-2xl p-4 ring-1 ring-white/10 space-y-4">
            <h2 className="font-semibold">Enviar solicitud de resultado</h2>


            {/* Porteros */}
            <div>
              <h3 className="block text-sm text-white/70 mb-3">Porteros</h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* LOCAL */}
                <div className="bg-white/5 rounded-xl p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{localTeam?.name ?? "Local"}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 ring-1 ring-white/10">
                    <Avatar
                      size={32}
                      src={playerById.get(String(localKeeperId))?.sprite}
                      alt={playerById.get(String(localKeeperId))?.name}
                    />
                    <Select
                      value={localKeeperId}
                      onChange={(e) => setLocalKeeperId(e.target.value)}
                      disabled={!localKeepers.length}
                      required
                      className="flex-1"
                    >
                      <option value="">— Selecciona portero —</option>
                      {localKeepers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* VISITANTE */}
                <div className="bg-white/5 rounded-xl p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{awayTeam?.name ?? "Visitante"}</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white/5 rounded-lg p-2 ring-1 ring-white/10">
                    <Avatar
                      size={32}
                      src={playerById.get(String(awayKeeperId))?.sprite}
                      alt={playerById.get(String(awayKeeperId))?.name}
                    />
                    <Select
                      value={awayKeeperId}
                      onChange={(e) => setAwayKeeperId(e.target.value)}
                      disabled={!awayKeepers.length}
                      required
                      className="flex-1"
                    >
                      <option value="">— Selecciona portero —</option>
                      {awayKeepers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Goleadores (separados por equipo) */}
            <div>
              <h3 className="block text-sm text-white/70 mb-3">Goleadores</h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* LOCAL */}
                <div className="bg-white/5 rounded-xl p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{localTeam?.name ?? "Local"}</span>
                    <button
                      type="button"
                      onClick={addRowLocal}
                      className="text-sm bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 ring-1 ring-white/10"
                    >
                      + Añadir más goleadores
                    </button>
                  </div>

                  <div className="space-y-2">
                    {rowsLocal.map((r, i) => {
                      const pl = r.playerId ? playerById.get(String(r.playerId)) : null;
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 ring-1 ring-white/10">
                          <Avatar size={32} src={pl?.sprite} alt={pl?.name} />

                          <Select
                            value={r.playerId}
                            onChange={(e) => changeRowLocal(i, "playerId", e.target.value)}
                            className="flex-1"
                          >
                            <option value="">— Jugador —</option>
                            {scorersLocal.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                              </option>
                            ))}
                          </Select>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={r.goals}
                              onChange={(e) => changeRowLocal(i, "goals", e.target.value)}
                              className="w-16 bg-white/10 ring-1 ring-white/10 rounded-lg px-2 py-1 text-center tabular-nums"
                            />
                          </div>

                          <IconButton onClick={() => removeRowLocal(i)} title="Eliminar" className="text-rose-300">✕</IconButton>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* VISITANTE */}
                <div className="bg-white/5 rounded-xl p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{awayTeam?.name ?? "Visitante"}</span>
                    <button
                      type="button"
                      onClick={addRowAway}
                      className="text-sm bg-white/10 hover:bg-white/15 rounded-lg px-2 py-1 ring-1 ring-white/10"
                    >
                      + Añadir más goleadores
                    </button>
                  </div>

                  <div className="space-y-2">
                    {rowsAway.map((r, i) => {
                      const pl = r.playerId ? playerById.get(String(r.playerId)) : null;
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 ring-1 ring-white/10">
                          <Avatar size={32} src={pl?.sprite} alt={pl?.name} />

                          <Select
                            value={r.playerId}
                            onChange={(e) => changeRowAway(i, "playerId", e.target.value)}
                            className="flex-1"
                          >
                            <option value="">— Jugador —</option>
                            {scorersAway.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.position ? `(${p.position})` : ""} (#{p.id})
                              </option>
                            ))}
                          </Select>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={r.goals}
                              onChange={(e) => changeRowAway(i, "goals", e.target.value)}
                              className="w-16 bg-white/10 ring-1 ring-white/10 rounded-lg px-2 py-1 text-center tabular-nums"
                            />
                          </div>

                          <IconButton onClick={() => removeRowAway(i)} title="Eliminar" className="text-rose-300">✕</IconButton>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Avisos de plantillas */}
            {localTeam && (localTeam.players?.length ?? 0) === 0 && (
              <div className="text-amber-300 text-sm">El {localTeam.name} no tiene jugadores cargados.</div>
            )}
            {awayTeam && (awayTeam.players?.length ?? 0) === 0 && (
              <div className="text-amber-300 text-sm">El {awayTeam.name} no tiene jugadores cargados.</div>
            )}
            {localTeam && !localKeepers.length && (
              <div className="text-amber-300 text-sm">El {localTeam.name} no tiene porteros asignados.</div>
            )}
            {awayTeam && !awayKeepers.length && (
              <div className="text-amber-300 text-sm">El {awayTeam.name} no tiene porteros asignados.</div>
            )}

            <button
              disabled={creating}
              className="w-full rounded-xl px-4 py-2.5 bg-amber-400 text-black font-semibold hover:opacity-90 disabled:opacity-60"
            >
              {creating ? "Enviando…" : "Enviar solicitud"}
            </button>

            {createMsg && <div className="text-sm text-white/80 mt-1">{createMsg}</div>}
            {teamsErr && <div className="text-sm text-amber-300 mt-2">{teamsErr}</div>}
          </form>
        </div>
      </div>
    </main>
  );
}
