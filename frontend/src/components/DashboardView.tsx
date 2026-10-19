import React, { useEffect, useState } from "react";
import { MODELOS_IA_CATALOGO, type ProyectoResumen, type Usuario } from "../types";
import { PerfilConfiguracionModal } from "./PerfilConfiguracionModal";
import { ArbolTrazabilidadModal } from "./ArbolTrazabilidadModal";
import { GanttPreviewModal } from "./GanttPreviewModal";

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
  // Consideramos completado si alcanzó la Etapa 4 (Tareas Técnicas consolidadas)
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
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          barColor: "bg-slate-400",
          porcentaje: 10,
        };
      case 1:
        return {
          texto: "Etapa 1: Ingesta",
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          barColor: "bg-blue-500",
          porcentaje: 25,
        };
      case 2:
        return {
          texto: "Etapa 2: Requisitos (RU)",
          bg: "bg-sky-50 text-sky-700 border-sky-200",
          barColor: "bg-sky-500",
          porcentaje: 50,
        };
      case 3:
        return {
          texto: "Etapa 3: Historias (HU)",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          barColor: "bg-purple-500",
          porcentaje: 75,
        };
      case 4:
        return {
          texto: "Etapa 4: Tareas (Completado)",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-300",
          barColor: "bg-emerald-500",
          porcentaje: 100,
        };
      default:
        return {
          texto: `Etapa ${etapa}`,
          bg: "bg-slate-50 text-slate-700 border-slate-200",
          barColor: "bg-slate-400",
          porcentaje: 25,
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Modal de confirmación para eliminar proyecto */}
      {proyectoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <span className="text-2xl">🗑️</span>
              <h3 className="font-bold text-base text-slate-800">¿Eliminar proyecto?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Estás a punto de eliminar{" "}
              <strong className="text-slate-900 font-semibold">{proyectoAEliminar.nombre}</strong>.
              Esta acción eliminará de forma irreversible el documento fuente y todos los Requisitos de Usuario,
              Historias de Usuario y Tareas Técnicas asociadas en la base de datos.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setProyectoAEliminar(null)}
                className="text-xs px-3.5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={handleConfirmarEliminar}
                className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar proyecto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar proyecto */}

      {/* Barra de Navegación Superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
              RQ
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                REQGEN
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Plataforma de Trazabilidad Híbrida
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 text-right">
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                {(usuario?.apodo || usuario?.nombre || "AN").slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {usuario?.apodo ? `@${usuario.apodo}` : usuario?.nombre || "Analista"}
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  {usuario?.email}
                </span>
              </div>
            </div>

            <button
              onClick={() => setMostrarPerfilModal(true)}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 rounded-lg transition flex items-center gap-1.5"
              title="Configuración de perfil (apodo, contraseña, baja)"
            >
              <span>⚙️</span>
              <span className="hidden sm:inline">Mi Perfil</span>
            </button>

            <button
              onClick={onCerrarSesion}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
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
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
                  Panel de Control
                </span>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Hola, {usuario?.apodo || usuario?.nombre || "Analista"}</span>
                  <span>👋</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gestiona tus proyectos de trazabilidad o genera planes de trabajo a partir de artefactos consolidados.
                </p>
              </div>

              {totalProyectos > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                  </div>
                  <button
                    onClick={onCrearNuevoProyecto}
                    className="text-xs font-semibold px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span>Nuevo</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selector de Pestañas: Mis Proyectos vs Plan de Trabajo */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setTabActiva("proyectos")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  tabActiva === "proyectos"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>📁</span>
                <span>Mis Proyectos</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    tabActiva === "proyectos"
                      ? "bg-blue-700 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {totalProyectos}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTabActiva("plan_trabajo")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  tabActiva === "plan_trabajo"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span>📊</span>
                <span>Plan de Trabajo & Gantt</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    tabActiva === "plan_trabajo"
                      ? "bg-indigo-700 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {proyectosCompletados} {proyectosCompletados === 1 ? "listo" : "listos"}
                </span>
              </button>
            </div>

            {/* Estado de carga */}
            {cargando && (
              <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-xs">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                <p className="text-xs font-semibold text-slate-600">Cargando tus proyectos desde PostgreSQL...</p>
              </div>
            )}

            {/* Error al cargar */}
            {error && !cargando && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={fetchProyectos}
                  className="font-bold underline ml-2 hover:text-red-900"
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
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                      📁
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-bold text-slate-800">
                        Aún no tienes proyectos de trazabilidad creados
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Comienza cargando un documento de requerimientos (PDF o TXT) o ingresando especificaciones en lenguaje natural para derivar formalmente Requisitos de Usuario, Historias y Tareas Técnicas.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={onCrearNuevoProyecto}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition inline-flex items-center gap-2"
                      >
                        <span className="text-base leading-none">+</span>
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
                      className="group border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/30 hover:bg-blue-50/70 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[200px] shadow-xs"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-2xl font-black transition-colors mb-2 shadow-xs">
                        +
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wider text-blue-800 group-hover:text-blue-900 block">
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
                          className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md group relative min-h-[200px]"
                        >
                          {/* Cabecera de la tarjeta */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
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
                                className="text-slate-300 hover:text-red-500 text-xs p-1 rounded transition opacity-0 group-hover:opacity-100"
                              >
                                🗑️
                              </button>
                            </div>

                            {/* Chip de IA utilizada para la asistencia */}
                            <div className="mb-2">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${modeloInfo.colorBg} inline-flex items-center gap-1`}
                                title={`Asistencia técnica provista por ${modeloInfo.nombre} (${modeloInfo.proveedor})`}
                              >
                                <span>{modeloInfo.icono}</span>
                                <span>{modeloInfo.nombre}</span>
                              </span>
                            </div>

                            <h3 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {proyecto.nombre}
                            </h3>

                            {proyecto.descripcion && (
                              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                {proyecto.descripcion}
                              </p>
                            )}
                          </div>

                          {/* Progreso y Footer */}
                          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                            {/* Barra de progreso */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                <span>Avance del flujo</span>
                                <span className="font-bold text-slate-600">{etapaInfo.porcentaje}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${etapaInfo.barColor} transition-all duration-300`}
                                  style={{ width: `${etapaInfo.porcentaje}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Conteo de artefactos */}
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                              <div className="flex items-center gap-1.5 font-medium">
                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-100 font-bold">
                                  {proyecto.total_requisitos || 0} RU
                                </span>
                                <span className="bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-100 font-bold">
                                  {proyecto.total_historias || 0} HU
                                </span>
                                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100 font-bold">
                                  {proyecto.total_tareas || 0} TSK
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">{fechaFormateada}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Si la búsqueda no arroja resultados */}
                    {proyectosFiltrados.length === 0 && busqueda && (
                      <div className="col-span-full py-8 text-center text-xs text-slate-400">
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
                <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-white border border-indigo-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-2xs">
                  <span className="text-2xl mt-0.5">📊</span>
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-indigo-950">
                      Módulo de Plan de Trabajo & Carta Gantt
                    </h2>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      En este apartado se agrupan exclusivamente los proyectos que han finalizado sus 4 etapas de especificación. Cuentan con un backlog técnico consolidado y están en condiciones de generar cronogramas y exportar a Excel.
                    </p>
                  </div>
                </div>

                {/* Caso 1: Ningún proyecto ha alcanzado la Etapa 4 */}
                {proyectosTerminados.length === 0 && (
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center shadow-xs space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                      🎯
                    </div>
                    <div className="max-w-md mx-auto">
                      <h3 className="text-base font-bold text-slate-800">
                        Aún no tienes proyectos listos para Plan de Trabajo
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Para habilitar la generación de la Carta Gantt, el proyecto debe completar las 4 etapas: Ingesta ➔ Requisitos de Usuario ➔ Historias de Usuario ➔ Tareas Técnicas.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setTabActiva("proyectos")}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition inline-flex items-center gap-2"
                      >
                        <span>📁 Ir a Mis Proyectos</span>
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
                          className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 space-y-4"
                        >
                          {/* Fila 1: Cabecera con Badges y Horas Totales */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                                <span>✨</span>
                                <span>4 ETAPAS COMPLETADAS • LISTO PARA PLAN DE TRABAJO</span>
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${modeloInfo.colorBg} inline-flex items-center gap-1`}
                              >
                                <span>{modeloInfo.icono}</span>
                                <span>{modeloInfo.nombre}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="px-3.5 py-1 bg-indigo-50 border border-indigo-200 rounded-xl text-right">
                                <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                                  Estimación Backlog
                                </span>
                                <span className="text-sm font-black text-indigo-900 block leading-tight">
                                  ⏱️ {proyecto.total_horas || 0} hrs
                                </span>
                              </div>
                              <button
                                type="button"
                                title="Eliminar proyecto"
                                onClick={() => setProyectoAEliminar(proyecto)}
                                className="text-slate-300 hover:text-red-500 text-xs p-1.5 rounded-lg hover:bg-slate-50 transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          {/* Fila 2: Título del Proyecto y Metadatos */}
                          <div>
                            <h3
                              onClick={() => onAbrirProyecto(proyecto.id)}
                              className="font-black text-lg text-slate-900 hover:text-indigo-600 transition cursor-pointer tracking-tight"
                            >
                              {proyecto.nombre}
                            </h3>
                            {proyecto.descripcion && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                                {proyecto.descripcion}
                              </p>
                            )}
                            <span className="text-[11px] text-slate-400 mt-1 block">
                              Consolidado el {fechaFormateada}
                            </span>
                          </div>

                          {/* Fila 3: Recordatorio Notorio de que el proyecto está listo para generar plan de trabajo */}
                          <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 via-indigo-50/40 to-blue-50/30 border border-emerald-200/80 rounded-xl flex items-start gap-3">
                            <span className="text-2xl mt-0.5">📌</span>
                            <div className="text-xs text-slate-700 space-y-1">
                              <span className="font-extrabold text-emerald-950 block">
                                Recordatorio: Proyecto listo para generación de Carta Gantt
                              </span>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Este proyecto completó formalmente el ciclo de derivación. Cuenta con correspondencia estricta entre{" "}
                                <strong className="text-blue-700 font-semibold">{proyecto.total_requisitos || 0} Requisitos</strong>,{" "}
                                <strong className="text-purple-700 font-semibold">{proyecto.total_historias || 0} Historias</strong> y{" "}
                                <strong className="text-emerald-700 font-semibold">{proyecto.total_tareas || 0} Tareas Técnicas</strong>{" "}
                                (acumulando <strong>{proyecto.total_horas || 0} horas estimadas</strong>).
                              </p>
                            </div>
                          </div>

                          {/* Fila 4: Footer con Conteo de Artefactos y Botones de Acción */}
                          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Desglose de artefactos */}
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200 text-xs font-bold">
                                {proyecto.total_requisitos || 0} RU
                              </span>
                              <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg border border-purple-200 text-xs font-bold">
                                {proyecto.total_historias || 0} HU
                              </span>
                              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs font-bold">
                                {proyecto.total_tareas || 0} TSK
                              </span>
                            </div>

                            {/* Acciones principales */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Botón: Ver Árbol de Trazabilidad */}
                              <button
                                type="button"
                                onClick={() => setProyectoParaArbol(proyecto)}
                                className="px-3.5 py-2 rounded-xl border border-indigo-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/60 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                              >
                                <span>🌳</span>
                                <span>Ver Árbol de Trazabilidad</span>
                              </button>

                              {/* Botón: Generar Plan de Trabajo (Gantt) */}
                              <button
                                type="button"
                                onClick={() => setProyectoParaGantt(proyecto)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                              >
                                <span>📅</span>
                                <span>Generar Plan de Trabajo (Gantt)</span>
                              </button>

                              {/* Botón: Abrir en Workspace */}
                              <button
                                type="button"
                                onClick={() => onAbrirProyecto(proyecto.id)}
                                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
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
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Tarjeta de Proyectos Completados (Requerimiento explícito) */}
              <div
                onClick={() => setTabActiva("plan_trabajo")}
                className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-xs relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-400 transition"
                title="Hacer clic para ver el apartado de Plan de Trabajo"
              >
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                      Resumen de Rendimiento
                    </span>
                    <span className="text-[10px] text-indigo-300 font-semibold hover:underline">
                      Ver planes →
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xs font-bold uppercase text-slate-200 tracking-wider">
                      PROYECTOS COMPLETADOS:
                    </h3>
                    <span className="text-2xl font-black text-white">
                      {proyectosCompletados}/{totalProyectos}
                    </span>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-slate-700/80 h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-blue-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${porcentajeCompletitud}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-300 block text-right font-medium">
                    {porcentajeCompletitud}% con backlog de tareas consolidado
                  </span>
                </div>
              </div>

              {/* Tarjeta de Modelo de IA Preferido (Requerimiento explícito) */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Modelo Preferido del Usuario
                  </span>
                  {modeloPreferidoInfo.esRecomendado ? (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                      Recomendado
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Experimental
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-xl shrink-0">
                    {modeloPreferidoInfo.icono}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-900 block truncate">
                      {modeloPreferidoInfo.nombre}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {totalProyectos > 0
                        ? `${maxUsos} de ${totalProyectos} proyectos (${porcentajeUsoModelo}%)`
                        : "Predeterminado (Recomendado)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose de Proyectos por Etapa */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Distribución por Etapas
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="font-semibold text-blue-900">Etapa 1: Ingesta de Documento</span>
                    <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs">
                      {enEtapa1}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-sky-50/60 border border-sky-100">
                    <span className="font-semibold text-sky-900">Etapa 2: Requisitos de Usuario (RU)</span>
                    <span className="font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-sky-200 text-xs">
                      {enEtapa2}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/60 border border-purple-100">
                    <span className="font-semibold text-purple-900">Etapa 3: Historias de Usuario (HU)</span>
                    <span className="font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 text-xs">
                      {enEtapa3}
                    </span>
                  </div>
                  <div
                    onClick={() => setTabActiva("plan_trabajo")}
                    className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 transition"
                  >
                    <span className="font-semibold text-emerald-950 flex items-center gap-1">
                      <span>✓</span> Etapa 4: Tareas (Completado)
                    </span>
                    <span className="font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 text-xs shadow-2xs">
                      {enEtapa4}
                    </span>
                  </div>
                </div>
              </div>

              {/* Métricas Globales de Artefactos de Trazabilidad */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Artefactos Acumulados
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-base font-black text-blue-700 block">{totalRequisitos}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">RUs</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-base font-black text-purple-700 block">{totalHistorias}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">HUs</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-base font-black text-emerald-700 block">{totalTareas}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tareas</span>
                  </div>
                </div>
              </div>

              {/* Resumen Metodológico de la Tesis */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <span className="font-bold text-slate-800 block flex items-center gap-1.5">
                  <span>💡</span> Trazabilidad Híbrida
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  El sistema garantiza la correspondencia entre la especificación formal del cliente y la entrega ágil. Cada tarea técnica desglosada responde y enlaza de forma trazable a su Requisito de Usuario de origen.
                </p>
              </div>

              {/* Perfil del Usuario y Accesos */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {(usuario?.apodo || usuario?.nombre || "AN").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-slate-800 block truncate">
                      {usuario?.apodo ? `@${usuario.apodo}` : usuario?.nombre || "Analista"}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {usuario?.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarPerfilModal(true)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline px-1.5 py-1"
                >
                  Editar
                </button>
              </div>

              {/* Botón de acción rápida */}
              <button
                onClick={onCrearNuevoProyecto}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
              >
                <span>+ Iniciar Nuevo Proyecto</span>
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
