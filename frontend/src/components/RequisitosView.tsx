import React, { useState } from "react";
import type { RequisitoItem } from "../types";

interface RequisitosViewProps {
  requisitosIniciales: RequisitoItem[];
  onVolver: () => void;
  onConfirmar: (requisitosAprobados: RequisitoItem[]) => void;
}

export const RequisitosView: React.FC<RequisitosViewProps> = ({
  requisitosIniciales,
  onVolver,
  onConfirmar,
}) => {
  const [requisitos, setRequisitos] = useState<RequisitoItem[]>(requisitosIniciales);
  const [nuevoRf, setNuevoRf] = useState("");
  const [nuevaPrioridad, setNuevaPrioridad] = useState<"Alta" | "Media" | "Baja">("Alta");

  const actualizarDescripcion = (index: number, valor: string) => {
    const actualizados = [...requisitos];
    actualizados[index].descripcion = valor;
    setRequisitos(actualizados);
  };

  const actualizarPrioridad = (index: number, valor: "Alta" | "Media" | "Baja") => {
    const actualizados = [...requisitos];
    actualizados[index].prioridad = valor;
    setRequisitos(actualizados);
  };

  const eliminarRequisito = (index: number) => {
    setRequisitos(requisitos.filter((_, i) => i !== index));
  };

  const agregarRequisitoManual = () => {
    if (!nuevoRf.trim()) return;
    const nuevoId = `RF${String(requisitos.length + 1).padStart(2, "0")}`;
    setRequisitos([
      ...requisitos,
      { id: nuevoId, descripcion: nuevoRf.trim(), prioridad: nuevaPrioridad },
    ]);
    setNuevoRf("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
              Etapa 2: Especificación de Requisitos
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {requisitos.length} artefactos detectados
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mt-1">
            Revisión y Aprobación (Human-in-the-Loop)
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 transition"
        >
          ← Volver al documento
        </button>
      </div>

      <div className="space-y-3">
        {requisitos.map((req, index) => (
          <div
            key={req.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center gap-3 transition-all hover:border-slate-300"
          >
            <div className="flex items-center gap-2 md:w-28 shrink-0">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                {req.id}
              </span>
              <select
                value={req.prioridad}
                onChange={(e) =>
                  actualizarPrioridad(index, e.target.value as "Alta" | "Media" | "Baja")
                }
                className={`text-xs font-semibold px-2 py-1 rounded border ${
                  req.prioridad === "Alta"
                    ? "text-red-700 border-red-200 bg-red-50"
                    : req.prioridad === "Media"
                    ? "text-amber-700 border-amber-200 bg-amber-50"
                    : "text-blue-700 border-blue-200 bg-blue-50"
                }`}
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            <textarea
              rows={2}
              value={req.descripcion}
              onChange={(e) => actualizarDescripcion(index, e.target.value)}
              className="w-full text-xs text-slate-800 p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans leading-relaxed"
            />

            <button
              onClick={() => eliminarRequisito(index)}
              title="Descartar artefacto"
              className="self-end md:self-center text-xs text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 space-y-3">
        <label className="text-xs font-semibold text-slate-600 block">
          + Agregar Requisito Manual
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Descripción del requisito..."
            value={nuevoRf}
            onChange={(e) => setNuevoRf(e.target.value)}
            className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <select
            value={nuevaPrioridad}
            onChange={(e) => setNuevaPrioridad(e.target.value as "Alta" | "Media" | "Baja")}
            className="text-xs p-2.5 bg-white border border-slate-300 rounded-lg"
          >
            <option value="Alta">Prioridad Alta</option>
            <option value="Media">Prioridad Media</option>
            <option value="Baja">Prioridad Baja</option>
          </select>
          <button
            onClick={agregarRequisitoManual}
            className="text-xs font-semibold px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition"
          >
            Añadir
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onConfirmar(requisitos)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>Aprobar y Consolidar Requisitos ({requisitos.length})</span>
          <span>✓</span>
        </button>
      </div>
    </div>
  );
};