export interface RequisitoItem {
  id: string;
  nombre: string;
  descripcion: string;
  fuente: string;
  estabilidad: "Transable" | "Intransable";
  tipo: "Funcional" | "No Funcional";
}

export interface HistoriaUsuarioItem {
  id: string;
  rf_origen: string;
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
  tipo: "Base de Datos" | "Backend" | "Frontend" | "Pruebas" | "DevOps";
  estimacion_horas: number;
}

export interface ProyectoResumen {
  id: string;
  nombre: string;
  descripcion?: string;
  etapa_actual: number;
  creado_en: string;
  actualizado_en?: string;
  total_requisitos: number;
  total_historias: number;
  total_tareas: number;
  total_horas?: number;
  modelo_ia?: string;
}

// Estructuras de datos para el Motor de Calendarización & Carta Gantt
export interface TareaCalendarizada extends TareaItem {
  huTitulo?: string;
  ruOrigen?: string;
  rfOrigen?: string;
  ruNombre?: string;
  fechaInicio: string; // Formato ISO "YYYY-MM-DD"
  fechaFin: string;    // Formato ISO "YYYY-MM-DD"
  duracionDias: number;
  semanaInicio: number; // Índice de semana relativa (1, 2, ...)
  semanaFin: number;
  semanasImpactadas?: number[]; // e.g. [1, 2]
}

export interface SemanaGantt {
  numero: number;
  etiqueta: string;      // "Semana 1", "Semana 2", ...
  rangoTexto: string;    // "06 Oct - 10 Oct"
  fechaInicio: string;   // "YYYY-MM-DD"
  fechaFin: string;      // "YYYY-MM-DD"
  horasTotales: number;
}

export type SemanaInfo = SemanaGantt;

export interface ResultadoCalendarizacion {
  fechaInicioProyecto: string;
  fechaFinProyecto: string;
  totalDiasHabiles: number;
  totalSemanas: number;
  totalHoras: number;
  horasPorSemanaPromedio: number;
  semanas: SemanaGantt[];
  tareasCalendarizadas: TareaCalendarizada[];
}

export interface ParametrosCalendarizacion {
  fechaInicio: string; // "YYYY-MM-DD"
  horasPorDia: number; // 4, 6, 8 (por defecto 8)
  diasPorSemana: number; // 5 (L-V) o 6 (L-S)
  modalidad: "secuencial" | "disciplina"; // Secuencial por HU o Paralelo
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
    icono: "GEM",
    badge: "Recomendado",
    descripcion: "Modelo principal recomendado. Máxima precisión en JSON, rapidez y consistencia formal.",
    colorBorder: "border-blue-500",
    colorBg: "bg-blue-500/15 text-sky-400 border-blue-500/30",
    colorText: "text-sky-400",
  },
  {
    id: "google/gemma-3-4b-it",
    nombre: "Gemma 3 (4B)",
    proveedor: "Google",
    esRecomendado: false,
    icono: "GM3",
    badge: "Experimental",
    descripcion: "Modelo abierto y ligero de Google optimizado para seguimiento estricto de instrucciones.",
    colorBorder: "border-teal-500",
    colorBg: "bg-teal-500/15 text-teal-400 border-teal-500/30",
    colorText: "text-teal-400",
  },
  {
    id: "nex-agi/nex-n2.5-mini",
    nombre: "Nex-Agi N2.5 Mini",
    proveedor: "Nex-Agi",
    esRecomendado: false,
    icono: "NEX",
    badge: "Experimental",
    descripcion: "Modelo experimental enfocado en síntesis rápida de especificaciones.",
    colorBorder: "border-purple-500",
    colorBg: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    colorText: "text-purple-400",
  },
  {
    id: "mistralai/mistral-nemo",
    nombre: "Mistral Nemo",
    proveedor: "Mistral AI",
    esRecomendado: false,
    icono: "MIS",
    badge: "Experimental",
    descripcion: "Excelente comprensión lingüística y razonamiento analítico multilingüe.",
    colorBorder: "border-orange-500",
    colorBg: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    colorText: "text-orange-400",
  },
  {
    id: "amazon/nova-micro-v1",
    nombre: "Amazon Nova-Micro",
    proveedor: "Amazon",
    esRecomendado: false,
    icono: "NOV",
    badge: "Experimental",
    descripcion: "Modelo ultraligero y económico de Amazon para extracción estructurada de texto.",
    colorBorder: "border-amber-500",
    colorBg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    colorText: "text-amber-400",
  },
];

export interface Usuario {
  id: string;
  nombre: string;
  apodo?: string;
  email: string;
  rol?: string;
  email_verificado?: boolean;
}
