import { useState } from "react";
import { IngestaView } from "./components/IngestaView";
import { RequisitosView } from "./components/RequisitosView";
import type { RequisitoItem } from "./types";

export default function App() {
  const [etapaActual, setEtapaActual] = useState<1 | 2>(1);
  const [requisitos, setRequisitos] = useState<RequisitoItem[]>([]);

  const handleRequisitosGenerados = (datos: RequisitoItem[]) => {
    setRequisitos(datos);
    setEtapaActual(2);
  };

  const handleRequisitosAprobados = (aprobados: RequisitoItem[]) => {
    setRequisitos(aprobados);
    alert(`Se consolidaron ${aprobados.length} requisitos funcionales aprobados. Listo para derivar Historias de Usuario.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Sistema para la especificación y trazabilidad de requisitos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Transformación estructurada y validada de requerimientos bajo metodología ágil PXP.
          </p>
        </div>

        {/* Control de visualización por etapas */}
        {etapaActual === 1 ? (
          <IngestaView onGenerarExitoso={handleRequisitosGenerados} />
        ) : (
          <RequisitosView
            requisitosIniciales={requisitos}
            onVolver={() => setEtapaActual(1)}
            onConfirmar={handleRequisitosAprobados}
          />
        )}

        {/* Indicador Metodológico de la Cadena */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-xs">
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 1 ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200"}`}>
            <span className="font-bold text-blue-600 block">Etapa 1</span>
            <span className="font-medium text-slate-800">Documento</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Ingesta y depuración</p>
          </div>
          <div className={`p-3 bg-white rounded-lg border shadow-xs ${etapaActual === 2 ? "border-green-500 ring-1 ring-green-500" : "border-slate-200"}`}>
            <span className="font-bold text-green-600 block">Etapa 2</span>
            <span className="font-medium text-slate-800">Requisitos</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Validación iterativa</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg border border-slate-200 opacity-50">
            <span className="font-bold text-slate-400 block">Etapa 3</span>
            <span className="font-medium text-slate-600">Historias Usuario</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Próxima iteración</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg border border-slate-200 opacity-50">
            <span className="font-bold text-slate-400 block">Etapa 4</span>
            <span className="font-medium text-slate-600">Tareas Técnicas</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Próxima iteración</p>
          </div>
        </div>

      </div>
    </div>
  );
}