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

  // Estados para nueva HU manual
  const [nuevoRfOrigen, setNuevoRfOrigen] = useState(
    requisitosDisponibles[0]?.id || "RF01"
  );
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

  const agregarHistoriaManual = () => {
    if (!nuevoTitulo.trim() || !nuevoQuiero.trim()) {
      alert("Por favor ingresa al menos el título y la acción deseada (Quiero).");
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
      para: nuevoPara.trim() || "mejorar la experiencia y operatividad del sistema",
      criterios_aceptacion: criterios,
    };

    setHistorias([...historias, nuevaHu]);

    // Limpiar formulario manual
    setNuevoTitulo("");
    setNuevoQuiero("");
    setNuevoPara("");
    setNuevoCriterio("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Etapa 3: Historias de Usuario
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {historias.length} historias en catálogo
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
            {/* Cabecera con Título full-width corregido */}
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
                title="Descartar Historia de Usuario"
                className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition shrink-0"
              >
                🗑️
              </button>
            </div>

            {/* Estructura Ágil: Rol, Quiero, Para */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Como:</span>
                <input
                  type="text"
                  value={hu.rol}
                  onChange={(e) => actualizarCampo(index, "rol", e.target.value)}
                  className="w-full bg-white p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Quiero:</span>
                <textarea
                  rows={2}
                  value={hu.quiero}
                  onChange={(e) => actualizarCampo(index, "quiero", e.target.value)}
                  className="w-full bg-white p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-500 block mb-1">Para:</span>
                <textarea
                  rows={2}
                  value={hu.para}
                  onChange={(e) => actualizarCampo(index, "para", e.target.value)}
                  className="w-full bg-white p-1.5 rounded border border-slate-200 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Criterios de Aceptación */}
            <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                Criterios de Aceptación:
              </span>
              <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                {hu.criterios_aceptacion.map((criterio, i) => (
                  <li key={i}>{criterio}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario para Agregar Historia de Usuario Manualmente */}
      <div className="bg-purple-50/40 p-5 rounded-xl border border-dashed border-purple-300 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
            + Agregar Historia de Usuario Manual (Human-in-the-Loop)
          </label>
          <span className="text-[11px] text-purple-700">
            Vincula la historia a un requisito formal padre
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Requisito Origen:</label>
            <select
              value={nuevoRfOrigen}
              onChange={(e) => setNuevoRfOrigen(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
            >
              {requisitosDisponibles.map((rf) => (
                <option key={rf.id} value={rf.id}>
                  {rf.id} — {rf.descripcion.slice(0, 45)}...
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Título de la HU:</label>
            <input
              type="text"
              placeholder="Ej: Inicio de sesión con autenticación de dos factores"
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
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
              placeholder="Acción a realizar..."
              value={nuevoQuiero}
              onChange={(e) => setNuevoQuiero(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Para:</label>
            <textarea
              rows={2}
              placeholder="Beneficio o meta..."
              value={nuevoPara}
              onChange={(e) => setNuevoPara(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
            Criterios de Aceptación (un criterio por línea):
          </label>
          <textarea
            rows={2}
            placeholder="El usuario recibe código por SMS&#10;El token vence a los 5 minutos"
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

      {/* Botón de Aprobación */}
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