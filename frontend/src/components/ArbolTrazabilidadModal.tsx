import React, { useEffect, useState } from "react";
import type { RequisitoItem, HistoriaUsuarioItem, TareaItem } from "../types";

interface ArbolTrazabilidadModalProps {
  proyectoId: string;
  nombreProyecto: string;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerarPlanTrabajo?: () => void;
}

interface ProyectoDetalle {
  id: string;
  nombre: string;
  descripcion?: string;
  etapa_actual: number;
  modelo_ia?: string;
  requisitos: RequisitoItem[];
  historias_usuario: HistoriaUsuarioItem[];
  tareas: TareaItem[];
}

export const ArbolTrazabilidadModal: React.FC<ArbolTrazabilidadModalProps> = ({
  proyectoId,
  nombreProyecto,
  token,
  isOpen,
  onClose,
  onGenerarPlanTrabajo,
}) => {
  const [detalle, setDetalle] = useState<ProyectoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [nodosExpandidos, setNodosExpandidos] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDetalle = async () => {
      setCargando(true);
      setError(null);
      try {
        const resp = await fetch(`http://localhost:8000/api/v1/proyectos/${proyectoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          throw new Error("No se pudo cargar la trazabilidad completa del proyecto.");
        }
        const data: ProyectoDetalle = await resp.json();
        setDetalle(data);

        // Por defecto expandir todos los RUs y HUs
        const idsExpandir = new Set<string>();
        data.requisitos.forEach((r) => idsExpandir.add(`RU-${r.id}`));
        data.historias_usuario.forEach((h) => idsExpandir.add(`HU-${h.id}`));
        setNodosExpandidos(idsExpandir);
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    };

    fetchDetalle();
  }, [isOpen, proyectoId, token]);

  if (!isOpen) return null;

  const toggleNodo = (id: string) => {
    setNodosExpandidos((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  };

  const expandirTodo = () => {
    if (!detalle) return;
    const todos = new Set<string>();
    detalle.requisitos.forEach((r) => todos.add(`RU-${r.id}`));
    detalle.historias_usuario.forEach((h) => todos.add(`HU-${h.id}`));
    setNodosExpandidos(todos);
  };

  const colapsarTodo = () => {
    setNodosExpandidos(new Set());
  };

  // Normalizador de ID para coincidencias seguras (e.g. RU1 vs RU-01)
  const sonIdsCoincidentes = (idA?: string, idB?: string) => {
    if (!idA || !idB) return false;
    const limpioA = idA.trim().toLowerCase();
    const limpioB = idB.trim().toLowerCase();
    if (limpioA === limpioB) return true;
    const numA = limpioA.replace(/[^0-9]/g, "");
    const numB = limpioB.replace(/[^0-9]/g, "");
    return numA.length > 0 && numA === numB;
  };

  const requisitos = detalle?.requisitos || [];
  const historias = detalle?.historias_usuario || [];
  const tareas = detalle?.tareas || [];

  const totalHoras = tareas.reduce((acc, t) => acc + (t.estimacion_horas || 0), 0);

  // Copiar estructura de árbol a portapapeles
  const handleCopiarEstructura = () => {
    if (!detalle) return;

    let texto = `ÁRBOL DE TRAZABILIDAD - ${detalle.nombre}\n`;
    texto += `Total: ${requisitos.length} RUs | ${historias.length} HUs | ${tareas.length} Tareas | ${totalHoras} hrs\n`;
    texto += `=========================================================\n\n`;

    requisitos.forEach((ru) => {
      texto += `[${ru.id}] ${ru.nombre} (${ru.tipo} - ${ru.estabilidad})\n`;
      const husHijas = historias.filter((h) => sonIdsCoincidentes(h.rf_origen, ru.id));
      if (husHijas.length === 0) {
        texto += `   └── (Sin historias asociadas)\n`;
      } else {
        husHijas.forEach((hu, idxHu) => {
          const esUltimaHu = idxHu === husHijas.length - 1;
          const prefijoHu = esUltimaHu ? "   └── " : "   ├── ";
          const barraSub = esUltimaHu ? "       " : "   │   ";
          texto += `${prefijoHu}[${hu.id}] ${hu.titulo}\n`;

          const tsksHijas = tareas.filter((t) => sonIdsCoincidentes(t.hu_origen, hu.id));
          if (tsksHijas.length === 0) {
            texto += `${barraSub}└── (Sin tareas técnicas asociadas)\n`;
          } else {
            tsksHijas.forEach((t, idxTsk) => {
              const esUltimaTsk = idxTsk === tsksHijas.length - 1;
              const prefijoTsk = esUltimaTsk ? "└── " : "├── ";
              texto += `${barraSub}${prefijoTsk}[${t.id}] ${t.titulo} (${t.tipo} - ${t.estimacion_horas}h)\n`;
            });
          }
        });
      }
      texto += `\n`;
    });

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Filtrado por búsqueda
  const coincideBusqueda = (texto: string) => {
    if (!busqueda.trim()) return true;
    return texto.toLowerCase().includes(busqueda.trim().toLowerCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌳</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                Trazabilidad Jerárquica Híbrida
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {nombreProyecto}
            </h2>
            <p className="text-xs text-slate-500">
              Correspondencia directa:{" "}
              <strong className="text-blue-700 font-semibold">Requisitos de Usuario (RU)</strong>{" "}
              ➔{" "}
              <strong className="text-purple-700 font-semibold">Historias de Usuario (HU)</strong>{" "}
              ➔{" "}
              <strong className="text-emerald-700 font-semibold">Tareas Técnicas (TSK)</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 text-lg transition"
            title="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Barra de Estadísticas y Controles */}
        <div className="px-5 sm:px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Métricas del Árbol */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold">
              📋 {requisitos.length} RUs
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold">
              📖 {historias.length} HUs
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              🛠️ {tareas.length} Tareas
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 font-extrabold">
              ⏱️ {totalHoras} hrs estimadas
            </span>
          </div>

          {/* Acciones de visualización */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandirTodo}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition"
            >
              Expandir todo
            </button>
            <button
              type="button"
              onClick={colapsarTodo}
              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition"
            >
              Colapsar todo
            </button>
            <button
              type="button"
              onClick={handleCopiarEstructura}
              disabled={cargando || !!error}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[11px] transition flex items-center gap-1.5 shadow-xs"
            >
              <span>{copiado ? "✓ Copiado" : "📋 Copiar Jerarquía"}</span>
            </button>
          </div>
        </div>

        {/* Buscador interactivo */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
          <span className="text-slate-400 text-xs">🔍</span>
          <input
            type="text"
            placeholder="Filtrar por código (RU1, HU-01, TSK-01) o palabras clave en artefactos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="text-[10px] text-slate-400 hover:text-slate-600 px-1 font-bold"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Contenido Scrollable con el Árbol Jerárquico */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/30">
          {cargando && (
            <div className="py-20 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-slate-600">
                Cargando relaciones de trazabilidad desde la base de datos...
              </p>
            </div>
          )}

          {error && !cargando && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
              <p className="font-bold mb-1">Error al cargar artefactos</p>
              <p>{error}</p>
            </div>
          )}

          {!cargando && !error && requisitos.length === 0 && (
            <div className="py-16 text-center text-slate-400 text-xs">
              Este proyecto no posee Requisitos de Usuario registrados.
            </div>
          )}

          {!cargando && !error && requisitos.length > 0 && (
            <div className="space-y-4">
              {requisitos.map((ru) => {
                const ruKey = `RU-${ru.id}`;
                const expandidoRU = nodosExpandidos.has(ruKey);

                // Encontrar las HUs hijas
                const husHijas = historias.filter((h) => sonIdsCoincidentes(h.rf_origen, ru.id));

                // Filtrar según búsqueda
                const ruCoincide =
                  coincideBusqueda(ru.id) ||
                  coincideBusqueda(ru.nombre) ||
                  coincideBusqueda(ru.descripcion);

                const husCoincidentes = husHijas.filter((hu) => {
                  const tsksDeHu = tareas.filter((t) => sonIdsCoincidentes(t.hu_origen, hu.id));
                  return (
                    ruCoincide ||
                    coincideBusqueda(hu.id) ||
                    coincideBusqueda(hu.titulo) ||
                    coincideBusqueda(hu.rol) ||
                    coincideBusqueda(hu.quiero) ||
                    tsksDeHu.some(
                      (t) =>
                        coincideBusqueda(t.id) ||
                        coincideBusqueda(t.titulo) ||
                        coincideBusqueda(t.descripcion)
                    )
                  );
                });

                if (!ruCoincide && husCoincidentes.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={ru.id}
                    className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all duration-150 hover:border-blue-300"
                  >
                    {/* NIVEL 1: Requisito de Usuario (RU) */}
                    <div
                      onClick={() => toggleNodo(ruKey)}
                      className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/60 to-white flex items-start justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 text-xs mt-0.5 transition font-bold"
                        >
                          {expandidoRU ? "▼" : "▶"}
                        </button>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs px-2 py-0.5 rounded-md bg-blue-600 text-white tracking-wide shadow-2xs">
                              {ru.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                              {ru.tipo}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                                ru.estabilidad === "Intransable"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              {ru.estabilidad}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm text-slate-900 leading-snug">
                            {ru.nombre}
                          </h3>

                          {ru.descripcion && (
                            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                              {ru.descripcion}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-200">
                          {husHijas.length} {husHijas.length === 1 ? "HU hija" : "HUs hijas"}
                        </span>
                      </div>
                    </div>

                    {/* NIVEL 2: Historias de Usuario (HUs) Hijas */}
                    {expandidoRU && (
                      <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/40 pl-6 sm:pl-10 space-y-3">
                        {husHijas.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2 pl-2">
                            ↳ No hay historias de usuario derivadas para este requisito.
                          </div>
                        ) : (
                          husHijas.map((hu) => {
                            const huKey = `HU-${hu.id}`;
                            const expandidoHU = nodosExpandidos.has(huKey);
                            const tsksHijas = tareas.filter((t) =>
                              sonIdsCoincidentes(t.hu_origen, hu.id)
                            );
                            const totalHorasHu = tsksHijas.reduce(
                              (acc, t) => acc + (t.estimacion_horas || 0),
                              0
                            );

                            return (
                              <div
                                key={hu.id}
                                className="bg-white border border-purple-200/80 rounded-xl p-3.5 shadow-2xs space-y-2 hover:border-purple-300 transition"
                              >
                                {/* Cabecera de la HU */}
                                <div
                                  onClick={() => toggleNodo(huKey)}
                                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                                >
                                  <div className="flex items-start gap-2 min-w-0">
                                    <button
                                      type="button"
                                      className="text-purple-400 hover:text-purple-700 text-xs mt-0.5 font-bold"
                                    >
                                      {expandidoHU ? "▼" : "▶"}
                                    </button>

                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-extrabold text-[11px] px-2 py-0.5 rounded-md bg-purple-700 text-white">
                                          {hu.id}
                                        </span>
                                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                          Origen: {hu.rf_origen}
                                        </span>
                                      </div>

                                      <h4 className="font-bold text-xs text-slate-800">
                                        {hu.titulo}
                                      </h4>

                                      <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <span className="font-semibold text-purple-700">Como</span>{" "}
                                        {hu.rol},{" "}
                                        <span className="font-semibold text-purple-700">quiero</span>{" "}
                                        {hu.quiero},{" "}
                                        <span className="font-semibold text-purple-700">para</span>{" "}
                                        {hu.para}.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 space-y-1">
                                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full border border-purple-200 block">
                                      {tsksHijas.length}{" "}
                                      {tsksHijas.length === 1 ? "tarea" : "tareas"}
                                    </span>
                                    {totalHorasHu > 0 && (
                                      <span className="text-[10px] font-semibold text-slate-500 block">
                                        {totalHorasHu} hrs
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* NIVEL 3: Tareas Técnicas (TSK) Nietas */}
                                {expandidoHU && (
                                  <div className="pt-2 pl-4 sm:pl-6 border-t border-purple-50 space-y-2">
                                    {tsksHijas.length === 0 ? (
                                      <div className="text-[11px] text-slate-400 italic py-1">
                                        ↳ Sin tareas técnicas desglosadas para esta HU.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                        {tsksHijas.map((tsk) => (
                                          <div
                                            key={tsk.id}
                                            className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/30 space-y-1 hover:bg-emerald-50/60 transition"
                                          >
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-700 text-white">
                                                {tsk.id}
                                              </span>
                                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                                                ⏱️ {tsk.estimacion_horas}h
                                              </span>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                              {tsk.tipo}
                                            </span>
                                            <p className="text-xs font-semibold text-slate-800 leading-tight">
                                              {tsk.titulo}
                                            </p>
                                            {tsk.descripcion && (
                                              <p className="text-[11px] text-slate-600 line-clamp-2">
                                                {tsk.descripcion}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer del Modal con botón a Plan de Trabajo */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span>Trazabilidad 100% verificada para auditoría de ingeniería de software.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            >
              Cerrar
            </button>
            {onGenerarPlanTrabajo && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGenerarPlanTrabajo();
                }}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>📅 Generar Plan de Trabajo (Gantt)</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

