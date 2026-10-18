import React from "react";
import { MODELOS_IA_CATALOGO } from "../types";

interface SeleccionModeloViewProps {
  modeloSeleccionado: string;
  onCambiarModelo: (modelo: string) => void;
  modeloBloqueado?: boolean;
  onContinuar: () => void;
}

export const SeleccionModeloView: React.FC<SeleccionModeloViewProps> = ({
  modeloSeleccionado,
  onCambiarModelo,
  modeloBloqueado = false,
  onContinuar,
}) => {
  const modeloActual =
    MODELOS_IA_CATALOGO.find((m) => m.id === modeloSeleccionado) || MODELOS_IA_CATALOGO[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Cabecera del Paso 0 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Paso 0 • Configuración Inicial
              </span>
              {modeloBloqueado ? (
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                  <span>🔒</span> Motor fijado para este proyecto
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span>✓</span> Selección activa
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Selecciona el Motor de Inteligencia Artificial
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">
              {modeloBloqueado ? "Inmutable durante el ciclo" : "1 Motor por proyecto"}
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              Mitigación de caídas activa
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Elige qué modelo de lenguaje asistirá en la extracción de Requisitos de Usuario (RU), derivación de Historias de Usuario (HU) con criterios Gherkin y descomposición en Tareas Técnicas (TSK).
        </p>

        {modeloBloqueado && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
            <span>ℹ️</span>
            <span>
              Este proyecto ya cuenta con artefactos generados o guardados. Por integridad en la trazabilidad metodológica, el motor de IA no puede modificarse una vez iniciado.
            </span>
          </div>
        )}
      </div>

      {/* Catálogo de Modelos (Cuadrícula de Tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODELOS_IA_CATALOGO.map((m) => {
          const esSeleccionado = modeloSeleccionado === m.id;
          return (
            <div
              key={m.id}
              onClick={() => !modeloBloqueado && onCambiarModelo(m.id)}
              className={`relative p-5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                modeloBloqueado
                  ? esSeleccionado
                    ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 cursor-default shadow-xs"
                    : "border-slate-200 bg-slate-50 opacity-40 cursor-not-allowed"
                  : esSeleccionado
                  ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30 cursor-pointer shadow-md scale-[1.01]"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs hover:bg-slate-50/60 cursor-pointer"
              }`}
            >
              {/* Badge de Recomendado / Experimental */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{m.icono}</span>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {m.nombre}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {m.proveedor}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wider ${
                      m.esRecomendado
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : "bg-purple-100 text-purple-700 border-purple-300"
                    }`}
                  >
                    {m.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">
                  {m.descripcion}
                </p>
              </div>

              {/* Pie de tarjeta con estado */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {m.esRecomendado ? "⚡ Alta velocidad" : "🔬 Experimental"}
                </span>

                {esSeleccionado ? (
                  <span className="font-bold text-xs text-blue-600 flex items-center gap-1">
                    <span>✓</span> {modeloBloqueado ? "Asignado" : "Seleccionado"}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium hover:text-slate-600">
                    {modeloBloqueado ? "Bloqueado" : "Click para elegir"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner de Mitigación y Salvaguarda */}
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 flex items-start gap-3">
        <span className="text-xl leading-none">🛡️</span>
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900">
            Medida de Mitigación y Respaldo Automático Activa
          </h4>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Puedes elegir con total tranquilidad cualquiera de los modelos experimentales. Si el proveedor sufre una caída temporal, saturación de cuota (HTTP 429) o produce una respuesta incompleta, el backend activará automáticamente un <strong>failover de contingencia a Gemini 2.5 Flash Lite</strong>, garantizando que tu flujo de trabajo nunca se interrumpa.
          </p>
        </div>
      </div>

      {/* Botón de Continuar a Ingesta de Documentos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl">
            {modeloActual.icono}
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Motor configurado:</div>
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>{modeloActual.nombre}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold bg-blue-100 text-blue-700">
                {modeloActual.badge}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onContinuar}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
        >
          <span>Continuar a Ingesta de Documentos</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

