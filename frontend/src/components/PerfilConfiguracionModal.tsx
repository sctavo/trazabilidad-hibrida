import React, { useState } from "react";
import type { Usuario } from "../types";
import { UserIcon, ShieldIcon, AlertIcon, CheckIcon, CloseIcon } from "./Icons";

interface PerfilConfiguracionModalProps {
  token: string;
  usuario: Usuario;
  isOpen: boolean;
  onClose: () => void;
  onPerfilActualizado: (usuarioActualizado: Usuario) => void;
}

export const PerfilConfiguracionModal: React.FC<PerfilConfiguracionModalProps> = ({
  token,
  usuario,
  isOpen,
  onClose,
  onPerfilActualizado,
}) => {
  const [tab, setTab] = useState<"perfil" | "seguridad" | "baja">("perfil");

  // Edición de apodo
  const [apodo, setApodo] = useState(usuario.apodo || usuario.nombre.split(" ")[0]);

  // Cambio de contraseña
  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  // Feedback
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [devLinkBaja, setDevLinkBaja] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Guardar Apodo
  const handleGuardarApodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (apodo.trim().length < 2) {
      setError("El apodo debe tener al menos 2 caracteres.");
      return;
    }
    setCargando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apodo: apodo.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al actualizar apodo.");

      setMensajeExito("Apodo actualizado exitosamente.");
      onPerfilActualizado({
        ...usuario,
        apodo: data.apodo,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 2. Cambiar Contraseña
  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaPassword !== confirmarPassword) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    if (nuevaPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(nuevaPassword)) {
      setError("La nueva contraseña debe contener al menos una letra mayúscula.");
      return;
    }

    setCargando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/cambiar-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password_actual: passwordActual,
          nueva_password: nuevaPassword,
          confirmar_password: confirmarPassword,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al cambiar contraseña.");

      setMensajeExito("Contraseña actualizada exitosamente.");
      setPasswordActual("");
      setNuevaPassword("");
      setConfirmarPassword("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 3. Solicitar Baja de Cuenta
  const handleSolicitarBaja = async () => {
    if (!window.confirm("¿Confirmas la solicitud de baja de tu cuenta? Se enviará un correo para autorizar el borrado.")) {
      return;
    }

    setCargando(true);
    setError(null);
    setMensajeExito(null);

    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/solicitar-baja-cuenta", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al solicitar baja.");

      setMensajeExito(data.mensaje);
      setDevLinkBaja(data.dev_link || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans text-slate-100">
      <div className="bg-[#131d35] border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              {(usuario.apodo || usuario.nombre).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Configuración de Perfil</h3>
              <p className="text-[11px] text-slate-400">{usuario.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-800 bg-[#131d35] px-5 pt-2 text-xs font-semibold text-slate-400">
          <button
            onClick={() => { setTab("perfil"); setError(null); setMensajeExito(null); }}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === "perfil" ? "border-blue-500 text-sky-400" : "border-transparent hover:text-slate-200"
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Datos y Apodo</span>
          </button>
          <button
            onClick={() => { setTab("seguridad"); setError(null); setMensajeExito(null); }}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === "seguridad" ? "border-blue-500 text-sky-400" : "border-transparent hover:text-slate-200"
            }`}
          >
            <ShieldIcon className="w-3.5 h-3.5" />
            <span>Cambiar Contraseña</span>
          </button>
          <button
            onClick={() => { setTab("baja"); setError(null); setMensajeExito(null); }}
            className={`pb-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === "baja" ? "border-red-500 text-red-400" : "border-transparent hover:text-slate-200"
            }`}
          >
            <AlertIcon className="w-3.5 h-3.5" />
            <span>Dar de Baja</span>
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 text-red-300 rounded-xl flex items-center gap-2">
              <AlertIcon className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckIcon className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* TAB 1: DATOS Y APODO */}
          {tab === "perfil" && (
            <form onSubmit={handleGuardarApodo} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Nombre completo:</label>
                <input
                  type="text"
                  disabled
                  value={usuario.nombre}
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-800 rounded-xl text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Correo electrónico:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    disabled
                    value={usuario.email}
                    className="w-full p-2.5 bg-[#0f172a] border border-slate-800 rounded-xl text-slate-400 cursor-not-allowed"
                  />
                  <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-800/70 text-emerald-400 font-bold text-[10px] rounded-lg shrink-0 flex items-center gap-1">
                    <CheckIcon className="w-3 h-3" /> Verificado
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Apodo (Visualizado en el Dashboard):
                </label>
                <input
                  type="text"
                  required
                  value={apodo}
                  onChange={(e) => setApodo(e.target.value)}
                  placeholder="Ej: Gus"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Este apodo aparecerá en el encabezado y en tu panel de control.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {cargando ? "Guardando..." : "Guardar Apodo"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CAMBIAR CONTRASEÑA */}
          {tab === "seguridad" && (
            <form onSubmit={handleCambiarPassword} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Contraseña actual:</label>
                <input
                  type="password"
                  required
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Nueva contraseña <span className="font-normal text-slate-400">(mín. 8 caracteres, 1 mayúscula)</span>:
                </label>
                <input
                  type="password"
                  required
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Confirmar nueva contraseña:</label>
                <input
                  type="password"
                  required
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-[#0f172a] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {cargando ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DAR DE BAJA LA CUENTA */}
          {tab === "baja" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-950/40 border border-red-800/80 rounded-xl text-red-200 space-y-2">
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-red-400">
                  <AlertIcon className="w-4 h-4 shrink-0" /> Zona de Peligro: Eliminación de Cuenta
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Al dar de baja tu cuenta se eliminarán de forma irreversible tus proyectos guardados, especificaciones RU, historias de usuario y tareas técnicas en PostgreSQL.
                </p>
                <p className="text-[11px] font-semibold text-red-300">
                  Te enviaremos un correo de confirmación a <span className="underline">{usuario.email}</span> para autorizar la baja definitiva.
                </p>
              </div>

              {devLinkBaja && (
                <div className="p-3 bg-[#0f172a] border border-slate-800 rounded-xl text-left text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-800/60 px-1.5 py-0.5 rounded">
                    Simulación de Correo
                  </span>
                  <p className="text-[11px] text-slate-400">Enlace de baja generado:</p>
                  <a href={devLinkBaja} className="block text-xs font-semibold text-red-400 hover:underline break-all">
                    Confirmar Baja Definitiva de Cuenta →
                  </a>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSolicitarBaja}
                  disabled={cargando}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {cargando ? "Procesando solicitud..." : "Solicitar Baja de Cuenta"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
