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