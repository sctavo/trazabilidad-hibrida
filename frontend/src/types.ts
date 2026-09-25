export interface RequisitoItem {
  id: string;
  descripcion: string;
  prioridad: "Alta" | "Media" | "Baja";
}

export interface HistoriaUsuarioItem {
  id: string;               // Ej: "HU-01"
  rf_origen: string;        // Ej: "RF01" (Trazabilidad jerárquica RF20)
  titulo: string;
  rol: string;              // "Como [rol]..."
  quiero: string;           // "quiero [acción]..."
  para: string;             // "para [beneficio]..."
  criterios_aceptacion: string[];
}