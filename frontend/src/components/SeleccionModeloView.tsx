import React from "react";
import { MODELOS_IA_CATALOGO } from "../types";
import { LockIcon, CheckIcon, InfoIcon } from "./Icons";

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
      <div className="bg-[#131d35] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                Paso 0 • Configuración Inicial
              </span>
              {modeloBloqueado ? (
                <span className="text-[11px] font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700 flex items-center gap-1.5">
                  <LockIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Motor fijado para este proyecto</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20 flex items-center gap-1.5">
                  <CheckIcon className="w-3.5 h-3.5 text-teal-400" />
                  <span>Selección activa</span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Selecciona el Motor de Inteligencia Artificial
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">
              1 Motor por proyecto
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Elige qué modelo de lenguaje asistirá en la extracción de Requisitos de Usuario (RU), derivación de Historias de Usuario (HU) con criterios Gherkin y descomposición en Tareas Técnicas (TSK).
        </p>

        {modeloBloqueado && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center gap-2.5">
            <InfoIcon className="w-4 h-4 text-amber-400 shrink-0" />
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
                    ? "border-blue-500 bg-[#1e293b] ring-2 ring-blue-500/30 cursor-default shadow-lg"
                    : "border-slate-800 bg-[#131d35]/50 opacity-40 cursor-not-allowed"
                  : esSeleccionado
                  ? "border-blue-500 bg-[#1e293b] ring-2 ring-blue-500/30 cursor-pointer shadow-lg scale-[1.01]"
                  : "border-slate-800 bg-[#131d35] hover:border-slate-700 hover:bg-[#182442] cursor-pointer"
              }`}
            >
              {/* Badge de Recomendado / Experimental */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-sky-400 shrink-0">
                      {m.icono}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white leading-snug">
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
                        ? "bg-blue-500/15 text-sky-400 border-blue-500/30"
                        : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                    }`}
                  >
                    {m.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed min-h-[48px]">
                  {m.descripcion}
                </p>
              </div>

              {/* Pie de tarjeta con estado */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {m.esRecomendado ? "Alta velocidad" : "Experimental"}
                </span>

                {esSeleccionado ? (
                  <span className="font-bold text-xs text-sky-400 flex items-center gap-1.5">
                    <CheckIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>{modeloBloqueado ? "Asignado" : "Seleccionado"}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium hover:text-slate-300">
                    {modeloBloqueado ? "Bloqueado" : "Elegir modelo"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón de Continuar a Ingesta */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onContinuar}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
        >
          <span>Continuar con {modeloActual.nombre}</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
