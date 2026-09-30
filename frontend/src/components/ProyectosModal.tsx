import React, { useEffect, useState } from "react";

export interface ProyectoResumen {
  id: string;
  nombre: string;
  descripcion?: string;
  etapa_actual: number;
  creado_en: string;
}

interface ProyectosModalProps {
  token: string;
  proyectoActivoId: string | null;
  onCerrar: () => void;
  onCrearNuevo: () => void;
  onCargarProyecto: (id: string) => void;
}

export const ProyectosModal: React.FC<ProyectosModalProps> = ({
  token,
  proyectoActivoId,
  onCerrar,
  onCrearNuevo,
  onCargarProyecto,
}) => {
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProyectos = async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/proyectos/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Error al obtener la lista de proyectos.");
      const data = await resp.json();
      setProyectos(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  const handleEliminar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Seguro que deseas eliminar este proyecto y toda su trazabilidad?")) return;

    try {
      const resp = await fetch(`http://localhost:8000/api/v1/proyectos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("No se pudo eliminar el proyecto.");
      setProyectos(proyectos.filter((p) => p.id !== id));
      if (proyectoActivoId === id) {
        onCrearNuevo();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Módulo de Proyectos (HU-23)
            </span>
            <h3 className="text-lg font-bold text-slate-800 mt-1">Mis Proyectos de Trazabilidad</h3>
          </div>
          <button
            onClick={onCerrar}
            className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2"
          >
            ✕
          </button>
        </div>

        {/* Botón Nuevo Proyecto */}
        <button
          onClick={() => {
            onCrearNuevo();
            onCerrar();
          }}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
        >
          <span>+ Crear Nuevo Proyecto (Lienzo en Blanco)</span>
        </button>

        {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>}

        {/* Lista de Proyectos del usuario */}
        <div className="max-h-72 overflow-y-auto space-y-2">
          {cargando ? (
            <p className="text-xs text-slate-400 text-center py-6">Cargando tus proyectos desde PostgreSQL...</p>
          ) : proyectos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Aún no tienes proyectos guardados en esta cuenta.</p>
          ) : (
            proyectos.map((p) => {
              const esActivo = p.id === proyectoActivoId;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    onCargarProyecto(p.id);
                    onCerrar();
                  }}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    esActivo
                      ? "border-blue-500 bg-blue-50/40 ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{p.nombre}</span>
                      {esActivo && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.2 rounded-full">
                          En pantalla
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Etapa alcanzada: <strong className="text-slate-700">Etapa {p.etapa_actual}</strong> · Guardado:{" "}
                      {new Date(p.creado_en).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleEliminar(p.id, e)}
                      title="Eliminar proyecto"
                      className="text-xs text-red-400 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition"
                    >
                      🗑️
                    </button>
                    <span className="text-xs text-blue-600 font-semibold">Cargar →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};