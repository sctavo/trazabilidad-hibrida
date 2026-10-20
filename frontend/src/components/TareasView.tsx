import React, { useState } from "react";
import type { TareaItem, HistoriaUsuarioItem } from "../types";
import { TrashIcon, CheckIcon, LockIcon, InfoIcon } from "./Icons";

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

  const husSinTareas = historiasDisponibles.filter(
    (hu) => !tareas.some((t) => t.hu_origen === hu.id)
  );

  const totalHoras = tareas.reduce((acc, t) => acc + (Number(t.estimacion_horas) || 0), 0);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-[#131d35] p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              Etapa 4: Backlog de Tareas Técnicas
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {tareas.length} tareas · {totalHoras} hrs estimadas
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Revisión y Estimación de Tareas 
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 transition"
        >
          ← Volver a Historias
        </button>
      </div>

      {/* Control de Ajuste de Horas por Nivel de Experiencia (Seniority) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131d35] p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
            Calibración de Horas por Experiencia del Equipo
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">
            Ajusta el esfuerzo estimado según la experiencia de los desarrolladores asignados:
          </span>
        </div>

        <div className="flex bg-[#0f172a] p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => cambiarNivelSeniority("principiante")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              nivelSeniority === "principiante"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Principiante</span>
            <span className="text-[10px] opacity-80">(100%)</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarNivelSeniority("intermedio")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              nivelSeniority === "intermedio"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Intermedio</span>
            <span className="text-[10px] opacity-80">(-30%)</span>
          </button>
          <button
            type="button"
            onClick={() => cambiarNivelSeniority("avanzado")}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              nivelSeniority === "avanzado"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span>Avanzado</span>
            <span className="text-[10px] opacity-80">(-55%)</span>
          </button>
        </div>
      </div>

      {/* Banner de HUs nuevas sin tareas asignadas */}
      {husSinTareas.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
            <InfoIcon className="w-4 h-4 text-amber-400" />
            <span>Historias de Usuario sin tareas técnicas asociadas:</span>
          </div>
          <div className="space-y-2">
            {husSinTareas.map((hu) => (
              <div
                key={hu.id}
                className="flex items-center justify-between bg-[#131d35] p-3 rounded-xl border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  <span className="font-bold text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-lg border border-purple-500/30 shrink-0">
                    {hu.id}
                  </span>
                  <span className="font-semibold text-slate-200 truncate">{hu.titulo}</span>
                </div>
                <button
                  type="button"
                  disabled={regenerandoHuId === hu.id}
                  onClick={() => handleGenerarTareasPorHU(hu.id)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition shrink-0 disabled:opacity-50"
                >
                  {regenerandoHuId === hu.id ? "Generando..." : "Derivar tareas con IA"}
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

          let estiloContenedor = "border-slate-800 hover:border-slate-700";
          if (huPadreFueModificada) {
            estiloContenedor = "border-amber-500/70 bg-amber-500/10 ring-1 ring-amber-500/30";
          } else if (huPadreFueSincronizada) {
            estiloContenedor = "border-teal-500/70 bg-teal-500/10 ring-1 ring-teal-500/30";
          }

          return (
            <div
              key={task.id}
              className={`bg-[#131d35] p-4 sm:p-5 rounded-2xl border shadow-xl flex flex-col md:flex-row md:items-center gap-3.5 transition-all ${estiloContenedor}`}
            >
              <div className="flex items-center gap-2 md:w-60 shrink-0">
                <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  {task.id}
                </span>
                <span className="text-xs font-semibold text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-lg border border-purple-500/30">
                  {task.hu_origen}
                </span>
                <select
                  value={task.tipo}
                  onChange={(e) => actualizarCampo(index, "tipo", e.target.value)}
                  className="text-[11px] font-semibold px-2 py-1 rounded-lg border bg-[#0f172a] border-slate-700 text-slate-300"
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
                    className="w-full text-xs font-semibold text-white border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-none py-0.5 bg-transparent"
                  />

                  {huPadreFueModificada && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 shrink-0">
                      HU {task.hu_origen} desactualizada
                    </span>
                  )}

                  {!huPadreFueModificada && huPadreFueSincronizada && (
                    <span className="text-[10px] font-bold text-teal-300 bg-teal-500/15 px-2 py-0.5 rounded border border-teal-500/30 shrink-0 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3 text-teal-300" />
                      <span>Sincronizado</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={task.descripcion}
                  onChange={(e) => actualizarCampo(index, "descripcion", e.target.value)}
                  className="w-full text-[11px] text-slate-400 bg-[#0f172a] p-2 rounded-lg border border-slate-800 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {huPadreFueModificada && (
                  <button
                    type="button"
                    disabled={regenerandoHuId === task.hu_origen}
                    onClick={() => handleGenerarTareasPorHU(task.hu_origen)}
                    className="text-[10px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-lg transition shrink-0"
                  >
                    {regenerandoHuId === task.hu_origen ? "..." : `Re-derivar ${task.hu_origen}`}
                  </button>
                )}

                <div className="flex items-center gap-1 bg-[#0f172a] px-2.5 py-1 rounded-lg border border-slate-700">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={task.estimacion_horas}
                    onChange={(e) => actualizarCampo(index, "estimacion_horas", Number(e.target.value))}
                    className="w-10 text-xs font-bold text-center bg-transparent focus:outline-none text-white"
                  />
                  <span className="text-[11px] text-slate-400">hrs</span>
                </div>

                <button
                  onClick={() => eliminarTarea(index)}
                  title="Descartar tarea"
                  className="text-xs text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/10 rounded-lg transition"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#131d35] p-6 rounded-2xl border border-dashed border-slate-700 space-y-3.5">
        <label className="text-xs font-bold text-sky-400 uppercase tracking-wider block">
          + Agregar Tarea Técnica Manual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <select
            value={nuevaHuOrigen}
            onChange={(e) => setNuevaHuOrigen(e.target.value)}
            className="text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl"
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
            className="sm:col-span-2 text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl placeholder-slate-500"
          />
          <div className="flex gap-1.5">
            <select
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value as TareaItem["tipo"])}
              className="text-xs p-2.5 bg-[#0f172a] text-white border border-slate-700 rounded-xl flex-1"
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
              className="w-14 text-xs p-2.5 text-center bg-[#0f172a] text-white border border-slate-700 rounded-xl font-bold"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={agregarTareaManual}
            className="text-xs font-semibold px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
          >
            Añadir Tarea
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => setMostrarModalDisclaimer(true)}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
        >
          <span>Consolidar Plan de Trabajo ({tareas.length} tareas · {totalHoras} hrs · {nivelSeniority})</span>
          <CheckIcon className="w-4 h-4 text-teal-300" />
        </button>
      </div>

      {/* Modal Disclaimer de Cierre de Especificación */}
      {mostrarModalDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#131d35] border border-slate-700 shadow-2xl rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-sky-400 flex items-center justify-center shrink-0">
                <LockIcon className="w-6 h-6 text-sky-400" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                  Cierre de Etapa 4
                </span>
                <h3 className="text-base font-bold text-white">
                  ¿Confirmar y consolidar especificación de artefactos?
                </h3>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300 leading-relaxed">
              <p>
                Has completado las <strong>4 etapas del ciclo de especificación</strong> (Documento, Requisitos de Usuario, Historias de Usuario y Tareas Técnicas).
              </p>
              <p className="font-semibold text-white">
                Al confirmar este paso, los artefactos quedarán consolidados y bloqueados, dando paso formal al módulo de <strong>Plan de Trabajo y Carta Gantt</strong>.
              </p>
              <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-[#131d35] rounded-xl border border-slate-800">
                  <span className="text-base font-black text-sky-400 block">{historiasDisponibles.length}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">HUs</span>
                </div>
                <div className="p-2.5 bg-[#131d35] rounded-xl border border-slate-800">
                  <span className="text-base font-black text-purple-400 block">{tareas.length}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Tareas</span>
                </div>
                <div className="p-2.5 bg-[#131d35] rounded-xl border border-slate-800">
                  <span className="text-base font-black text-teal-400 block">{totalHoras} hrs</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{nivelSeniority}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMostrarModalDisclaimer(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
              >
                Deseo revisar artefactos
              </button>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalDisclaimer(false);
                  onConfirmar(tareas);
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-4 h-4 text-teal-300" />
                <span>Confirmar y Pasar al Plan de Trabajo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
