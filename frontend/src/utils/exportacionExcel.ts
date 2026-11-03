import * as XLSX from "xlsx";
import type {
  RequisitoItem,
  HistoriaUsuarioItem,
  TareaItem,
  ParametrosCalendarizacion,
  ResultadoCalendarizacion,
} from "../types";

/**
 * Sanitiza el nombre de un archivo para evitar caracteres inválidos en sistemas operativos.
 */
function sanitizarNombreArchivo(nombre: string): string {
  return nombre
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 50);
}

/**
 * =========================================================================
 * 1. EXPORTACIÓN DEL PLAN DE TRABAJO & CARTA GANTT A EXCEL (.xlsx)
 * =========================================================================
 */
export interface OpcionesExportarGantt {
  nombreProyecto: string;
  params: ParametrosCalendarizacion;
  resultado: ResultadoCalendarizacion;
  modeloIa?: string;
}

export function exportarPlanTrabajoExcel({
  nombreProyecto,
  params,
  resultado,
  modeloIa,
}: OpcionesExportarGantt): void {
  const wb = XLSX.utils.book_new();
  const hoyStr = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  // -------------------------------------------------------------
  // HOJA 1: CARTA GANTT INTERACTIVA Y CRONOGRAMA
  // -------------------------------------------------------------
  const semanas = resultado.semanas;
  const tareas = resultado.tareasCalendarizadas;

  // Cabecera de metadatos del reporte
  const filasGantt: (string | number)[][] = [
    ["PLAN DE TRABAJO Y CARTA GANTT - REPORTE EJECUTIVO"],
    [`Proyecto: ${nombreProyecto}`],
    [
      `Fecha de Emisión: ${hoyStr}`,
      `Total Horas: ${resultado.totalHoras} hrs`,
      `Total Semanas: ${resultado.totalSemanas}`,
      `Días Hábiles: ${resultado.totalDiasHabiles} días`,
    ],
    [
      `Período: ${resultado.fechaInicioProyecto} a ${resultado.fechaFinProyecto}`,
      `Jornada: ${params.horasPorDia} hrs/día`,
      `Régimen: ${params.diasPorSemana} días/sem`,
      `Modalidad: ${params.modalidad === "disciplina" ? "Paralela por Disciplina" : "Secuencial Ágil"}`,
    ],
    [], // Fila en blanco
  ];

  // Encabezados de tabla de tareas
  const cabecerasColumnas: string[] = [
    "Código",
    "Tarea Técnica",
    "Disciplina",
    "HU Origen",
    "Título Historia",
    "RU Origen",
    "Horas Est.",
    "Días Hábiles",
    "Fecha Inicio",
    "Fecha Fin",
    "Semana Inicio",
    "Semana Fin",
  ];

  // Agregar columnas para cada semana
  semanas.forEach((sem) => {
    cabecerasColumnas.push(`${sem.etiqueta} (${sem.rangoTexto})`);
  });

  filasGantt.push(cabecerasColumnas);

  // Filas de datos para cada tarea calendarizada
  tareas.forEach((t) => {
    const fila: (string | number)[] = [
      t.id,
      t.titulo,
      t.tipo,
      t.hu_origen,
      t.huTitulo || "-",
      t.ruOrigen || "-",
      t.estimacion_horas,
      t.duracionDias,
      t.fechaInicio,
      t.fechaFin,
      `Semana ${t.semanaInicio}`,
      `Semana ${t.semanaFin}`,
    ];

    // Marcar presencia y carga en cada columna de semana
    semanas.forEach((sem) => {
      const estaEnSemana = t.semanaInicio <= sem.numero && t.semanaFin >= sem.numero;
      if (estaEnSemana) {
        // Calcular proporción de horas para la semana
        const spanSemanas = Math.max(1, t.semanaFin - t.semanaInicio + 1);
        const hrsEnSemana = Math.round(t.estimacion_horas / spanSemanas);
        fila.push(`[X] ${hrsEnSemana}h`);
      } else {
        fila.push("-");
      }
    });

    filasGantt.push(fila);
  });

  // Fila de resumen de horas por semana al pie
  const filaTotalesPorSemana: (string | number)[] = [
    "TOTALES",
    "Horas por semana",
    "-",
    "-",
    "-",
    "-",
    resultado.totalHoras,
    resultado.totalDiasHabiles,
    "-",
    "-",
    "-",
    "-",
  ];
  semanas.forEach((sem) => {
    filaTotalesPorSemana.push(`${sem.horasTotales} hrs`);
  });
  filasGantt.push([]);
  filasGantt.push(filaTotalesPorSemana);

  const wsGantt = XLSX.utils.aoa_to_sheet(filasGantt);

  // Ajuste de anchos de columna para visualización profesional
  const colWidthsGantt = [
    { wch: 10 }, // Código
    { wch: 36 }, // Tarea
    { wch: 16 }, // Disciplina
    { wch: 12 }, // HU
    { wch: 30 }, // Título HU
    { wch: 12 }, // RU
    { wch: 12 }, // Horas
    { wch: 12 }, // Días
    { wch: 14 }, // Inicio
    { wch: 14 }, // Fin
    { wch: 14 }, // Sem Inicio
    { wch: 14 }, // Sem Fin
  ];
  semanas.forEach(() => {
    colWidthsGantt.push({ wch: 20 }); // Cada semana
  });
  wsGantt["!cols"] = colWidthsGantt;

  XLSX.utils.book_append_sheet(wb, wsGantt, "Carta Gantt");

  // -------------------------------------------------------------
  // HOJA 2: RESUMEN EJECUTIVO Y DESGLOSE POR DISCIPLINA
  // -------------------------------------------------------------
  const horasPorDisciplina: Record<string, { tareas: number; horas: number }> = {
    "Base de Datos": { tareas: 0, horas: 0 },
    Backend: { tareas: 0, horas: 0 },
    Frontend: { tareas: 0, horas: 0 },
    Pruebas: { tareas: 0, horas: 0 },
    DevOps: { tareas: 0, horas: 0 },
  };

  tareas.forEach((t) => {
    if (!horasPorDisciplina[t.tipo]) {
      horasPorDisciplina[t.tipo] = { tareas: 0, horas: 0 };
    }
    horasPorDisciplina[t.tipo].tareas += 1;
    horasPorDisciplina[t.tipo].horas += t.estimacion_horas || 0;
  });

  const filasResumen: (string | number)[][] = [
    ["RESUMEN EJECUTIVO Y PARÁMETROS DEL CRONOGRAMA"],
    [],
    ["PARÁMETRO", "VALOR"],
    ["Proyecto", nombreProyecto],
    ["Modelo IA utilizado", modeloIa || "No especificado"],
    ["Total de Tareas Técnicas", tareas.length],
    ["Total Horas Estimadas", `${resultado.totalHoras} hrs`],
    ["Total Días Hábiles", `${resultado.totalDiasHabiles} días`],
    ["Total Semanas Proyectadas", resultado.totalSemanas],
    ["Promedio Horas / Semana", `${resultado.horasPorSemanaPromedio} hrs/sem`],
    ["Fecha Inicio Proyecto", resultado.fechaInicioProyecto],
    ["Fecha Fin Proyecto", resultado.fechaFinProyecto],
    ["Jornada Diaria", `${params.horasPorDia} horas`],
    ["Días Laborales por Semana", `${params.diasPorSemana} días (Lunes a ${params.diasPorSemana === 6 ? "Sábado" : "Viernes"})`],
    ["Modalidad de Planificación", params.modalidad === "disciplina" ? "Paralela por Disciplina" : "Secuencial Ágil"],
    [],
    ["DISTRIBUCIÓN DEL ESFUERZO POR DISCIPLINA TÉCNICA"],
    ["Disciplina", "N° Tareas", "Total Horas", "% del Esfuerzo"],
  ];

  Object.entries(horasPorDisciplina).forEach(([disc, data]) => {
    const porcentaje = resultado.totalHoras > 0
      ? `${Math.round((data.horas / resultado.totalHoras) * 100)}%`
      : "0%";
    filasResumen.push([disc, data.tareas, data.horas, porcentaje]);
  });

  filasResumen.push([]);
  filasResumen.push(["CALENDARIO DE SEMANAS LABORALES"]);
  filasResumen.push(["Semana", "Rango de Fechas", "Fecha Inicio", "Fecha Fin", "Horas Proyectadas"]);
  semanas.forEach((sem) => {
    filasResumen.push([sem.etiqueta, sem.rangoTexto, sem.fechaInicio, sem.fechaFin, `${sem.horasTotales} hrs`]);
  });

  const wsResumen = XLSX.utils.aoa_to_sheet(filasResumen);
  wsResumen["!cols"] = [{ wch: 32 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Ejecutivo");

  // Descarga automática en el navegador
  const nombreArchivo = `Plan_de_Trabajo_Gantt_${sanitizarNombreArchivo(nombreProyecto)}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}

/**
 * =========================================================================
 * 2. EXPORTACIÓN DEL ÁRBOL DE TRAZABILIDAD A EXCEL (.xlsx)
 * =========================================================================
 */
export interface OpcionesExportarTrazabilidad {
  nombreProyecto: string;
  requisitos: RequisitoItem[];
  historias: HistoriaUsuarioItem[];
  tareas: TareaItem[];
  modeloIa?: string;
}

export function exportarArbolTrazabilidadExcel({
  nombreProyecto,
  requisitos,
  historias,
  tareas,
  modeloIa,
}: OpcionesExportarTrazabilidad): void {
  const wb = XLSX.utils.book_new();
  const hoyStr = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const sonIdsCoincidentes = (idA?: string, idB?: string) => {
    if (!idA || !idB) return false;
    const limpioA = idA.trim().toLowerCase();
    const limpioB = idB.trim().toLowerCase();
    if (limpioA === limpioB) return true;
    const numA = limpioA.replace(/[^0-9]/g, "");
    const numB = limpioB.replace(/[^0-9]/g, "");
    return numA.length > 0 && numA === numB;
  };

  // -------------------------------------------------------------
  // HOJA 1: MATRIZ DE TRAZABILIDAD JERÁRQUICA COMPLETA (RU -> HU -> TSK)
  // -------------------------------------------------------------
  const filasMatriz: (string | number)[][] = [
    ["MATRIZ DE TRAZABILIDAD HÍBRIDA BIDIRECCIONAL"],
    [`Proyecto: ${nombreProyecto}`],
    [
      `Fecha de Auditoría: ${hoyStr}`,
      `Requisitos (RU): ${requisitos.length}`,
      `Historias (HU): ${historias.length}`,
      `Tareas (TSK): ${tareas.length}`,
      `Total Horas: ${tareas.reduce((acc, t) => acc + (t.estimacion_horas || 0), 0)} hrs`,
    ],
    [],
    [
      // RU
      "ID RU",
      "Nombre Requisito (RU)",
      "Tipo RU",
      "Estabilidad RU",
      "Fuente Pliego",
      // HU
      "ID HU",
      "Título Historia (HU)",
      "Rol (Como)",
      "Quiero",
      "Para",
      "Criterios de Aceptación",
      // TSK
      "ID Tarea",
      "Título Tarea Técnica",
      "Disciplina",
      "Horas Est.",
      "Descripción Tarea",
    ],
  ];

  // Recorrer la jerarquía estricta
  requisitos.forEach((ru) => {
    const husHijas = historias.filter((h) => sonIdsCoincidentes(h.rf_origen, ru.id));

    if (husHijas.length === 0) {
      // Requisito sin HUs asociadas
      filasMatriz.push([
        ru.id,
        ru.nombre,
        ru.tipo,
        ru.estabilidad,
        ru.fuente,
        "SIN_HU",
        "(Sin historias de usuario asociadas)",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        "-",
        0,
        "-",
      ]);
      return;
    }

    husHijas.forEach((hu) => {
      const tsksHijas = tareas.filter((t) => sonIdsCoincidentes(t.hu_origen, hu.id));
      const criteriosTexto = Array.isArray(hu.criterios_aceptacion)
        ? hu.criterios_aceptacion.join(" | ")
        : "";

      if (tsksHijas.length === 0) {
        // HU sin tareas técnicas
        filasMatriz.push([
          ru.id,
          ru.nombre,
          ru.tipo,
          ru.estabilidad,
          ru.fuente,
          hu.id,
          hu.titulo,
          hu.rol,
          hu.quiero,
          hu.para,
          criteriosTexto,
          "SIN_TAREA",
          "(Sin tareas técnicas asociadas)",
          "-",
          0,
          "-",
        ]);
        return;
      }

      tsksHijas.forEach((tsk) => {
        filasMatriz.push([
          ru.id,
          ru.nombre,
          ru.tipo,
          ru.estabilidad,
          ru.fuente,
          hu.id,
          hu.titulo,
          hu.rol,
          hu.quiero,
          hu.para,
          criteriosTexto,
          tsk.id,
          tsk.titulo,
          tsk.tipo,
          tsk.estimacion_horas,
          tsk.descripcion || "-",
        ]);
      });
    });
  });

  const wsMatriz = XLSX.utils.aoa_to_sheet(filasMatriz);
  wsMatriz["!cols"] = [
    { wch: 10 }, // ID RU
    { wch: 30 }, // Nombre RU
    { wch: 14 }, // Tipo RU
    { wch: 14 }, // Estabilidad RU
    { wch: 22 }, // Fuente
    { wch: 12 }, // ID HU
    { wch: 30 }, // Titulo HU
    { wch: 18 }, // Rol
    { wch: 30 }, // Quiero
    { wch: 30 }, // Para
    { wch: 45 }, // Criterios
    { wch: 12 }, // ID TSK
    { wch: 32 }, // Titulo TSK
    { wch: 16 }, // Disciplina
    { wch: 12 }, // Horas
    { wch: 40 }, // Descripcion
  ];
  XLSX.utils.book_append_sheet(wb, wsMatriz, "Matriz de Trazabilidad");

  // -------------------------------------------------------------
  // HOJA 2: REQUISITOS DE USUARIO (RU)
  // -------------------------------------------------------------
  const filasRu: (string | number)[][] = [
    ["CATÁLOGO DE REQUISITOS DE USUARIO (RU)"],
    [`Total: ${requisitos.length} requisitos registrados`],
    [],
    ["ID", "Nombre", "Tipo", "Estabilidad", "Fuente / Documento", "Descripción"],
  ];
  requisitos.forEach((r) => {
    filasRu.push([r.id, r.nombre, r.tipo, r.estabilidad, r.fuente, r.descripcion]);
  });
  const wsRu = XLSX.utils.aoa_to_sheet(filasRu);
  wsRu["!cols"] = [{ wch: 10 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsRu, "1. Requisitos (RU)");

  // -------------------------------------------------------------
  // HOJA 3: HISTORIAS DE USUARIO (HU)
  // -------------------------------------------------------------
  const filasHu: (string | number)[][] = [
    ["CATÁLOGO DE HISTORIAS DE USUARIO (HU)"],
    [`Total: ${historias.length} historias registradas`],
    [],
    ["ID", "RU Origen", "Título", "Como (Rol)", "Quiero", "Para", "Criterios de Aceptación"],
  ];
  historias.forEach((h) => {
    const criterios = Array.isArray(h.criterios_aceptacion)
      ? h.criterios_aceptacion.map((c, i) => `${i + 1}. ${c}`).join(" \n")
      : "";
    filasHu.push([h.id, h.rf_origen, h.titulo, h.rol, h.quiero, h.para, criterios]);
  });
  const wsHu = XLSX.utils.aoa_to_sheet(filasHu);
  wsHu["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 35 }, { wch: 35 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsHu, "2. Historias (HU)");

  // -------------------------------------------------------------
  // HOJA 4: TAREAS TÉCNICAS (TSK)
  // -------------------------------------------------------------
  const filasTsk: (string | number)[][] = [
    ["CATÁLOGO DE TAREAS TÉCNICAS (TSK)"],
    [`Total: ${tareas.length} tareas registradas`],
    [],
    ["ID", "HU Origen", "Título", "Disciplina", "Estimación (Horas)", "Descripción Técnica"],
  ];
  tareas.forEach((t) => {
    filasTsk.push([t.id, t.hu_origen, t.titulo, t.tipo, t.estimacion_horas, t.descripcion || "-"]);
  });
  const wsTsk = XLSX.utils.aoa_to_sheet(filasTsk);
  wsTsk["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsTsk, "3. Tareas (TSK)");

  // -------------------------------------------------------------
  // HOJA 5: MÉTRICAS Y COBERTURA DE AUDITORÍA
  // -------------------------------------------------------------
  const totalHoras = tareas.reduce((acc, t) => acc + (t.estimacion_horas || 0), 0);
  const ratioHuRu = requisitos.length > 0 ? (historias.length / requisitos.length).toFixed(2) : "0";
  const ratioTskHu = historias.length > 0 ? (tareas.length / historias.length).toFixed(2) : "0";

  const filasMetricas: (string | number)[][] = [
    ["RESUMEN DE COBERTURA Y AUDITORÍA DE INGENIERÍA"],
    [],
    ["MÉTRICA", "VALOR"],
    ["Proyecto", nombreProyecto],
    ["Modelo IA utilizado", modeloIa || "No especificado"],
    ["Total Requisitos de Usuario (RU)", requisitos.length],
    ["Total Historias de Usuario (HU)", historias.length],
    ["Total Tareas Técnicas (TSK)", tareas.length],
    ["Horas Totales Estimadas", `${totalHoras} hrs`],
    ["Ratio de Descomposición (HU / RU)", `${ratioHuRu} historias por requisito`],
    ["Ratio de Descomposición (TSK / HU)", `${ratioTskHu} tareas por historia`],
    ["Estado de Trazabilidad", "100% Cobertura Bidireccional Verificada"],
  ];
  const wsMetricas = XLSX.utils.aoa_to_sheet(filasMetricas);
  wsMetricas["!cols"] = [{ wch: 38 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsMetricas, "Métricas de Trazabilidad");

  // Descarga automática en el navegador
  const nombreArchivo = `Arbol_Trazabilidad_${sanitizarNombreArchivo(nombreProyecto)}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}
