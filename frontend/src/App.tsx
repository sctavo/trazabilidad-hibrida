import { useState } from "react";
import { LoginView } from "./components/LoginView";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import { HistoriasUsuarioView } from "./components/HistoriasUsuarioView";
import { TareasView } from "./components/TareasView";
import { ProyectosModal } from "./components/ProyectosModal";
import type { RequisitoItem, HistoriaUsuarioItem, TareaItem } from "./types";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [usuario, setUsuario] = useState<{ id: string; nombre: string; email: string } | null>(
    localStorage.getItem("usuario") ? JSON.parse(localStorage.getItem("usuario")!) : null
  );

  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [nombreProyecto, setNombreProyecto] = useState("Especificación de Requisitos");
  const [textoDocumento, setTextoDocumento] = useState("");
  const [etapaActual, setEtapaActual] = useState<1 | 2 | 3 | 4>(1);

  const [requisitos, setRequisitos] = useState<RequisitoItem[]>([]);
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>([]);
  const [tareas, setTareas] = useState<TareaItem[]>([]);

  // Estados de Trazabilidad en Cascada
  const [ruModificadosIds, setRuModificadosIds] = useState<Set<string>>(new Set());
  const [huModificadasIds, setHuModificadasIds] = useState<Set<string>>(new Set());

  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);
  const [cargandoHu, setCargandoHu] = useState(false);
  const [cargandoTareas, setCargandoTareas] = useState(false);
  const [guardandoBD, setGuardandoBD] = useState(false);
  const [mostrarModalProyectos, setMostrarModalProyectos] = useState(false);

  const handleCerrarSesion = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    setProyectoId(null);
    setNombreProyecto("Especificación de Requisitos");
    setTextoDocumento("");
    setRequisitos([]);
    setHistorias([]);
    setTareas([]);
    setRuModificadosIds(new Set());
    setHuModificadasIds(new Set());
    setEtapaActual(1);
  };

  const handleCrearNuevoProyecto = () => {
    setProyectoId(null);
    setNombreProyecto(`Proyecto ${new Date().toLocaleDateString()}`);
    setTextoDocumento("");
    setRequisitos([]);
    setHistorias([]);
    setTareas([]);
    setRuModificadosIds(new Set());
    setHuModificadasIds(new Set());
    setEtapaActual(1);
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
      setTextoDocumento(data.texto_documento || "");
      setRequisitos(data.requisitos || []);
      setHistorias(data.historias_usuario || []);
      setTareas(data.tareas || []);
      setRuModificadosIds(new Set());
      setHuModificadasIds(new Set());
      setEtapaActual(data.etapa_actual as 1 | 2 | 3 | 4);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGuardarProyectoBD = async () => {
    if (!token) return;
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
          etapa_actual: etapaActual,
          texto_documento: textoDocumento,
          requisitos,
          historias_usuario: historias,
          tareas,
        }),
      });

      if (!resp.ok) throw new Error("Error al persistir en base de datos.");
      const data = await resp.json();
      setProyectoId(data.id);
      alert("✓ Proyecto guardado en PostgreSQL exitosamente.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardandoBD(false);
    }
  };

  // Etapa 1 -> Etapa 2
  const handleSolicitarRequisitos = async (texto: string) => {
    setTextoDocumento(texto);
    setCargandoRequisitos(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/requisitos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!response.ok) throw new Error("Error al generar requisitos");
      const data = await response.json();
      setRequisitos(data.requisitos);
      setHistorias([]);
      setTareas([]);
      setRuModificadosIds(new Set());
      setHuModificadasIds(new Set());
      setEtapaActual(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoRequisitos(false);
    }
  };

  // Etapa 2 -> Etapa 3 (Recepción de cambios en RU y avance)
  const handleRequisitosAprobados = async (
    aprobados: RequisitoItem[],
    modificados: string[]
  ) => {
    setRequisitos(aprobados);

    // Si hubo modificaciones, las acumulamos para alertar a las HU
    if (modificados.length > 0) {
      setRuModificadosIds((prev) => {
        const nuevo = new Set(prev);
        modificados.forEach((id) => nuevo.add(id));
        return nuevo;
      });
    }

    // Primera generación de HU
    if (historias.length === 0) {
      setCargandoHu(true);
      try {
        const response = await fetch("http://localhost:8000/api/v1/generar/historias-usuario/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requisitos: aprobados }),
        });

        if (!response.ok) throw new Error("Error al derivar Historias de Usuario");
        const data = await response.json();
        setHistorias(data.historias_usuario);
        setRuModificadosIds(new Set());
        setEtapaActual(3);
      } catch (error: any) {
        alert(error.message);
      } finally {
        setCargandoHu(false);
      }
    } else {
      // Ya existen HU: avanzamos a revisarlas
      setEtapaActual(3);
    }
  };

  // Registrar que una HU cambió para alertar a Tareas
  const handleRegistrarHuModificada = (huId: string) => {
    setHuModificadasIds((prev) => new Set(prev).add(huId));
  };

  // Etapa 3 -> Etapa 4
  const handleHistoriasAprobadas = async (aprobadas: HistoriaUsuarioItem[]) => {
    setHistorias(aprobadas);

    // Primera generación de Tareas
    if (tareas.length === 0) {
      setCargandoTareas(true);
      try {
        const response = await fetch("http://localhost:8000/api/v1/generar/tareas/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historias_usuario: aprobadas }),
        });

        if (!response.ok) throw new Error("Error al derivar Tareas Técnicas");
        const data = await response.json();
        setTareas(data.tareas);
        setHuModificadasIds(new Set());
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

  if (!token) {
    return (
      <LoginView
        onLoginExitoso={(jwt, usr) => {
          setToken(jwt);
          setUsuario(usr);
          localStorage.setItem("token", jwt);
          localStorage.setItem("usuario", JSON.stringify(usr));
        }}
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
              {usuario?.nombre.slice(0, 2).toUpperCase() || "AN"}
            </div>
            <div>
              <input
                type="text"
                value={nombreProyecto}
                onChange={(e) => setNombreProyecto(e.target.value)}
                className="font-bold text-xs text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 block">Analista: {usuario?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarModalProyectos(true)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            >
              📁 Mis Proyectos
            </button>
            <button
              onClick={handleGuardarProyectoBD}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              {guardandoBD ? "Guardando..." : "💾 Guardar"}
            </button>
            <button
              onClick={handleCerrarSesion}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {mostrarModalProyectos && (
          <ProyectosModal
            token={token}
            proyectoActivoId={proyectoId}
            onCerrar={() => setMostrarModalProyectos(false)}
            onCrearNuevo={handleCrearNuevoProyecto}
            onCargarProyecto={handleCargarProyecto}
          />
        )}

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema para la especificación y trazabilidad de requisitos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transformación secuencial estricta: Documento → Requisitos (RU) → Historias de Usuario → Tareas.
          </p>
        </div>

        {cargandoRequisitos && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Extrayendo Requisitos de Usuario con Gemini...</h3>
          </div>
        )}

        {cargandoHu && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Derivando Historias de Usuario con Gemini...</h3>
          </div>
        )}

        {cargandoTareas && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Derivando Tareas Técnicas con Gemini...</h3>
          </div>
        )}

        {!cargandoRequisitos && !cargandoHu && !cargandoTareas && (
          <>
            {etapaActual === 1 && <IngestaView onSolicitarGeneracion={handleSolicitarRequisitos} />}
            {etapaActual === 2 && (
              <RequisitosView
                requisitosIniciales={requisitos}
                onVolver={() => setEtapaActual(1)}
                onConfirmar={handleRequisitosAprobados}
              />
            )}
            {etapaActual === 3 && (
              <HistoriasUsuarioView
                historiasIniciales={historias}
                requisitosDisponibles={requisitos}
                ruModificadosIds={ruModificadosIds}
                onVolver={() => setEtapaActual(2)}
                onConfirmar={handleHistoriasAprobadas}
                onRegistrarHuModificada={handleRegistrarHuModificada}
                onHistoriasActualizadas={(actualizadas) => setHistorias(actualizadas)}
              />
            )}
            {etapaActual === 4 && (
              <TareasView
                tareasIniciales={tareas}
                historiasDisponibles={historias}
                huModificadasIds={huModificadasIds}
                onVolver={() => setEtapaActual(3)}
                onConfirmar={(aprobadas) => {
                  setTareas(aprobadas);
                  alert("Plan de tareas técnicas aprobado.");
                }}
                onTareasActualizadas={(actualizadas) => setTareas(actualizadas)}
              />
            )}
          </>
        )}

        {/* Pipeline de Navegación */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-xs">
          <button
            onClick={() => setEtapaActual(1)}
            className={`p-3 bg-white text-left rounded-lg border shadow-xs transition ${
              etapaActual === 1 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-blue-600 block">Etapa 1</span>
            <span className="font-medium text-slate-800">Documento</span>
          </button>
          <button
            onClick={() => requisitos.length > 0 && setEtapaActual(2)}
            disabled={requisitos.length === 0}
            className={`p-3 bg-white text-left rounded-lg border shadow-xs transition disabled:opacity-40 ${
              etapaActual === 2 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-blue-600 block">Etapa 2</span>
            <span className="font-medium text-slate-800">Requisitos (RU)</span>
          </button>
          <button
            onClick={() => historias.length > 0 && setEtapaActual(3)}
            disabled={historias.length === 0}
            className={`p-3 bg-white text-left rounded-lg border shadow-xs transition disabled:opacity-40 ${
              etapaActual === 3 ? "border-purple-500 ring-1 ring-purple-500" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span className="font-bold text-purple-600 block">Etapa 3</span>
            <span className="font-medium text-slate-800">Historias Usuario</span>
          </button>
          <button
            onClick={() => tareas.length > 0 && setEtapaActual(4)}
            disabled={tareas.length === 0}
            className={`p-3 bg-white text-left rounded-lg border shadow-xs transition disabled:opacity-40 ${
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