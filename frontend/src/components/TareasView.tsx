import React, { useState } from "react";
import type { TareaItem, HistoriaUsuarioItem } from "../types";

interface TareasViewProps {
  tareasIniciales: TareaItem[];
  historiasDisponibles: HistoriaUsuarioItem[];
  huModificadasIds: Set<string>;
  huSincronizadasIds: Set<string>;
  modeloIa?: string;
  onVolver: () => void;
  onConfirmar: (tareasAprobadas: TareaItem[]) => void;
  onTareasActualizadas: (tareas: TareaItem[]) => void;
  onMarcarHuSincronizada: (huId: string) => void;
}

export const TareasView: React.FC<TareasViewProps> = ({
  tareasIniciales,
  historiasDisponibles,
  huModificadasIds,
  huSincronizadasIds,
  modeloIa = "google/gemini-2.5-flash-lite",
  onVolver,
  onConfirmar,
  onTareasActualizadas,
  onMarcarHuSincronizada,
}) => {
  const [tareas, setTareas] = useState<TareaItem[]>(tareasIniciales);
  const [regenerandoHuId, setRegenerandoHuId] = useState<string | null>(null);

  // Niveles de horas por experiencia (Principiante / Intermedio / Avanzado)
  const [nivelSeniority, setNivelSeniority] = useState<"principiante" | "intermedio" | "avanzado">("principiante");
  const [horasBaseMap, setHorasBaseMap] = useState<Record<string, number>>(() => {
    const mapa: Record<string, number> = {};
    tareasIniciales.forEach((t) => {
      mapa[t.id] = t.estimacion_horas;
    });
    return mapa;
  });

  // Modal disclaimer de finalización de etapas
  const [mostrarModalDisclaimer, setMostrarModalDisclaimer] = useState(false);

  // Formulario manual
  const [nuevaHuOrigen, setNuevaHuOrigen] = useState(historiasDisponibles[0]?.id || "HU-01");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TareaItem["tipo"]>("Backend");
  const [nuevasHoras, setNuevasHoras] = useState(4);

  // Cambiar nivel de horas (Principiante = 100%, Intermedio = ~70%, Avanzado = ~45%)
  const cambiarNivelSeniority = (nuevoNivel: "principiante" | "intermedio" | "avanzado") => {
    setNivelSeniority(nuevoNivel);
    const actualizadas = tareas.map((t) => {
      const base = horasBaseMap[t.id] ?? t.estimacion_horas;
      let nuevasHoras = base;
      if (nuevoNivel === "intermedio") {
        nuevasHoras = Math.max(1, Math.round(base * 0.7));
      } else if (nuevoNivel === "avanzado") {
        nuevasHoras = Math.max(1, Math.round(base * 0.45));
      }
      return { ...t, estimacion_horas: nuevasHoras };
    });
    setTareas(actualizadas);
    onTareasActualizadas(actualizadas);
  };

  const actualizarCampo = (index: number, campo: keyof TareaItem, valor: any) => {
    const actualizadas = [...tareas];
    actualizadas[index] = { ...actualizadas[index], [campo]: valor };
    if (campo === "estimacion_horas") {
      const id = actualizadas[index].id;
      const numValor = Number(valor) || 1;
      let nuevoBase = numValor;
      if (nivelSeniority === "intermedio") nuevoBase = Math.round(numValor / 0.7);
      else if (nivelSeniority === "avanzado") nuevoBase = Math.round(numValor / 0.45);
      setHorasBaseMap((prev) => ({ ...prev, [id]: nuevoBase }));
    }
    setTareas(actualizadas);
    onTareasActualizadas(actualizadas);
  };

  const eliminarTarea = (index: number) => {
    const actualizadas = tareas.filter((_, i) => i !== index);
    const normalizadas = actualizadas.map((t, i) => ({
      ...t,
      id: `TSK-${String(i + 1).padStart(2, "0")}`,
    }));
    setTareas(normalizadas);
    onTareasActualizadas(normalizadas);
  };

  // Re-derivar o generar por primera vez las tareas de una HU específica
  const handleGenerarTareasPorHU = async (huId: string) => {
    const huObj = historiasDisponibles.find((h) => h.id === huId);
    if (!huObj) return;

    setRegenerandoHuId(huId);
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/generar/tareas/regenerar-hu/?modelo=${encodeURIComponent(modeloIa)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(huObj),
      });
      if (!resp.ok) throw new Error("Error al derivar tareas para esta historia.");
      const data = await resp.json();
      const nuevasTareas: TareaItem[] = data.tareas;

      const primerIndice = tareas.findIndex((t) => t.hu_origen === huId);
      let combinadas: TareaItem[] = [];

      if (primerIndice !== -1) {
        const antes = tareas.slice(0, primerIndice);
        const despues = tareas.slice(primerIndice).filter((t) => t.hu_origen !== huId);
        combinadas = [...antes, ...nuevasTareas, ...despues];
      } else {
        const huIdx = historiasDisponibles.findIndex((h) => h.id === huId);
        const siguienteIndice = tareas.findIndex((t) => {
          const tHuIdx = historiasDisponibles.findIndex((h) => h.id === t.hu_origen);
          return tHuIdx > huIdx;
        });

        if (siguienteIndice !== -1) {
          combinadas = [
            ...tareas.slice(0, siguienteIndice),
            ...nuevasTareas,
            ...tareas.slice(siguienteIndice),
          ];
        } else {
          combinadas = [...tareas, ...nuevasTareas];
        }
      }

      const normalizadas = combinadas.map((t, i) => ({
        ...t,
        id: `TSK-${String(i + 1).padStart(2, "0")}`,
      }));

      setTareas(normalizadas);
      onTareasActualizadas(normalizadas);
      onMarcarHuSincronizada(huId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegenerandoHuId(null);
    }
  };

  const agregarTareaManual = () => {
    if (!nuevoTitulo.trim()) {
      alert("Indica el título de la tarea.");
      return;
    }

    const nuevaTarea: TareaItem = {
      id: "TEMP",
      hu_origen: nuevaHuOrigen,
      titulo: nuevoTitulo.trim(),
      descripcion: nuevaDescripcion.trim() || "Implementación técnica según requerimientos.",
      tipo: nuevoTipo,
      estimacion_horas: Number(nuevasHoras) || 1,
    };

    let ultimoIndiceMismaHu = -1;
    for (let i = tareas.length - 1; i >= 0; i--) {
      if (tareas[i].hu_origen === nuevaHuOrigen) {
        ultimoIndiceMismaHu = i;
        break;
      }
    }

    let actualizadas: TareaItem[] = [];
    if (ultimoIndiceMismaHu !== -1) {
      actualizadas = [
        ...tareas.slice(0, ultimoIndiceMismaHu + 1),
        nuevaTarea,
        ...tareas.slice(ultimoIndiceMismaHu + 1),
      ];
    } else {
      const huIdx = historiasDisponibles.findIndex((h) => h.id === nuevaHuOrigen);
      const siguienteIndice = tareas.findIndex((t) => {
        const tHuIdx = historiasDisponibles.findIndex((h) => h.id === t.hu_origen);
        return tHuIdx > huIdx;
      });

      if (siguienteIndice !== -1) {
        actualizadas = [
          ...tareas.slice(0, siguienteIndice),
          nuevaTarea,
          ...tareas.slice(siguienteIndice),
        ];
      } else {
        actualizadas = [...tareas, nuevaTarea];
      }
    }

    const normalizadas = actualizadas.map((t, i) => ({
      ...t,
      id: `TSK-${String(i + 1).padStart(2, "0")}`,
    }));

    setTareas(normalizadas);
    onTareasActualizadas(normalizadas);

    setNuevoTitulo("");
    setNuevaDescripcion("");
    setNuevasHoras(4);
  };

  // Identificar qué HUs no tienen aún ninguna tarea generada
  const husSinTareas = historiasDisponibles.filter(
    (hu) => !tareas.some((t) => t.hu_origen === hu.id)
  );

  const totalHoras = tareas.reduce((acc, t) => acc + (Number(t.estimacion_horas) || 0), 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Etapa 4: Backlog de Tareas Técnicas
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {tareas.length} tareas · {totalHoras} hrs estimadas
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-800 mt-1">
            Revisión y Estimación de Tareas 
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 transition"
        >
          ← Volver a Historias
        </button>
      </div>

      {/* Control de Ajuste de Horas por Nivel de Experiencia (Seniority) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 p-4 rounded-xl border border-indigo-100 shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
            ⚡ Calibración de Horas por Seniority del Equipo
          </span>
          <span className="text-xs text-slate-600 block mt-0.5">
            Ajusta el esfuerzo estimado según la experiencia de los desarrolladores asignados:
          </span>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-indigo-200 shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => cambiarNivelSeniority("principiante")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              nivelSeniority === "principiante"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-indigo-900 hover:bg-slate-50"
            }`}
          >
            <span>🌱</span>
            <span>Principiante</span>
            <span className="text-[10px] opacity-80">(100%)</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarNivelSeniority("intermedio")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              nivelSeniority === "intermedio"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-indigo-900 hover:bg-slate-50"
            }`}
          >
            <span>⚡</span>
            <span>Intermedio</span>
            <span className="text-[10px] opacity-80">(-30%)</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarNivelSeniority("avanzado")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              nivelSeniority === "avanzado"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-indigo-900 hover:bg-slate-50"
            }`}
          >
            <span>🚀</span>
            <span>Avanzado</span>
            <span className="text-[10px] opacity-80">(-55%)</span>
          </button>
        </div>
      </div>

      {/* Banner de HUs nuevas sin tareas asignadas */}
      {husSinTareas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
            <span>⚠️</span>
            <span>Historias de Usuario sin tareas técnicas asociadas:</span>
          </div>
          <div className="space-y-2">
            {husSinTareas.map((hu) => (
              <div
                key={hu.id}
                className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200 text-xs"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 shrink-0">
                    {hu.id}
                  </span>
                  <span className="font-semibold text-slate-800 truncate">{hu.titulo}</span>
                </div>
                <button
                  type="button"
                  disabled={regenerandoHuId === hu.id}
                  onClick={() => handleGenerarTareasPorHU(hu.id)}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition shrink-0 disabled:opacity-50"
                >
                  {regenerandoHuId === hu.id ? "Generando..." : "✨ Derivar tareas con IA"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listado de Tareas */}
      <div className="space-y-3">
        {tareas.map((task, index) => {
          const huPadreFueModificada = huModificadasIds.has(task.hu_origen);
          const huPadreFueSincronizada = huSincronizadasIds.has(task.hu_origen);

          let estiloContenedor = "border-slate-200 hover:border-slate-300";
          if (huPadreFueModificada) {
            estiloContenedor = "border-amber-400 bg-amber-50/15 ring-1 ring-amber-200";
          } else if (huPadreFueSincronizada) {
            estiloContenedor = "border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-200";
          }

          return (
            <div
              key={task.id}
              className={`bg-white p-4 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center gap-3 transition-all ${estiloContenedor}`}
            >
              <div className="flex items-center gap-2 md:w-56 shrink-0">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                  {task.id}
                </span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {task.hu_origen}
                </span>
                <select
                  value={task.tipo}
                  onChange={(e) => actualizarCampo(index, "tipo", e.target.value)}
                  className="text-[11px] font-semibold px-2 py-1 rounded border bg-slate-50 border-slate-200 text-slate-700"
                >
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Base de Datos">Base de Datos</option>
                  <option value="Pruebas">Pruebas</option>
                  <option value="DevOps">DevOps</option>
                </select>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={task.titulo}
                    onChange={(e) => actualizarCampo(index, "titulo", e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-0.5"
                  />

                  {huPadreFueModificada && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shrink-0">
                      ⚠️ HU {task.hu_origen} desactualizada
                    </span>
                  )}

                  {!huPadreFueModificada && huPadreFueSincronizada && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
                      ✓ Sincronizado
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={task.descripcion}
                  onChange={(e) => actualizarCampo(index, "descripcion", e.target.value)}
                  className="w-full text-[11px] text-slate-600 bg-slate-50/70 p-1.5 rounded border border-slate-100 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {huPadreFueModificada && (
                  <button
                    type="button"
                    disabled={regenerandoHuId === task.hu_origen}
                    onClick={() => handleGenerarTareasPorHU(task.hu_origen)}
                    className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-400 px-2 py-1 rounded transition shrink-0"
                  >
                    {regenerandoHuId === task.hu_origen ? "..." : `🔄 Re-derivar ${task.hu_origen}`}
                  </button>
                )}

                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={task.estimacion_horas}
                    onChange={(e) => actualizarCampo(index, "estimacion_horas", Number(e.target.value))}
                    className="w-10 text-xs font-bold text-center bg-transparent focus:outline-none text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500">hrs</span>
                </div>

                <button
                  onClick={() => eliminarTarea(index)}
                  title="Descartar tarea"
                  className="text-xs text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-50/40 p-5 rounded-xl border border-dashed border-indigo-300 space-y-3">
        <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
          + Agregar Tarea Técnica Manual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            value={nuevaHuOrigen}
            onChange={(e) => setNuevaHuOrigen(e.target.value)}
            className="text-xs p-2 bg-white border border-slate-300 rounded-lg"
          >
            {historiasDisponibles.map((hu) => (
              <option key={hu.id} value={hu.id}>
                {hu.id} — {hu.titulo.slice(0, 30)}...
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Título de la tarea..."
            value={nuevoTitulo}
            onChange={(e) => setNuevoTitulo(e.target.value)}
            className="sm:col-span-2 text-xs p-2 bg-white border border-slate-300 rounded-lg"
          />
          <div className="flex gap-1">
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as TareaItem["tipo"])}
              className="text-xs p-2 bg-white border border-slate-300 rounded-lg flex-1"
            >
              <option value="Frontend">Frontend</option>
              <option value="Backend">Backend</option>
              <option value="Base de Datos">BD</option>
              <option value="Pruebas">QA</option>
              <option value="DevOps">DevOps</option>
            </select>
            <input
              type="number"
              min="1"
              value={nuevasHoras}
              onChange={(e) => setNuevasHoras(Number(e.target.value))}
              className="w-12 text-xs p-2 text-center bg-white border border-slate-300 rounded-lg font-bold"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={agregarTareaManual}
            className="text-xs font-semibold px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg transition"
          >
            Añadir Tarea
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => setMostrarModalDisclaimer(true)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>Consolidar Plan de Trabajo ({tareas.length} tareas · {totalHoras} hrs · {nivelSeniority})</span>
          <span>✓</span>
        </button>
      </div>

      {/* Modal Disclaimer de Cierre de Especificación */}
      {mostrarModalDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                ⚠️
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Cierre de Etapa 4
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  ¿Confirmar y consolidar especificación de artefactos?
                </h3>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600 leading-relaxed">
              <p>
                Has completado las <strong>4 etapas del ciclo de especificación</strong> (Documento, Requisitos de Usuario, Historias de Usuario y Tareas Técnicas).
              </p>
              <p className="font-semibold text-slate-800">
                🔒 Al confirmar este paso, los artefactos quedarán consolidados y bloqueados, dando paso formal al módulo de <strong>Plan de Trabajo y Carta Gantt</strong>.
              </p>
              <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-slate-700">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-base font-black text-blue-600 block">{historiasDisponibles.length}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">HUs</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-base font-black text-indigo-600 block">{tareas.length}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Tareas</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-base font-black text-emerald-600 block">{totalHoras} hrs</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{nivelSeniority}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostrarModalDisclaimer(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
              >
                🔍 Deseo revisar artefactos
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalDisclaimer(false);
                  onConfirmar(tareas);
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2"
              >
                <span>✓ Confirmar y Pasar al Plan de Trabajo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};