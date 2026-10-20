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
import {
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  SearchIcon,
  DownloadIcon,
  SlidersIcon,
  CheckIcon,
} from "./Icons";

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

  // Colores por disciplina técnica adaptados a dark mode
  const getBadgeDisciplina = (tipo: string) => {
    switch (tipo) {
      case "Base de Datos":
        return {
          bg: "bg-amber-950/70 text-amber-300 border-amber-800/80",
          barColor: "bg-amber-500 text-slate-950",
          dot: "bg-amber-400",
        };
      case "Backend":
        return {
          bg: "bg-blue-950/70 text-sky-300 border-blue-800/80",
          barColor: "bg-blue-600 text-white",
          dot: "bg-blue-400",
        };
      case "Frontend":
        return {
          bg: "bg-purple-950/70 text-purple-300 border-purple-800/80",
          barColor: "bg-purple-600 text-white",
          dot: "bg-purple-400",
        };
      case "DevOps":
        return {
          bg: "bg-cyan-950/70 text-cyan-300 border-cyan-800/80",
          barColor: "bg-cyan-600 text-white",
          dot: "bg-cyan-400",
        };
      case "Pruebas":
        return {
          bg: "bg-emerald-950/70 text-emerald-300 border-emerald-800/80",
          barColor: "bg-emerald-600 text-white",
          dot: "bg-emerald-400",
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          barColor: "bg-slate-600 text-white",
          dot: "bg-slate-400",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto font-sans text-slate-100">
      <div className="bg-[#131d35] border border-slate-700/80 rounded-2xl w-full max-w-7xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-[#0f172a]/60 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                Motor de Calendarización & Carta Gantt
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {nombreProyecto}
            </h2>
            <p className="text-xs text-slate-400">
              Distribución temporal y organización en semanas laborales para el backlog técnico derivado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-lg transition"
            title="Cerrar modal"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Panel Interactivo de Parámetros de Calendarización */}
        <div className="p-4 sm:p-5 bg-[#0f172a]/40 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <SlidersIcon className="w-4 h-4 text-sky-400" />
              <span>Parámetros de Planificación</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Ajusta los valores para recalcular el cronograma en tiempo real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Fecha de Inicio */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Fecha de Inicio</span>
              </label>
              <input
                type="date"
                value={params.fechaInicio}
                onChange={(e) =>
                  setParams((prev) => ({ ...prev, fechaInicio: e.target.value }))
                }
                className="w-full text-xs bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 2. Horas por Jornada Diaria */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 text-teal-400" />
                <span>Jornada Diaria</span>
              </label>
              <select
                value={params.horasPorDia}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    horasPorDia: Number(e.target.value),
                  }))
                }
                className="w-full text-xs bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-white focus:outline-none focus:border-blue-500"
              >
                <option value={4}>4 hrs / día (Part-time)</option>
                <option value={6}>6 hrs / día (Flexible)</option>
                <option value={8}>8 hrs / día (Jornada Completa)</option>
              </select>
            </div>

            {/* 3. Días Laborales por Semana */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                <span>Días Laborales</span>
              </label>
              <select
                value={params.diasPorSemana}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    diasPorSemana: Number(e.target.value),
                  }))
                }
                className="w-full text-xs bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>5 días (Lunes a Viernes)</option>
                <option value={6}>6 días (Lunes a Sábado)</option>
              </select>
            </div>

            {/* 4. Modalidad de Asignación */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Estrategia de Asignación</span>
              </label>
              <select
                value={params.modalidad}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    modalidad: e.target.value as "secuencial" | "disciplina",
                  }))
                }
                className="w-full text-xs bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-white focus:outline-none focus:border-blue-500"
              >
                <option value="secuencial">Secuencial Ágil por HU</option>
                <option value="disciplina">Paralelo (Frontend / Backend)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Barra Ejecutiva de Resultados y Métricas del Cronograma */}
        {resultado && (
          <div className="px-5 sm:px-6 py-3 bg-[#0f172a]/60 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Fecha Inicio
              </span>
              <span className="font-bold text-slate-200 text-xs">
                {formatearFechaCorta(parseFecha(resultado.fechaInicioProyecto), true)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Fin Estimado
              </span>
              <span className="font-bold text-sky-400 text-xs">
                {formatearFechaCorta(parseFecha(resultado.fechaFinProyecto), true)}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Total Semanas
              </span>
              <span className="font-bold text-white text-sm">
                {resultado.totalSemanas} semanas
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Esfuerzo Total
              </span>
              <span className="font-bold text-emerald-400 text-xs">
                {resultado.totalHoras} hrs ({resultado.totalDiasHabiles} días hábiles)
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">
                Ritmo Promedio
              </span>
              <span className="font-semibold text-slate-300 text-xs">
                ~{resultado.horasPorSemanaPromedio} hrs / semana
              </span>
            </div>
          </div>
        )}

        {/* Barra de Filtros y Búsqueda */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#0f172a]/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filtros por Disciplina */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Filtrar:</span>
            {["TODOS", "Base de Datos", "Backend", "Frontend", "Pruebas", "DevOps"].map(
              (tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFiltroTipo(tipo)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    filtroTipo === tipo
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-[#0f172a] text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
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
              className="text-xs bg-[#0f172a] border border-slate-700 rounded-lg pl-7 pr-3 py-1 w-44 sm:w-56 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <SearchIcon className="absolute left-2 top-2 text-slate-500 w-3.5 h-3.5" />
          </div>
        </div>

        {/* Previsualización de la Carta Gantt (Grid Tabla + Cronograma) */}
        <div className="flex-1 overflow-auto bg-[#0f172a]/80 p-4 sm:p-6">
          {cargando && (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-xs font-semibold text-slate-400">
                Construyendo el cronograma de trabajo...
              </p>
            </div>
          )}

          {error && !cargando && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs text-center">
              <p className="font-bold mb-1">Error al generar la Carta Gantt</p>
              <p>{error}</p>
            </div>
          )}

          {!cargando && !error && resultado && (
            <div className="min-w-[900px] border border-slate-800 rounded-xl overflow-hidden bg-[#131d35] shadow-xl">
              
              {/* Encabezado del Gantt: Columnas de Información + Columnas de Semanas */}
              <div className="grid grid-cols-12 bg-[#0f172a] border-b border-slate-800 text-[11px] font-semibold text-slate-300 sticky top-0 z-20">
                {/* Lado Izquierdo: Info de la Tarea (5 columnas) */}
                <div className="col-span-2 p-2.5 border-r border-slate-800">
                  Código & Disciplina
                </div>
                <div className="col-span-2 p-2.5 border-r border-slate-800">
                  Tarea & HU Origen
                </div>
                <div className="col-span-1 p-2.5 border-r border-slate-800 text-center">
                  Duración
                </div>

                {/* Lado Derecho: Semanas */}
                <div className="col-span-7 flex divide-x divide-slate-800 overflow-x-auto">
                  {resultado.semanas.map((sem) => (
                    <div
                      key={sem.numero}
                      className="flex-1 min-w-[90px] p-2 text-center bg-[#0f172a]"
                    >
                      <span className="block text-[11px] font-bold text-sky-400">
                        {sem.etiqueta}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-medium">
                        {sem.rangoTexto}
                      </span>
                      <span className="block text-[9px] font-bold text-teal-400 mt-0.5">
                        {sem.horasTotales}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filas de Tareas del Gantt */}
              <div className="divide-y divide-slate-800/80 text-xs">
                {tareasFiltradas.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No hay tareas que coincidan con los filtros seleccionados.
                  </div>
                ) : (
                  tareasFiltradas.map((tarea) => {
                    const badge = getBadgeDisciplina(tarea.tipo);

                    return (
                      <div
                        key={tarea.id}
                        className="grid grid-cols-12 hover:bg-slate-800/40 transition-colors items-center group"
                      >
                        {/* Columna 1: Código y Disciplina */}
                        <div className="col-span-2 p-2.5 border-r border-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                            {tarea.id}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.bg}`}
                          >
                            {tarea.tipo}
                          </span>
                        </div>

                        {/* Columna 2: Título y HU Origen */}
                        <div className="col-span-2 p-2.5 border-r border-slate-800 min-w-0">
                          <span className="font-semibold text-slate-200 block truncate" title={tarea.titulo}>
                            {tarea.titulo}
                          </span>
                          <span className="text-[10px] text-purple-300 block truncate" title={tarea.huTitulo}>
                            ↳ {tarea.hu_origen}: {tarea.huTitulo || "Historia asociada"}
                          </span>
                        </div>

                        {/* Columna 3: Horas y Días Hábiles */}
                        <div className="col-span-1 p-2.5 border-r border-slate-800 text-center">
                          <span className="font-bold text-slate-200 block text-xs">
                            {tarea.estimacion_horas}h
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {tarea.duracionDias} {tarea.duracionDias === 1 ? "día" : "días"}
                          </span>
                        </div>

                        {/* Columna 4 a 12: Grilla Visual de Línea de Tiempo (Semanas) */}
                        <div className="col-span-7 flex divide-x divide-slate-800/60 h-full py-2 px-1 relative">
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
                                    className={`w-full h-6 rounded-md ${badge.barColor} flex items-center justify-between px-2 text-[10px] font-bold shadow-xs transition-transform duration-100 group-hover:scale-[1.02] cursor-pointer ${
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
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#0f172a]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Leyenda y feedback */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="font-semibold text-slate-300">Disciplinas:</span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> BD
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Backend
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Frontend
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Pruebas
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600"></span> DevOps
              </span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end relative">
            {mensajeExcel && (
              <div className="absolute -top-12 right-0 bg-slate-900 border border-slate-700 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Previsualización aprobada. Listo para implementar exportación a Excel.</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 rounded-xl transition"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleExportarExcelClick}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition flex items-center gap-2"
              title="Exportar Carta Gantt y cronograma a archivo Excel"
            >
              <DownloadIcon className="w-4 h-4" />
              <span>Exportar a Excel (.xlsx)</span>
              <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                Próximo paso
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
