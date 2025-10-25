/* ---------- Popup de ST por jugador (con modo intercambio) ---------- */
function PlayerTechPopup({
  open,
  onClose,
  draftId,
  players,
  index,
  setIndex,
}) {
  const player = players?.[index];
  const dpId = player?.id;

  const prevIdx = (index - 1 + players.length) % players.length;
  const nextIdx = (index + 1) % players.length;

  const [loading, setLoading] = useState(false);
  const [techs, setTechs] = useState([]); // {id,name,type,element,power,order}
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [search, setSearch] = useState("");

  // 👉 NUEVO: técnica candidata para intercambio (cuando ya hay 6)
  const [replaceCandidate, setReplaceCandidate] = useState(null);

  const remaining = useMemo(() => Math.max(0, 6 - techs.length), [techs]);

  useEffect(() => {
    if (!open || !dpId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getPlayerTechniques(draftId, dpId);
        setTechs((data.techniques || []).sort((a, b) => a.order - b.order));
        setReplaceCandidate(null); // reset al cambiar de jugador
      } catch (e) {
        toast.error(e.message || "Error cargando ST");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, dpId, draftId]);

  async function loadCatalog() {
    try {
      const res = await getTechniquesCatalog(draftId, dpId, {
        search,
        excludeAssigned: true,
      });
      setCatalog(res.results || []);
    } catch (e) {
      toast.error(e.message || "Error cargando catálogo");
    }
  }

  // 👉 Añadir o entrar en modo intercambio
  async function handleAdd(tech) {
    try {
      if (techs.length < 6) {
        const res = await addPlayerTechnique(draftId, dpId, tech.id);
        const merged = [...techs, res.added].sort((a, b) => a.order - b.order);
        setTechs(merged);
        toast.success("SuperTécnica añadida");
        loadCatalog();
        return;
      }
      // Ya tiene 6: cerrar catálogo y activar modo intercambio
      setCatalogOpen(false);
      setReplaceCandidate(tech);
      toast("Elige una de las 6 para reemplazarla", { icon: "🔁" });
    } catch (e) {
      toast.error(e.message || "No se pudo añadir");
    }
  }

  // 👉 Confirmar intercambio al pulsar un slot
  async function confirmReplace(slotIndex) {
    if (!replaceCandidate) return;
    const target = techs[slotIndex];
    if (!target) return;
    try {
      setLoading(true);
      await deletePlayerTechnique(draftId, dpId, target.id);
      await addPlayerTechnique(draftId, dpId, replaceCandidate.id, target.order);

      const fresh = (await getPlayerTechniques(draftId, dpId)).techniques || [];
      setTechs(fresh.sort((a, b) => a.order - b.order));
      toast.success(`Reemplazada '${target.name}' por '${replaceCandidate.name}'`);
    } catch (e) {
      toast.error(e.message || "No se pudo intercambiar");
    } finally {
      setReplaceCandidate(null);
      setLoading(false);
    }
  }

  async function handleDelete(t) {
    try {
      await deletePlayerTechnique(draftId, dpId, t.id);
      const fresh = (await getPlayerTechniques(draftId, dpId)).techniques || [];
      setTechs(fresh.sort((a, b) => a.order - b.order));
      toast.success("Eliminada");
      loadCatalog();
    } catch (e) {
      toast.error(e.message || "Error al eliminar");
    }
  }

  function move(i, dir) {
    if (replaceCandidate) return; // no mover en modo intercambio
    const j = i + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= techs.length) return;
    const copy = [...techs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setTechs(copy.map((t, k) => ({ ...t, order: k })));
  }

  async function handleSave() {
    try {
      await reorderPlayerTechniques(draftId, dpId, techs.map((t) => t.id));
      toast.success("Guardado");
      onClose();
    } catch (e) {
      toast.error(e.message || "Error al guardar");
    }
  }

  if (!open || !player) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center">
      <div className="w-[900px] max-w-[95vw] bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl">
        {/* Header navegación */}
        <div className="flex items-center justify-between px-5 pt-4">
          <button
            onClick={() => setIndex(prevIdx)}
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/20"
            title="Jugador anterior"
          >
            {players[prevIdx]?.name || "—"}
          </button>

          <button
            onClick={onClose}
            className="rounded-full w-9 h-9 bg-white/10 hover:bg-white/20 grid place-items-center"
            title="Cerrar"
          >
            ✕
          </button>

          <button
            onClick={() => setIndex(nextIdx)}
            className="rounded-xl px-4 py-2 bg-white/10 border border-white/10 hover:bg-white/20"
            title="Siguiente jugador"
          >
            {players[nextIdx]?.name || "—"}
          </button>
        </div>

        {/* Tarjeta de info + lista */}
        <div className="px-6 pb-5">
          {/* … (tu cabecera/imagen/datos se mantiene tal cual) … */}

          {/* Banner de modo intercambio */}
          {replaceCandidate && (
            <div className="mt-4 mb-2 px-4 py-3 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 flex items-center justify-between">
              <div>
                Estás intercambiando por: <strong>{replaceCandidate.name}</strong>.  
                Pulsa una de tus 6 técnicas para reemplazarla.
              </div>
              <button
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
                onClick={() => setReplaceCandidate(null)}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Lista ST */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">SuperTécnicas ({techs.length}/6)</h4>
              <span className="text-sm text-white/70">Slots libres: {remaining}</span>
            </div>

            {loading ? (
              <div className="py-6 text-center">Cargando…</div>
            ) : (
              <ul className="divide-y divide-white/10 rounded-xl overflow-hidden border border-white/10">
                {[0, 1, 2, 3, 4, 5].map((slot) => {
                  const t = techs[slot];
                  const clickable = !!t && !!replaceCandidate; // solo clickable en intercambio
                  return (
                    <li
                      key={slot}
                      className={[
                        "flex items-center justify-between px-4 py-3 bg-white/[0.03]",
                        clickable ? "cursor-pointer hover:bg-white/10" : ""
                      ].join(" ")}
                      onClick={() => clickable && confirmReplace(slot)}
                      title={clickable ? `Reemplazar ${t?.name}` : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 w-6 text-right">
                          {slot + 1}.
                        </span>
                        {t ? (
                          <>
                            <span className="font-medium">{t.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10">
                              {t.type}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10">
                              {t.element}
                            </span>
                            <span className="text-xs text-white/70">
                              Poder: {t.power}
                            </span>
                          </>
                        ) : (
                          <span className="text-white/50">— Vacío —</span>
                        )}
                      </div>

                      {/* Controles: ocultar cuando estamos en intercambio */}
                      {!replaceCandidate && t && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => move(slot, "up")}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => move(slot, "down")}
                            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleDelete(t)}
                            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer botones */}
          <div className="flex items-center justify-between mt-4">
            {/* Abrir catálogo deshabilitado durante intercambio */}
            <button
              onClick={() => {
                setCatalogOpen(true);
                loadCatalog();
              }}
              disabled={!!replaceCandidate}
              className={`rounded-xl px-4 py-2 ${
                replaceCandidate
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : "bg-sky-600 hover:bg-sky-500"
              }`}
            >
              Añadir/Intercambiar ST
            </button>

            <button
              onClick={handleSave}
              disabled={!!replaceCandidate}
              className={`rounded-xl px-6 py-2 ${
                replaceCandidate
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>

      {/* Panel Catálogo (no se muestra en modo intercambio) */}
      {catalogOpen && !replaceCandidate && (
        <div className="fixed inset-0 z-[100000] bg-black/70 flex items-center justify-center">
          <div className="w-[720px] max-w-[95vw] bg-slate-900 text-white rounded-2xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Catálogo (sin duplicadas)</h4>
              <button
                onClick={() => setCatalogOpen(false)}
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre…"
                className="px-3 py-2 rounded bg-white text-black flex-1"
              />
              <button
                onClick={loadCatalog}
                className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
              >
                Buscar
              </button>
            </div>

            <div className="mt-3 max-h-72 overflow-auto divide-y divide-white/10">
              {catalog.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2">
                  <div className="space-x-2">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10">
                      {t.type}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 border border-white/10">
                      {t.element}
                    </span>
                    <span className="text-xs text-white/70">Poder: {t.power}</span>
                  </div>
                  <button
                    onClick={() => handleAdd(t)}
                    className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500"
                  >
                    {techs.length < 6 ? "Añadir" : "Intercambiar…"}
                  </button>
                </div>
              ))}
              {catalog.length === 0 && (
                <div className="py-6 text-center text-white/70">Sin resultados</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}