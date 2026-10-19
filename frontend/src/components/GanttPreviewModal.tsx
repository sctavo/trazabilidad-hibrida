import React, { useEffect, useState, useMemo } from "react";
import type {
  ParametrosCalendarizacion,
  TareaItem,
  HistoriaUsuarioItem,
  RequisitoItem,
} from "../types";
import {
  calendarizarProyecto,
  formatearFechaCorta,
  parseFecha,
} from "../utils/calendarizacion";

interface GanttPreviewModalProps {
  proyectoId: string;
  nombreProyecto: string;
  token: string;
  isOpen: boolean;
  onClose: () => void;
  onProcederExportacionExcel?: () => void;
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

export const GanttPreviewModal: React.FC<GanttPreviewModalProps> = ({
  proyectoId,
  nombreProyecto,
  token,
  isOpen,
  onClose,
  onProcederExportacionExcel,
}) => {
  const [detalle, setDetalle] = useState<ProyectoDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fecha de inicio sugerida: Próximo lunes (o hoy si es lunes)
  const defaultFechaInicio = useMemo(() => {
    const d = new Date();
    const dia = d.getDay();
    const diasHastaLunes = dia === 1 ? 0 : (8 - dia) % 7 || 7;
    d.setDate(d.getDate() + diasHastaLunes);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Parámetros de calendarización interactivos
  const [params, setParams] = useState<ParametrosCalendarizacion>({
    fechaInicio: defaultFechaInicio,
    horasPorDia: 8,
    diasPorSemana: 5,
    modalidad: "secuencial",
  });

  // Filtros visuales
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [mensajeExcel, setMensajeExcel] = useState(false);

  // Carga de datos del proyecto desde la API
  useEffect(() => {
    if (!isOpen) return;

    const fetchProyecto = async () => {
      setCargando(true);
      setError(null);
      try {
        const resp = await fetch(`http://localhost:8000/api/v1/proyectos/${proyectoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          throw new Error("No se pudo cargar la información para la Carta Gantt.");
        }
        const data: ProyectoDetalle = await resp.json();
        setDetalle(data);
      } catch (err: any) {
        setError(err.message || "Error al conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    };

    fetchProyecto();
  }, [isOpen, proyectoId, token]);

  // Ejecución en tiempo real del motor de calendarización
  const resultado = useMemo(() => {
    if (!detalle) return null;
    return calendarizarProyecto(
      detalle.tareas || [],
      detalle.historias_usuario || [],
      detalle.requisitos || [],
      params
    );
  }, [detalle, params]);

  if (!isOpen) return null;

  // Filtrado de tareas calendarizadas
  const tareasFiltradas = (resultado?.tareasCalendarizadas || []).filter((t) => {
    const coincideFiltroTipo = filtroTipo === "TODOS" || t.tipo === filtroTipo;
    const coincideTexto =
      !busqueda.trim() ||
      t.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.huTitulo && t.huTitulo.toLowerCase().includes(busqueda.toLowerCase()));
    return coincideFiltroTipo && coincideTexto;
  });

  // Colores por disciplina técnica
  const getBadgeDisciplina = (tipo: string) => {
    switch (tipo) {
      case "Base de Datos":
        return {
          bg: "bg-amber-100 text-amber-800 border-amber-300",
          barColor: "bg-amber-500 text-white",
          dot: "bg-amber-500",
        };
      case "Backend":
        return {
          bg: "bg-blue-100 text-blue-800 border-blue-300",
          barColor: "bg-blue-600 text-white",
          dot: "bg-blue-600",
        };
      case "Frontend":
        return {
          bg: "bg-purple-100 text-purple-800 border-purple-300",
          barColor: "bg-purple-600 text-white",
          dot: "bg-purple-600",
        };
      case "DevOps":
        return {
          bg: "bg-cyan-100 text-cyan-800 border-cyan-300",
          barColor: "bg-cyan-600 text-white",
          dot: "bg-cyan-600",
        };
      case "Pruebas":
        return {
          bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
          barColor: "bg-emerald-600 text-white",
          dot: "bg-emerald-600",
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-300",
          barColor: "bg-slate-600 text-white",
          dot: "bg-slate-600",
        };
    }
  };

  const handleExportarExcelClick = () => {
    if (onProcederExportacionExcel) {
      onProcederExportacionExcel();
    } else {
      setMensajeExcel(true);
      setTimeout(() => setMensajeExcel(false), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                Motor de Calendarización & Carta Gantt
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {nombreProyecto}
            </h2>
            <p className="text-xs text-slate-500">
              Distribución temporal y organización en semanas laborales para el backlog técnico derivado.
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

        {/* Panel Interactivo de Parámetros de Calendarización */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/40 via-white to-blue-50/40 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚙️</span> Parámetros de Planificación
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Ajusta los valores para recalcular el cronograma en tiempo real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Fecha de Inicio */}
            <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <label className="font-bold text-slate-700 block">
                🗓️ Fecha de Inicio
              </label>
              <input
                type="date"
                value={params.fechaInicio}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, fechaInicio: e.target.value }))
                }
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* 2. Horas por Jornada Diaria */}
            <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <label className="font-bold text-slate-700 block">
                ⏱️ Jornada Diaria
              </label>
              <select
                value={params.horasPorDia}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    horasPorDia: Number(e.target.value),
                  }))
                }
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={4}>4 hrs / día (Part-time)</option>
                <option value={6}>6 hrs / día (Flexible)</option>
                <option value={8}>8 hrs / día (Jornada Completa)</option>
              </select>
            </div>

            {/* 3. Días Laborales por Semana */}
            <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <label className="font-bold text-slate-700 block">
                📆 Días Laborales
              </label>
              <select
                value={params.diasPorSemana}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    diasPorSemana: Number(e.target.value),
                  }))
                }
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={5}>5 días (Lunes a Viernes)</option>
                <option value={6}>6 días (Lunes a Sábado)</option>
              </select>
            </div>

            {/* 4. Modalidad de Asignación */}
            <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <label className="font-bold text-slate-700 block">
                🔀 Estrategia de Asignación
              </label>
              <select
                value={params.modalidad}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    modalidad: e.target.value as "secuencial" | "disciplina",
                  }))
                }
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="secuencial">Secuencial Ágil por HU</option>
                <option value="disciplina">Paralelo (Frontend / Backend)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Barra Ejecutiva de Resultados y Métricas del Cronograma */}
        {resultado && (
          <div className="px-5 sm:px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Fecha Inicio
              </span>
              <span className="font-bold text-slate-900 text-xs">
                {formatearFechaCorta(parseFecha(resultado.fechaInicioProyecto), true)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Fin Estimado
              </span>
              <span className="font-bold text-indigo-700 text-xs">
                {formatearFechaCorta(parseFecha(resultado.fechaFinProyecto), true)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Total Semanas
              </span>
              <span className="font-black text-slate-900 text-sm">
                {resultado.totalSemanas} semanas
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Esfuerzo Total
              </span>
              <span className="font-bold text-emerald-700 text-xs">
                ⏱️ {resultado.totalHoras} hrs ({resultado.totalDiasHabiles} días hábiles)
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Ritmo Promedio
              </span>
              <span className="font-bold text-slate-800 text-xs">
                ~{resultado.horasPorSemanaPromedio} hrs / semana
              </span>
            </div>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/60 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filtros por Disciplina */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Filtrar:</span>
            {["TODOS", "Base de Datos", "Backend", "Frontend", "Pruebas", "DevOps"].map(
              (tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                    filtroTipo === tipo
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tipo}
                </button>
              )
            )}
          </div>

          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar tarea o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1 w-44 sm:w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="absolute left-2 top-1.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Previsualización de la Carta Gantt (Grid Tabla + Cronograma) */}
        <div className="flex-1 overflow-auto bg-white p-4 sm:p-6">
          {cargando && (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-slate-600">
                Construyendo el modelo de calendarización del proyecto...
              </p>
            </div>
          )}

          {error && !cargando && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
              <p className="font-bold mb-1">Error al generar la Carta Gantt</p>
              <p>{error}</p>
            </div>
          )}

          {!cargando && !error && resultado && (
            <div className="min-w-[900px] border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              
              {/* Encabezado del Gantt: Columnas de Información + Columnas de Semanas */}
              <div className="grid grid-cols-12 bg-slate-100/90 border-b border-slate-200 text-[11px] font-bold text-slate-700 sticky top-0 z-20">
                {/* Lado Izquierdo: Info de la Tarea (5 columnas) */}
                <div className="col-span-2 p-2.5 border-r border-slate-200">
                  Código & Disciplina
                </div>
                <div className="col-span-2 p-2.5 border-r border-slate-200">
                  Tarea & HU Origen
                </div>
                <div className="col-span-1 p-2.5 border-r border-slate-200 text-center">
                  Duración
                </div>

                {/* Lado Derecho: Semanas (7 columnas distribuidas según el total de semanas) */}
                <div className="col-span-7 flex divide-x divide-slate-200 overflow-x-auto">
                  {resultado.semanas.map((sem) => (
                    <div
                      key={sem.numero}
                      className="flex-1 min-w-[90px] p-2 text-center bg-slate-50"
                    >
                      <span className="block text-[11px] font-black text-indigo-900">
                        {sem.etiqueta}
                      </span>
                      <span className="block text-[9px] text-slate-500 font-medium">
                        {sem.rangoTexto}
                      </span>
                      <span className="block text-[9px] font-extrabold text-indigo-600 mt-0.5">
                        {sem.horasTotales}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filas de Tareas del Gantt */}
              <div className="divide-y divide-slate-100 text-xs">
                {tareasFiltradas.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No hay tareas que coincidan con los filtros seleccionados.
                  </div>
                ) : (
                  tareasFiltradas.map((tarea) => {
                    const badge = getBadgeDisciplina(tarea.tipo);

                    return (
                      <div
                        key={tarea.id}
                        className="grid grid-cols-12 hover:bg-slate-50/80 transition-colors items-center group"
                      >
                        {/* Columna 1: Código y Disciplina */}
                        <div className="col-span-2 p-2.5 border-r border-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-white">
                            {tarea.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badge.bg}`}
                          >
                            {tarea.tipo}
                          </span>
                        </div>

                        {/* Columna 2: Título y HU Origen */}
                        <div className="col-span-2 p-2.5 border-r border-slate-100 min-w-0">
                          <span className="font-bold text-slate-900 block truncate" title={tarea.titulo}>
                            {tarea.titulo}
                          </span>
                          <span className="text-[10px] text-purple-700 block truncate" title={tarea.huTitulo}>
                            ↳ {tarea.hu_origen}: {tarea.huTitulo || "Historia asociada"}
                          </span>
                        </div>

                        {/* Columna 3: Horas y Días Hábiles */}
                        <div className="col-span-1 p-2.5 border-r border-slate-100 text-center">
                          <span className="font-extrabold text-slate-800 block text-xs">
                            {tarea.estimacion_horas}h
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {tarea.duracionDias} {tarea.duracionDias === 1 ? "día" : "días"}
                          </span>
                        </div>

                        {/* Columna 4 a 12: Grilla Visual de Línea de Tiempo (Semanas) */}
                        <div className="col-span-7 flex divide-x divide-slate-100 h-full py-2 px-1 relative">
                          {resultado.semanas.map((sem) => {
                            const estaEnSemana =
                              tarea.semanaInicio <= sem.numero &&
                              tarea.semanaFin >= sem.numero;

                            const esInicio = tarea.semanaInicio === sem.numero;
                            const esFin = tarea.semanaFin === sem.numero;

                            return (
                              <div
                                key={sem.numero}
                                className="flex-1 min-w-[90px] h-8 flex items-center justify-center px-0.5 relative"
                              >
                                {estaEnSemana && (
                                  <div
                                    title={`[${tarea.id}] ${tarea.titulo}\n${tarea.tipo} - ${tarea.estimacion_horas}h\nInicio: ${formatearFechaCorta(parseFecha(tarea.fechaInicio))}\nFin: ${formatearFechaCorta(parseFecha(tarea.fechaFin))}`}
                                    className={`w-full h-6 rounded-md ${badge.barColor} flex items-center justify-between px-2 text-[10px] font-bold shadow-2xs transition-transform duration-100 group-hover:scale-[1.02] cursor-pointer ${
                                      esInicio ? "rounded-l-md" : "rounded-l-none"
                                    } ${esFin ? "rounded-r-md" : "rounded-r-none"}`}
                                  >
                                    <span className="truncate">
                                      {esInicio ? tarea.id : "•"}
                                    </span>
                                    {esFin && (
                                      <span className="text-[9px] opacity-90 ml-1">
                                        {tarea.estimacion_horas}h
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal con Botones y Notificaciones */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Leyenda y feedback */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="font-bold text-slate-700">Disciplinas:</span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> BD
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Backend
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Frontend
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Pruebas
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span> DevOps
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end relative">
            {mensajeExcel && (
              <div className="absolute -top-12 right-0 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap">
                ✨ Previsualización aprobada. Listo para implementar exportación nativa a Excel.
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 border border-slate-300 rounded-xl transition"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleExportarExcelClick}
              className="px-5 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition flex items-center gap-2"
              title="Exportar Carta Gantt y cronograma a archivo Excel"
            >
              <span>📊</span>
              <span>Exportar a Excel (.xlsx)</span>
              <span className="text-[10px] bg-emerald-700 px-1.5 py-0.2 rounded font-medium">
                Paso siguiente
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
