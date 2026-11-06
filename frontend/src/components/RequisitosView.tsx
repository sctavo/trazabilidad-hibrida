import React, { useState } from "react";
import type { RequisitoItem } from "../types";
import { TrashIcon, CheckIcon, InfoIcon } from "./Icons";

interface RequisitosViewProps {
  requisitosIniciales: RequisitoItem[];
  onVolver: () => void;
  onConfirmar: (requisitosAprobados: RequisitoItem[], ruModificadosIds: string[]) => void;
  onEliminarRequisitoCascade: (ruId: string) => void;
}

export const RequisitosView: React.FC<RequisitosViewProps> = ({
  requisitosIniciales,
  onVolver,
  onConfirmar,
  onEliminarRequisitoCascade,
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

  const handleEliminarRequisito = (index: number) => {
    const ru = requisitos[index];
    const confirmar = window.confirm(
      `¿Deseas eliminar el requisito ${ru.id}? Esta acción eliminará en cascada todas las Historias de Usuario y Tareas Técnicas que dependan de él.`
    );
    if (!confirmar) return;

    const actualizados = requisitos.filter((_, i) => i !== index);
    setRequisitos(actualizados);
    onEliminarRequisitoCascade(ru.id);
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
      descripcion: nuevaDescripcion.trim(),
      fuente: nuevaFuente.trim() || "Entrada manual",
      estabilidad: nuevaEstabilidad,
      tipo: nuevoTipo,
    };
    setRequisitos([...requisitos, nuevoRu]);
    setRuEditados((prev) => new Set(prev).add(nuevoId));

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
      {/* Modal de Alerta de Impacto */}
      {mostrarModalImpacto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#131d35] border border-slate-700 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-2.5 text-amber-400">
              <InfoIcon className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-white">Impacto en Trazabilidad</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Has modificado los requisitos:{" "}
              <strong className="text-white font-semibold">{Array.from(ruEditados).join(", ")}</strong>.
              Las Historias de Usuario y Tareas Técnicas derivadas quedarán marcadas como
              <span className="text-amber-400 font-semibold"> desincronizadas</span> para permitir re-derivación selectiva.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMostrarModalImpacto(false)}
                className="text-xs px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition"
              >
                Revisar cambios
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalImpacto(false);
                  onConfirmar(requisitos, Array.from(ruEditados));
                }}
                className="text-xs px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition"
              >
                Confirmar y Propagar Impacto →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="flex items-center justify-between bg-[#131d35] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              Etapa 2: Requisitos de Usuario (RU)
            </span>
            <span className="text-xs text-slate-400 font-medium">{requisitos.length} requisitos</span>
            {ruEditados.size > 0 && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {ruEditados.size} con cambios pendientes
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Revisión y Aprobación Formal 
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
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
              className={`bg-[#131d35] p-5 sm:p-6 rounded-2xl border shadow-xl space-y-3.5 transition-all ${
                fueEditado
                  ? "border-amber-500/70 ring-1 ring-amber-500/30"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-xs font-black text-sky-400 bg-blue-500/15 px-2.5 py-1 rounded-lg border border-blue-500/30 shrink-0">
                    {req.id}
                  </span>
                  {fueEditado && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                      Modificado
                    </span>
                  )}
                  <input
                    type="text"
                    value={req.nombre}
                    onChange={(e) => actualizarCampo(index, "nombre", e.target.value)}
                    className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 flex-1 min-w-0 w-full"
                  />
                </div>

                <button
                  onClick={() => handleEliminarRequisito(index)}
                  title="Descartar Requisito y derivados en cascada"
                  className="text-xs text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition shrink-0"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Descripción:
                </label>
                <textarea
                  rows={2}
                  value={req.descripcion}
                  onChange={(e) => actualizarCampo(index, "descripcion", e.target.value)}
                  className="w-full text-xs text-slate-200 p-3 bg-[#0f172a] border border-slate-700 rounded-xl focus:border-blue-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-400 block mb-1">Fuente:</span>
                  <input
                    type="text"
                    value={req.fuente}
                    onChange={(e) => actualizarCampo(index, "fuente", e.target.value)}
                    className="w-full bg-[#131d35] text-white p-1.5 rounded-lg border border-slate-700 focus:outline-none"
                  />
                </div>

                <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-400 block mb-1">Estabilidad:</span>
                  <select
                    value={req.estabilidad}
                    onChange={(e) => actualizarCampo(index, "estabilidad", e.target.value)}
                    className="w-full p-1.5 rounded-lg font-medium border border-slate-700 text-slate-200 bg-[#131d35]"
                  >
                    <option value="Transable">Transable (Por defecto)</option>
                    <option value="Intransable">Intransable</option>
                  </select>
                </div>

                <div className="p-2.5 bg-[#0f172a] rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-400 block mb-1">Tipo:</span>
                  <select
                    value={req.tipo}
                    onChange={(e) => actualizarCampo(index, "tipo", e.target.value)}
                    className="w-full bg-[#131d35] p-1.5 rounded-lg border border-slate-700 font-medium text-slate-200"
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

      {/* Formulario Manual */}
      <div className="bg-[#131d35] p-6 rounded-2xl border border-dashed border-slate-700 space-y-3.5">
        <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
          + Agregar Requisito de Usuario Manual 
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            placeholder="Nombre de la funcionalidad..."
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            className="sm:col-span-2 text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
          />
          <input
            type="text"
            placeholder="Fuente..."
            value={nuevaFuente}
            onChange={(e) => setNuevaFuente(e.target.value)}
            className="text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
          />
        </div>

        <textarea
          rows={2}
          placeholder="Descripción detallada del comportamiento requerido..."
          value={nuevaDescripcion}
          onChange={(e) => setNuevaDescripcion(e.target.value)}
          className="w-full text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Estabilidad:</label>
            <select
              value={nuevaEstabilidad}
              onChange={(e) => setNuevaEstabilidad(e.target.value as "Transable" | "Intransable")}
              className="w-full p-2 bg-[#0f172a] border border-slate-700 rounded-xl font-medium text-slate-200"
            >
              <option value="Transable">Transable (Por defecto)</option>
              <option value="Intransable">Intransable</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Tipo:</label>
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as "Funcional" | "No Funcional")}
              className="w-full p-2 bg-[#0f172a] border border-slate-700 rounded-xl font-medium text-slate-200"
            >
              <option value="Funcional">Funcional</option>
              <option value="No Funcional">No Funcional</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={agregarRequisitoManual}
            className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
          >
            Añadir RU
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleIntentarConsolidar}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
        >
          <span>Aprobar y Consolidar Requisitos ({requisitos.length})</span>
          <CheckIcon className="w-4 h-4 text-teal-300" />
        </button>
      </div>
    </div>
  );
};
