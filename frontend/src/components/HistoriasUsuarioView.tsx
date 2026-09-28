import React, { useState } from "react";
import type { HistoriaUsuarioItem, RequisitoItem } from "../types";

interface HistoriasUsuarioViewProps {
  historiasIniciales: HistoriaUsuarioItem[];
  requisitosDisponibles: RequisitoItem[];
  onVolver: () => void;
  onConfirmar: (historiasAprobadas: HistoriaUsuarioItem[]) => void;
}

export const HistoriasUsuarioView: React.FC<HistoriasUsuarioViewProps> = ({
  historiasIniciales,
  requisitosDisponibles,
  onVolver,
  onConfirmar,
}) => {
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>(historiasIniciales);
  const [criterioLoadingId, setCriterioLoadingId] = useState<string | null>(null);

  // Formulario manual
  const [nuevoRfOrigen, setNuevoRfOrigen] = useState(requisitosDisponibles[0]?.id || "RU1");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoRol, setNuevoRol] = useState("usuario analista");
  const [nuevoQuiero, setNuevoQuiero] = useState("");
  const [nuevoPara, setNuevoPara] = useState("");
  const [nuevoCriterio, setNuevoCriterio] = useState("");

  const actualizarCampo = (index: number, campo: keyof HistoriaUsuarioItem, valor: any) => {
    const actualizadas = [...historias];
    actualizadas[index] = { ...actualizadas[index], [campo]: valor };
    setHistorias(actualizadas);
  };

  const eliminarHistoria = (index: number) => {
    setHistorias(historias.filter((_, i) => i !== index));
  };

  // Llamada IA para regenerar criterios de aceptación de una HU editada
  const handleRegenerarCriteriosIA = async (index: number) => {
    const hu = historias[index];
    setCriterioLoadingId(hu.id);

    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/criterios-hu/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: hu.id,
          titulo: hu.titulo,
          rol: hu.rol,
          quiero: hu.quiero,
          para: hu.para,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al obtener nuevos criterios");
      }

      const data = await response.json();
      actualizarCampo(index, "criterios_aceptacion", data.criterios_aceptacion);
    } catch (err: any) {
      alert(err.message || "No fue posible regenerar los criterios con IA.");
    } finally {
      setCriterioLoadingId(null);
    }
  };

  const agregarHistoriaManual = () => {
    if (!nuevoTitulo.trim() || !nuevoQuiero.trim()) {
      alert("Por favor indica al menos el título y el comportamiento deseado (Quiero).");
      return;
    }

    const nuevoId = `HU-${String(historias.length + 1).padStart(2, "0")}`;
    const criterios = nuevoCriterio.trim()
      ? nuevoCriterio.split("\n").filter((c) => c.trim().length > 0)
      : ["Criterio de aceptación estándar verificado."];

    const nuevaHu: HistoriaUsuarioItem = {
      id: nuevoId,
      rf_origen: nuevoRfOrigen,
      titulo: nuevoTitulo.trim(),
      rol: nuevoRol.trim(),
      quiero: nuevoQuiero.trim(),
      para: nuevoPara.trim() || "operatividad del sistema",
      criterios_aceptacion: criterios,
    };

    setHistorias([...historias, nuevaHu]);
    setNuevoTitulo("");
    setNuevoQuiero("");
    setNuevoPara("");
    setNuevoCriterio("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Etapa 3: Historias de Usuario
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {historias.length} historias activas
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mt-1">
            Auditoría y Validación Ágil (Human-in-the-Loop)
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 transition"
        >
          ← Volver a Requisitos
        </button>
      </div>

      {/* Lista de Historias de Usuario */}
      <div className="space-y-4">
        {historias.map((hu, index) => (
          <div
            key={hu.id}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 transition-all hover:border-slate-300"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200 shrink-0">
                  {hu.id}
                </span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                  Origen: {hu.rf_origen}
                </span>
                <input
                  type="text"
                  value={hu.titulo}
                  onChange={(e) => actualizarCampo(index, "titulo", e.target.value)}
                  className="font-bold text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none px-1 flex-1 min-w-0 w-full"
                />
              </div>

              <button
                onClick={() => eliminarHistoria(index)}
                title="Descartar Historia"
                className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition shrink-0"
              >
                🗑️
              </button>
            </div>

            {/* Estructura Ágil */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Como:</span>
                <input
                  type="text"
                  value={hu.rol}
                  onChange={(e) => actualizarCampo(index, "rol", e.target.value)}
                  className="w-full bg-white p-1.5 rounded border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Quiero:</span>
                <textarea
                  rows={2}
                  value={hu.quiero}
                  onChange={(e) => actualizarCampo(index, "quiero", e.target.value)}
                  className="w-full bg-white p-1.5 rounded border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Para:</span>
                <textarea
                  rows={2}
                  value={hu.para}
                  onChange={(e) => actualizarCampo(index, "para", e.target.value)}
                  className="w-full bg-white p-1.5 rounded border border-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Criterios de Aceptación con Regeneración IA */}
            <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Criterios de Aceptación:
                </span>
                <button
                  type="button"
                  disabled={criterioLoadingId === hu.id}
                  onClick={() => handleRegenerarCriteriosIA(index)}
                  className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded transition disabled:opacity-50 flex items-center gap-1"
                >
                  {criterioLoadingId === hu.id ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full mr-1"></span>
                      Actualizando con IA...
                    </>
                  ) : (
                    <>✨ Regenerar criterios con IA</>
                  )}
                </button>
              </div>

              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                {hu.criterios_aceptacion.map((criterio, i) => (
                  <li key={i}>{criterio}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario Manual de HU */}
      <div className="bg-purple-50/40 p-5 rounded-xl border border-dashed border-purple-300 space-y-4">
        <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
          + Agregar Historia de Usuario Manual (Human-in-the-Loop)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">RU Origen:</label>
            <select
              value={nuevoRfOrigen}
              onChange={(e) => setNuevoRfOrigen(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-medium"
            >
              {requisitosDisponibles.map((ru) => (
                <option key={ru.id} value={ru.id}>
                  {ru.id} — {ru.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Título de la HU:</label>
            <input
              type="text"
              placeholder="Ej: Formulario de alta de vehículos"
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Como:</label>
            <input
              type="text"
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Quiero:</label>
            <textarea
              rows={2}
              value={nuevoQuiero}
              onChange={(e) => setNuevoQuiero(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Para:</label>
            <textarea
              rows={2}
              value={nuevoPara}
              onChange={(e) => setNuevoPara(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Criterios de Aceptación (uno por línea):
          </label>
          <textarea
            rows={2}
            placeholder="Criterio 1&#10;Criterio 2"
            value={nuevoCriterio}
            onChange={(e) => setNuevoCriterio(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={agregarHistoriaManual}
            className="text-xs font-semibold px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg transition"
          >
            Añadir Historia al Catálogo
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onConfirmar(historias)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>Aprobar y Consolidar Historias ({historias.length})</span>
          <span>✓</span>
        </button>
      </div>
    </div>
  );
};