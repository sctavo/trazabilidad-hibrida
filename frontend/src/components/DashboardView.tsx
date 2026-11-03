import React, { useEffect, useState } from "react";
import logoImg from "../assets/logo.png";
import { MODELOS_IA_CATALOGO, type ProyectoResumen, type Usuario } from "../types";
import { PerfilConfiguracionModal } from "./PerfilConfiguracionModal";
import { ArbolTrazabilidadModal } from "./ArbolTrazabilidadModal";
import { GanttPreviewModal } from "./GanttPreviewModal";
import {
  FolderIcon,
  ChartIcon,
  GanttIcon,
  TrashIcon,
  SettingsIcon,
  SearchIcon,
  TreeIcon,
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  PlusIcon,
} from "./Icons";

interface DashboardViewProps {
  token: string;
  usuario: Usuario | null;
  onAbrirProyecto: (id: string) => void;
  onCrearNuevoProyecto: () => void;
  onCerrarSesion: () => void;
  onPerfilActualizado?: (usuario: Usuario) => void;
  tabInicial?: "proyectos" | "plan_trabajo";
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  token,
  usuario,
  onAbrirProyecto,
  onCrearNuevoProyecto,
  onCerrarSesion,
  onPerfilActualizado,
  tabInicial = "proyectos",
}) => {
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [proyectoAEliminar, setProyectoAEliminar] = useState<ProyectoResumen | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [mostrarPerfilModal, setMostrarPerfilModal] = useState(false);

  // Pestañas: "proyectos" (Mis Proyectos) vs "plan_trabajo" (Plan de Trabajo / Gantt)
  const [tabActiva, setTabActiva] = useState<"proyectos" | "plan_trabajo">(tabInicial);

  // Modal de Árbol de Trazabilidad
  const [proyectoParaArbol, setProyectoParaArbol] = useState<ProyectoResumen | null>(null);

  // Modal interactivo de Previsualización de Carta Gantt
  const [proyectoParaGantt, setProyectoParaGantt] = useState<ProyectoResumen | null>(null);

  useEffect(() => {
    if (tabInicial) {
      setTabActiva(tabInicial);
    }
  }, [tabInicial]);

  const fetchProyectos = async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/proyectos/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        throw new Error("No se pudo cargar la lista de proyectos.");
      }
      const data: ProyectoResumen[] = await resp.json();
      setProyectos(data);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, [token]);

  const handleConfirmarEliminar = async () => {
    if (!proyectoAEliminar) return;
    setEliminando(true);
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/proyectos/${proyectoAEliminar.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("No se pudo eliminar el proyecto.");
      setProyectos((prev) => prev.filter((p) => p.id !== proyectoAEliminar.id));
      setProyectoAEliminar(null);
    } catch (err: any) {
      alert(err.message || "Error al eliminar el proyecto.");
    } finally {
      setEliminando(false);
    }
  };

  // Cálculos para métricas del dashboard y la barra lateral
  const totalProyectos = proyectos.length;
  const proyectosCompletados = proyectos.filter((p) => p.etapa_actual === 4).length;
  const porcentajeCompletitud = totalProyectos > 0 ? Math.round((proyectosCompletados / totalProyectos) * 100) : 0;

  // Desglose por etapa
  const enEtapa1 = proyectos.filter((p) => p.etapa_actual === 1).length;
  const enEtapa2 = proyectos.filter((p) => p.etapa_actual === 2).length;
  const enEtapa3 = proyectos.filter((p) => p.etapa_actual === 3).length;
  const enEtapa4 = proyectos.filter((p) => p.etapa_actual === 4).length;

  // Total acumulado de artefactos generados en la cuenta
  const totalRequisitos = proyectos.reduce((acc, p) => acc + (p.total_requisitos || 0), 0);
  const totalHistorias = proyectos.reduce((acc, p) => acc + (p.total_historias || 0), 0);
  const totalTareas = proyectos.reduce((acc, p) => acc + (p.total_tareas || 0), 0);

  // Cálculo del modelo de IA preferido del analista
  const conteoModelos: Record<string, number> = {};
  proyectos.forEach((p) => {
    const mod = p.modelo_ia || "google/gemini-2.5-flash-lite";
    conteoModelos[mod] = (conteoModelos[mod] || 0) + 1;
  });

  let modeloPreferidoId = "google/gemini-2.5-flash-lite";
  let maxUsos = 0;
  Object.entries(conteoModelos).forEach(([modId, cantidad]) => {
    if (cantidad > maxUsos) {
      maxUsos = cantidad;
      modeloPreferidoId = modId;
    }
  });

  const modeloPreferidoInfo =
    MODELOS_IA_CATALOGO.find((m) => m.id === modeloPreferidoId) || MODELOS_IA_CATALOGO[0];
  const porcentajeUsoModelo = totalProyectos > 0 ? Math.round((maxUsos / totalProyectos) * 100) : 100;

  // Proyectos filtrados por búsqueda
  const proyectosFiltrados = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Proyectos en etapa 4 para el apartado de Plan de Trabajo
  const proyectosTerminados = proyectosFiltrados.filter((p) => p.etapa_actual === 4);

  const getEtapaInfo = (etapa: number) => {
    switch (etapa) {
      case 0:
        return {
          texto: "Paso 0: Motor IA",
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          barColor: "bg-slate-500",
          porcentaje: 10,
        };
      case 1:
        return {
          texto: "Etapa 1: Ingesta",
          bg: "bg-blue-500/15 text-sky-400 border-blue-500/30",
          barColor: "bg-blue-500",
          porcentaje: 25,
        };
      case 2:
        return {
          texto: "Etapa 2: Requisitos (RU)",
          bg: "bg-sky-500/15 text-sky-400 border-sky-500/30",
          barColor: "bg-sky-500",
          porcentaje: 50,
        };
      case 3:
        return {
          texto: "Etapa 3: Historias (HU)",
          bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
          barColor: "bg-purple-500",
          porcentaje: 75,
        };
      case 4:
        return {
          texto: "Etapa 4: Tareas (Completado)",
          bg: "bg-teal-500/15 text-teal-300 border-teal-500/30",
          barColor: "bg-teal-400",
          porcentaje: 100,
        };
      default:
        return {
          texto: `Etapa ${etapa}`,
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          barColor: "bg-slate-500",
          porcentaje: 25,
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      {/* Modal de confirmación para eliminar proyecto */}
      {proyectoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#131d35] border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <TrashIcon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-base text-white">¿Eliminar proyecto?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Estás a punto de eliminar{" "}
              <strong className="text-white font-semibold">{proyectoAEliminar.nombre}</strong>.
              Esta acción eliminará de forma irreversible el documento fuente y todos los Requisitos de Usuario,
              Historias de Usuario y Tareas Técnicas asociadas en la base de datos.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setProyectoAEliminar(null)}
                className="text-xs px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={handleConfirmarEliminar}
                className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Navegación Superior */}
      <header className="bg-[#131d35] border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <img
              src={logoImg}
              alt="ReqGen"
              className="h-10 sm:h-12 w-auto object-contain cursor-pointer"
              onClick={() => {}}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-right">
              <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 text-sky-400 flex items-center justify-center font-bold text-xs">
                {(usuario?.apodo || usuario?.nombre || "AN").slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-white block leading-tight">
                  {usuario?.apodo ? `@${usuario.apodo}` : usuario?.nombre || "Analista"}
                </span>
                <span className="text-[11px] text-slate-400 block leading-tight">
                  {usuario?.email}
                </span>
              </div>
            </div>

            <button
              onClick={() => setMostrarPerfilModal(true)}
              className="text-xs font-semibold px-3.5 py-2 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5"
              title="Configuración de perfil (apodo, contraseña, baja)"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>

            <button
              onClick={onCerrarSesion}
              className="text-xs font-semibold px-3.5 py-2 border border-slate-700 text-slate-400 hover:text-white hover:bg-red-600/80 hover:border-transparent rounded-xl transition"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal con layout de 2 columnas (Proyectos + Sidebar permanente) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Columna Izquierda: Pestañas + Grid de Proyectos o Plan de Trabajo */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Cabecera del listado */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                  Panel de Control
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Hola, {usuario?.apodo || usuario?.nombre || "Analista"}</span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Gestiona tus proyectos de trazabilidad o genera planes de trabajo a partir de artefactos consolidados.
                </p>
              </div>

              {totalProyectos > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="text-xs bg-[#131d35] text-white border border-slate-700 rounded-xl pl-8 pr-3 py-2 w-48 sm:w-56 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                    />
                    <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  </div>
                  <button
                    onClick={onCrearNuevoProyecto}
                    className="text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Nuevo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selector de Pestañas: Mis Proyectos vs Plan de Trabajo */}
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setTabActiva("proyectos")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  tabActiva === "proyectos"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-[#131d35] text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <FolderIcon className="w-3.5 h-3.5" />
                <span>Mis Proyectos</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    tabActiva === "proyectos"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {totalProyectos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabActiva("plan_trabajo")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  tabActiva === "plan_trabajo"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-[#131d35] text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <GanttIcon className="w-3.5 h-3.5" />
                <span>Plan de Trabajo & Gantt</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    tabActiva === "plan_trabajo"
                      ? "bg-blue-700 text-teal-300"
                      : "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                  }`}
                >
                  {proyectosCompletados} {proyectosCompletados === 1 ? "listo" : "listos"}
                </span>
              </button>
            </div>

            {/* Estado de carga */}
            {cargando && (
              <div className="bg-[#131d35] border border-slate-800 rounded-3xl p-16 text-center shadow-xl">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-400">Cargando tus proyectos desde PostgreSQL...</p>
              </div>
            )}

            {/* Error al cargar */}
            {error && !cargando && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-xs text-red-400 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchProyectos}
                  className="font-bold underline ml-2 hover:text-red-300"
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* PESTAÑA 1: MIS PROYECTOS (Vista General) */}
            {tabActiva === "proyectos" && !cargando && !error && (
              <>
                {/* Caso 1: Usuario NO tiene proyectos (Cuenta vacía) */}
                {totalProyectos === 0 && (
                  <div className="bg-[#131d35] border border-dashed border-slate-700 rounded-3xl p-12 text-center shadow-xl space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center mx-auto">
                      <FolderIcon className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-bold text-white">
                        Aún no tienes proyectos de trazabilidad creados
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Comienza cargando un documento de requerimientos (PDF o TXT) o ingresando especificaciones en lenguaje natural para derivar formalmente Requisitos de Usuario, Historias y Tareas Técnicas.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={onCrearNuevoProyecto}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition inline-flex items-center gap-2"
                      >
                        <PlusIcon className="w-4 h-4" />
                        <span>Crear Nuevo Proyecto</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Caso 2: El usuario sí tiene proyectos en su cuenta */}
                {totalProyectos > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Tarjeta de Acción: NUEVO PROYECTO + */}
                    <div
                      onClick={onCrearNuevoProyecto}
                      className="group border-2 border-dashed border-slate-700/80 hover:border-blue-500 bg-[#131d35]/50 hover:bg-[#131d35] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[210px]"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-sky-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors mb-3">
                        <PlusIcon className="w-6 h-6" />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-300 group-hover:text-sky-400 block">
                        NUEVO PROYECTO +
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 block">
                        Lienzo en blanco para iniciar ciclo
                      </span>
                    </div>

                    {/* Tarjetas de Proyectos Existentes */}
                    {proyectosFiltrados.map((proyecto) => {
                      const etapaInfo = getEtapaInfo(proyecto.etapa_actual);
                      const modeloInfo =
                        MODELOS_IA_CATALOGO.find((m) => m.id === proyecto.modelo_ia) ||
                        MODELOS_IA_CATALOGO[0];
                      const fechaFormateada = new Date(proyecto.creado_en).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <div
                          key={proyecto.id}
                          onClick={() => onAbrirProyecto(proyecto.id)}
                          className="bg-[#131d35] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-xl group relative min-h-[210px]"
                        >
                          {/* Cabecera de la tarjeta */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${etapaInfo.bg}`}
                              >
                                {etapaInfo.texto}
                              </span>
                              <button
                                type="button"
                                title="Eliminar proyecto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProyectoAEliminar(proyecto);
                                }}
                                className="text-slate-500 hover:text-red-400 text-xs p-1 rounded-lg transition opacity-0 group-hover:opacity-100"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Chip de IA utilizada para la asistencia */}
                            <div className="mb-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${modeloInfo.colorBg} inline-flex items-center gap-1.5`}
                                title={`Asistencia provista por ${modeloInfo.nombre} (${modeloInfo.proveedor})`}
                              >
                                <span className="font-mono text-[9px] uppercase tracking-wider">{modeloInfo.icono}</span>
                                <span>{modeloInfo.nombre}</span>
                              </span>
                            </div>

                            <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors line-clamp-2">
                              {proyecto.nombre}
                            </h3>

                            {proyecto.descripcion && (
                              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                {proyecto.descripcion}
                              </p>
                            )}
                          </div>

                          {/* Progreso y Footer */}
                          <div className="mt-4 pt-3 border-t border-slate-800 space-y-2.5">
                            {/* Barra de progreso */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                <span>Avance</span>
                                <span className="font-bold text-slate-300">{etapaInfo.porcentaje}%</span>
                              </div>
                              <div className="w-full bg-[#0f172a] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${etapaInfo.barColor} transition-all duration-300`}
                                  style={{ width: `${etapaInfo.porcentaje}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Conteo de artefactos */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <div className="flex items-center gap-1.5 font-medium">
                                <span className="bg-blue-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-bold">
                                  {proyecto.total_requisitos || 0} RU
                                </span>
                                <span className="bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20 font-bold">
                                  {proyecto.total_historias || 0} HU
                                </span>
                                <span className="bg-teal-500/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/20 font-bold">
                                  {proyecto.total_tareas || 0} TSK
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">{fechaFormateada}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Si la búsqueda no arroja resultados */}
                    {proyectosFiltrados.length === 0 && busqueda && (
                      <div className="col-span-full py-8 text-center text-xs text-slate-500">
                        No se encontraron proyectos con el nombre "{busqueda}".
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* PESTAÑA 2: PLAN DE TRABAJO (Proyectos con 4 Etapas Consolidadas) */}
            {tabActiva === "plan_trabajo" && !cargando && !error && (
              <div className="space-y-4">
                
                {/* Banner Explicativo */}
                <div className="bg-[#131d35] border border-slate-800 rounded-2xl p-5 flex items-start gap-3.5 shadow-xl">
                  <div className="p-2 rounded-xl bg-blue-500/15 text-sky-400 shrink-0">
                    <ChartIcon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-white">
                      Módulo de Plan de Trabajo & Carta Gantt
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      En este apartado se agrupan exclusivamente los proyectos que han finalizado sus 4 etapas de especificación. Cuentan con un backlog técnico consolidado y están en condiciones de generar cronogramas y exportar a Excel.
                    </p>
                  </div>
                </div>

                {/* Caso 1: Ningún proyecto ha alcanzado la Etapa 4 */}
                {proyectosTerminados.length === 0 && (
                  <div className="bg-[#131d35] border border-dashed border-slate-700 rounded-3xl p-12 text-center shadow-xl space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-sky-400 flex items-center justify-center mx-auto">
                      <GanttIcon className="w-8 h-8" />
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-bold text-white">
                        Aún no tienes proyectos listos para Plan de Trabajo
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Para habilitar la generación de la Carta Gantt, el proyecto debe completar las 4 etapas: Ingesta ➔ Requisitos de Usuario ➔ Historias de Usuario ➔ Tareas Técnicas.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setTabActiva("proyectos")}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg transition inline-flex items-center gap-2"
                      >
                        <FolderIcon className="w-4 h-4" />
                        <span>Ir a Mis Proyectos</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Caso 2: Hay proyectos listos (Render en Tarjetas Anchas Horizontales) */}
                {proyectosTerminados.length > 0 && (
                  <div className="space-y-4">
                    {proyectosTerminados.map((proyecto) => {
                      const modeloInfo =
                        MODELOS_IA_CATALOGO.find((m) => m.id === proyecto.modelo_ia) ||
                        MODELOS_IA_CATALOGO[0];
                      const fechaFormateada = new Date(proyecto.creado_en).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      });

                      return (
                        <div
                          key={proyecto.id}
                          className="bg-[#131d35] border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xl transition-all duration-200 space-y-4"
                        >
                          {/* Fila 1: Cabecera con Badges y Horas Totales */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                                <CheckIcon className="w-3.5 h-3.5 text-teal-400" />
                                <span>4 ETAPAS COMPLETADAS • LISTO PARA PLAN DE TRABAJO</span>
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${modeloInfo.colorBg} inline-flex items-center gap-1.5`}
                              >
                                <span className="font-mono text-[9px] uppercase tracking-wider">{modeloInfo.icono}</span>
                                <span>{modeloInfo.nombre}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="px-3.5 py-1.5 bg-[#0f172a] border border-slate-800 rounded-xl text-right">
                                <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-wider block">
                                  Estimación Backlog
                                </span>
                                <span className="text-sm font-black text-white flex items-center justify-end gap-1.5 leading-tight">
                                  <ClockIcon className="w-3.5 h-3.5 text-sky-400" />
                                  <span>{proyecto.total_horas || 0} hrs</span>
                                </span>
                              </div>
                              <button
                                type="button"
                                title="Eliminar proyecto"
                                onClick={() => setProyectoAEliminar(proyecto)}
                                className="text-slate-500 hover:text-red-400 text-xs p-1.5 rounded-lg hover:bg-slate-800 transition"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Fila 2: Título del Proyecto y Metadatos */}
                          <div>
                            <h3
                              onClick={() => onAbrirProyecto(proyecto.id)}
                              className="font-black text-lg text-white hover:text-sky-400 transition cursor-pointer tracking-tight"
                            >
                              {proyecto.nombre}
                            </h3>
                            {proyecto.descripcion && (
                              <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                                {proyecto.descripcion}
                              </p>
                            )}
                            <span className="text-[11px] text-slate-500 mt-1 block">
                              Consolidado el {fechaFormateada}
                            </span>
                          </div>

                          {/* Fila 3: Recordatorio Notorio de que el proyecto está listo para generar plan de trabajo */}
                          <div className="p-4 bg-[#0f172a] border border-slate-800 rounded-xl flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                              <CheckIcon className="w-4 h-4" />
                            </div>
                            <div className="text-xs text-slate-300 space-y-1">
                              <span className="font-extrabold text-white block">
                                Proyecto preparado para calendarización y exportación
                              </span>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                Este proyecto completó formalmente el ciclo de derivación con correspondencia estricta entre{" "}
                                <strong className="text-sky-400 font-semibold">{proyecto.total_requisitos || 0} Requisitos</strong>,{" "}
                                <strong className="text-purple-300 font-semibold">{proyecto.total_historias || 0} Historias</strong> y{" "}
                                <strong className="text-teal-300 font-semibold">{proyecto.total_tareas || 0} Tareas Técnicas</strong>{" "}
                                (acumulando <strong>{proyecto.total_horas || 0} horas estimadas</strong>).
                              </p>
                            </div>
                          </div>

                          {/* Fila 4: Footer con Conteo de Artefactos y Botones de Acción */}
                          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Desglose de artefactos */}
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-500/10 text-sky-400 px-2.5 py-0.5 rounded-lg border border-blue-500/20 text-xs font-bold">
                                {proyecto.total_requisitos || 0} RU
                              </span>
                              <span className="bg-purple-500/10 text-purple-300 px-2.5 py-0.5 rounded-lg border border-purple-500/20 text-xs font-bold">
                                {proyecto.total_historias || 0} HU
                              </span>
                              <span className="bg-teal-500/10 text-teal-300 px-2.5 py-0.5 rounded-lg border border-teal-500/20 text-xs font-bold">
                                {proyecto.total_tareas || 0} TSK
                              </span>
                            </div>

                            {/* Acciones principales */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botón: Ver Árbol de Trazabilidad */}
                              <button
                                type="button"
                                onClick={() => setProyectoParaArbol(proyecto)}
                                className="px-3.5 py-2 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                              >
                                <TreeIcon className="w-3.5 h-3.5 text-sky-400" />
                                <span>Ver Árbol de Trazabilidad</span>
                              </button>

                              {/* Botón: Generar Plan de Trabajo (Gantt) */}
                              <button
                                type="button"
                                onClick={() => setProyectoParaGantt(proyecto)}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                              >
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>Generar Plan de Trabajo (Gantt)</span>
                              </button>

                              {/* Botón: Abrir en Workspace */}
                              <button
                                type="button"
                                onClick={() => onAbrirProyecto(proyecto.id)}
                                className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
                                title="Abrir y editar en el espacio de trabajo"
                              >
                                Editar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna Derecha: Sidebar Permanente */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-28">
            <div className="bg-[#131d35] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              
              {/* Tarjeta de Proyectos Completados */}
              <div
                onClick={() => setTabActiva("plan_trabajo")}
                className="bg-[#0f172a] border border-slate-800 hover:border-slate-700 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden cursor-pointer transition"
                title="Hacer clic para ver el apartado de Plan de Trabajo"
              >
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                      Resumen de Rendimiento
                    </span>
                    <span className="text-[10px] text-teal-400 font-semibold hover:underline flex items-center gap-1">
                      Ver planes →
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                      PROYECTOS COMPLETADOS:
                    </h3>
                    <span className="text-2xl font-black text-white">
                      {proyectosCompletados}/{totalProyectos}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeCompletitud}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-400 block text-right font-medium">
                    {porcentajeCompletitud}% con backlog de tareas consolidado
                  </span>
                </div>
              </div>

              {/* Tarjeta de Modelo de IA Preferido */}
              <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Modelo Preferido del Usuario
                  </span>
                  {modeloPreferidoInfo.esRecomendado ? (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-blue-500/20 text-sky-400 border border-blue-500/40">
                      Recomendado
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Experimental
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-[#131d35] border border-slate-700 shadow-sm flex items-center justify-center font-mono font-bold text-xs text-sky-400 shrink-0">
                    {modeloPreferidoInfo.icono}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-white block truncate">
                      {modeloPreferidoInfo.nombre}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {totalProyectos > 0
                        ? `${maxUsos} de ${totalProyectos} proyectos (${porcentajeUsoModelo}%)`
                        : "Predeterminado (Recomendado)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose de Proyectos por Etapa */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Distribución por Etapas
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                    <span className="font-semibold text-slate-300">Etapa 1: Ingesta de Documento</span>
                    <span className="font-bold text-sky-400 bg-[#131d35] px-2 py-0.5 rounded border border-slate-700 text-xs">
                      {enEtapa1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                    <span className="font-semibold text-slate-300">Etapa 2: Requisitos de Usuario (RU)</span>
                    <span className="font-bold text-sky-400 bg-[#131d35] px-2 py-0.5 rounded border border-slate-700 text-xs">
                      {enEtapa2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f172a] border border-slate-800">
                    <span className="font-semibold text-slate-300">Etapa 3: Historias de Usuario (HU)</span>
                    <span className="font-bold text-purple-300 bg-[#131d35] px-2 py-0.5 rounded border border-slate-700 text-xs">
                      {enEtapa3}
                    </span>
                  </div>
                  <div
                    onClick={() => setTabActiva("plan_trabajo")}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f172a] border border-slate-800 cursor-pointer hover:border-slate-700 transition"
                  >
                    <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                      <CheckIcon className="w-3.5 h-3.5 text-teal-400" />
                      <span>Etapa 4: Tareas (Completado)</span>
                    </span>
                    <span className="font-extrabold text-teal-300 bg-[#131d35] px-2 py-0.5 rounded border border-teal-500/30 text-xs">
                      {enEtapa4}
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas Globales de Artefactos de Trazabilidad */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Artefactos Acumulados
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800">
                    <span className="text-base font-black text-sky-400 block">{totalRequisitos}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">RUs</span>
                  </div>
                  <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800">
                    <span className="text-base font-black text-purple-400 block">{totalHistorias}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">HUs</span>
                  </div>
                  <div className="bg-[#0f172a] p-3 rounded-xl border border-slate-800">
                    <span className="text-base font-black text-teal-400 block">{totalTareas}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tareas</span>
                  </div>
                </div>
              </div>

              {/* Resumen Metodológico de la Tesis */}
              <div className="p-4 bg-[#0f172a] rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                <span className="font-bold text-white block flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#d4f63b]"></span>
                  <span>Trazabilidad Híbrida</span>
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  El sistema garantiza la correspondencia entre la especificación formal del cliente y la entrega ágil. Cada tarea técnica desglosada responde y enlaza de forma trazable a su Requisito de Usuario de origen.
                </p>
              </div>

              {/* Perfil del Usuario y Accesos */}
              <div className="p-3.5 bg-[#0f172a] rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {(usuario?.apodo || usuario?.nombre || "AN").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-white block truncate">
                      {usuario?.apodo ? `@${usuario.apodo}` : usuario?.nombre || "Analista"}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {usuario?.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarPerfilModal(true)}
                  className="text-[11px] font-bold text-sky-400 hover:text-white hover:underline px-2 py-1"
                >
                  Editar
                </button>
              </div>

              {/* Botón de acción rápida */}
              <button
                onClick={onCrearNuevoProyecto}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Iniciar Nuevo Proyecto</span>
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* Modal de Árbol de Trazabilidad */}
      {proyectoParaArbol && (
        <ArbolTrazabilidadModal
          proyectoId={proyectoParaArbol.id}
          nombreProyecto={proyectoParaArbol.nombre}
          token={token}
          isOpen={!!proyectoParaArbol}
          onClose={() => setProyectoParaArbol(null)}
          onGenerarPlanTrabajo={() => {
            const proj = proyectoParaArbol;
            setProyectoParaArbol(null);
            setProyectoParaGantt(proj);
          }}
        />
      )}

      {/* Modal de Previsualización de Carta Gantt & Calendarización */}
      {proyectoParaGantt && (
        <GanttPreviewModal
          proyectoId={proyectoParaGantt.id}
          nombreProyecto={proyectoParaGantt.nombre}
          token={token}
          isOpen={!!proyectoParaGantt}
          onClose={() => setProyectoParaGantt(null)}
        />
      )}

      {/* Modal de Configuración de Perfil */}
      {mostrarPerfilModal && usuario && (
        <PerfilConfiguracionModal
          token={token}
          usuario={usuario}
          isOpen={mostrarPerfilModal}
          onClose={() => setMostrarPerfilModal(false)}
          onPerfilActualizado={(usrActualizado) => {
            if (onPerfilActualizado) {
              onPerfilActualizado(usrActualizado);
            }
          }}
        />
      )}
    </div>
  );
};
