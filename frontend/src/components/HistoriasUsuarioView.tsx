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
  
  // Conjunto con los IDs de las Historias de Usuario que han sido editadas manualmente
  const [huModificadas, setHuModificadas] = useState<Set<string>>(new Set());
  
  // Estados de carga por IA
  const [criterioLoadingId, setCriterioLoadingId] = useState<string | null>(null);
  const [generandoCriteriosNuevo, setGenerandoCriteriosNuevo] = useState(false);

  // Formulario manual de creación
  const [nuevoRfOrigen, setNuevoRfOrigen] = useState(requisitosDisponibles[0]?.id || "RU1");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoRol, setNuevoRol] = useState("usuario analista");
  const [nuevoQuiero, setNuevoQuiero] = useState("");
  const [nuevoPara, setNuevoPara] = useState("");
  
  // Opción de criterios en la creación: "ia" o "manual"
  const [modoCriterioNuevo, setModoCriterioNuevo] = useState<"ia" | "manual">("ia");
  const [nuevoCriterioManual, setNuevoCriterioManual] = useState("");
  const [criteriosGeneradosNuevo, setCriteriosGeneradosNuevo] = useState<string[]>([]);

  // Actualizar campo de una HU existente y registrar que fue modificada
  const actualizarCampo = (index: number, campo: keyof HistoriaUsuarioItem, valor: any) => {
    const actualizadas = [...historias];
    const hu = actualizadas[index];
    actualizadas[index] = { ...hu, [campo]: valor };
    setHistorias(actualizadas);

    // Si se modifica la redacción ágil, marcamos la HU como modificada
    if (campo !== "criterios_aceptacion") {
      setHuModificadas((prev) => new Set(prev).add(hu.id));
    }
  };

  const eliminarHistoria = (index: number) => {
    const id = historias[index].id;
    setHistorias(historias.filter((_, i) => i !== index));
    setHuModificadas((prev) => {
      const nuevoSet = new Set(prev);
      nuevoSet.delete(id);
      return nuevoSet;
    });
  };

  // Regenerar criterios con IA para una HU existente modificada
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
      alert(err.message || "No fue posible regenerar los criterios con IA.");
    } finally {
      setCriterioLoadingId(null);
    }
  };

  // Generar criterios con IA para la nueva HU que se está creando
  const handleGenerarCriteriosNuevaHU = async () => {
    if (!nuevoTitulo.trim() || !nuevoQuiero.trim()) {
      alert("Para que la IA genere criterios coherentes, escribe al menos el título y el deseo (Quiero).");
      return;
    }

    setGenerandoCriteriosNuevo(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/criterios-hu/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `HU-${String(historias.length + 1).padStart(2, "0")}`,
          titulo: nuevoTitulo,
          rol: nuevoRol,
          quiero: nuevoQuiero,
          para: nuevoPara || "operatividad del sistema",
        }),
      });

      if (!response.ok) throw new Error("Error al consultar el servicio de IA");

      const data = await response.json();
      setCriteriosGeneradosNuevo(data.criterios_aceptacion);
    } catch (err: any) {
      alert(err.message || "Error al generar criterios automáticos");
    } finally {
      setGenerandoCriteriosNuevo(false);
    }
  };

  // Confirmar y agregar la HU al catálogo
  const agregarHistoriaManual = () => {
    if (!nuevoTitulo.trim() || !nuevoQuiero.trim()) {
      alert("Por favor indica al menos el título y el comportamiento deseado (Quiero).");
      return;
    }

    let criteriosFinales: string[] = [];

    if (modoCriterioNuevo === "ia") {
      if (criteriosGeneradosNuevo.length === 0) {
        alert("Genera primero los criterios con IA pulsando el botón '✨ Generar criterios con IA' o cambia a ingreso manual.");
        return;
      }
      criteriosFinales = criteriosGeneradosNuevo;
    } else {
      criteriosFinales = nuevoCriterioManual.trim()
        ? nuevoCriterioManual.split("\n").filter((c) => c.trim().length > 0)
        : ["Criterio de aceptación estándar verificado."];
    }

    const nuevoId = `HU-${String(historias.length + 1).padStart(2, "0")}`;
    const nuevaHu: HistoriaUsuarioItem = {
      id: nuevoId,
      rf_origen: nuevoRfOrigen,
      titulo: nuevoTitulo.trim(),
      rol: nuevoRol.trim(),
      quiero: nuevoQuiero.trim(),
      para: nuevoPara.trim() || "operatividad del sistema",
      criterios_aceptacion: criteriosFinales,
    };

    setHistorias([...historias, nuevaHu]);

    // Limpiar formulario
    setNuevoTitulo("");
    setNuevoQuiero("");
    setNuevoPara("");
    setNuevoCriterioManual("");
    setCriteriosGeneradosNuevo([]);
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

      {/* Listado de Historias de Usuario */}
      <div className="space-y-4">
        {historias.map((hu, index) => {
          const fueModificada = huModificadas.has(hu.id);

          return (
            <div
              key={hu.id}
              className={`bg-white p-5 rounded-xl border transition-all shadow-xs space-y-3 ${
                fueModificada ? "border-purple-300 ring-1 ring-purple-100" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200 shrink-0">
                    {hu.id}
                  </span>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                    Origen: {hu.rf_origen}
                  </span>
                  {fueModificada && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                      Modificada
                    </span>
                  )}
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

              {/* Criterios de Aceptación: el botón de regeneración SOLO aparece si fue modificada */}
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
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-100/70 hover:bg-purple-200/70 border border-purple-300 px-2.5 py-1 rounded transition disabled:opacity-50 flex items-center gap-1 shadow-2xs"
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

      {/* Formulario de Alta con opción dual de Criterios (Automáticos con IA vs Manuales) */}
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
              placeholder="Ej: Exportación de reportes de auditoría"
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
              placeholder="Acción..."
              value={nuevoQuiero}
              onChange={(e) => setNuevoQuiero(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Para:</label>
            <textarea
              rows={2}
              placeholder="Beneficio..."
              value={nuevoPara}
              onChange={(e) => setNuevoPara(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Sección de Criterios con elección: IA o Manual */}
        <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              Definición de Criterios de Aceptación:
            </span>

            {/* Toggle de Modo */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModoCriterioNuevo("ia")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded transition ${
                  modoCriterioNuevo === "ia"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ✨ Generar con IA
              </button>
              <button
                type="button"
                onClick={() => setModoCriterioNuevo("manual")}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded transition ${
                  modoCriterioNuevo === "manual"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                ✏️ Ingreso Manual
              </button>
            </div>
          </div>

          {modoCriterioNuevo === "ia" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  La IA derivará criterios atómicos a partir del título, rol y acción definidos arriba.
                </p>
                <button
                  type="button"
                  disabled={generandoCriteriosNuevo}
                  onClick={handleGenerarCriteriosNuevaHU}
                  className="text-xs font-semibold px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition disabled:opacity-50 flex items-center gap-1 shrink-0"
                >
                  {generandoCriteriosNuevo ? (
                    <>
                      <span className="animate-spin inline-block w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full mr-1"></span>
                      Consultando Gemini...
                    </>
                  ) : (
                    <>✨ Generar criterios automáticos</>
                  )}
                </button>
              </div>

              {criteriosGeneradosNuevo.length > 0 && (
                <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-800 uppercase block mb-1">
                    Criterios sugeridos por la IA:
                  </span>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1">
                    {criteriosGeneradosNuevo.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div>
              <textarea
                rows={3}
                placeholder="Escribe un criterio por línea:&#10;- El sistema valida credenciales...&#10;- Se genera registro en log..."
                value={nuevoCriterioManual}
                onChange={(e) => setNuevoCriterioManual(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          )}
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