import React, { useState } from "react";
import type { Usuario } from "../types";
import { LoginView } from "./LoginView";
import logoImg from "../assets/logo.png";

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
          <div className="flex items-center">
            <img
              src={logoImg}
              alt="ReqGen"
              className="h-10 sm:h-12 w-auto object-contain"
            />
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
      {/* 2. HERO SECTION CENTRADO                                         */}
      {/* ================================================================= */}
      <section className="relative z-10 flex-1 flex flex-col justify-center items-center py-16 sm:py-24 text-center px-4 max-w-5xl mx-auto space-y-6">
        
        {/* Titular Principal Grande (completamente blanco) */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          El software se mueve rápido. <br />
          ReqGen mantiene tu trazabilidad.
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
            <span>Registrate</span>
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
      {/* 3. PIE DE PÁGINA (FOOTER)                                         */}
      {/* ================================================================= */}
      <footer className="mt-auto relative z-10 border-t border-slate-800/80 py-6 bg-slate-950/60 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider">REQGEN</span>
            <span>·</span>
            <span>Plataforma de Trazabilidad Híbrida para Ingeniería de Software</span>
          </div>
          <div className="text-[11px] text-slate-500 text-center sm:text-right">
            Memoria de Tesis · ICC · {new Date().getFullYear()}
          </div>
        </div>
      </footer>

      {/* ================================================================= */}
      {/* 4. MODAL ANIMADO DE LOGIN / REGISTRO                              */}
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

