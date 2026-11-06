import { useState, useEffect } from "react";
import { LandingPageView } from "./components/LandingPageView";
import { DashboardView } from "./components/DashboardView";
import { SeleccionModeloView } from "./components/SeleccionModeloView";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import { HistoriasUsuarioView } from "./components/HistoriasUsuarioView";
import { TareasView } from "./components/TareasView";
import { FolderIcon, SaveIcon, LockIcon } from "./components/Icons";
import type { RequisitoItem, HistoriaUsuarioItem, TareaItem, Usuario } from "./types";
import { MODELOS_IA_CATALOGO } from "./types";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [usuario, setUsuario] = useState<Usuario | null>(
    localStorage.getItem("usuario") ? JSON.parse(localStorage.getItem("usuario")!) : null
  );

  // Tokens pasados por URL al hacer clic en enlaces de correo
  const [tokenVerificacionUrl, setTokenVerificacionUrl] = useState<string | null>(null);
  const [tokenResetUrl, setTokenResetUrl] = useState<string | null>(null);
  const [tokenBajaUrl, setTokenBajaUrl] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vEmail = params.get("verificar_email");
    const rToken = params.get("reset_token");
    const bToken = params.get("baja_token");

    if (vEmail) setTokenVerificacionUrl(vEmail);
    if (rToken) setTokenResetUrl(rToken);
    if (bToken) setTokenBajaUrl(bToken);
  }, []);

  // Control de vista: "dashboard" (pantalla de bienvenida y proyectos) vs "workspace" (pipeline de 4 etapas)
  const [vistaActual, setVistaActual] = useState<"dashboard" | "workspace">("dashboard");
  const [tabDashboardInicial, setTabDashboardInicial] = useState<"proyectos" | "plan_trabajo">("proyectos");

  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [nombreProyecto, setNombreProyecto] = useState("Especificación de Requisitos");
  const [modeloIa, setModeloIa] = useState<string>("google/gemini-2.5-flash-lite");
  const [textoDocumento, setTextoDocumento] = useState("");
  const [etapaActual, setEtapaActual] = useState<0 | 1 | 2 | 3 | 4>(0);

  const [requisitos, setRequisitos] = useState<RequisitoItem[]>([]);
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>([]);
  const [tareas, setTareas] = useState<TareaItem[]>([]);

  // Estados de Trazabilidad Jerárquica: Amarillo vs Verde
  const [ruModificadosIds, setRuModificadosIds] = useState<Set<string>>(new Set());
  const [ruSincronizadosIds, setRuSincronizadosIds] = useState<Set<string>>(new Set());

  const [huModificadasIds, setHuModificadasIds] = useState<Set<string>>(new Set());
  const [huSincronizadasIds, setHuSincronizadasIds] = useState<Set<string>>(new Set());

  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);
  const [cargandoHu, setCargandoHu] = useState(false);
  const [cargandoTareas, setCargandoTareas] = useState(false);
  const [guardandoBD, setGuardandoBD] = useState(false);

  const handleGuardarProyectoBD = async (
    silencioso = false,
    etapaOverride?: number,
    tareasOverride?: TareaItem[]
  ): Promise<boolean> => {
    if (!token) return false;
    setGuardandoBD(true);
    try {
      const url = proyectoId
        ? `http://localhost:8000/api/v1/proyectos/?proyecto_id=${proyectoId}`
        : "http://localhost:8000/api/v1/proyectos/";

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: nombreProyecto,
          etapa_actual: etapaOverride !== undefined ? etapaOverride : etapaActual,
          texto_documento: textoDocumento,
          modelo_ia: modeloIa,
          requisitos,
          historias_usuario: historias,
          tareas: tareasOverride || tareas,
        }),
      });

      if (!resp.ok) throw new Error("Error al persistir en base de datos.");
      const data = await resp.json();
      setProyectoId(data.id);
      if (!silencioso) {
        alert("Proyecto guardado exitosamente.");
      }
      return true;
    } catch (err: any) {
      if (!silencioso) {
        alert(err.message);
      }
      return false;
    } finally {
      setGuardandoBD(false);
    }
  };

  const handleCerrarSesion = async () => {
    if (
      vistaActual === "workspace" &&
      (textoDocumento.trim() || requisitos.length > 0 || historias.length > 0 || tareas.length > 0)
    ) {
      await handleGuardarProyectoBD(true);
    }

    setToken(null);
    setUsuario(null);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setProyectoId(null);
    setNombreProyecto("Especificación de Requisitos");
    setModeloIa("google/gemini-2.5-flash-lite");
    setTextoDocumento("");
    setRequisitos([]);
    setHistorias([]);
    setTareas([]);
    setRuModificadosIds(new Set());
    setRuSincronizadosIds(new Set());
    setHuModificadasIds(new Set());
    setHuSincronizadasIds(new Set());
    setEtapaActual(0);
    setVistaActual("dashboard");
  };

  const handleCrearNuevoProyecto = () => {
    setProyectoId(null);
    setNombreProyecto(`Proyecto ${new Date().toLocaleDateString()}`);
    setModeloIa("google/gemini-2.5-flash-lite");
    setTextoDocumento("");
    setRequisitos([]);
    setHistorias([]);
    setTareas([]);
    setRuModificadosIds(new Set());
    setRuSincronizadosIds(new Set());
    setHuModificadasIds(new Set());
    setHuSincronizadasIds(new Set());
    setEtapaActual(0);
  };

  const handleCargarProyecto = async (id: string) => {
    if (!token) return;
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/proyectos/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Error al cargar proyecto.");
      const data = await resp.json();

      setProyectoId(data.id);
      setNombreProyecto(data.nombre);
      setModeloIa(data.modelo_ia || "google/gemini-2.5-flash-lite");
      setTextoDocumento(data.texto_documento || "");
      setRequisitos(data.requisitos || []);
      setHistorias(data.historias_usuario || []);
      setTareas(data.tareas || []);
      setRuModificadosIds(new Set());
      setRuSincronizadosIds(new Set());
      setHuModificadasIds(new Set());
      setHuSincronizadasIds(new Set());
      setEtapaActual((data.etapa_actual as 0 | 1 | 2 | 3 | 4) ?? 1);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAbrirProyectoDesdeDashboard = async (id: string) => {
    await handleCargarProyecto(id);
    setVistaActual("workspace");
  };

  const handleCrearNuevoDesdeDashboard = () => {
    handleCrearNuevoProyecto();
    setVistaActual("workspace");
  };

  const handleVolverAlDashboardConAutoGuardado = async () => {
    if (textoDocumento.trim() || requisitos.length > 0 || historias.length > 0 || tareas.length > 0) {
      await handleGuardarProyectoBD(true);
    }
    setTabDashboardInicial("proyectos");
    setVistaActual("dashboard");
  };

  const handleSolicitarRequisitos = async (texto: string) => {
    setTextoDocumento(texto);
    setCargandoRequisitos(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/requisitos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, modelo: modeloIa }),
      });

      if (!response.ok) throw new Error("Error al generar requisitos");
      const data = await response.json();
      setRequisitos(data.requisitos);
      setHistorias([]);
      setTareas([]);
      setRuModificadosIds(new Set());
      setRuSincronizadosIds(new Set());
      setHuModificadasIds(new Set());
      setHuSincronizadasIds(new Set());
      setEtapaActual(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoRequisitos(false);
    }
  };

  // --- BORRADO EN CASCADA: RU -> HUs -> Tareas ---
  const handleEliminarRequisitoCascade = (ruId: string) => {
    const husAEliminar = historias.filter((h) => h.rf_origen === ruId);
    const huIdsAEliminar = new Set(husAEliminar.map((h) => h.id));

    const historiasRestantes = historias.filter((h) => h.rf_origen !== ruId);
    const historiasNormalizadas = historiasRestantes.map((h, i) => ({
      ...h,
      id: `HU-${String(i + 1).padStart(2, "0")}`,
    }));
    setHistorias(historiasNormalizadas);

    const tareasRestantes = tareas.filter((t) => !huIdsAEliminar.has(t.hu_origen));
    const tareasNormalizadas = tareasRestantes.map((t, i) => ({
      ...t,
      id: `TSK-${String(i + 1).padStart(2, "0")}`,
    }));
    setTareas(tareasNormalizadas);

    setRuModificadosIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(ruId);
      return nuevo;
    });
    setRuSincronizadosIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(ruId);
      return nuevo;
    });
  };

  // --- BORRADO EN CASCADA: HU -> Tareas ---
  const handleEliminarHistoriaCascade = (huId: string) => {
    const tareasRestantes = tareas.filter((t) => t.hu_origen !== huId);
    const tareasNormalizadas = tareasRestantes.map((t, i) => ({
      ...t,
      id: `TSK-${String(i + 1).padStart(2, "0")}`,
    }));
    setTareas(tareasNormalizadas);

    setHuModificadasIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(huId);
      return nuevo;
    });
    setHuSincronizadasIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(huId);
      return nuevo;
    });
  };

  // Etapa 2 -> Etapa 3
  const handleRequisitosAprobados = async (
    aprobados: RequisitoItem[],
    modificados: string[]
  ) => {
    setRequisitos(aprobados);

    if (modificados.length > 0) {
      setRuModificadosIds((prev) => {
        const nuevo = new Set(prev);
        modificados.forEach((id) => nuevo.add(id));
        return nuevo;
      });
      setRuSincronizadosIds((prev) => {
        const nuevo = new Set(prev);
        modificados.forEach((id) => nuevo.delete(id));
        return nuevo;
      });
    }

    if (historias.length === 0) {
      setCargandoHu(true);
      try {
        const response = await fetch("http://localhost:8000/api/v1/generar/historias-usuario/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requisitos: aprobados, modelo: modeloIa }),
        });

        if (!response.ok) throw new Error("Error al derivar Historias de Usuario");
        const data = await response.json();
        setHistorias(data.historias_usuario);
        setRuModificadosIds(new Set());
        setRuSincronizadosIds(new Set());
        setEtapaActual(3);
      } catch (error: any) {
        alert(error.message);
      } finally {
        setCargandoHu(false);
      }
    } else {
      setEtapaActual(3);
    }
  };

  const handleMarcarRuSincronizado = (ruId: string) => {
    setRuModificadosIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(ruId);
      return nuevo;
    });
    setRuSincronizadosIds((prev) => new Set(prev).add(ruId));
  };

  const handleRegistrarHuModificada = (huId: string) => {
    setHuModificadasIds((prev) => new Set(prev).add(huId));
    setHuSincronizadasIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(huId);
      return nuevo;
    });
  };

  const handleMarcarHuSincronizada = (huId: string) => {
    setHuModificadasIds((prev) => {
      const nuevo = new Set(prev);
      nuevo.delete(huId);
      return nuevo;
    });
    setHuSincronizadasIds((prev) => new Set(prev).add(huId));
  };

  // Etapa 3 -> Etapa 4: Con generación automática de tareas para HUs nuevas
  const handleHistoriasAprobadas = async (aprobadas: HistoriaUsuarioItem[]) => {
    setHistorias(aprobadas);

    if (tareas.length === 0) {
      setCargandoTareas(true);
      try {
        const response = await fetch("http://localhost:8000/api/v1/generar/tareas/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historias_usuario: aprobadas, modelo: modeloIa }),
        });

        if (!response.ok) throw new Error("Error al derivar Tareas Técnicas");
        const data = await response.json();
        setTareas(data.tareas);
        setHuModificadasIds(new Set());
        setHuSincronizadasIds(new Set());
        setEtapaActual(4);
      } catch (error: any) {
        alert(error.message);
      } finally {
        setCargandoTareas(false);
      }
      return;
    }

    const husSinTareas = aprobadas.filter((hu) => !tareas.some((t) => t.hu_origen === hu.id));

    if (husSinTareas.length > 0) {
      setCargandoTareas(true);
      try {
        const response = await fetch("http://localhost:8000/api/v1/generar/tareas/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historias_usuario: husSinTareas, modelo: modeloIa }),
        });

        if (!response.ok) throw new Error("Error al derivar tareas para las historias nuevas.");
        const data = await response.json();
        const nuevasTareas: TareaItem[] = data.tareas;

        const todasTareas = [...tareas, ...nuevasTareas];
        const ordenadas = todasTareas.sort((a, b) => {
          const idxA = aprobadas.findIndex((h) => h.id === a.hu_origen);
          const idxB = aprobadas.findIndex((h) => h.id === b.hu_origen);
          return idxA - idxB;
        });

        const normalizadas = ordenadas.map((t, i) => ({
          ...t,
          id: `TSK-${String(i + 1).padStart(2, "0")}`,
        }));

        setTareas(normalizadas);
        setEtapaActual(4);
      } catch (error: any) {
        alert(error.message);
      } finally {
        setCargandoTareas(false);
      }
    } else {
      setEtapaActual(4);
    }
  };

  const handlePerfilActualizado = (usuarioActualizado: Usuario) => {
    setUsuario(usuarioActualizado);
    localStorage.setItem("usuario", JSON.stringify(usuarioActualizado));
  };

  const hayTokenAccionUrl = Boolean(tokenVerificacionUrl || tokenResetUrl || tokenBajaUrl);

  if (!token || hayTokenAccionUrl) {
    return (
      <LandingPageView
        tokenVerificacionUrl={tokenVerificacionUrl}
        tokenResetUrl={tokenResetUrl}
        tokenBajaUrl={tokenBajaUrl}
        onLoginExitoso={(jwt, usr) => {
          setToken(jwt);
          setUsuario(usr);
          localStorage.setItem("token", jwt);
          localStorage.setItem("usuario", JSON.stringify(usr));
          setTokenVerificacionUrl(null);
          setTokenResetUrl(null);
          setTokenBajaUrl(null);
          setVistaActual("dashboard");
        }}
      />
    );
  }

  // Si la vista actual es el Dashboard de Proyectos
  if (vistaActual === "dashboard") {
    return (
      <DashboardView
        token={token}
        usuario={usuario}
        tabInicial={tabDashboardInicial}
        onAbrirProyecto={handleAbrirProyectoDesdeDashboard}
        onCrearNuevoProyecto={handleCrearNuevoDesdeDashboard}
        onCerrarSesion={handleCerrarSesion}
        onPerfilActualizado={handlePerfilActualizado}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 py-6 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cabecera del Workspace */}
        <header className="flex flex-col sm:flex-row items-center justify-between bg-[#131d35] p-4 rounded-xl border border-slate-800 shadow-xl gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
              {(usuario?.apodo || usuario?.nombre || "AN").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  className="font-bold text-xs text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none transition"
                />
                {(() => {
                  const m = MODELOS_IA_CATALOGO.find((x) => x.id === modeloIa) || MODELOS_IA_CATALOGO[0];
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        m.esRecomendado
                          ? "bg-blue-950/60 border-blue-800/70 text-sky-400"
                          : "bg-purple-950/60 border-purple-800/70 text-purple-300"
                      }`}
                      title={m.descripcion}
                    >
                      <span className="font-mono text-[9px] text-slate-400">{m.icono}</span>
                      <span>{m.nombre}</span>
                      {m.esRecomendado ? (
                        <span className="text-[8px] bg-blue-900/80 text-sky-300 px-1 rounded uppercase tracking-wider font-bold">
                          Default
                        </span>
                      ) : (
                        <span className="text-[8px] bg-purple-900/80 text-purple-300 px-1 rounded uppercase tracking-wider font-bold">
                          Exp
                        </span>
                      )}
                    </span>
                  );
                })()}
              </div>
              <span className="text-[11px] text-slate-400 block">
                Analista: {usuario?.apodo ? `@${usuario.apodo} (${usuario.nombre})` : usuario?.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVolverAlDashboardConAutoGuardado}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              title="Guardar y volver a Mis Proyectos"
            >
              <FolderIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>{guardandoBD ? "Guardando..." : "Mis Proyectos"}</span>
            </button>
            <button
              onClick={() => handleGuardarProyectoBD(false)}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <SaveIcon className="w-3.5 h-3.5" />
              <span>{guardandoBD ? "Guardando..." : "Guardar"}</span>
            </button>
            <button
              onClick={handleCerrarSesion}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg transition disabled:opacity-50"
              title="Guardar y cerrar sesión"
            >
              {guardandoBD ? "Guardando..." : "Cerrar sesión"}
            </button>
          </div>
        </header>

        {/* Título y estado del Workspace */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              ReqGen Workspace
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Pipeline de derivación de artefactos de ingeniería de software.
            </p>
          </div>
        </div>

        {/* Estados de Carga / Generación */}
        {cargandoRequisitos && (
          <div className="bg-[#131d35] border border-slate-800 rounded-xl p-12 text-center shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-200">
              Extrayendo Requisitos de Usuario con {MODELOS_IA_CATALOGO.find(m => m.id === modeloIa)?.nombre || "IA"}...
            </h3>
            <p className="text-xs text-slate-500 mt-1">Estructurando catálogo de especificación RU</p>
          </div>
        )}

        {cargandoHu && (
          <div className="bg-[#131d35] border border-slate-800 rounded-xl p-12 text-center shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-200">
              Derivando Historias de Usuario con {MODELOS_IA_CATALOGO.find(m => m.id === modeloIa)?.nombre || "IA"}...
            </h3>
            <p className="text-xs text-slate-500 mt-1">Generando historias de usuario con criterios de aceptación</p>
          </div>
        )}

        {cargandoTareas && (
          <div className="bg-[#131d35] border border-slate-800 rounded-xl p-12 text-center shadow-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-200">
              Derivando Tareas Técnicas con {MODELOS_IA_CATALOGO.find(m => m.id === modeloIa)?.nombre || "IA"}...
            </h3>
            <p className="text-xs text-slate-500 mt-1">Desglosando backlog técnico y estimaciones de esfuerzo</p>
          </div>
        )}

        {!cargandoRequisitos && !cargandoHu && !cargandoTareas && (
          <>
            {etapaActual === 0 && (
              <SeleccionModeloView
                modeloSeleccionado={modeloIa}
                onCambiarModelo={setModeloIa}
                modeloBloqueado={requisitos.length > 0 || proyectoId !== null}
                onContinuar={() => setEtapaActual(1)}
              />
            )}
            {etapaActual === 1 && (
              <IngestaView
                modeloSeleccionado={modeloIa}
                modeloBloqueado={requisitos.length > 0 || proyectoId !== null}
                onVolverPaso0={() => setEtapaActual(0)}
                onSolicitarGeneracion={handleSolicitarRequisitos}
              />
            )}
            {etapaActual === 2 && (
              <RequisitosView
                requisitosIniciales={requisitos}
                onVolver={() => setEtapaActual(1)}
                onConfirmar={handleRequisitosAprobados}
                onEliminarRequisitoCascade={handleEliminarRequisitoCascade}
              />
            )}
            {etapaActual === 3 && (
              <HistoriasUsuarioView
                historiasIniciales={historias}
                requisitosDisponibles={requisitos}
                ruModificadosIds={ruModificadosIds}
                ruSincronizadosIds={ruSincronizadosIds}
                modeloIa={modeloIa}
                onVolver={() => setEtapaActual(2)}
                onConfirmar={handleHistoriasAprobadas}
                onRegistrarHuModificada={handleRegistrarHuModificada}
                onHistoriasActualizadas={(actualizadas) => setHistorias(actualizadas)}
                onMarcarRuSincronizado={handleMarcarRuSincronizado}
                onEliminarHistoriaCascade={handleEliminarHistoriaCascade}
              />
            )}
            {etapaActual === 4 && (
              <TareasView
                tareasIniciales={tareas}
                historiasDisponibles={historias}
                huModificadasIds={huModificadasIds}
                huSincronizadasIds={huSincronizadasIds}
                modeloIa={modeloIa}
                onVolver={() => setEtapaActual(3)}
                onConfirmar={async (aprobadas) => {
                  setTareas(aprobadas);
                  setEtapaActual(4);
                  await handleGuardarProyectoBD(true, 4, aprobadas);
                  setTabDashboardInicial("plan_trabajo");
                  setVistaActual("dashboard");
                }}
                onTareasActualizadas={(actualizadas) => setTareas(actualizadas)}
                onMarcarHuSincronizada={handleMarcarHuSincronizada}
              />
            )}
          </>
        )}

        {/* Pipeline de Navegación Inferior */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-slate-800 text-xs">
          <button
            onClick={() => setEtapaActual(0)}
            className={`p-2.5 rounded-lg border text-left transition ${
              etapaActual === 0
                ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500"
                : "bg-[#131d35] border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-400 block text-[11px]">Paso 0</span>
              {(requisitos.length > 0 || proyectoId !== null) && (
                <LockIcon className="w-3 h-3 text-slate-500" title="Modelo fijado para este proyecto" />
              )}
            </div>
            <span className="font-medium text-slate-200">Motor IA</span>
          </button>

          <button
            onClick={() => setEtapaActual(1)}
            className={`p-2.5 rounded-lg border text-left transition ${
              etapaActual === 1
                ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500"
                : "bg-[#131d35] border-slate-800 hover:border-slate-700"
            }`}
          >
            <span className="font-bold text-sky-400 block text-[11px]">Etapa 1</span>
            <span className="font-medium text-slate-200">Documento</span>
          </button>

          <button
            onClick={() => requisitos.length > 0 && setEtapaActual(2)}
            disabled={requisitos.length === 0}
            className={`p-2.5 rounded-lg border text-left transition disabled:opacity-40 ${
              etapaActual === 2
                ? "bg-blue-950/30 border-blue-500 ring-1 ring-blue-500"
                : "bg-[#131d35] border-slate-800 hover:border-slate-700"
            }`}
          >
            <span className="font-bold text-sky-400 block text-[11px]">Etapa 2</span>
            <span className="font-medium text-slate-200">Requisitos (RU)</span>
          </button>

          <button
            onClick={() => historias.length > 0 && setEtapaActual(3)}
            disabled={historias.length === 0}
            className={`p-2.5 rounded-lg border text-left transition disabled:opacity-40 ${
              etapaActual === 3
                ? "bg-purple-950/30 border-purple-500 ring-1 ring-purple-500"
                : "bg-[#131d35] border-slate-800 hover:border-slate-700"
            }`}
          >
            <span className="font-bold text-purple-400 block text-[11px]">Etapa 3</span>
            <span className="font-medium text-slate-200">Historias Usuario</span>
          </button>

          <button
            onClick={() => tareas.length > 0 && setEtapaActual(4)}
            disabled={tareas.length === 0}
            className={`p-2.5 rounded-lg border text-left transition disabled:opacity-40 ${
              etapaActual === 4
                ? "bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500"
                : "bg-[#131d35] border-slate-800 hover:border-slate-700"
            }`}
          >
            <span className="font-bold text-emerald-400 block text-[11px]">Etapa 4</span>
            <span className="font-medium text-slate-200">Tareas Técnicas</span>
          </button>
        </div>

      </div>
    </div>
  );
}
