import React, { useState } from "react";
import type { Usuario } from "../types";

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

      setMensajeExito("¡Apodo actualizado exitosamente!");
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

      setMensajeExito("¡Contraseña actualizada exitosamente!");
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
    if (!window.confirm("¿Seguro que deseas solicitar la baja definitiva de tu cuenta? Se enviará un correo para confirmar.")) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {(usuario.apodo || usuario.nombre).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">Configuración de Perfil</h3>
              <p className="text-[11px] text-slate-400">{usuario.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2 text-xs font-semibold text-slate-600">
          <button
            onClick={() => { setTab("perfil"); setError(null); setMensajeExito(null); }}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              tab === "perfil" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-900"
            }`}
          >
            👤 Datos y Apodo
          </button>
          <button
            onClick={() => { setTab("seguridad"); setError(null); setMensajeExito(null); }}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              tab === "seguridad" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-slate-900"
            }`}
          >
            🔐 Cambiar Contraseña
          </button>
          <button
            onClick={() => { setTab("baja"); setError(null); setMensajeExito(null); }}
            className={`pb-3 px-3 border-b-2 transition-colors ${
              tab === "baja" ? "border-red-600 text-red-600" : "border-transparent hover:text-slate-900"
            }`}
          >
            ⚠️ Dar de Baja
          </button>
        </div>

        {/* Contenido del Modal */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {mensajeExito && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <span>✓</span>
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* TAB 1: DATOS Y APODO */}
          {tab === "perfil" && (
            <form onSubmit={handleGuardarApodo} className="space-y-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nombre completo:</label>
                <input
                  type="text"
                  disabled
                  value={usuario.nombre}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Correo electrónico:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    disabled
                    value={usuario.email}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 cursor-not-allowed"
                  />
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg shrink-0">
                    ✓ Verificado
                  </span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Apodo (Visualizado en el Dashboard):
                </label>
                <input
                  type="text"
                  required
                  value={apodo}
                  onChange={(e) => setApodo(e.target.value)}
                  placeholder="Ej: Gus"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Este nombre corto es el que aparecerá en el saludo de bienvenida de tu Dashboard.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
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
                <label className="font-semibold text-slate-700 block mb-1">Contraseña actual:</label>
                <input
                  type="password"
                  required
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nueva contraseña <span className="font-normal text-slate-400">(mín. 8 caracteres, 1 mayúscula)</span>:
                </label>
                <input
                  type="password"
                  required
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Confirmar nueva contraseña:</label>
                <input
                  type="password"
                  required
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {cargando ? "Actualizando..." : "Actualizar Contraseña"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: DAR DE BAJA LA CUENTA */}
          {tab === "baja" && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-2">
                <h4 className="font-bold text-xs flex items-center gap-1.5">
                  <span>⚠️</span> Zona de Peligro: Eliminación de Cuenta
                </h4>
                <p className="text-[11px] leading-relaxed">
                  Al dar de baja tu cuenta se eliminarán de forma <strong>irreversible</strong> todos tus proyectos guardados, documentos fuente, requisitos, historias de usuario y tareas técnicas en PostgreSQL.
                </p>
                <p className="text-[11px] font-semibold">
                  Por seguridad, te enviaremos un correo a <u>{usuario.email}</u> con un enlace de confirmación antes de proceder con el borrado definitivo.
                </p>
              </div>

              {devLinkBaja && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                    Modo Local / Simulación
                  </span>
                  <p className="text-[11px] text-slate-500">Enlace de baja generado en el correo:</p>
                  <a href={devLinkBaja} className="block text-xs font-semibold text-red-600 hover:underline break-all">
                    Confirmar Baja Definitiva de Cuenta →
                  </a>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSolicitarBaja}
                  disabled={cargando}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {cargando ? "Procesando solicitud..." : "Solicitar Baja de Cuenta por Correo"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

