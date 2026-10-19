import type {
  TareaItem,
  HistoriaUsuarioItem,
  RequisitoItem,
  ParametrosCalendarizacion,
  TareaCalendarizada,
  SemanaGantt,
} from "../types";

export interface ResultadoCalendarizacion {
  tareasCalendarizadas: TareaCalendarizada[];
  semanas: SemanaGantt[];
  fechaInicioProyecto: string;
  fechaFinProyecto: string;
  totalSemanas: number;
  totalDiasHabiles: number;
  totalHoras: number;
  horasPorSemanaPromedio: number;
}

/**
 * Convierte un string YYYY-MM-DD a objeto Date asegurando medianoche local.
 */
export function parseFecha(str: string): Date {
  const partes = str.split("-").map(Number);
  if (partes.length !== 3 || partes.some(isNaN)) {
    return new Date();
  }
  return new Date(partes[0], partes[1] - 1, partes[2], 0, 0, 0, 0);
}

/**
 * Convierte un Date a string YYYY-MM-DD local.
 */
export function formatearFechaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Formatea una fecha para visualización amigable: "20 oct" o "20 oct 2026".
 */
export function formatearFechaCorta(d: Date, incluirAnio = false): string {
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    ...(incluirAnio ? { year: "numeric" } : {}),
  });
}

/**
 * Formato largo para cabecera: "Lunes, 20 de octubre de 2026"
 */
export function formatearFechaLarga(d: Date): string {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Verifica si un día es hábil según la jornada seleccionada (5 o 6 días).
 */
export function esDiaHabil(d: Date, diasPorSemana: number): boolean {
  const diaSemana = d.getDay(); // 0: Dom, 1: Lun, ..., 6: Sáb
  if (diasPorSemana === 5) {
    return diaSemana >= 1 && diaSemana <= 5;
  }
  if (diasPorSemana === 6) {
    return diaSemana >= 1 && diaSemana <= 6;
  }
  return true;
}

/**
 * Si la fecha cae en fin de semana, la avanza al primer día hábil siguiente.
 */
export function asegurarDiaHabil(d: Date, diasPorSemana: number): Date {
  const copia = new Date(d);
  while (!esDiaHabil(copia, diasPorSemana)) {
    copia.setDate(copia.getDate() + 1);
  }
  return copia;
}

/**
 * Avanza la fecha al siguiente día hábil.
 */
export function avanzarSiguienteDiaHabil(d: Date, diasPorSemana: number): Date {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + 1);
  while (!esDiaHabil(copia, diasPorSemana)) {
    copia.setDate(copia.getDate() + 1);
  }
  return copia;
}

/**
 * Obtiene el lunes de la semana a la que pertenece una fecha dada.
 */
