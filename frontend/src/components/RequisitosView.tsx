import React, { useState } from "react";
import type { RequisitoItem } from "../types";

interface RequisitosViewProps {
  requisitosIniciales: RequisitoItem[];
  onVolver: () => void;
  onConfirmar: (requisitosAprobados: RequisitoItem[], ruModificadosIds: string[]) => void;
}

export const RequisitosView: React.FC<RequisitosViewProps> = ({
  requisitosIniciales,
  onVolver,
  onConfirmar,
}) => {
  const [requisitos, setRequisitos] = useState<RequisitoItem[]>(requisitosIniciales);
  const [ruEditados, setRuEditados] = useState<Set<string>>(new Set());
  const [mostrarModalImpacto, setMostrarModalImpacto] = useState(false);

  // Formulario manual
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaFuente, setNuevaFuente] = useState("Documento base");
  const [nuevaEstabilidad, setNuevaEstabilidad] = useState<"Transable" | "Intransable">("Transable");
  const [nuevoTipo, setNuevoTipo] = useState<"Funcional" | "No Funcional">("Funcional");

  const actualizarCampo = (index: number, campo: keyof RequisitoItem, valor: any) => {
    const actualizados = [...requisitos];
    const ru = actualizados[index];
    actualizados[index] = { ...ru, [campo]: valor };
    setRequisitos(actualizados);
    setRuEditados((prev) => new Set(prev).add(ru.id));
  };

  const eliminarRequisito = (index: number) => {
    const id = requisitos[index].id;
    setRequisitos(requisitos.filter((_, i) => i !== index));
    setRuEditados((prev) => new Set(prev).add(id));
  };

  const agregarRequisitoManual = () => {
    if (!nuevoNombre.trim() || !nuevaDescripcion.trim()) {
      alert("Completa el nombre y la descripción.");
      return;
    }
    const nuevoId = `RU${requisitos.length + 1}`;
    const nuevoRu: RequisitoItem = {
      id: nuevoId,
      nombre: nuevoNombre.trim(),
      descripcion: nuevaDescripcion.trim(), // Corregido: antes decía nuevoDescripcion
      fuente: nuevaFuente.trim() || "Entrada manual",
      estabilidad: nuevaEstabilidad,
      tipo: nuevoTipo,
    };
    setRequisitos([...requisitos, nuevoRu]);
    setRuEditados((prev) => new Set(prev).add(nuevoId));

    // Limpieza de campos
    setNuevoNombre("");
    setNuevaDescripcion("");
    setNuevaFuente("Documento base");
    setNuevaEstabilidad("Transable");
    setNuevoTipo("Funcional");
  };

  const handleIntentarConsolidar = () => {
    if (ruEditados.size > 0) {
      setMostrarModalImpacto(true);
    } else {
      onConfirmar(requisitos, []);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Modal de Alerta de Impacto en la Trazabilidad */}
      {mostrarModalImpacto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-amber-600">
              <span className="text-xl">⚠️</span>
              <h3 className="font-bold text-sm text-slate-800">Impacto en Trazabilidad Jerárquica</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Has modificado los requisitos:{" "}
              <strong className="text-slate-900">
                {Array.from(ruEditados).join(", ")}
              </strong>
              . Las Historias de Usuario y Tareas Técnicas que dependan de estos artefactos quedarán marcadas como 
              <span className="text-amber-700 font-semibold"> desincronizadas</span> en las siguientes etapas.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostrarModalImpacto(false)}
                className="text-xs px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition"
              >
                Revisar cambios
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalImpacto(false);
                  onConfirmar(requisitos, Array.from(ruEditados));
                }}
                className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Confirmar y Propagar Impacto →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Etapa 2: Requisitos de Usuario (RU)
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {requisitos.length} requisitos
            </span>
            {ruEditados.size > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                {ruEditados.size} con cambios pendientes
              </span>
            )}
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

      {/* Lista de Requisitos */}
      <div className="space-y-4">
        {requisitos.map((req, index) => {
          const fueEditado = ruEditados.has(req.id);
          return (
            <div
              key={req.id}
              className={`bg-white p-5 rounded-xl border shadow-xs space-y-3 transition-all ${
                fueEditado ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm font-black text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 shrink-0">
                    {req.id}
                  </span>
                  {fueEditado && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                      Modificado
                    </span>
                  )}
                  <input
                    type="text"
                    value={req.nombre}
                    onChange={(e) => actualizarCampo(index, "nombre", e.target.value)}
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

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Descripción:
                </label>
                <textarea
                  rows={2}
                  value={req.descripcion}
                  onChange={(e) => actualizarCampo(index, "descripcion", e.target.value)}
                  className="w-full text-xs text-slate-800 p-2.5 bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

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
                    className="w-full p-1 rounded font-medium border text-slate-700 bg-white"
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
          );
        })}
      </div>

      {/* Formulario Manual de Alta */}
      <div className="bg-blue-50/40 p-5 rounded-xl border border-dashed border-blue-300 space-y-3">
        <label className="text-xs font-bold text-blue-900 uppercase tracking-wider block">
          + Agregar Requisito de Usuario Manual (Human-in-the-Loop)
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Nombre de la funcionalidad..."
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            className="sm:col-span-2 text-xs p-2 bg-white border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            placeholder="Fuente..."
            value={nuevaFuente}
            onChange={(e) => setNuevaFuente(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
          />
        </div>

        <textarea
          rows={2}
          placeholder="Descripción detallada del comportamiento requerido..."
          value={nuevaDescripcion}
          onChange={(e) => setNuevaDescripcion(e.target.value)}
          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
        />

        {/* Selectores de Estabilidad y Tipo para usar setNuevaEstabilidad y setNuevoTipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Estabilidad:</label>
            <select
              value={nuevaEstabilidad}
              onChange={(e) => setNuevaEstabilidad(e.target.value as "Transable" | "Intransable")}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700"
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
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-700"
            >
              <option value="Funcional">Funcional</option>
              <option value="No Funcional">No Funcional</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={agregarRequisitoManual}
            className="text-xs font-semibold px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition"
          >
            Añadir RU
          </button>
        </div>
      </div>

      {/* Botón de Consolidación */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleIntentarConsolidar}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>Aprobar y Consolidar Requisitos ({requisitos.length})</span>
          <span>✓</span>
        </button>
      </div>
    </div>
  );
};