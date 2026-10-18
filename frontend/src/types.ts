export interface RequisitoItem {
  id: string; // Ej: "RU1"
  nombre: string; // Ej: "Registrar Vehículo"
  descripcion: string;
  fuente: string;
  estabilidad: "Transable" | "Intransable";
  tipo: "Funcional" | "No Funcional";
}

export interface HistoriaUsuarioItem {
  id: string;
  rf_origen: string; // Enlace al RU padre (ej: "RU1")
  titulo: string;
  rol: string;
  quiero: string;
  para: string;
  criterios_aceptacion: string[];
}

export interface TareaItem {
  id: string;
  hu_origen: string;
  titulo: string;
  descripcion: string;
  tipo: "Frontend" | "Backend" | "Base de Datos" | "Pruebas" | "DevOps";
  estimacion_horas: number;
}

export interface ProyectoResumen {
  id: string;
  nombre: string;
  descripcion?: string;
  etapa_actual: number;
  modelo_ia?: string;
  creado_en: string;
  total_requisitos?: number;
  total_historias?: number;
  total_tareas?: number;
}

export interface ModeloIAInfo {
  id: string;
  nombre: string;
  proveedor: string;
  esRecomendado: boolean;
  icono: string;
  badge: string;
  descripcion: string;
  colorBorder: string;
  colorBg: string;
  colorText: string;
}

export const MODELOS_IA_CATALOGO: ModeloIAInfo[] = [
  {
    id: "google/gemini-2.5-flash-lite",
    nombre: "Gemini 2.5 Flash Lite",
    proveedor: "Google",
    esRecomendado: true,
    icono: "⚡",
    badge: "Recomendado",
    descripcion: "Modelo principal recomendado. Máxima precisión en JSON, rapidez y consistencia formal.",
    colorBorder: "border-blue-500",
    colorBg: "bg-blue-50 text-blue-700 border-blue-200",
    colorText: "text-blue-700",
  },
  {
    id: "google/gemma-3-4b-it",
    nombre: "Gemma 3 (4B)",
    proveedor: "Google",
    esRecomendado: false,
    icono: "💎",
    badge: "Experimental",
    descripcion: "Modelo abierto y ligero de Google optimizado para seguimiento estricto de instrucciones.",
    colorBorder: "border-teal-500",
    colorBg: "bg-teal-50 text-teal-700 border-teal-200",
    colorText: "text-teal-700",
  },
  {
    id: "nex-agi/nex-n2.5-mini",
    nombre: "Nex-Agi N2.5 Mini",
    proveedor: "Nex-Agi",
    esRecomendado: false,
    icono: "🚀",
    badge: "Experimental",
    descripcion: "Modelo experimental enfocado en síntesis rápida de especificaciones.",
    colorBorder: "border-purple-500",
    colorBg: "bg-purple-50 text-purple-700 border-purple-200",
    colorText: "text-purple-700",
  },
  {
    id: "mistralai/mistral-nemo",
    nombre: "Mistral Nemo",
    proveedor: "Mistral AI",
    esRecomendado: false,
    icono: "🧠",
    badge: "Experimental",
    descripcion: "Excelente comprensión lingüística y razonamiento analítico multilingüe.",
    colorBorder: "border-orange-500",
    colorBg: "bg-orange-50 text-orange-700 border-orange-200",
    colorText: "text-orange-700",
  },
  {
    id: "amazon/nova-micro-v1",
    nombre: "Amazon Nova-Micro",
    proveedor: "Amazon",
    esRecomendado: false,
    icono: "☁️",
    badge: "Experimental",
    descripcion: "Modelo ultraligero y económico de Amazon para extracción estructurada de texto.",
    colorBorder: "border-amber-500",
    colorBg: "bg-amber-50 text-amber-700 border-amber-200",
    colorText: "text-amber-700",
  },
];