import { useState, useEffect } from "react";
import { LoginView } from "./components/LoginView";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import { HistoriasUsuarioView } from "./components/HistoriasUsuarioView";
import { TareasView } from "./components/TareasView";
import type { RequisitoItem, HistoriaUsuarioItem, TareaItem } from "./types";

export default function App() {
  // Autenticación
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [usuario, setUsuario] = useState<{ id: string; nombre: string; email: string } | null>(
    localStorage.getItem("usuario") ? JSON.parse(localStorage.getItem("usuario")!) : null
  );

  // Proyecto activo
  const [proyectoId, setProyectoId] = useState<string | null>(null);
  const [nombreProyecto, setNombreProyecto] = useState("Especificación de Requisitos");
  const [textoDocumento, setTextoDocumento] = useState("");
  const [etapaActual, setEtapaActual] = useState<1 | 2 | 3 | 4>(1);

  // Artefactos en memoria
  const [requisitos, setRequisitos] = useState<RequisitoItem[]>([]);
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>([]);
  const [tareas, setTareas] = useState<TareaItem[]>([]);

  // Spinners
  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);
  const [cargandoHu, setCargandoHu] = useState(false);
  const [cargandoTareas, setCargandoTareas] = useState(false);
  const [guardandoBD, setGuardandoBD] = useState(false);

  const handleLoginExitoso = (jwt: string, user: { id: string; nombre: string; email: string }) => {
    setToken(jwt);
    setUsuario(user);
    localStorage.setItem("token", jwt);
    localStorage.setItem("usuario", JSON.stringify(user));
  };

  const handleCerrarSesion = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
  };

  // Guardar estado actual en PostgreSQL (HU-22 / RF30)
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

      if (!resp.ok) throw new Error("Error al persistir el proyecto en base de datos.");
      const data = await resp.json();
      setProyectoId(data.id);
      alert("✓ Proyecto y artefactos guardados en PostgreSQL exitosamente.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGuardandoBD(false);
    }
  };

  // Ingesta -> Requisitos (Solo llama a IA si la lista está vacía o el texto cambió)
  const handleSolicitarRequisitos = async (texto: string) => {
    setTextoDocumento(texto);
    setCargandoRequisitos(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/requisitos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!response.ok) throw new Error("Error al generar requisitos con el LLM");
      const data = await response.json();
      setRequisitos(data.requisitos);
      setEtapaActual(2);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCargandoRequisitos(false);
    }
  };

  // Requisitos -> HU (Evita re-ejecutar IA si ya existen historias y solo se está avanzando)
  const handleRequisitosAprobados = async (aprobados: RequisitoItem[]) => {
    setRequisitos(aprobados);

    if (historias.length > 0) {
      setEtapaActual(3);
      return;
    }

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
      setEtapaActual(3);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCargandoHu(false);
    }
  };

  // HU -> Tareas (Evita re-ejecutar IA si ya existen tareas)
  const handleHistoriasAprobadas = async (aprobadas: HistoriaUsuarioItem[]) => {
    setHistorias(aprobadas);

    if (tareas.length > 0) {
      setEtapaActual(4);
      return;
    }

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
      setEtapaActual(4);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setCargandoTareas(false);
    }
  };

  const handleTareasAprobadas = (aprobadas: TareaItem[]) => {
    setTareas(aprobadas);
    alert("Plan de tareas técnicas aprobado. Listo para exportar o revisar trazabilidad.");
  };

  if (!token) {
    return <LoginView onLoginExitoso={handleLoginExitoso} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Barra superior de sesión y persistencia */}
        <header className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {usuario?.nombre.slice(0, 2).toUpperCase() || "AN"}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">{usuario?.nombre}</span>
              <span className="text-[11px] text-slate-500">{usuario?.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGuardarProyectoBD}
              disabled={guardandoBD}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-1"
            >
              {guardandoBD ? "Guardando..." : "💾 Guardar Proyecto en BD"}
            </button>
            <button
              onClick={handleCerrarSesion}
              className="text-xs font-semibold px-3 py-1.5 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-lg transition"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Título de la aplicación */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema para la especificación y trazabilidad de requisitos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transformación secuencial: Documento → Requisitos (RU) → Historias de Usuario → Tareas[cite: 14, 15].
          </p>
        </div>

        {/* Spinners de Carga */}
        {cargandoRequisitos && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Extrayendo Requisitos de Usuario (RU) con Gemini...</h3>
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

        {/* Vistas según la etapa */}
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
                onVolver={() => setEtapaActual(2)}
                onConfirmar={handleHistoriasAprobadas}
              />
            )}
            {etapaActual === 4 && (
              <TareasView
                tareasIniciales={tareas}
                historiasDisponibles={historias}
                onVolver={() => setEtapaActual(3)}
                onConfirmar={handleTareasAprobadas}
              />
            )}
          </>
        )}

        {/* Pipeline de navegación visual */}
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