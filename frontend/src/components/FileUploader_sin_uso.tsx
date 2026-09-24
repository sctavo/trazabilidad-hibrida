import React, { useState, useRef } from "react";

interface UploadResponse {
  estado: string;
  archivo: string;
  contenido: string;
}

export const FileUploader: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UploadResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    // Validación de extensiones requeridas (HU-01, HU-02)
    const validExtensions = ["text/plain", "application/pdf"];
    if (!validExtensions.includes(file.type) && !file.name.endsWith(".txt") && !file.name.endsWith(".pdf")) {
      setError("Formato no soportado. Por favor sube un archivo .pdf o .txt");
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
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al procesar el documento");
      }

      const result: UploadResponse = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || "Ocurrió un error de conexión con el backend");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Zona de Arrastre / Carga */}
      <div
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors bg-white shadow-sm ${
          dragActive ? "border-blue-500 bg-blue-50/40" : "border-slate-300"
        }`}
      >
        <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-slate-800">
          Arrastra y suelta tu documento
        </h3>
        <p className="text-sm text-slate-500 mt-1 mb-5">
          Formatos soportados: PDF, TXT · hasta 25 MB
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          className="hidden"
          onChange={handleChange}
        />

        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow transition disabled:bg-blue-300"
        >
          {loading ? "Procesando documento..." : "Seleccionar archivo"}
        </button>

        <div className="flex items-center space-x-4 mt-6 text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1">📄 PDF</span>
          <span className="flex items-center gap-1">📝 TXT</span>
        </div>
      </div>

      {/* Indicador de error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center">
          <span className="font-semibold mr-1">Error:</span> {error}
        </div>
      )}

      {/* Visualizador de Contenido Extraído (Base de Conocimiento) */}
      {data && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                {data.estado}
              </span>
              <h4 className="text-base font-bold text-slate-800 mt-2">
                {data.archivo}
              </h4>
            </div>
            <button
              onClick={() => setData(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Limpiar
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Texto extraído (Base de conocimiento inicial)
            </label>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg max-h-60 overflow-y-auto text-xs font-mono text-slate-700 whitespace-pre-wrap">
              {data.contenido}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};