import { useState } from "react";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import { HistoriasUsuarioView } from "./components/HistoriasUsuarioView";
import type { RequisitoItem, HistoriaUsuarioItem } from "./types";

export default function App() {
  const [etapaActual, setEtapaActual] = useState<1 | 2 | 3>(1);
  const [requisitos, setRequisitos] = useState<RequisitoItem[]>([]);
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>([]);
  const [cargandoHu, setCargandoHu] = useState(false);

  // Etapa 1 -> Etapa 2
  const handleRequisitosGenerados = (datos: RequisitoItem[]) => {
    setRequisitos(datos);
    setEtapaActual(2);
  };

  // Etapa 2 -> Derivar HU con Gemini -> Etapa 3
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
      alert(error.message || "Error al conectar con la API");
    } finally {
      setCargandoHu(false);
    }
  };

  // Etapa 3 -> Confirmación de HU (base para derivar tareas)
  const handleHistoriasAprobadas = (aprobadas: HistoriaUsuarioItem[]) => {
    setHistorias(aprobadas);
    alert(`Se consolidaron ${aprobadas.length} Historias de Usuario aprobadas. Listas para derivar el backlog de tareas técnicas.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema para la especificación y trazabilidad de requisitos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transformación secuencial estricta: Documento → Requisitos → Historias de Usuario → Tareas.
          </p>
        </div>

        {/* Renderizado de etapas */}
        {cargandoHu ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-sm font-semibold text-slate-800">Derivando Historias de Usuario con IA...</h3>
            <p className="text-xs text-slate-500 mt-1">Estructurando rol, intención y criterios de aceptación vinculados a cada RF.</p>
          </div>
        ) : (
          <>
            {etapaActual === 1 && <IngestaView onGenerarExitoso={handleRequisitosGenerados} />}
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
          </>
        )}

        {/* Indicador visual de pipeline metodológico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-xs">
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 1 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
            <span className="font-bold text-blue-600 block">Etapa 1</span>
            <span className="font-medium text-slate-800">Documento</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Ingesta y texto base</p>
          </div>
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 2 ? "border-green-500 ring-1 ring-green-500" : "border-slate-200"}`}>
            <span className="font-bold text-green-600 block">Etapa 2</span>
            <span className="font-medium text-slate-800">Requisitos</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Validación formal</p>
          </div>
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 3 ? "border-purple-500 ring-1 ring-purple-500" : "border-slate-200"}`}>
            <span className="font-bold text-purple-600 block">Etapa 3</span>
            <span className="font-medium text-slate-800">Historias Usuario</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Valor de negocio ágil</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg border border-slate-200 opacity-50">
            <span className="font-bold text-slate-400 block">Etapa 4</span>
            <span className="font-medium text-slate-600">Tareas Técnicas</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Siguiente paso</p>
          </div>
        </div>

      </div>
    </div>
  );
}