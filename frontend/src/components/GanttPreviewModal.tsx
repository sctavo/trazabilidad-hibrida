import React, { useEffect, useState, useMemo } from "react";
import type {
  ParametrosCalendarizacion,
  TareaItem,
  HistoriaUsuarioItem,
  RequisitoItem,
  TareaCalendarizada,
} from "../types";
import {
  calendarizarProyecto,
  recalcularMetricasGantt,
  moverTareaASemana,
  actualizarHorasTarea,
  formatearFechaCorta,
  parseFecha,
} from "../utils/calendarizacion";
import { exportarPlanTrabajoExcel } from "../utils/exportacionExcel";
import {
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  SearchIcon,
  SlidersIcon,
  CheckIcon,
  EditIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  RotateCcwIcon,
  PlusIcon,
  SaveIcon,
  FileSpreadsheetIcon,
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
  texto_documento?: string;
  nombre_archivo?: string;
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

  // Estado para personalización y total flexibilidad del usuario
  const [tareasPersonalizadas, setTareasPersonalizadas] = useState<TareaCalendarizada[] | null>(null);
  const [semanasMinimas, setSemanasMinimas] = useState<number>(0);
  const [tareaEnEdicion, setTareaEnEdicion] = useState<TareaCalendarizada | null>(null);

  // Filtros visuales y búsqueda
  const [filtroTipo, setFiltroTipo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");

  // Notificaciones y persistencia
  const [mensajeExcel, setMensajeExcel] = useState(false);
  const [guardandoProyecto, setGuardandoProyecto] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);

  // Carga de datos del proyecto desde la API
  useEffect(() => {
    if (!isOpen) return;

    const fetchProyecto = async () => {
      setCargando(true);
      setError(null);
      setTareasPersonalizadas(null);
      setSemanasMinimas(0);
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

  // Ejecución del motor de calendarización: automático o recalculo con tareas personalizadas
  const resultado = useMemo(() => {
    if (!detalle) return null;

    if (tareasPersonalizadas) {
      return recalcularMetricasGantt(tareasPersonalizadas, params, semanasMinimas);
    }

    const resAuto = calendarizarProyecto(
      detalle.tareas || [],
      detalle.historias_usuario || [],
      detalle.requisitos || [],
      params
    );

    if (semanasMinimas > resAuto.totalSemanas) {
      return recalcularMetricasGantt(resAuto.tareasCalendarizadas, params, semanasMinimas);
    }

    return resAuto;
  }, [detalle, params, tareasPersonalizadas, semanasMinimas]);

  if (!isOpen) return null;

  // Lista activa de tareas calendarizadas
  const listaTareasActivas = tareasPersonalizadas || resultado?.tareasCalendarizadas || [];

  // Filtrado de tareas calendarizadas
  const tareasFiltradas = listaTareasActivas.filter((t) => {
    const coincideFiltroTipo = filtroTipo === "TODOS" || t.tipo === filtroTipo;
    const coincideTexto =
      !busqueda.trim() ||
      t.id.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (t.huTitulo && t.huTitulo.toLowerCase().includes(busqueda.toLowerCase()));
    return coincideFiltroTipo && coincideTexto;
  });

  // Mover tarea directamente a una semana seleccionada (por ejemplo al hacer click en la celda)
  const handleMoverTareaSemana = (tareaId: string, nuevaSemana: number) => {
    const actualizadas = listaTareasActivas.map((t) => {
      if (t.id === tareaId) {
        return moverTareaASemana(t, nuevaSemana, params);
      }
      return t;
    });
    setTareasPersonalizadas(actualizadas);
  };

  // Desplazar tarea 1 semana antes o después
  const handleDesplazarSemana = (tareaId: string, delta: number) => {
    const actualizadas = listaTareasActivas.map((t) => {
      if (t.id === tareaId) {
        const nuevaSemana = Math.max(1, t.semanaInicio + delta);
        return moverTareaASemana(t, nuevaSemana, params);
      }
      return t;
    });
    setTareasPersonalizadas(actualizadas);
  };

  // Guardar edición manual de una tarea (modal de edición rápida)
  const handleGuardarEdicionTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tareaEnEdicion) return;

    const actualizadas = listaTareasActivas.map((t) => {
      if (t.id === tareaEnEdicion.id) {
        let modificada = moverTareaASemana(
          t,
          tareaEnEdicion.semanaInicio,
          params,
          tareaEnEdicion.semanaFin
        );
        modificada = actualizarHorasTarea(
          modificada,
          tareaEnEdicion.estimacion_horas,
          params
        );
        modificada.titulo = tareaEnEdicion.titulo;
        modificada.tipo = tareaEnEdicion.tipo;
        return modificada;
      }
      return t;
    });

    setTareasPersonalizadas(actualizadas);
    setTareaEnEdicion(null);
  };

  // Restablecer al cálculo automático inicial
  const handleRestablecerAutomatico = () => {
    setTareasPersonalizadas(null);
    setSemanasMinimas(0);
  };

  // Agregar una semana extra al horizonte del cronograma
  const handleAgregarSemana = () => {
    const maxSem = resultado?.totalSemanas || 1;
    setSemanasMinimas(Math.max(maxSem + 1, semanasMinimas + 1));
  };

  // Persistir cambios en la base de datos PostgreSQL
  const handleGuardarPlanEnProyecto = async () => {
    if (!detalle || !resultado) return;
    setGuardandoProyecto(true);
    setMensajeGuardado(null);

    try {
      const tareasActualizadas = (detalle.tareas || []).map((tOrig) => {
        const tPersonalizada = listaTareasActivas.find((tp) => tp.id === tOrig.id);
        if (tPersonalizada) {
          return {
            ...tOrig,
            titulo: tPersonalizada.titulo,
            tipo: tPersonalizada.tipo,
            estimacion_horas: tPersonalizada.estimacion_horas,
          };
        }
        return tOrig;
      });

      const payload = {
        nombre: detalle.nombre,
        descripcion: detalle.descripcion || "",
        etapa_actual: detalle.etapa_actual || 4,
        modelo_ia: detalle.modelo_ia || "google/gemini-2.5-flash-lite",
        texto_documento: detalle.texto_documento || "",
        nombre_archivo: detalle.nombre_archivo || "",
        requisitos: detalle.requisitos || [],
        historias_usuario: detalle.historias_usuario || [],
        tareas: tareasActualizadas,
      };

      const resp = await fetch(`http://localhost:8000/api/v1/proyectos/?proyecto_id=${proyectoId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error("No se pudo guardar la modificación en la base de datos.");
      }

      setMensajeGuardado("¡Plan guardado exitosamente en el proyecto!");
      setTimeout(() => setMensajeGuardado(null), 4000);
    } catch (err: any) {
      setMensajeGuardado(`Error al guardar: ${err.message}`);
      setTimeout(() => setMensajeGuardado(null), 4000);
    } finally {
      setGuardandoProyecto(false);
    }
  };

  // Exportar el plan de trabajo modificado a Excel (.xlsx)
  const handleExportarExcelClick = () => {
    if (!resultado) return;

    try {
      exportarPlanTrabajoExcel({
        nombreProyecto,
        params,
        resultado,
        modeloIa: detalle?.modelo_ia,
      });

      setMensajeExcel(true);
      setTimeout(() => setMensajeExcel(false), 4500);

      if (onProcederExportacionExcel) {
        onProcederExportacionExcel();
      }
    } catch (err) {
      console.error("Error al exportar a Excel:", err);
    }
  };

  // Colores por disciplina técnica
  const getBadgeDisciplina = (tipo: string) => {
    switch (tipo) {
      case "Base de Datos":
        return {
          bg: "bg-amber-950/70 text-amber-300 border-amber-800/80",
          barColor: "bg-amber-500 hover:bg-amber-400 text-slate-950",
          dot: "bg-amber-400",
        };
      case "Backend":
        return {
          bg: "bg-blue-950/70 text-sky-300 border-blue-800/80",
          barColor: "bg-blue-600 hover:bg-blue-500 text-white",
          dot: "bg-blue-400",
        };
      case "Frontend":
        return {
          bg: "bg-purple-950/70 text-purple-300 border-purple-800/80",
          barColor: "bg-purple-600 hover:bg-purple-500 text-white",
          dot: "bg-purple-400",
        };
      case "DevOps":
        return {
          bg: "bg-cyan-950/70 text-cyan-300 border-cyan-800/80",
          barColor: "bg-cyan-600 hover:bg-cyan-500 text-white",
          dot: "bg-cyan-400",
        };
      case "Pruebas":
        return {
          bg: "bg-emerald-950/70 text-emerald-300 border-emerald-800/80",
          barColor: "bg-emerald-600 hover:bg-emerald-500 text-white",
          dot: "bg-emerald-400",
        };
      default:
        return {
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          barColor: "bg-slate-600 hover:bg-slate-500 text-white",
          dot: "bg-slate-400",
        };
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
                Plan de Trabajo & Carta Gantt Interactiva
              </span>
              {tareasPersonalizadas && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700 animate-pulse">
                  Modo Personalizado Activo
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {nombreProyecto}
            </h2>
            <p className="text-xs text-slate-400">
              Personaliza libremente la asignación de semanas, desplaza tareas o ajusta horas antes de exportar a Excel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportarExcelClick}
              disabled={cargando || !resultado}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
              title="Exportar cronograma a Excel (.xlsx)"
            >
              <FileSpreadsheetIcon className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 text-lg transition"
              title="Cerrar modal"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Interactivo de Parámetros de Calendarización */}
        <div className="p-4 sm:p-5 bg-[#0f172a]/40 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <SlidersIcon className="w-4 h-4 text-sky-400" />
              <span>Parámetros Base de Planificación</span>
            </span>
            <div className="flex items-center gap-2">
              {tareasPersonalizadas && (
                <button
                  type="button"
                  onClick={handleRestablecerAutomatico}
                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded-lg transition flex items-center gap-1.5"
                >
                  <RotateCcwIcon className="w-3.5 h-3.5" />
                  <span>Restablecer Plan Automático</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAgregarSemana}
                className="px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/80 rounded-lg transition flex items-center gap-1.5"
                title="Ampliar el horizonte del cronograma añadiendo una semana extra"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>+ Agregar Semana</span>
              </button>
            </div>
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

            {/* 2. Horas por Jornada Diaria (Libertad total: 1 a 20 hrs/día) */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span>Jornada Diaria</span>
                </label>
                <span className="font-mono font-bold text-[11px] text-teal-300">
                  {params.horasPorDia}h / día
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={params.horasPorDia}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, Number(e.target.value) || 1));
                    setParams((prev) => ({ ...prev, horasPorDia: val }));
                  }}
                  className="w-16 text-xs bg-[#0f172a] border border-slate-700 rounded-lg px-2 py-1.5 font-bold text-white focus:outline-none focus:border-blue-500 text-center"
                  title="Horas de trabajo por jornada diaria (1 a 20)"
                />
                <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                  {[4, 6, 8, 10, 12].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setParams((prev) => ({ ...prev, horasPorDia: preset }))}
                      className={`px-1.5 py-1 rounded text-[10px] font-semibold transition ${
                        params.horasPorDia === preset
                          ? "bg-teal-500/25 text-teal-300 border border-teal-500/50"
                          : "bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Días Laborales por Semana (Libertad total: 1 a 7 días) */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Días Laborales</span>
                </label>
                <span className="font-mono font-bold text-[11px] text-purple-300">
                  {params.diasPorSemana} {params.diasPorSemana === 1 ? "día" : "días"}/sem
                </span>
              </div>
              <select
                value={params.diasPorSemana}
                onChange={(e) =>
                  setParams((prev) => ({
                    ...prev,
                    diasPorSemana: Math.max(1, Math.min(7, Number(e.target.value) || 5)),
                  }))
                }
                className="w-full text-xs bg-[#0f172a] border border-slate-700 rounded-lg px-2.5 py-1.5 font-medium text-white focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1 día / sem (Solo Lunes)</option>
                <option value={2}>2 días / sem (Lunes y Martes)</option>
                <option value={3}>3 días / sem (Lunes a Miércoles)</option>
                <option value={4}>4 días / sem (Lunes a Jueves)</option>
                <option value={5}>5 días / sem (Lunes a Viernes - Estándar)</option>
                <option value={6}>6 días / sem (Lunes a Sábado)</option>
                <option value={7}>7 días / sem (Lunes a Domingo - Continuo)</option>
              </select>
            </div>

            {/* 4. Modalidad de Asignación */}
            <div className="space-y-1 bg-[#131d35] p-3 rounded-xl border border-slate-800">
              <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Estrategia Base</span>
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

        {/* Guía de Flexibilidad para el Usuario */}
        <div className="px-5 sm:px-6 py-2 bg-blue-950/30 border-b border-blue-900/40 flex items-center justify-between text-[11px] text-sky-300 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
            <span>
              <strong>Flexibilidad Total:</strong> Puedes mover cualquier tarea usando las flechas <strong>◀ ▶</strong>, haciendo <strong>clic en cualquier celda de la semana</strong> en la grilla, o usando <strong>✎ Editar</strong>.
            </span>
          </div>
          {mensajeGuardado && (
            <span className="text-emerald-300 font-bold bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-700 animate-in fade-in">
              {mensajeGuardado}
            </span>
          )}
        </div>

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
            <div className="min-w-[950px] border border-slate-800 rounded-xl overflow-hidden bg-[#131d35] shadow-xl">
              
              {/* Encabezado del Gantt: Columnas de Información + Columnas de Semanas */}
              <div className="grid grid-cols-12 bg-[#0f172a] border-b border-slate-800 text-[11px] font-semibold text-slate-300 sticky top-0 z-20">
                {/* Lado Izquierdo: Info de la Tarea (5 columnas) */}
                <div className="col-span-3 p-2.5 border-r border-slate-800 flex items-center justify-between">
                  <span>Código, Disciplina & Ajustes</span>
                  <span className="text-[10px] text-slate-500">Mover / Editar</span>
                </div>
                <div className="col-span-2 p-2.5 border-r border-slate-800">
                  Tarea & HU Origen
                </div>
                <div className="col-span-1 p-2.5 border-r border-slate-800 text-center">
                  Carga
                </div>

                {/* Lado Derecho: Semanas */}
                <div className="col-span-6 flex divide-x divide-slate-800 overflow-x-auto">
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
                        {/* Columna 1: Código, Disciplina y Controles Rápidos de Movimiento */}
                        <div className="col-span-3 p-2 border-r border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                              {tarea.id}
                            </span>
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.bg}`}
                            >
                              {tarea.tipo}
                            </span>
                          </div>

                          {/* Botones de flexibilidad rápida */}
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() => handleDesplazarSemana(tarea.id, -1)}
                              disabled={tarea.semanaInicio <= 1}
                              title="Desplazar a la semana anterior (◀)"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 transition"
                            >
                              <ArrowLeftIcon className="w-3 h-3" />
                            </button>
                            <span className="text-[10px] font-mono text-slate-300 px-1 font-bold">
                              S{tarea.semanaInicio}{tarea.semanaFin > tarea.semanaInicio ? `-S${tarea.semanaFin}` : ""}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDesplazarSemana(tarea.id, +1)}
                              title="Desplazar a la semana siguiente (▶)"
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                            >
                              <ArrowRightIcon className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTareaEnEdicion(tarea)}
                              title="Editar tarea, semanas u horas"
                              className="p-1 rounded bg-blue-950/80 hover:bg-blue-900 text-sky-300 border border-blue-800 transition ml-0.5"
                            >
                              <EditIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Columna 2: Título y HU Origen */}
                        <div className="col-span-2 p-2.5 border-r border-slate-800 min-w-0">
                          <span
                            className="font-semibold text-slate-200 block truncate cursor-pointer hover:text-sky-300"
                            title={tarea.titulo}
                            onClick={() => setTareaEnEdicion(tarea)}
                          >
                            {tarea.titulo}
                          </span>
                          <span className="text-[10px] text-purple-300 block truncate" title={tarea.huTitulo}>
                            ↳ {tarea.hu_origen}: {tarea.huTitulo || "Historia asociada"}
                          </span>
                        </div>

                        {/* Columna 3: Horas y Días Hábiles */}
                        <div
                          className="col-span-1 p-2 border-r border-slate-800 text-center cursor-pointer hover:bg-slate-800/60 transition"
                          onClick={() => setTareaEnEdicion(tarea)}
                          title="Hacer clic para editar horas estimadas"
                        >
                          <span className="font-bold text-slate-200 block text-xs">
                            {tarea.estimacion_horas}h
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {tarea.duracionDias} {tarea.duracionDias === 1 ? "día" : "días"}
                          </span>
                        </div>

                        {/* Columna 4 a 12: Grilla Visual de Línea de Tiempo (Semanas) */}
                        <div className="col-span-6 flex divide-x divide-slate-800/60 h-full py-1.5 px-0.5 relative">
                          {resultado.semanas.map((sem) => {
                            const estaEnSemana =
                              tarea.semanaInicio <= sem.numero &&
                              tarea.semanaFin >= sem.numero;

                            const esInicio = tarea.semanaInicio === sem.numero;
                            const esFin = tarea.semanaFin === sem.numero;

                            return (
                              <div
                                key={sem.numero}
                                onClick={() => handleMoverTareaSemana(tarea.id, sem.numero)}
                                className={`flex-1 min-w-[90px] h-9 flex items-center justify-center px-0.5 relative transition cursor-pointer ${
                                  !estaEnSemana
                                    ? "hover:bg-sky-500/10 hover:border hover:border-dashed hover:border-sky-500/40 rounded"
                                    : ""
                                }`}
                                title={
                                  estaEnSemana
                                    ? `[${tarea.id}] ${tarea.titulo}\n${tarea.tipo} - ${tarea.estimacion_horas}h\nActiva en ${sem.etiqueta}`
                                    : `Hacer clic para mover esta tarea a ${sem.etiqueta}`
                                }
                              >
                                {estaEnSemana ? (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTareaEnEdicion(tarea);
                                    }}
                                    className={`w-full h-7 rounded-md ${badge.barColor} flex items-center justify-between px-2 text-[10px] font-bold shadow-xs transition-transform duration-100 group-hover:scale-[1.02] cursor-pointer ${
                                      esInicio ? "rounded-l-md" : "rounded-l-none"
                                    } ${esFin ? "rounded-r-md" : "rounded-r-none"}`}
                                  >
                                    <span className="truncate">
                                      {esInicio ? tarea.id : "•"}
                                    </span>
                                    {esFin && (
                                      <span className="text-[9px] opacity-90 ml-1 font-mono">
                                        {tarea.estimacion_horas}h
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-700 group-hover:text-slate-500 select-none">
                                    +
                                  </span>
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

        {/* Modal / Dialog de Edición Rápida de Tarea (z-[100] para sobreponerse a cabeceras fijas) */}
        {tareaEnEdicion && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-[#131d35] border border-slate-700 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <EditIcon className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-white text-sm">
                    Modificar Plan: {tareaEnEdicion.id}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTareaEnEdicion(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleGuardarEdicionTarea} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Título de la Tarea
                  </label>
                  <input
                    type="text"
                    value={tareaEnEdicion.titulo}
                    onChange={(e) =>
                      setTareaEnEdicion({ ...tareaEnEdicion, titulo: e.target.value })
                    }
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Disciplina
                    </label>
                    <select
                      value={tareaEnEdicion.tipo}
                      onChange={(e) =>
                        setTareaEnEdicion({
                          ...tareaEnEdicion,
                          tipo: e.target.value as any,
                        })
                      }
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      <option value="Base de Datos">Base de Datos</option>
                      <option value="Backend">Backend</option>
                      <option value="Frontend">Frontend</option>
                      <option value="Pruebas">Pruebas</option>
                      <option value="DevOps">DevOps</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Estimación (Horas)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={tareaEnEdicion.estimacion_horas}
                      onChange={(e) =>
                        setTareaEnEdicion({
                          ...tareaEnEdicion,
                          estimacion_horas: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Semana Inicio
                    </label>
                    <select
                      value={tareaEnEdicion.semanaInicio}
                      onChange={(e) => {
                        const nuevaIni = Number(e.target.value);
                        const nuevaFin = Math.max(nuevaIni, tareaEnEdicion.semanaFin);
                        setTareaEnEdicion({
                          ...tareaEnEdicion,
                          semanaInicio: nuevaIni,
                          semanaFin: nuevaFin,
                        });
                      }}
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      {Array.from(
                        { length: Math.max(resultado?.totalSemanas || 1, 10) },
                        (_, i) => i + 1
                      ).map((s) => (
                        <option key={s} value={s}>
                          Semana {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Semana Fin
                    </label>
                    <select
                      value={tareaEnEdicion.semanaFin}
                      onChange={(e) =>
                        setTareaEnEdicion({
                          ...tareaEnEdicion,
                          semanaFin: Math.max(tareaEnEdicion.semanaInicio, Number(e.target.value)),
                        })
                      }
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                    >
                      {Array.from(
                        { length: Math.max(resultado?.totalSemanas || 1, 10) },
                        (_, i) => i + 1
                      )
                        .filter((s) => s >= tareaEnEdicion.semanaInicio)
                        .map((s) => (
                          <option key={s} value={s}>
                            Semana {s}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTareaEnEdicion(null)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xs"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
              <div className="absolute -top-12 right-0 bg-slate-900 border border-emerald-500 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap flex items-center gap-1.5">
                <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>¡Plan de Trabajo y Carta Gantt exportados exitosamente a Excel (.xlsx)!</span>
              </div>
            )}

            {tareasPersonalizadas && (
              <button
                type="button"
                onClick={handleGuardarPlanEnProyecto}
                disabled={guardandoProyecto}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl transition flex items-center gap-1.5"
                title="Guardar las horas y datos modificados en PostgreSQL"
              >
                <SaveIcon className="w-3.5 h-3.5" />
                <span>{guardandoProyecto ? "Guardando..." : "Guardar en Proyecto"}</span>
              </button>
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
              disabled={cargando || !resultado}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition flex items-center gap-2"
              title="Exportar Carta Gantt interactiva a archivo Excel (.xlsx)"
            >
              <FileSpreadsheetIcon className="w-4 h-4" />
              <span>Exportar a Excel (.xlsx)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
