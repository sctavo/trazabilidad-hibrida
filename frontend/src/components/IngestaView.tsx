import React, { useState, useRef } from "react";
import type { RequisitoItem } from "../types";

interface IngestaViewProps {
  onGenerarExitoso: (requisitos: RequisitoItem[]) => void;
}

export const IngestaView: React.FC<IngestaViewProps> = ({ onGenerarExitoso }) => {
  const [tab, setTab] = useState<"archivo" | "manual">("archivo");
  const [loadingArchivo, setLoadingArchivo] = useState(false);
  const [loadingGeneracion, setLoadingGeneracion] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [nombreOrigen, setNombreOrigen] = useState<string>("");
  const [textoBase, setTextoBase] = useState<string>("");
  const [textoManual, setTextoManual] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

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

  // Llamada al motor LLM de FastAPI
  const handleLlamarLLM = async () => {
    if (!textoBase.trim()) return;

    setLoadingGeneracion(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:8000/api/v1/generar/requisitos/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoBase }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error al generar requisitos con el LLM");
      }

      const data = await response.json();
      onGenerarExitoso(data.requisitos);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al invocar la API de IA");
    } finally {
      setLoadingGeneracion(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setTab("archivo")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            tab === "archivo"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📁 Cargar Archivo (PDF / TXT)
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${
            tab === "manual"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          ✏️ Pegar / Escribir Texto
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
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-white shadow-xs transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50/40" : "border-slate-300"
          }`}
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">Carga o arrastra el documento fuente</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Formatos válidos: PDF o TXT</p>
          
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
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:bg-blue-300"
          >
            {loadingArchivo ? "Extrayendo texto con PyMuPDF..." : "Examinar equipo"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Ingreso manual de especificaciones
          </label>
          <textarea
            rows={6}
            value={textoManual}
            onChange={(e) => setTextoManual(e.target.value)}
            placeholder="Pega notas de reuniones, correos o requerimientos libres..."
            className="w-full p-3 text-sm text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleAplicarTextoManual}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Cargar al área de trabajo
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center">
          <span className="font-bold mr-1">Aviso:</span> {error}
        </div>
      )}

      {textoBase && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Base de Conocimiento Activa
              </span>
              <h4 className="text-sm font-semibold text-slate-800 mt-1">Fuente: {nombreOrigen}</h4>
            </div>
            <button
              onClick={() => { setTextoBase(""); setTextoManual(""); }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Descartar
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">
              Edición previa del texto fuente (Human-in-the-loop)
            </label>
            <textarea
              rows={8}
              value={textoBase}
              onChange={(e) => setTextoBase(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              disabled={loadingGeneracion}
              onClick={handleLlamarLLM}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <span>{loadingGeneracion ? "Derivando requisitos con Gemini..." : "Generar Requisitos con IA (Gemini)"}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};