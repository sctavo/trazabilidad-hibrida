import React, { useState } from "react";
import type { HistoriaUsuarioItem, RequisitoItem } from "../types";

interface HistoriasUsuarioViewProps {
  historiasIniciales: HistoriaUsuarioItem[];
  requisitosDisponibles: RequisitoItem[];
  ruModificadosIds: Set<string>;
  onVolver: () => void;
  onConfirmar: (historiasAprobadas: HistoriaUsuarioItem[]) => void;
  onRegistrarHuModificada: (huId: string) => void;
  onHistoriasActualizadas: (historias: HistoriaUsuarioItem[]) => void;
}

export const HistoriasUsuarioView: React.FC<HistoriasUsuarioViewProps> = ({
  historiasIniciales,
  requisitosDisponibles,
  ruModificadosIds,
  onVolver,
  onConfirmar,
  onRegistrarHuModificada,
  onHistoriasActualizadas,
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

  const eliminarHistoria = (index: number) => {
    const id = historias[index].id;
    const actualizadas = historias.filter((_, i) => i !== index);
    setHistorias(actualizadas);
    onHistoriasActualizadas(actualizadas);
    onRegistrarHuModificada(id);
  };

  // Re-derivar en el espacio exacto donde estaban las HUs de este RU
  const handleRegenerarHUsPorRU = async (ruId: string) => {
    const ruObj = requisitosDisponibles.find((r) => r.id === ruId);
    if (!ruObj) return;

    setRegenerandoRuId(ruId);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/generar/historias-usuario/regenerar-ru/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ruObj),
      });
      if (!resp.ok) throw new Error("Error al regenerar historias para este requisito.");
      const data = await resp.json();
      const nuevasHUsParaEsteRu: HistoriaUsuarioItem[] = data.historias_usuario;

      // 1. Encontrar el índice donde inicia el bloque de este RU
      const primerIndice = historias.findIndex((h) => h.rf_origen === ruId);

      let combinadas: HistoriaUsuarioItem[] = [];
      if (primerIndice !== -1) {
        // Elementos previos al bloque
        const antes = historias.slice(0, primerIndice);
        // Elementos posteriores excluyendo las HUs que pertenecían al RU regenerado
        const despues = historias.slice(primerIndice).filter((h) => h.rf_origen !== ruId);
        // Se insertan en su posición original exacta
        combinadas = [...antes, ...nuevasHUsParaEsteRu, ...despues];
      } else {
        // Si no existían HUs previas de este RU, ubicar según el orden de requisitosDisponibles
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

      // Re-numeración correlativa limpia (HU-01, HU-02...)
      const normalizadas = combinadas.map((h, i) => ({
        ...h,
        id: `HU-${String(i + 1).padStart(2, "0")}`,
      }));

      setHistorias(normalizadas);
      onHistoriasActualizadas(normalizadas);

      // Notificar cambio sobre las historias de este RU
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

  // Agregar HU manual inmediatamente después del grupo de su RU origen
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

    // Buscar el último índice que comparte el mismo RU origen
    let ultimoIndiceMismoRu = -1;
    for (let i = historias.length - 1; i >= 0; i--) {
      if (historias[i].rf_origen === nuevoRfOrigen) {
        ultimoIndiceMismoRu = i;
        break;
      }
    }

    let actualizadas: HistoriaUsuarioItem[] = [];
    if (ultimoIndiceMismoRu !== -1) {
      // Se inserta contiguo a sus hermanas de RU
      actualizadas = [
        ...historias.slice(0, ultimoIndiceMismoRu + 1),
        nuevaHu,
        ...historias.slice(ultimoIndiceMismoRu + 1),
      ];
    } else {
      // Si es el primer elemento para ese RU, colocarlo respetando el orden del RU
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
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              Etapa 3: Historias de Usuario
            </span>
            <span className="text-xs text-slate-500 font-medium">{historias.length} historias</span>
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

      <div className="space-y-4">
        {historias.map((hu, index) => {
          const fueModificada = huModificadas.has(hu.id);
          const padreFueModificado = ruModificadosIds.has(hu.rf_origen);

          return (
            <div
              key={hu.id}
              className={`bg-white p-5 rounded-xl border transition-all shadow-xs space-y-3 ${
                padreFueModificado
                  ? "border-amber-400 bg-amber-50/15 ring-1 ring-amber-200"
                  : fueModificada
                  ? "border-purple-300 ring-1 ring-purple-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200 shrink-0">
                    {hu.id}
                  </span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                    Origen: {hu.rf_origen}
                  </span>

                  {padreFueModificado && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                      ⚠️ Requisito {hu.rf_origen} modificado
                    </span>
                  )}

                  <input
                    type="text"
                    value={hu.titulo}
                    onChange={(e) => actualizarCampo(index, "titulo", e.target.value)}
                    className="font-bold text-sm text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-purple-500 focus:outline-none px-1 flex-1 min-w-0 w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {padreFueModificado && (
                    <button
                      type="button"
                      disabled={regenerandoRuId === hu.rf_origen}
                      onClick={() => handleRegenerarHUsPorRU(hu.rf_origen)}
                      className="text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-400 px-2.5 py-1 rounded-lg transition disabled:opacity-50 shrink-0"
                    >
                      {regenerandoRuId === hu.rf_origen ? "Re-derivando..." : `🔄 Re-derivar ${hu.rf_origen}`}
                    </button>
                  )}

                  <button
                    onClick={() => eliminarHistoria(index)}
                    title="Descartar Historia"
                    className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition shrink-0"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-1">Como:</span>
                  <input
                    type="text"
                    value={hu.rol}
                    onChange={(e) => actualizarCampo(index, "rol", e.target.value)}
                    className="w-full bg-white p-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-1">Quiero:</span>
                  <textarea
                    rows={2}
                    value={hu.quiero}
                    onChange={(e) => actualizarCampo(index, "quiero", e.target.value)}
                    className="w-full bg-white p-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-500 block mb-1">Para:</span>
                  <textarea
                    rows={2}
                    value={hu.para}
                    onChange={(e) => actualizarCampo(index, "para", e.target.value)}
                    className="w-full bg-white p-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Criterios de Aceptación:
                  </span>
                  {fueModificada && (
                    <button
                      type="button"
                      disabled={criterioLoadingId === hu.id}
                      onClick={() => handleRegenerarCriteriosIA(index)}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-100 border border-purple-300 px-2.5 py-1 rounded transition disabled:opacity-50"
                    >
                      {criterioLoadingId === hu.id ? "Actualizando..." : "✨ Regenerar criterios con IA"}
                    </button>
                  )}
                </div>

                <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                  {hu.criterios_aceptacion.map((criterio, i) => (
                    <li key={i}>{criterio}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-purple-50/40 p-5 rounded-xl border border-dashed border-purple-300 space-y-3">
        <label className="text-xs font-bold text-purple-900 uppercase tracking-wider block">
          + Agregar Historia de Usuario Manual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={nuevoRfOrigen}
            onChange={(e) => setNuevoRfOrigen(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
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
            className="sm:col-span-2 text-xs p-2 bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <input
            type="text"
            value={nuevoRol}
            onChange={(e) => setNuevoRol(e.target.value)}
            className="p-2 bg-white border border-slate-300 rounded-lg"
          />
          <textarea
            rows={2}
            placeholder="Acción..."
            value={nuevoQuiero}
            onChange={(e) => setNuevoQuiero(e.target.value)}
            className="p-2 bg-white border border-slate-300 rounded-lg"
          />
          <textarea
            rows={2}
            placeholder="Beneficio..."
            value={nuevoPara}
            onChange={(e) => setNuevoPara(e.target.value)}
            className="p-2 bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <textarea
          rows={2}
          placeholder="Criterios (uno por línea)..."
          value={nuevoCriterioManual}
          onChange={(e) => setNuevoCriterioManual(e.target.value)}
          className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
        />
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