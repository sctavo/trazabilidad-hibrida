import React, { useState, useRef } from "react";
import { MODELOS_IA_CATALOGO } from "../types";
import { LockIcon } from "./Icons";

interface IngestaViewProps {
  modeloSeleccionado: string;
  modeloBloqueado?: boolean;
  onVolverPaso0?: () => void;
  onSolicitarGeneracion: (texto: string) => void;
}

export const IngestaView: React.FC<IngestaViewProps> = ({
  modeloSeleccionado,
  modeloBloqueado = false,
  onVolverPaso0,
  onSolicitarGeneracion,
}) => {
  const [tab, setTab] = useState<"archivo" | "manual">("archivo");
  const [loadingArchivo, setLoadingArchivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [nombreOrigen, setNombreOrigen] = useState<string>("");
  const [textoBase, setTextoBase] = useState<string>("");
  const [textoManual, setTextoManual] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const modeloActual =
    MODELOS_IA_CATALOGO.find((m) => m.id === modeloSeleccionado) || MODELOS_IA_CATALOGO[0];

  const handleUpload = async (file: File) => {
    const validExtensions = ["text/plain", "application/pdf"];
    if (!validExtensions.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      setError("Formato no soportado. Selecciona un archivo .pdf o .txt");
      return;
    }

    setLoadingArchivo(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/api/v1/upload/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Error al procesar el archivo");
      }

      const result = await response.json();
      setNombreOrigen(result.archivo);
      setTextoBase(result.contenido);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el backend");
    } finally {
      setLoadingArchivo(false);
    }
  };

  const handleAplicarTextoManual = () => {
    if (!textoManual.trim()) {
      setError("El texto no puede estar vacío.");
      return;
    }
    setError(null);
    setNombreOrigen("Entrada directa (Texto manual)");
    setTextoBase(textoManual);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* 1. Resumen compacto del Motor de IA configurado en Paso 0 */}
      <div className="bg-[#131d35] border border-slate-800 rounded-2xl px-5 py-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-sky-400 shrink-0">
            {modeloActual.icono}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Asistente de IA:
              </span>
              <span className="font-bold text-xs text-white">
                {modeloActual.nombre}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  modeloActual.esRecomendado
                    ? "bg-blue-500/15 text-sky-400 border border-blue-500/30"
                    : "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                }`}
              >
                {modeloActual.badge}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block truncate max-w-md">
              {modeloActual.descripcion}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {modeloBloqueado ? (
            <span className="text-[11px] text-slate-400 font-medium bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5">
              <LockIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Motor fijado</span>
            </span>
          ) : (
            onVolverPaso0 && (
              <button
                type="button"
                onClick={onVolverPaso0}
                className="text-xs text-sky-400 hover:text-white font-semibold px-3 py-1.5 bg-blue-500/10 hover:bg-blue-600 rounded-lg transition border border-blue-500/30 flex items-center gap-1.5"
                title="Cambiar el modelo de inteligencia artificial en el Paso 0"
              >
                <span>←</span>
                <span>Cambiar motor (Paso 0)</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* 2. Pestañas de Ingesta de Documento o Texto */}
      <div className="flex border-b border-slate-800 bg-[#131d35] rounded-t-2xl px-5 pt-3">
        <button
          onClick={() => setTab("archivo")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            tab === "archivo"
              ? "border-blue-500 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Cargar Archivo (PDF / TXT)
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
            tab === "manual"
              ? "border-blue-500 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Pegar / Escribir Texto
        </button>
      </div>

      {tab === "archivo" ? (
        <div
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
          }}
          className={`border-2 border-dashed rounded-b-2xl p-10 flex flex-col items-center justify-center bg-[#131d35] shadow-xl transition-colors ${
            dragActive ? "border-sky-400 bg-blue-500/10" : "border-slate-700/80"
          }`}
        >
          <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 text-sky-400 rounded-2xl mb-3 shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-white">Carga o arrastra el documento fuente</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">Formatos válidos: PDF o TXT</p>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <button
            type="button"
            disabled={loadingArchivo}
            onClick={() => inputRef.current?.click()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
          >
            {loadingArchivo ? "Extrayendo texto con PyMuPDF..." : "Examinar equipo"}
          </button>
        </div>
      ) : (
        <div className="bg-[#131d35] border border-slate-800 rounded-b-2xl p-6 shadow-xl space-y-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Ingreso manual de especificaciones
          </label>
          <textarea
            rows={6}
            value={textoManual}
            onChange={(e) => setTextoManual(e.target.value)}
            placeholder="Pega notas de reuniones, correos o requerimientos libres..."
            className="w-full p-3.5 text-sm text-slate-100 bg-[#0f172a] border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none placeholder-slate-500"
          />
          <button
            onClick={handleAplicarTextoManual}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition"
          >
            Cargar al área de trabajo
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-xl text-xs flex items-center">
          <span className="font-bold mr-1.5">Aviso:</span> {error}
        </div>
      )}

      {textoBase && (
        <div className="bg-[#131d35] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 bg-blue-500/15 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                Base de Conocimiento Activa
              </span>
              <h4 className="text-sm font-semibold text-white mt-1">Fuente: {nombreOrigen}</h4>
            </div>
            <button
              onClick={() => { setTextoBase(""); setTextoManual(""); }}
              className="text-xs text-red-400 hover:text-red-300 font-medium transition"
            >
              Descartar
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Edición previa del texto fuente 
            </label>
            <textarea
              rows={8}
              value={textoBase}
              onChange={(e) => setTextoBase(e.target.value)}
              className="w-full p-4 bg-[#0f172a] border border-slate-700 rounded-xl text-xs font-mono text-slate-200 leading-relaxed focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => onSolicitarGeneracion(textoBase)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition flex items-center gap-2"
            >
              <span>Generar Requisitos de Usuario (RU) con {modeloActual.nombre}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
