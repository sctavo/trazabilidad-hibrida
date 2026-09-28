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

  // Formulario de alta manual de RU
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaFuente, setNuevaFuente] = useState("Documento base");
  const [nuevaEstabilidad, setNuevaEstabilidad] = useState<"Transable" | "Intransable">("Transable");
  const [nuevoTipo, setNuevoTipo] = useState<"Funcional" | "No Funcional">("Funcional");

  const actualizarCampo = (index: number, campo: keyof RequisitoItem, valor: any) => {
    const actualizados = [...requisitos];
    actualizados[index] = { ...actualizados[index], [campo]: valor };
    setRequisitos(actualizados);
  };

  const eliminarRequisito = (index: number) => {
    setRequisitos(requisitos.filter((_, i) => i !== index));
  };

  const agregarRequisitoManual = () => {
    if (!nuevoNombre.trim() || !nuevaDescripcion.trim()) {
      alert("Por favor completa el nombre y la descripción del requisito.");
      return;
    }

    const nuevoId = `RU${requisitos.length + 1}`;
    const nuevoRu: RequisitoItem = {
      id: nuevoId,
      nombre: nuevoNombre.trim(),
      descripcion: nuevaDescripcion.trim(),
      fuente: nuevaFuente.trim() || "Entrada manual",
      estabilidad: nuevaEstabilidad,
      tipo: nuevoTipo,
    };

    setRequisitos([...requisitos, nuevoRu]);
    setNuevoNombre("");
    setNuevaDescripcion("");
    setNuevaFuente("Documento base");
    setNuevaEstabilidad("Transable");
    setNuevoTipo("Funcional");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Etapa 2: Requisitos de Usuario (RU)
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {requisitos.length} requisitos estructurados
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mt-1">
            Revisión y Aprobación Formal (Human-in-the-Loop)
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 transition"
        >
          ← Volver al documento
        </button>
      </div>

      {/* Lista de Requisitos con formato formal */}
      <div className="space-y-4">
        {requisitos.map((req, index) => (
          <div
            key={req.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300"
          >
            {/* Encabezado: RU# - Nombre */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 shrink-0">
                  {req.id}
                </span>
                <span className="text-sm font-bold text-slate-400 shrink-0">-</span>
                <input
                  type="text"
                  value={req.nombre}
                  onChange={(e) => actualizarCampo(index, "nombre", e.target.value)}
                  placeholder="Nombre del requisito..."
                  className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 flex-1 min-w-0 w-full"
                />
              </div>

              <button
                onClick={() => eliminarRequisito(index)}
                title="Descartar Requisito"
                className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition shrink-0"
              >
                🗑️
              </button>
            </div>

            {/* Descripción */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Descripción:
              </label>
              <textarea
                rows={2}
                value={req.descripcion}
                onChange={(e) => actualizarCampo(index, "descripcion", e.target.value)}
                className="w-full text-xs text-slate-800 p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none font-sans leading-relaxed"
              />
            </div>

            {/* Metadatos: Fuente, Estabilidad, Tipo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-600 block mb-1">Fuente:</span>
                <input
                  type="text"
                  value={req.fuente}
                  onChange={(e) => actualizarCampo(index, "fuente", e.target.value)}
                  className="w-full bg-white p-1 rounded border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-600 block mb-1">Estabilidad:</span>
                <select
                  value={req.estabilidad}
                  onChange={(e) => actualizarCampo(index, "estabilidad", e.target.value)}
                  className={`w-full p-1 rounded font-medium border ${
                    req.estabilidad === "Intransable"
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <option value="Transable">Transable (Por defecto)</option>
                  <option value="Intransable">Intransable</option>
                </select>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-600 block mb-1">Tipo:</span>
                <select
                  value={req.tipo}
                  onChange={(e) => actualizarCampo(index, "tipo", e.target.value)}
                  className="w-full bg-white p-1 rounded border border-slate-200 font-medium text-slate-700"
                >
                  <option value="Funcional">Funcional</option>
                  <option value="No Funcional">No Funcional</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario Manual de Alta de Requisito */}
      <div className="bg-blue-50/40 p-5 rounded-xl border border-dashed border-blue-300 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
            + Agregar Requisito de Usuario Manual (Human-in-the-Loop)
          </label>
          <span className="text-[11px] text-blue-700">Formato formal RU</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nombre de la funcionalidad:</label>
            <input
              type="text"
              placeholder="Ej: Registrar Vehículo"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Fuente:</label>
            <input
              type="text"
              placeholder="Ej: Aplicación (Monitor-X)"
              value={nuevaFuente}
              onChange={(e) => setNuevaFuente(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">Descripción detallada:</label>
          <textarea
            rows={2}
            placeholder="Describa el comportamiento requerido del sistema..."
            value={nuevaDescripcion}
            onChange={(e) => setNuevaDescripcion(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Estabilidad:</label>
            <select
              value={nuevaEstabilidad}
              onChange={(e) => setNuevaEstabilidad(e.target.value as "Transable" | "Intransable")}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
            >
              <option value="Transable">Transable (Por defecto)</option>
              <option value="Intransable">Intransable</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tipo:</label>
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as "Funcional" | "No Funcional")}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
            >
              <option value="Funcional">Funcional</option>
              <option value="No Funcional">No Funcional</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={agregarRequisitoManual}
            className="text-xs font-semibold px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition"
          >
            Añadir RU al Catálogo
          </button>
        </div>
      </div>

      {/* Botón de Consolidación */}
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