import { IngestaView } from "./components/IngestaView";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Ingesta y gestión de documentos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Carga un archivo (PDF/TXT) o pega requerimientos libres. Revisa y depura el texto antes de generar la trazabilidad jerárquica[cite: 6, 9].
          </p>
        </div>

        {/* Módulo de Ingesta con Edición */}
        <IngestaView />

        {/* Cadena Metodológica */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-200 text-xs">
          <div className="p-3 bg-white rounded-lg border border-blue-400 shadow-xs">
            <span className="font-bold text-blue-600 block">Etapa 1</span>
            <span className="font-medium text-slate-800">Documento</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Texto fuente extraído</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg border border-slate-200 opacity-60">
            <span className="font-bold text-slate-400 block">Etapa 2</span>
            <span className="font-medium text-slate-600">Requisitos</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Especificación estructurada</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg border border-slate-200 opacity-60">
            <span className="font-bold text-slate-400 block">Etapa 3</span>
            <span className="font-medium text-slate-600">Historias Usuario</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Valor de negocio</p>
          </div>
          <div className="p-3 bg-white/60 rounded-lg border border-slate-200 opacity-60">
            <span className="font-bold text-slate-400 block">Etapa 4</span>
            <span className="font-medium text-slate-600">Tareas Técnicas</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Backlog ágil</p>
          </div>
        </div>

      </div>
    </div>
  );
}