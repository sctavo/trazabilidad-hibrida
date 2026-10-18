import React, { useEffect, useState } from "react";
import type { ProyectoResumen } from "../types";

interface DashboardViewProps {
  token: string;
  usuario: { id: string; nombre: string; email: string } | null;
  onAbrirProyecto: (id: string) => void;
  onCrearNuevoProyecto: () => void;
  onCerrarSesion: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  token,
  usuario,
  onAbrirProyecto,
  onCrearNuevoProyecto,
  onCerrarSesion,
}) => {
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [proyectoAEliminar, setProyectoAEliminar] = useState<ProyectoResumen | null>(null);
  const [eliminando, setEliminando] = useState(false);

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

  // Proyectos filtrados por búsqueda
  const proyectosFiltrados = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEtapaInfo = (etapa: number) => {
    switch (etapa) {
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 text-right">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs">
                {usuario?.nombre?.slice(0, 2).toUpperCase() || "AN"}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {usuario?.nombre || "Analista"}
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  {usuario?.email}
                </span>
              </div>
            </div>

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
          
          {/* Columna Izquierda: Grid de Proyectos */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Cabecera del listado */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Mis Proyectos
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecciona un proyecto para continuar la especificación o inicia uno nuevo.
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

            {/* Caso 1: Usuario NO tiene proyectos (Cuenta vacía) */}
            {!cargando && !error && totalProyectos === 0 && (
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
            {!cargando && !error && totalProyectos > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Tarjeta de Acción: NUEVO PROYECTO + */}
                <div
                  onClick={onCrearNuevoProyecto}
                  className="group border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/30 hover:bg-blue-50/70 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[190px] shadow-xs"
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
                  const fechaFormateada = new Date(proyecto.creado_en).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={proyecto.id}
                      onClick={() => onAbrirProyecto(proyecto.id)}
                      className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:shadow-md group relative min-h-[190px]"
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
                            className="text-slate-300 hover:text-red-500 text-xs p-1 rounded transition opacity-0 group-hover:opacity-100"
                          >
                            🗑️
                          </button>
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
          </div>

          {/* Columna Derecha: Sidebar Permanente */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              
              {/* Tarjeta de Proyectos Completados (Requerimiento explícito) */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-xs relative overflow-hidden">
                <div className="relative z-10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">
                    Resumen de Rendimiento
                  </span>
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
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <span className="font-semibold text-emerald-900">Etapa 4: Tareas Técnicas (TSK)</span>
                    <span className="font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 text-xs">
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
    </div>
  );
};

