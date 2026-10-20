import React, { useState } from "react";
import type { HistoriaUsuarioItem, RequisitoItem } from "../types";
import { TrashIcon, CheckIcon, CloseIcon } from "./Icons";

interface HistoriasUsuarioViewProps {
  historiasIniciales: HistoriaUsuarioItem[];
  requisitosDisponibles: RequisitoItem[];
  ruModificadosIds: Set<string>;
  ruSincronizadosIds: Set<string>;
  modeloIa?: string;
  onVolver: () => void;
  onConfirmar: (historiasAprobadas: HistoriaUsuarioItem[]) => void;
  onRegistrarHuModificada: (huId: string) => void;
  onHistoriasActualizadas: (historias: HistoriaUsuarioItem[]) => void;
  onMarcarRuSincronizado: (ruId: string) => void;
  onEliminarHistoriaCascade: (huId: string) => void;
}

export const HistoriasUsuarioView: React.FC<HistoriasUsuarioViewProps> = ({
  historiasIniciales,
  requisitosDisponibles,
  ruModificadosIds,
  ruSincronizadosIds,
  modeloIa = "google/gemini-2.5-flash-lite",
  onVolver,
  onConfirmar,
  onRegistrarHuModificada,
  onHistoriasActualizadas,
  onMarcarRuSincronizado,
  onEliminarHistoriaCascade,
}) => {
  const [historias, setHistorias] = useState<HistoriaUsuarioItem[]>(historiasIniciales);
  const [huModificadas, setHuModificadas] = useState<Set<string>>(new Set());
  const [criterioLoadingId, setCriterioLoadingId] = useState<string | null>(null);
  const [regenerandoRuId, setRegenerandoRuId] = useState<string | null>(null);

  // Formulario manual
  const [nuevoRfOrigen, setNuevoRfOrigen] = useState(requisitosDisponibles[0]?.id || "RU1");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoRol, setNuevoRol] = useState("usuario analista");
  const [nuevoQuiero, setNuevoQuiero] = useState("");
  const [nuevoPara, setNuevoPara] = useState("");
  const [nuevoCriterioManual, setNuevoCriterioManual] = useState("");

  const actualizarCampo = (index: number, campo: keyof HistoriaUsuarioItem, valor: any) => {
    const actualizadas = [...historias];
    const hu = actualizadas[index];
    actualizadas[index] = { ...hu, [campo]: valor };
    setHistorias(actualizadas);
    onHistoriasActualizadas(actualizadas);

    if (campo !== "criterios_aceptacion") {
      setHuModificadas((prev) => new Set(prev).add(hu.id));
      onRegistrarHuModificada(hu.id);
    }
  };

  const handleEditarCriterioManual = (huIndex: number, criterioIndex: number, nuevoTexto: string) => {
    const actualizadas = [...historias];
    const hu = actualizadas[huIndex];
    const nuevosCriterios = [...hu.criterios_aceptacion];
    nuevosCriterios[criterioIndex] = nuevoTexto;
    actualizadas[huIndex] = { ...hu, criterios_aceptacion: nuevosCriterios };
    setHistorias(actualizadas);
    onHistoriasActualizadas(actualizadas);
    onRegistrarHuModificada(hu.id);
  };

  const handleEliminarCriterioManual = (huIndex: number, criterioIndex: number) => {
    const actualizadas = [...historias];
    const hu = actualizadas[huIndex];
    const nuevosCriterios = hu.criterios_aceptacion.filter((_, i) => i !== criterioIndex);
    actualizadas[huIndex] = { ...hu, criterios_aceptacion: nuevosCriterios };
    setHistorias(actualizadas);
    onHistoriasActualizadas(actualizadas);
    onRegistrarHuModificada(hu.id);
  };

  const handleAgregarCriterioManual = (huIndex: number) => {
    const actualizadas = [...historias];
    const hu = actualizadas[huIndex];
    const nuevosCriterios = [...hu.criterios_aceptacion, "Nuevo criterio de aceptación comprobable."];
    actualizadas[huIndex] = { ...hu, criterios_aceptacion: nuevosCriterios };
    setHistorias(actualizadas);
    onHistoriasActualizadas(actualizadas);
    onRegistrarHuModificada(hu.id);
  };

  const handleEliminarHistoria = (index: number) => {
    const hu = historias[index];
    const confirmar = window.confirm(
      `¿Deseas eliminar la historia ${hu.id}? Todas las Tareas Técnicas que dependan de ella también serán eliminadas.`
    );
    if (!confirmar) return;

    const actualizadas = historias.filter((_, i) => i !== index);
    const normalizadas = actualizadas.map((h, i) => ({
      ...h,
      id: `HU-${String(i + 1).padStart(2, "0")}`,
    }));

    setHistorias(normalizadas);
    onHistoriasActualizadas(normalizadas);
    onEliminarHistoriaCascade(hu.id);
  };

  const handleRegenerarHUsPorRU = async (ruId: string) => {
    const ruObj = requisitosDisponibles.find((r) => r.id === ruId);
    if (!ruObj) return;

    setRegenerandoRuId(ruId);
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/generar/historias-usuario/regenerar-ru/?modelo=${encodeURIComponent(modeloIa)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruObj),
      });
      if (!resp.ok) throw new Error("Error al regenerar historias para este requisito.");
      const data = await resp.json();
      const nuevasHUsParaEsteRu: HistoriaUsuarioItem[] = data.historias_usuario;

      const primerIndice = historias.findIndex((h) => h.rf_origen === ruId);
      let combinadas: HistoriaUsuarioItem[] = [];

      if (primerIndice !== -1) {
        const antes = historias.slice(0, primerIndice);
        const despues = historias.slice(primerIndice).filter((h) => h.rf_origen !== ruId);
        combinadas = [...antes, ...nuevasHUsParaEsteRu, ...despues];
      } else {
        const ruIdx = requisitosDisponibles.findIndex((r) => r.id === ruId);
        const siguienteIndice = historias.findIndex((h) => {
          const hRuIdx = requisitosDisponibles.findIndex((r) => r.id === h.rf_origen);
          return hRuIdx > ruIdx;
        });

        if (siguienteIndice !== -1) {
          combinadas = [
            ...historias.slice(0, siguienteIndice),
            ...nuevasHUsParaEsteRu,
            ...historias.slice(siguienteIndice),
          ];
        } else {
          combinadas = [...historias, ...nuevasHUsParaEsteRu];
        }
      }

      const normalizadas = combinadas.map((h, i) => ({
        ...h,
        id: `HU-${String(i + 1).padStart(2, "0")}`,
      }));

      setHistorias(normalizadas);
      onHistoriasActualizadas(normalizadas);
      onMarcarRuSincronizado(ruId);

      normalizadas
        .filter((h) => h.rf_origen === ruId)
        .forEach((h) => onRegistrarHuModificada(h.id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegenerandoRuId(null);
    }
  };

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
          modelo: modeloIa,
        }),
      });
      if (!response.ok) throw new Error("Error al obtener nuevos criterios");
      const data = await response.json();
      actualizarCampo(index, "criterios_aceptacion", data.criterios_aceptacion);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCriterioLoadingId(null);
    }
  };

  const agregarHistoriaManual = () => {
    if (!nuevoTitulo.trim() || !nuevoQuiero.trim()) {
      alert("Indica al menos el título y el deseo (Quiero).");
      return;
    }

    const nuevaHu: HistoriaUsuarioItem = {
      id: "TEMP",
      rf_origen: nuevoRfOrigen,
      titulo: nuevoTitulo.trim(),
      rol: nuevoRol.trim(),
      quiero: nuevoQuiero.trim(),
      para: nuevoPara.trim() || "operatividad del sistema",
      criterios_aceptacion: nuevoCriterioManual.trim()
        ? nuevoCriterioManual.split("\n").filter((c) => c.trim().length > 0)
        : ["Criterio estándar verificado."],
    };

    let ultimoIndiceMismoRu = -1;
    for (let i = historias.length - 1; i >= 0; i--) {
      if (historias[i].rf_origen === nuevoRfOrigen) {
        ultimoIndiceMismoRu = i;
        break;
      }
    }

    let actualizadas: HistoriaUsuarioItem[] = [];
    if (ultimoIndiceMismoRu !== -1) {
      actualizadas = [
        ...historias.slice(0, ultimoIndiceMismoRu + 1),
        nuevaHu,
        ...historias.slice(ultimoIndiceMismoRu + 1),
      ];
    } else {
      const ruIdx = requisitosDisponibles.findIndex((r) => r.id === nuevoRfOrigen);
      const siguienteIndice = historias.findIndex((h) => {
        const hRuIdx = requisitosDisponibles.findIndex((r) => r.id === h.rf_origen);
        return hRuIdx > ruIdx;
      });

      if (siguienteIndice !== -1) {
        actualizadas = [
          ...historias.slice(0, siguienteIndice),
          nuevaHu,
          ...historias.slice(siguienteIndice),
        ];
      } else {
        actualizadas = [...historias, nuevaHu];
      }
    }

    const normalizadas = actualizadas.map((h, i) => ({
      ...h,
      id: `HU-${String(i + 1).padStart(2, "0")}`,
    }));

    setHistorias(normalizadas);
    onHistoriasActualizadas(normalizadas);

    const huCreada = normalizadas.find(
      (h) => h.titulo === nuevaHu.titulo && h.rf_origen === nuevaHu.rf_origen
    );
    if (huCreada) {
      onRegistrarHuModificada(huCreada.id);
    }

    setNuevoTitulo("");
    setNuevoQuiero("");
    setNuevoPara("");
    setNuevoCriterioManual("");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-[#131d35] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30">
              Etapa 3: Historias de Usuario
            </span>
            <span className="text-xs text-slate-400 font-medium">{historias.length} historias</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Auditoría y Validación Ágil 
          </h2>
        </div>
        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
        >
          ← Volver a Requisitos
        </button>
      </div>

      <div className="space-y-4">
        {historias.map((hu, index) => {
          const fueModificada = huModificadas.has(hu.id);
          const padreFueModificado = ruModificadosIds.has(hu.rf_origen);
          const padreFueSincronizado = ruSincronizadosIds.has(hu.rf_origen);

          let estiloContenedor = "border-slate-800 hover:border-slate-700";
          if (padreFueModificado) {
            estiloContenedor = "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/30";
          } else if (padreFueSincronizado) {
            estiloContenedor = "border-teal-500/70 bg-teal-500/10 ring-1 ring-teal-500/30";
          } else if (fueModificada) {
            estiloContenedor = "border-purple-500/60 ring-1 ring-purple-500/30";
          }

          return (
            <div
              key={hu.id}
              className={`bg-[#131d35] p-5 sm:p-6 rounded-2xl border transition-all shadow-xl space-y-3.5 ${estiloContenedor}`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-xs font-bold text-purple-300 bg-purple-500/15 px-2.5 py-1 rounded-lg border border-purple-500/30 shrink-0">
                    {hu.id}
                  </span>
                  <span className="text-xs font-semibold text-sky-400 bg-blue-500/15 px-2 py-0.5 rounded-lg border border-blue-500/30 shrink-0">
                    Origen: {hu.rf_origen}
                  </span>

                  {padreFueModificado && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                      Requisito {hu.rf_origen} modificado
                    </span>
                  )}

                  {!padreFueModificado && padreFueSincronizado && (
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30 shrink-0 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3 text-teal-300" />
                      <span>Sincronizado con {hu.rf_origen}</span>
                    </span>
                  )}

                  <input
                    type="text"
                    value={hu.titulo}
                    onChange={(e) => actualizarCampo(index, "titulo", e.target.value)}
                    className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none px-1 flex-1 min-w-0 w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {padreFueModificado && (
                    <button
                      type="button"
                      disabled={regenerandoRuId === hu.rf_origen}
                      onClick={() => handleRegenerarHUsPorRU(hu.rf_origen)}
                      className="text-[11px] font-semibold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-lg transition disabled:opacity-50 shrink-0"
                    >
                      {regenerandoRuId === hu.rf_origen ? "Re-derivando..." : `Re-derivar ${hu.rf_origen}`}
                    </button>
                  )}

                  <button
                    onClick={() => handleEliminarHistoria(index)}
                    title="Descartar Historia y tareas derivadas"
                    className="text-xs text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-400 block mb-1">Como:</span>
                  <input
                    type="text"
                    value={hu.rol}
                    onChange={(e) => actualizarCampo(index, "rol", e.target.value)}
                    className="w-full bg-[#131d35] text-white p-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-400 block mb-1">Quiero:</span>
                  <textarea
                    rows={2}
                    value={hu.quiero}
                    onChange={(e) => actualizarCampo(index, "quiero", e.target.value)}
                    className="w-full bg-[#131d35] text-white p-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-400 block mb-1">Para:</span>
                  <textarea
                    rows={2}
                    value={hu.para}
                    onChange={(e) => actualizarCampo(index, "para", e.target.value)}
                    className="w-full bg-[#131d35] text-white p-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Criterios de Aceptación */}
              <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Criterios de Aceptación:
                  </span>
                  <div className="flex items-center gap-2">
                    {fueModificada && (
                      <button
                        type="button"
                        disabled={criterioLoadingId === hu.id}
                        onClick={() => handleRegenerarCriteriosIA(index)}
                        className="text-[11px] font-semibold text-purple-300 hover:text-white bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg transition disabled:opacity-50"
                      >
                        {criterioLoadingId === hu.id ? "Actualizando..." : "Regenerar criterios con IA"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleAgregarCriterioManual(index)}
                      className="text-[11px] font-semibold text-slate-300 hover:text-white bg-[#131d35] border border-slate-700 px-2.5 py-1 rounded-lg transition hover:bg-slate-800"
                    >
                      + Criterio
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {hu.criterios_aceptacion.map((criterio, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs font-bold">•</span>
                      <input
                        type="text"
                        value={criterio}
                        onChange={(e) => handleEditarCriterioManual(index, i, e.target.value)}
                        className="w-full text-xs text-slate-100 bg-[#131d35] border border-slate-700 rounded-lg px-3 py-1.5 focus:border-blue-500 focus:outline-none"
                        placeholder="Criterio de aceptación comprobable..."
                      />
                      <button
                        type="button"
                        onClick={() => handleEliminarCriterioManual(index, i)}
                        title="Eliminar este criterio"
                        className="text-slate-400 hover:text-red-400 p-1 rounded-lg transition"
                      >
                        <CloseIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {hu.criterios_aceptacion.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic">
                      No hay criterios definidos. Agrega uno con "+ Criterio" o regenera con IA.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#131d35] p-6 rounded-2xl border border-dashed border-slate-700 space-y-3.5">
        <label className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
          + Agregar Historia de Usuario Manual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <select
            value={nuevoRfOrigen}
            onChange={(e) => setNuevoRfOrigen(e.target.value)}
            className="text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl"
          >
            {requisitosDisponibles.map((ru) => (
              <option key={ru.id} value={ru.id}>
                {ru.id} — {ru.nombre}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Título de la historia..."
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            className="sm:col-span-2 text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <input
            type="text"
            value={nuevoRol}
            onChange={(e) => setNuevoRol(e.target.value)}
            className="p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl"
          />
          <textarea
            rows={2}
            placeholder="Acción..."
            value={nuevoQuiero}
            onChange={(e) => setNuevoQuiero(e.target.value)}
            className="p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
          />
          <textarea
            rows={2}
            placeholder="Beneficio..."
            value={nuevoPara}
            onChange={(e) => setNuevoPara(e.target.value)}
            className="p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
          />
        </div>
        <textarea
          rows={2}
          placeholder="Criterios (uno por línea)..."
          value={nuevoCriterioManual}
          onChange={(e) => setNuevoCriterioManual(e.target.value)}
          className="w-full text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
        />
        <div className="flex justify-end">
          <button
            onClick={agregarHistoriaManual}
            className="text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
          >
            Añadir Historia al Catálogo
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onConfirmar(historias)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
        >
          <span>Aprobar y Consolidar Historias ({historias.length})</span>
          <CheckIcon className="w-4 h-4 text-teal-300" />
        </button>
      </div>
    </div>
  );
};
