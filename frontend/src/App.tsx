import { useState } from "react";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import { HistoriasUsuarioView } from "./components/HistoriasUsuarioView";
import { TareasView } from "./components/TareasView";
import type { RequisitoItem, HistoriaUsuarioItem, TareaItem } from "./types";

export default function App() {
  const [etapaActual, setEtapaActual] = useState<1 | 2 | 3 | 4>(1);
  const [requisitos, setRequisitos] = useState<RequisitoItem[]>([]);
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>([]);
  const [tareas, setTareas] = useState<TareaItem[]>([]);

  // Estados de carga por etapas
  const [cargandoRequisitos, setCargandoRequisitos] = useState(false);
  const [cargandoHu, setCargandoHu] = useState(false);
  const [cargandoTareas, setCargandoTareas] = useState(false);

  // Etapa 1 -> Etapa 2 (Llamada IA Requisitos de Usuario con Loading)
  const handleSolicitarRequisitos = async (texto: string) => {
    setCargandoRequisitos(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/requisitos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al generar requisitos con el LLM");
      }

      const data = await response.json();
      setRequisitos(data.requisitos);
      setEtapaActual(2);
    } catch (err: any) {
      alert(err.message || "Error al conectar con la API de IA");
    } finally {
      setCargandoRequisitos(false);
    }
  };

  // Etapa 2 -> Etapa 3 (Llamada IA Historias de Usuario)
  const handleRequisitosAprobados = async (aprobados: RequisitoItem[]) => {
    setRequisitos(aprobados);
    setCargandoHu(true);

    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/historias-usuario/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitos: aprobados }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al derivar Historias de Usuario");
      }

      const data = await response.json();
      setHistorias(data.historias_usuario);
      setEtapaActual(3);
    } catch (error: any) {
      alert(error.message || "Error con la API de IA");
    } finally {
      setCargandoHu(false);
    }
  };

  // Etapa 3 -> Etapa 4 (Llamada IA Tareas Técnicas)
  const handleHistoriasAprobadas = async (aprobadas: HistoriaUsuarioItem[]) => {
    setHistorias(aprobadas);
    setCargandoTareas(true);

    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/tareas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historias_usuario: aprobadas }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al derivar Tareas Técnicas");
      }

      const data = await response.json();
      setTareas(data.tareas);
      setEtapaActual(4);
    } catch (error: any) {
      alert(error.message || "Error al derivar tareas técnicas");
    } finally {
      setCargandoTareas(false);
    }
  };

  const handleTareasAprobadas = (aprobadas: TareaItem[]) => {
    setTareas(aprobadas);
    alert(
      `¡Cadena de artefactos completada!\n` +
      `- ${requisitos.length} Requisitos de Usuario (RU)\n` +
      `- ${historias.length} Historias de Usuario\n` +
      `- ${aprobadas.length} Tareas Técnicas Aprobadas\n\n` +
      `Listo para proceder con la matriz de trazabilidad y exportación.`
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema para la especificación y trazabilidad de requisitos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transformación secuencial: Documento → Requisitos de Usuario (RU) → Historias de Usuario → Tareas[cite: 14, 15].
          </p>
        </div>

        {/* Indicador de carga: Documento -> Requisitos */}
        {cargandoRequisitos && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">
              Analizando documento y extrayendo Requisitos de Usuario (RU) con Gemini...
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Estructurando nombre, descripción, fuente, tipo y estabilidad por defecto ("Transable")[cite: 14, 15].
            </p>
          </div>
        )}

        {/* Indicador de carga: Requisitos -> Historias de Usuario */}
        {cargandoHu && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Derivando Historias de Usuario con Gemini...</h3>
            <p className="text-xs text-slate-500 mt-1">Estructurando rol, intención y criterios de aceptación vinculados a cada RU[cite: 14, 15].</p>
          </div>
        )}

        {/* Indicador de carga: Historias de Usuario -> Tareas */}
        {cargandoTareas && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Derivando Tareas Técnicas con Gemini...</h3>
            <p className="text-xs text-slate-500 mt-1">Desglosando en unidades de trabajo ágil con estimación de horas[cite: 14, 15].</p>
          </div>
        )}

        {/* Visualización de Etapas */}
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

        {/* Pipeline metodológico inferior */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-xs">
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 1 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
            <span className="font-bold text-blue-600 block">Etapa 1</span>
            <span className="font-medium text-slate-800">Documento</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Ingesta y texto base</p>
          </div>
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 2 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
            <span className="font-bold text-blue-600 block">Etapa 2</span>
            <span className="font-medium text-slate-800">Requisitos (RU)</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Formato formal RU</p>
          </div>
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 3 ? "border-purple-500 ring-1 ring-purple-500" : "border-slate-200"}`}>
            <span className="font-bold text-purple-600 block">Etapa 3</span>
            <span className="font-medium text-slate-800">Historias Usuario</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Criterios dinámicos IA</p>
          </div>
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 4 ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200"}`}>
            <span className="font-bold text-indigo-600 block">Etapa 4</span>
            <span className="font-medium text-slate-800">Tareas Técnicas</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Backlog final</p>
          </div>
        </div>
      </div>
    </div>
  );
}