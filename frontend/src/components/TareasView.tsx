import React, { useState } from "react";
import type { TareaItem, HistoriaUsuarioItem } from "../types";

interface TareasViewProps {
  tareasIniciales: TareaItem[];
  historiasDisponibles: HistoriaUsuarioItem[];
  onVolver: () => void;
  onConfirmar: (tareasAprobadas: TareaItem[]) => void;
}

export const TareasView: React.FC<TareasViewProps> = ({
  tareasIniciales,
  historiasDisponibles,
  onVolver,
  onConfirmar,
}) => {
  const [tareas, setTareas] = useState<TareaItem[]>(tareasIniciales);

  // Formulario manual
  const [nuevaHuOrigen, setNuevaHuOrigen] = useState(
    historiasDisponibles[0]?.id || "HU-01"
  );
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevoTipo, setNuevoTipo] = useState<TareaItem["tipo"]>("Backend");
  const [nuevasHoras, setNuevasHoras] = useState(4);

  const actualizarCampo = (index: number, campo: keyof TareaItem, valor: any) => {
    const actualizadas = [...tareas];
    actualizadas[index] = { ...actualizadas[index], [campo]: valor };
    setTareas(actualizadas);
  };

  const eliminarTarea = (index: number) => {
    setTareas(tareas.filter((_, i) => i !== index));
  };

  const agregarTareaManual = () => {
    if (!nuevoTitulo.trim()) {
      alert("Por favor indica al menos el título de la tarea técnica.");
      return;
    }

    const nuevoId = `TSK-${String(tareas.length + 1).padStart(2, "0")}`;
    const nuevaTarea: TareaItem = {
      id: nuevoId,
      hu_origen: nuevaHuOrigen,
      titulo: nuevoTitulo.trim(),
      descripcion: nuevaDescripcion.trim() || "Implementación técnica según requerimientos.",
      tipo: nuevoTipo,
      estimacion_horas: Number(nuevasHoras) || 1,
    };

    setTareas([...tareas, nuevaTarea]);
    setNuevoTitulo("");
    setNuevaDescripcion("");
    setNuevasHoras(4);
  };

  const totalHoras = tareas.reduce((acc, t) => acc + (Number(t.estimacion_horas) || 0), 0);

  const getBadgeColor = (tipo: TareaItem["tipo"]) => {
    switch (tipo) {
      case "Frontend":
        return "bg-cyan-50 text-cyan-700 border-cyan-200";
      case "Backend":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Base de Datos":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pruebas":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DevOps":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Encabezado */}
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

      {/* Lista de Tareas */}
      <div className="space-y-3">
        {tareas.map((task, index) => (
          <div
            key={task.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center gap-3 transition-all hover:border-slate-300"
          >
            {/* Metadata y selectores */}
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
                className={`text-[11px] font-semibold px-2 py-1 rounded border ${getBadgeColor(task.tipo)}`}
              >
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Base de Datos">Base de Datos</option>
                <option value="Pruebas">Pruebas</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>

            {/* Campos de texto */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <input
                type="text"
                value={task.titulo}
                onChange={(e) => actualizarCampo(index, "titulo", e.target.value)}
                className="w-full text-xs font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-0.5"
              />
              <input
                type="text"
                value={task.descripcion}
                onChange={(e) => actualizarCampo(index, "descripcion", e.target.value)}
                className="w-full text-[11px] text-slate-600 bg-slate-50/70 p-1.5 rounded border border-slate-100 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Estimación en horas */}
            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={task.estimacion_horas}
                  onChange={(e) => actualizarCampo(index, "estimacion_horas", Number(e.target.value))}
                  className="w-12 text-xs font-bold text-center bg-transparent focus:outline-none text-slate-800"
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
        ))}
      </div>

      {/* Agregar Tarea Técnica Manualmente */}
      <div className="bg-indigo-50/40 p-5 rounded-xl border border-dashed border-indigo-300 space-y-3">
        <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
          + Agregar Tarea Técnica Manual (Human-in-the-Loop)
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Historia Origen:</label>
            <select
              value={nuevaHuOrigen}
              onChange={(e) => setNuevaHuOrigen(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            >
              {historiasDisponibles.map((hu) => (
                <option key={hu.id} value={hu.id}>
                  {hu.id} — {hu.titulo.slice(0, 30)}...
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Título de la Tarea:</label>
            <input
              type="text"
              placeholder="Ej: Implementar endpoint de login con JWT"
              value={nuevoTitulo}
              onChange={(e) => setNuevoTitulo(e.target.value)}
              className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600 block mb-1">Tipo y Horas:</label>
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
                className="w-14 text-xs p-2 text-center bg-white border border-slate-300 rounded-lg font-bold"
              />
            </div>
          </div>
        </div>

        <div>
          <input
            type="text"
            placeholder="Descripción técnica adicional..."
            value={nuevaDescripcion}
            onChange={(e) => setNuevaDescripcion(e.target.value)}
            className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={agregarTareaManual}
            className="text-xs font-semibold px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg transition"
          >
            Añadir Tarea al Backlog
          </button>
        </div>
      </div>

      {/* Botón de Cierre de Cadena */}
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