export function obtenerLunesDeSemana(d: Date): Date {
  const copia = new Date(d);
  const dia = copia.getDay();
  const diff = copia.getDate() - dia + (dia === 0 ? -6 : 1);
  copia.setDate(diff);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/**
 * Calcula la semana (1-indexada) a la que pertenece una fecha respecto al lunes inicial.
 */
export function calcularIndiceSemana(fecha: Date, lunesBase: Date): number {
  const lunesObjetivo = obtenerLunesDeSemana(fecha);
  const msPorSemana = 7 * 24 * 60 * 60 * 1000;
  const diffMs = lunesObjetivo.getTime() - lunesBase.getTime();
  const indice = Math.floor(diffMs / msPorSemana) + 1;
  return Math.max(1, indice);
}

/**
 * Motor central de calendarización. Distribuye tareas en semanas laborales.
 */
export function calendarizarProyecto(
  tareas: TareaItem[],
  historias: HistoriaUsuarioItem[],
  _requisitos: RequisitoItem[],
  params: ParametrosCalendarizacion
): ResultadoCalendarizacion {
  if (tareas.length === 0) {
    const hoy = new Date();
    return {
      tareasCalendarizadas: [],
      semanas: [],
      fechaInicioProyecto: formatearFechaISO(hoy),
      fechaFinProyecto: formatearFechaISO(hoy),
      totalSemanas: 0,
      totalDiasHabiles: 0,
      totalHoras: 0,
      horasPorSemanaPromedio: 0,
    };
  }

  // Mapa de HUs para metadatos
  const mapaHus = new Map<string, HistoriaUsuarioItem>();
  historias.forEach((h) => {
    mapaHus.set(h.id.toLowerCase(), h);
  });

  const fechaInicioBase = parseFecha(params.fechaInicio);
  const fechaInicioHabil = asegurarDiaHabil(fechaInicioBase, params.diasPorSemana);
  const lunesProyecto = obtenerLunesDeSemana(fechaInicioHabil);

  // Ordenamiento metodológico de tareas para la calendarización:
  // 1. Por Historia de Usuario (orden de aparición)
  // 2. Por disciplina: Base de Datos -> Backend -> Frontend -> Pruebas -> DevOps
  const ordenDisciplinas: Record<string, number> = {
    "Base de Datos": 1,
    Backend: 2,
    Frontend: 3,
    Pruebas: 4,
    DevOps: 5,
  };

  const tareasOrdenadas = [...tareas].sort((a, b) => {
    const idxHuA = historias.findIndex(
      (h) => h.id.toLowerCase() === a.hu_origen.toLowerCase()
    );
    const idxHuB = historias.findIndex(
      (h) => h.id.toLowerCase() === b.hu_origen.toLowerCase()
    );

    if (idxHuA !== idxHuB) {
      return (idxHuA === -1 ? 999 : idxHuA) - (idxHuB === -1 ? 999 : idxHuB);
    }

    const dA = ordenDisciplinas[a.tipo] || 99;
    const dB = ordenDisciplinas[b.tipo] || 99;
    return dA - dB;
  });

  const tareasCalendarizadas: TareaCalendarizada[] = [];
  let cursorFecha = new Date(fechaInicioHabil);

  if (params.modalidad === "disciplina") {
    // Modalidad Paralela: Track Datos/Backend vs Track Frontend
    let cursorTrackBackend = new Date(fechaInicioHabil);
    let cursorTrackFrontend = new Date(fechaInicioHabil);
    let cursorTrackQA = new Date(fechaInicioHabil);

    for (const t of tareasOrdenadas) {
      const huPadre = mapaHus.get(t.hu_origen.toLowerCase());
      const horas = t.estimacion_horas || 8;
      const duracionDias = Math.max(1, Math.ceil(horas / params.horasPorDia));

      let tInicio: Date;
      if (t.tipo === "Base de Datos" || t.tipo === "Backend") {
        tInicio = new Date(cursorTrackBackend);
      } else if (t.tipo === "Frontend") {
        tInicio = new Date(cursorTrackFrontend);
      } else {
        // QA / DevOps va tras el avance de backend, frontend o QA previo
        const maxPrevio = new Date(
          Math.max(
            cursorTrackBackend.getTime(),
            cursorTrackFrontend.getTime(),
            cursorTrackQA.getTime()
          )
        );
        tInicio = new Date(maxPrevio);
      }

      // Calcular fecha fin sumando días hábiles
      let tFin = new Date(tInicio);
      for (let i = 1; i < duracionDias; i++) {
        tFin = avanzarSiguienteDiaHabil(tFin, params.diasPorSemana);
      }

      const sigDia = avanzarSiguienteDiaHabil(tFin, params.diasPorSemana);
      if (t.tipo === "Base de Datos" || t.tipo === "Backend") {
        cursorTrackBackend = sigDia;
      } else if (t.tipo === "Frontend") {
        cursorTrackFrontend = sigDia;
      } else {
        cursorTrackQA = sigDia;
      }

      const semInicio = calcularIndiceSemana(tInicio, lunesProyecto);
      const semFin = calcularIndiceSemana(tFin, lunesProyecto);

      tareasCalendarizadas.push({
        ...t,
        fechaInicio: formatearFechaISO(tInicio),
        fechaFin: formatearFechaISO(tFin),
        duracionDias,
        semanaInicio: semInicio,
        semanaFin: semFin,
        huTitulo: huPadre?.titulo,
        ruOrigen: huPadre?.rf_origen,
      });
    }
  } else {
    // Modalidad Secuencial Ágil (Paso a paso por Backlog)
    for (const t of tareasOrdenadas) {
      const huPadre = mapaHus.get(t.hu_origen.toLowerCase());
      const horas = t.estimacion_horas || 8;
      const duracionDias = Math.max(1, Math.ceil(horas / params.horasPorDia));

      const tInicio = new Date(cursorFecha);

      let tFin = new Date(tInicio);
      for (let i = 1; i < duracionDias; i++) {
        tFin = avanzarSiguienteDiaHabil(tFin, params.diasPorSemana);
      }

      cursorFecha = avanzarSiguienteDiaHabil(tFin, params.diasPorSemana);

      const semInicio = calcularIndiceSemana(tInicio, lunesProyecto);
      const semFin = calcularIndiceSemana(tFin, lunesProyecto);

      tareasCalendarizadas.push({
        ...t,
        fechaInicio: formatearFechaISO(tInicio),
        fechaFin: formatearFechaISO(tFin),
        duracionDias,
        semanaInicio: semInicio,
        semanaFin: semFin,
        huTitulo: huPadre?.titulo,
        ruOrigen: huPadre?.rf_origen,
      });
    }
  }

  // Determinar total de semanas
  let maxSemana = 1;
  tareasCalendarizadas.forEach((t) => {
    if (t.semanaFin > maxSemana) maxSemana = t.semanaFin;
  });

  // Generar lista de semanas
  const semanas: SemanaGantt[] = [];
  for (let s = 1; s <= maxSemana; s++) {
    const lunesSemana = new Date(lunesProyecto.getTime() + (s - 1) * 7 * 86400000);
    const diasSumarFin = params.diasPorSemana === 6 ? 5 : 4; // Sábado (+5) o Viernes (+4)
    const finSemana = new Date(lunesSemana.getTime() + diasSumarFin * 86400000);

    // Sumar horas de tareas que se ejecutan durante esta semana
    const horasSemana = tareasCalendarizadas.reduce((acc, t) => {
      if (t.semanaInicio <= s && t.semanaFin >= s) {
        // Distribuir horas proporcionalmente si la tarea abarca varias semanas
        const span = t.semanaFin - t.semanaInicio + 1;
        return acc + Math.round(t.estimacion_horas / span);
      }
      return acc;
    }, 0);

    semanas.push({
      numero: s,
      etiqueta: `Semana ${s}`,
      rangoTexto: `${formatearFechaCorta(lunesSemana)} - ${formatearFechaCorta(finSemana)}`,
      fechaInicio: formatearFechaISO(lunesSemana),
      fechaFin: formatearFechaISO(finSemana),
      horasTotales: horasSemana,
    });
  }

  // Fechas globales del proyecto
  const primerInicio = tareasCalendarizadas[0]?.fechaInicio || formatearFechaISO(fechaInicioHabil);
  const ultimoFin = tareasCalendarizadas.reduce((max, t) => {
    return t.fechaFin > max ? t.fechaFin : max;
  }, primerInicio);

  const totalHoras = tareas.reduce((acc, t) => acc + (t.estimacion_horas || 0), 0);
  const totalDiasHabiles = tareasCalendarizadas.reduce((acc, t) => acc + t.duracionDias, 0);
  const horasPorSemanaPromedio = maxSemana > 0 ? Math.round(totalHoras / maxSemana) : totalHoras;

  return {
    tareasCalendarizadas,
    semanas,
    fechaInicioProyecto: primerInicio,
    fechaFinProyecto: ultimoFin,
    totalSemanas: maxSemana,
    totalDiasHabiles,
    totalHoras,
    horasPorSemanaPromedio,
  };
}
