import React, { useState } from "react";
import type { Usuario } from "../types";
import { LoginView } from "./LoginView";
import heroImg from "../assets/hero.png";
import matrixImg from "../assets/traceability-matrix.svg";
import velocityImg from "../assets/agile-velocity.svg";

interface LandingPageViewProps {
  onLoginExitoso: (token: string, usuario: Usuario) => void;
  tokenVerificacionUrl?: string | null;
  tokenResetUrl?: string | null;
  tokenBajaUrl?: string | null;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onLoginExitoso,
  tokenVerificacionUrl,
  tokenResetUrl,
  tokenBajaUrl,
}) => {
  // Estado para el modal animado de Login y Registro
  const hayTokenAccionUrl = Boolean(tokenVerificacionUrl || tokenResetUrl || tokenBajaUrl);
  const [modalAbierto, setModalAbierto] = useState<boolean>(hayTokenAccionUrl);
  const [modoModal, setModoModal] = useState<"login" | "registro">("login");

  const abrirModal = (modo: "login" | "registro") => {
    setModoModal(modo);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans selection:bg-[#d4f63b] selection:text-slate-950 relative overflow-x-hidden">
      
      {/* Fondo con Cuadrícula Geométrica Minimalista y Gradiente Radial Suave */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] pointer-events-none opacity-50 blur-[120px] rounded-full"
        style={{
          background: "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.3) 0%, rgba(30, 64, 175, 0.15) 50%, transparent 75%)",
        }}
      />

      {/* ================================================================= */}
      {/* 1. BARRA DE NAVEGACIÓN SUPERIOR (NAVBAR)                          */}
      {/* ================================================================= */}
      <header className="relative z-30 w-full border-b border-slate-800 bg-[#0f172a]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo ReqGen */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-[0_0_20px_rgba(37,99,235,0.35)] border border-blue-400/30">
              RQ
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-tight">
                REQGEN
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block">
                Trazabilidad Híbrida
              </span>
            </div>
          </div>

          {/* Acciones de Autenticación */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => abrirModal("login")}
              className="text-xs font-semibold px-4 py-2 text-slate-300 hover:text-white transition"
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => abrirModal("registro")}
              className="text-xs font-black px-5 py-2.5 rounded-full bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 transition-all shadow-[0_0_20px_rgba(212,246,59,0.25)] hover:scale-105 active:scale-95"
            >
              Comenzar
            </button>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. HERO SECTION CENTRADO (INSPIRADO EN SHOPIFY)                   */}
      {/* ================================================================= */}
      <section className="relative z-10 pt-16 sm:pt-24 pb-14 text-center px-4 max-w-5xl mx-auto space-y-6">
        
        {/* Badge superior minimalista */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-bold text-slate-300 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#d4f63b] animate-pulse"></span>
          <span>Ingeniería de Requerimientos Asistida por IA · Control Humano</span>
        </div>

        {/* Titular Principal Grande */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          El software se mueve rápido. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-[#d4f63b]">
            ReqGen mantiene tu trazabilidad.
          </span>
        </h1>

        {/* Subtítulo Conciso */}
        <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
          Conviertete en un desarrolador de software más eficiente con la ayuda de ReqGen.
        </p>

        {/* Botones de Acción (Pills de Alto Contraste) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-4">
          <button
            onClick={() => abrirModal("registro")}
            className="px-8 py-3.5 rounded-full bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 font-black text-sm transition-all shadow-[0_0_30px_rgba(212,246,59,0.3)] hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>Comenzar gratis</span>
            <span>→</span>
          </button>
          <button
            onClick={() => abrirModal("login")}
            className="px-8 py-3.5 rounded-full border border-slate-700 hover:border-slate-400 text-white hover:bg-slate-800/60 font-bold text-sm transition-all"
          >
            Iniciar sesión
          </button>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 3. GALERÍA DE TARJETAS HORIZONTAL (SHOWCASE STYLE SHOPIFY)        */}
      {/* ================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          
          {/* Card 1: Ingesta de Documentos (Cols 1-3) */}
          <div className="md:col-span-3 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-xs hover:border-slate-700 transition group shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider bg-blue-950/60 border border-blue-800/50 px-2 py-0.5 rounded-full">
                  Etapa 1
                </span>
                <span className="text-xs text-slate-400">PDF / TXT</span>
              </div>
              <h3 className="font-bold text-sm text-white">Ingesta de Especificaciones</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Análisis léxico estricto de documentos y pliegos con detección de verbos normativos RFC 2119.
              </p>
            </div>

            {/* Preview UI Mockup */}
            <div className="mt-4 p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium truncate">
                <span className="text-blue-400">📄</span>
                <span className="truncate">Pliego_Cliente_v2.pdf</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[85%] rounded-full"></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>14 Cláusulas</span>
                <span className="text-emerald-400 font-semibold">✓ 100% Parseado</span>
              </div>
            </div>
          </div>

          {/* Card 2: Matriz de Trazabilidad Híbrida (Cols 4-7) */}
          <div className="md:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-xs hover:border-slate-700 transition group shadow-sm overflow-hidden">
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider bg-purple-950/60 border border-purple-800/50 px-2 py-0.5 rounded-full">
                  Trazabilidad
                </span>
                <span className="text-[11px] font-bold text-[#d4f63b]">100% Cobertura</span>
              </div>
              <h3 className="font-bold text-sm text-white">Matriz Bidireccional</h3>
            </div>

            {/* Imagen Vectorial de la Matriz de Trazabilidad */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#070b14] p-1 flex items-center justify-center">
              <img 
                src={matrixImg} 
                alt="Matriz de Trazabilidad Híbrida" 
                className="w-full h-auto object-contain rounded-xl hover:scale-102 transition duration-300" 
              />
            </div>
          </div>

          {/* Card 3: Núcleo Arquitectónico Central (Cols 8-9) */}
          <div className="md:col-span-2 bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800/80 rounded-3xl p-4 flex flex-col items-center justify-between text-center backdrop-blur-xs hover:border-slate-700 transition shadow-sm">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full">
              Núcleo
            </span>
            <div className="my-2 flex items-center justify-center">
              <img 
                src={heroImg} 
                alt="Arquitectura Híbrida" 
                className="w-24 h-24 object-contain filter drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:scale-105 transition duration-300" 
              />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Puente Híbrido</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">IEEE 830 ⇄ Scrum</span>
            </div>
          </div>

          {/* Card 4: Velocidad Ágil & Modelos IA (Cols 10-12) */}
          <div className="md:col-span-3 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-xs hover:border-slate-700 transition group shadow-sm overflow-hidden">
            <div className="space-y-1 mb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#d4f63b] uppercase tracking-wider bg-lime-950/60 border border-lime-800/50 px-2 py-0.5 rounded-full">
                  Multi-Modelo
                </span>
                <span className="text-xs text-slate-400">Failover Activo</span>
              </div>
              <h3 className="font-bold text-sm text-white">Velocidad y Respaldo IA</h3>
            </div>

            {/* Imagen Vectorial de Velocidad y Modelos */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#070b14] p-1 flex items-center justify-center">
              <img 
                src={velocityImg} 
                alt="Velocidad y Catálogo de Modelos" 
                className="w-full h-auto object-contain rounded-xl hover:scale-102 transition duration-300" 
              />
            </div>
          </div>

        </div>
      </section>

      {/* ================================================================= */}
      {/* 4. TRES PILARES METODOLÓGICOS CONCISOS (NO SOBRECARGADO)         */}
      {/* ================================================================= */}
      <section id="metodologia" className="relative z-10 border-t border-slate-800/80 py-16 bg-slate-900/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Ingeniería formal sin burocracia.
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              El modelo híbrido resuelve la brecha entre el contrato estricto con el cliente
              y el desarrollo ágil mediante correspondencia verificable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Pilar 1 */}
            <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-700/50 text-blue-400 flex items-center justify-center text-lg font-bold">
                1
              </div>
              <h3 className="font-bold text-base text-white">Rigor Predictivo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Estructura Requisitos de Usuario (RU) con estabilidad, prioridad y formato conforme a la norma IEEE 830 para preservar el alcance contractual.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/50 text-purple-400 flex items-center justify-center text-lg font-bold">
                2
              </div>
              <h3 className="font-bold text-base text-white">Agilidad Adaptativa</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deriva Historias de Usuario con sintaxis formal Gherkin (Dado-Cuando-Entonces) y tareas técnicas desglosadas listas para sprints.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="p-6 bg-slate-900/50 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-lime-950/60 border border-lime-700/50 text-[#d4f63b] flex items-center justify-center text-lg font-bold">
                3
              </div>
              <h3 className="font-bold text-base text-white">Propagación en Cascada</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Detecta y mitiga el impacto de cambios o podas de requisitos, alertando y sincronizando automáticamente toda la cadena de artefactos.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 5. CALL TO ACTION FINAL                                           */}
      {/* ================================================================= */}
      <section className="relative z-10 border-t border-slate-800/80 py-16 text-center px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Comienza a especificar con rigor y agilidad.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Crea tu cuenta de analista, valida tu correo y experimenta la trazabilidad de requerimientos asistida por inteligencia artificial.
          </p>
          <div className="pt-2">
            <button
              onClick={() => abrirModal("registro")}
              className="px-9 py-3.5 rounded-full bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 font-black text-sm transition-all shadow-[0_0_30px_rgba(212,246,59,0.35)] hover:scale-105 active:scale-95 inline-flex items-center gap-2"
            >
              <span>Crear Cuenta en ReqGen</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* 6. PIE DE PÁGINA (FOOTER)                                         */}
      {/* ================================================================= */}
      <footer className="relative z-10 border-t border-slate-800/80 py-8 bg-slate-950 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">REQGEN</span>
            <span>·</span>
            <span>Plataforma de Trazabilidad Híbrida para Ingeniería de Software</span>
          </div>
          <div className="text-[11px] text-slate-500 text-center sm:text-right">
            Memoria de Tesis · Ingeniería Civil Informática · {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* ================================================================= */}
      {/* 7. MODAL ANIMADO DE LOGIN / REGISTRO                              */}
      {/* ================================================================= */}
      {modalAbierto && (
        <LoginView
          esModal={true}
          modoInicial={modoModal}
          onCerrar={cerrarModal}
          onLoginExitoso={onLoginExitoso}
          tokenVerificacionUrl={tokenVerificacionUrl}
          tokenResetUrl={tokenResetUrl}
          tokenBajaUrl={tokenBajaUrl}
        />
      )}

    </div>
  );
};

