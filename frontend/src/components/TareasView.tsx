import React, { useState } from "react";
import type { TareaItem, HistoriaUsuarioItem } from "../types";

interface TareasViewProps {
  tareasIniciales: TareaItem[];
  historiasDisponibles: HistoriaUsuarioItem[];
  huModificadasIds: Set<string>;
  onVolver: () => void;
  onConfirmar: (tareasAprobadas: TareaItem[]) => void;
  onTareasActualizadas: (tareas: TareaItem[]) => void;
}

export const TareasView: React.FC<TareasViewProps> = ({
  tareasIniciales,
  historiasDisponibles,
  huModificadasIds,
  onVolver,
  onConfirmar,
  onTareasActualizadas,
}) => {
  const [tareas, setTareas] = useState<TareaItem[]>(tareasIniciales);
  const [regenerandoHuId, setRegenerandoHuId] = useState<string | null>(null);

  // Formulario manual
  const [nuevaHuOrigen, setNuevaHuOrigen] = useState(historiasDisponibles[0]?.id || "HU-01");
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TareaItem["tipo"]>("Backend");
  const [nuevasHoras, setNuevasHoras] = useState(4);

  const actualizarCampo = (index: number, campo: keyof TareaItem, valor: any) => {
    const actualizadas = [...tareas];
    actualizadas[index] = { ...actualizadas[index], [campo]: valor };
    setTareas(actualizadas);
    onTareasActualizadas(actualizadas);
  };

  const eliminarTarea = (index: number) => {
    const actualizadas = tareas.filter((_, i) => i !== index);
    setTareas(actualizadas);
    onTareasActualizadas(actualizadas);
  };

  // Re-derivar e insertar exactamente en el slot de esa HU
  const handleRegenerarTareasPorHU = async (huId: string) => {
    const huObj = historiasDisponibles.find((h) => h.id === huId);
    if (!huObj) return;

    setRegenerandoHuId(huId);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/generar/tareas/regenerar-hu/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(huObj),
      });
      if (!resp.ok) throw new Error("Error al re-derivar tareas.");
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
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRegenerandoHuId(null);
    }
  };

  // Agregar tarea contigua a su HU origen
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
            Revisión y Estimación de Tareas (Human-in-the-Loop)
          </h2>
        </div>

        <button
          onClick={onVolver}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 transition"
        >
          ← Volver a Historias
        </button>
      </div>

      <div className="space-y-3">
        {tareas.map((task, index) => {
          const huPadreFueModificada = huModificadasIds.has(task.hu_origen);

          return (
            <div
              key={task.id}
              className={`bg-white p-4 rounded-xl border shadow-xs flex flex-col md:flex-row md:items-center gap-3 transition-all ${
                huPadreFueModificada
                  ? "border-amber-400 bg-amber-50/15 ring-1 ring-amber-200"
                  : "border-slate-200 hover:border-slate-300"
              }`}
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
                    onClick={() => handleRegenerarTareasPorHU(task.hu_origen)}
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
          onClick={() => onConfirmar(tareas)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
        >
          <span>Consolidar Plan de Trabajo ({tareas.length} tareas · {totalHoras} hrs)</span>
          <span>✓</span>
        </button>
      </div>
    </div>
  );
};