import React, { useState, useRef } from "react";

interface UploadResponse {
  estado: string;
  archivo: string;
  contenido: string;
}

export const IngestaView: React.FC = () => {
  // Pestaña activa: 'archivo' o 'manual'
  const [tab, setTab] = useState<"archivo" | "manual">("archivo");
  
  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Estado central del texto (Base de conocimiento editable)
  const [nombreOrigen, setNombreOrigen] = useState<string>("");
  const [textoBase, setTextoBase] = useState<string>("");
  const [textoManual, setTextoManual] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Procesar archivo con el Backend (PyMuPDF)
  const handleUpload = async (file: File) => {
    const validExtensions = ["text/plain", "application/pdf"];
    if (!validExtensions.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      setError("Formato no soportado. Por favor selecciona un archivo .pdf o .txt");
      return;
    }

    setLoading(true);
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

      const result: UploadResponse = await response.json();
      setNombreOrigen(result.archivo);
      setTextoBase(result.contenido);
    } catch (err: any) {
      setError(err.message || "Error al comunicar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  // Confirmar texto pegado manualmente
  const handleAplicarTextoManual = () => {
    if (!textoManual.trim()) {
      setError("El texto ingresado no puede estar vacío.");
      return;
    }
    setError(null);
    setNombreOrigen("Entrada directa (Texto libre)");
    setTextoBase(textoManual);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      
      {/* Selector de Modo de Ingesta */}
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

      {/* Contenido según la pestaña */}
      {tab === "archivo" ? (
        <div
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-white shadow-xs transition-colors ${
            dragActive ? "border-blue-500 bg-blue-50/40" : "border-slate-300"
          }`}
        >
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-800">Sube o arrastra el documento de especificación</h3>
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
            disabled={loading}
            onClick={() => inputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:bg-blue-300"
          >
            {loading ? "Extrayendo texto con PyMuPDF..." : "Examinar equipo"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Ingreso manual o transcripción de reuniones
          </label>
          <textarea
            rows={6}
            value={textoManual}
            onChange={(e) => setTextoManual(e.target.value)}
            placeholder="Pega aquí notas de requerimientos, correos del cliente o transcripciones libres..."
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

      {/* Alerta de Error */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center">
          <span className="font-bold mr-1">Aviso:</span> {error}
        </div>
      )}

      {/* Editor Human-in-the-Loop del texto extraído / ingresado */}
      {textoBase && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  Base de Conocimiento Activa
                </span>
                <span className="text-xs text-slate-400">
                  ({textoBase.length} caracteres)
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mt-1">
                Fuente: {nombreOrigen}
              </h4>
            </div>

            <button
              onClick={() => {
                setTextoBase("");
                setTextoManual("");
                setNombreOrigen("");
              }}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Descartar
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Revisión y edición directa (Human-in-the-loop)
              </label>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                ✏️ Puedes editar o borrar texto antes de consultar al LLM
              </span>
            </div>
            <textarea
              rows={10}
              value={textoBase}
              onChange={(e) => setTextoBase(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 leading-relaxed focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Botón de transición hacia el Motor IA */}
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                // Siguiente paso: T0009 (Integración API LLM)
                console.log("Texto listo para enviar a OpenRouter/Gemini:", textoBase);
                alert("Texto consolidado. ¡Listo para procesar con Gemini!");
              }}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <span>Generar Requisitos con IA (Gemini)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};