import { useState, useEffect } from "react";
import { LandingPageView } from "./components/LandingPageView";
import { DashboardView } from "./components/DashboardView";
import { SeleccionModeloView } from "./components/SeleccionModeloView";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import { HistoriasUsuarioView } from "./components/HistoriasUsuarioView";
import { TareasView } from "./components/TareasView";
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
        alert("✓ Proyecto guardado en PostgreSQL exitosamente.");
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
    // Si el usuario está trabajando en un proyecto y hay datos cargados, se auto-guarda antes de cerrar sesión
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
    // Si el proyecto tiene contenido trabajado, auto-guardar en la BD antes de ir al dashboard
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
    // 1. Encontrar las HUs hijas
    const husAEliminar = historias.filter((h) => h.rf_origen === ruId);
    const huIdsAEliminar = new Set(husAEliminar.map((h) => h.id));

    // 2. Podar las HUs
    const historiasRestantes = historias.filter((h) => h.rf_origen !== ruId);
    const historiasNormalizadas = historiasRestantes.map((h, i) => ({
      ...h,
      id: `HU-${String(i + 1).padStart(2, "0")}`,
    }));
    setHistorias(historiasNormalizadas);

    // 3. Podar las Tareas nietas
    const tareasRestantes = tareas.filter((t) => !huIdsAEliminar.has(t.hu_origen));
    const tareasNormalizadas = tareasRestantes.map((t, i) => ({
      ...t,
      id: `TSK-${String(i + 1).padStart(2, "0")}`,
    }));
    setTareas(tareasNormalizadas);

    // 4. Limpiar sets de estados
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

    // Caso A: Primera generación completa de tareas
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

    // Caso B: Ya existen tareas, pero hay HUs nuevas que no tienen ninguna tarea asociada
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

        // Combinar preservando el orden jerárquico por hu_origen
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
    <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Cabecera */}
        <header className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {(usuario?.apodo || usuario?.nombre || "AN").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nombreProyecto}
                  onChange={(e) => setNombreProyecto(e.target.value)}
                  className="font-bold text-xs text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
                />
                {(() => {
                  const m = MODELOS_IA_CATALOGO.find((x) => x.id === modeloIa) || MODELOS_IA_CATALOGO[0];
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        m.esRecomendado
                          ? "bg-blue-50 border-blue-200 text-blue-700"
                          : "bg-purple-50 border-purple-200 text-purple-700"
                      }`}
                      title={m.descripcion}
                    >
                      <span>{m.icono}</span>
                      <span>{m.nombre}</span>
                      {m.esRecomendado ? (
                        <span className="text-[8px] bg-blue-100 text-blue-800 px-1 rounded-sm uppercase tracking-wider font-bold">
                          Default
                        </span>
                      ) : (
                        <span className="text-[8px] bg-purple-100 text-purple-800 px-1 rounded-sm uppercase tracking-wider font-bold">
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
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
              title="Guardar automáticamente y volver al Dashboard de Mis Proyectos"
            >
              <span>📁</span>
              <span>{guardandoBD ? "Guardando..." : "Mis Proyectos"}</span>
            </button>
            <button
              onClick={() => handleGuardarProyectoBD(false)}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {guardandoBD ? "Guardando..." : "💾 Guardar"}
            </button>
            <button
              onClick={handleCerrarSesion}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg transition disabled:opacity-50"
              title="Guarda automáticamente tus avances y cierra la sesión"
            >
              {guardandoBD ? "Guardando..." : "Cerrar sesión"}
            </button>
          </div>
        </header>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            ReqGen 
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transformación secuencial estricta: Documento → Requisitos (RU) → Historias de Usuario → Tareas.
          </p>
        </div>

        {cargandoRequisitos && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">
              Extrayendo Requisitos de Usuario con {MODELOS_IA_CATALOGO.find(m => m.id === modeloIa)?.nombre || "IA"}...
            </h3>
            <p className="text-xs text-slate-400 mt-1">Con mitigación automática activa</p>
          </div>
        )}

        {cargandoHu && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">
              Derivando Historias de Usuario con {MODELOS_IA_CATALOGO.find(m => m.id === modeloIa)?.nombre || "IA"}...
            </h3>
            <p className="text-xs text-slate-400 mt-1">Con mitigación automática activa</p>
          </div>
        )}

        {cargandoTareas && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">
              Derivando Tareas Técnicas con {MODELOS_IA_CATALOGO.find(m => m.id === modeloIa)?.nombre || "IA"}...
            </h3>
            <p className="text-xs text-slate-400 mt-1">Con mitigación automática activa</p>
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

        {/* Pipeline de Navegación */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-4 border-t border-slate-200 text-xs">
          <button
            onClick={() => setEtapaActual(0)}
            className={`p-2.5 bg-white text-left rounded-lg border shadow-xs transition ${
              etapaActual === 0 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-600 block">Paso 0</span>
              {(requisitos.length > 0 || proyectoId !== null) && (
                <span className="text-[10px] text-slate-400" title="Modelo fijado para este proyecto">🔒</span>
              )}
            </div>
            <span className="font-medium text-slate-800">Motor IA</span>
          </button>
          <button
            onClick={() => setEtapaActual(1)}
            className={`p-2.5 bg-white text-left rounded-lg border shadow-xs transition ${
              etapaActual === 1 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-blue-600 block">Etapa 1</span>
            <span className="font-medium text-slate-800">Documento</span>
          </button>
          <button
            onClick={() => requisitos.length > 0 && setEtapaActual(2)}
            disabled={requisitos.length === 0}
            className={`p-2.5 bg-white text-left rounded-lg border shadow-xs transition disabled:opacity-40 ${
              etapaActual === 2 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-blue-600 block">Etapa 2</span>
            <span className="font-medium text-slate-800">Requisitos (RU)</span>
          </button>
          <button
            onClick={() => historias.length > 0 && setEtapaActual(3)}
            disabled={historias.length === 0}
            className={`p-2.5 bg-white text-left rounded-lg border shadow-xs transition disabled:opacity-40 ${
              etapaActual === 3 ? "border-purple-500 ring-1 ring-purple-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-purple-600 block">Etapa 3</span>
            <span className="font-medium text-slate-800">Historias Usuario</span>
          </button>
          <button
            onClick={() => tareas.length > 0 && setEtapaActual(4)}
            disabled={tareas.length === 0}
            className={`p-2.5 bg-white text-left rounded-lg border shadow-xs transition disabled:opacity-40 ${
              etapaActual === 4 ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-indigo-600 block">Etapa 4</span>
            <span className="font-medium text-slate-800">Tareas Técnicas</span>
          </button>
        </div>
      </div>
    </div>
  );
}