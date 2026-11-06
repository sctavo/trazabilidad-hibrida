import React, { useState, useEffect } from "react";
import type { Usuario } from "../types";

interface LoginViewProps {
  onLoginExitoso: (token: string, usuario: Usuario) => void;
  tokenVerificacionUrl?: string | null;
  tokenResetUrl?: string | null;
  tokenBajaUrl?: string | null;
  modoInicial?: "login" | "registro";
  onCerrar?: () => void;
  esModal?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginExitoso,
  tokenVerificacionUrl,
  tokenResetUrl,
  tokenBajaUrl,
  modoInicial = "login",
  onCerrar,
  esModal = false,
}) => {
  // Modos de vista: 'login' | 'registro' | 'recuperar' | 'reset_password' | 'verificando_email' | 'baja_cuenta' | 'registro_exitoso'
  const [modo, setModo] = useState<
    "login" | "registro" | "recuperar" | "reset_password" | "verificando_email" | "baja_cuenta" | "registro_exitoso"
  >(modoInicial);

  // Campos de formulario
  const [nombre, setNombre] = useState("");
  const [apodo, setApodo] = useState("");
  const [email, setEmail] = useState("");
  const [confirmarEmail, setConfirmarEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  // Captcha
  const [captchaPregunta, setCaptchaPregunta] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaRespuesta, setCaptchaRespuesta] = useState("");

  // Estados de interfaz y feedback
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [emailNoVerificado, setEmailNoVerificado] = useState<string | null>(null);
  const [ultimoDevLink, setUltimoDevLink] = useState<string | null>(null);

  // Cargar Captcha
  const cargarCaptcha = async () => {
    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/captcha");
      if (resp.ok) {
        const data = await resp.json();
        setCaptchaPregunta(data.pregunta);
        setCaptchaToken(data.token);
        setCaptchaRespuesta("");
      }
    } catch {
      setCaptchaPregunta("¿Cuánto es 4 + 3?");
    }
  };

  // Sincronizar modo inicial si cambia desde fuera
  useEffect(() => {
    if (modoInicial && !tokenVerificacionUrl && !tokenResetUrl && !tokenBajaUrl) {
      setModo(modoInicial);
    }
  }, [modoInicial]);

  // Detectar tokens en URL al montar
  useEffect(() => {
    if (tokenVerificacionUrl) {
      setModo("verificando_email");
      ejecutarVerificacionEmail(tokenVerificacionUrl);
    } else if (tokenResetUrl) {
      setModo("reset_password");
    } else if (tokenBajaUrl) {
      setModo("baja_cuenta");
    }
  }, [tokenVerificacionUrl, tokenResetUrl, tokenBajaUrl]);

  useEffect(() => {
    if (modo === "registro") {
      cargarCaptcha();
    }
  }, [modo]);

  const ejecutarVerificacionEmail = async (token: string) => {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch(`http://localhost:8000/api/v1/auth/verificar-email?token=${token}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al verificar correo.");
      setMensajeExito(data.mensaje || "¡Correo verificado con éxito!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 1. Manejo de Inicio de Sesión
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);
    setEmailNoVerificado(null);
    setCargando(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email.trim().toLowerCase());
      formData.append("password", password);

      const resp = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 403 && data.detail?.includes("no ha sido verificado")) {
          setEmailNoVerificado(email.trim().toLowerCase());
          throw new Error(data.detail);
        }
        throw new Error(data.detail || "Credenciales inválidas.");
      }

      onLoginExitoso(data.access_token, data.usuario);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 2. Manejo de Registro
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMensajeExito(null);

    // Validaciones locales
    if (email.trim().toLowerCase() !== confirmarEmail.trim().toLowerCase()) {
      setError("Los correos electrónicos ingresados no coinciden.");
      return;
    }
    if (password !== confirmarPassword) {
      setError("Las contraseñas ingresadas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe contener al menos una letra mayúscula.");
      return;
    }
    if (!captchaRespuesta.trim()) {
      setError("Por favor responde la pregunta de verificación anti-robot.");
      return;
    }

    setCargando(true);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apodo: apodo.trim() || nombre.trim().split(" ")[0],
          email: email.trim().toLowerCase(),
          confirmar_email: confirmarEmail.trim().toLowerCase(),
          password,
          confirmar_password: confirmarPassword,
          captcha_token: captchaToken,
          captcha_respuesta: captchaRespuesta.trim(),
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        cargarCaptcha();
        throw new Error(data.detail || "Error al registrar la cuenta.");
      }

      setUltimoDevLink(data.dev_link || null);
      setModo("registro_exitoso");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 3. Reenviar Confirmación
  const handleReenviarConfirmacion = async () => {
    if (!emailNoVerificado && !email) return;
    setCargando(true);
    setError(null);
    try {
      const targetEmail = emailNoVerificado || email;
      const resp = await fetch("http://localhost:8000/api/v1/auth/reenviar-confirmacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail.trim().toLowerCase() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al reenviar correo.");
      setMensajeExito(data.mensaje);
      setUltimoDevLink(data.dev_link || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 4. Solicitar Recuperación de Contraseña
  const handleSolicitarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/solicitar-recuperacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await resp.json();
      setMensajeExito(data.mensaje);
      setUltimoDevLink(data.dev_link || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 5. Restablecer Contraseña
  const handleRestablecerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password)) {
      setError("La contraseña debe tener mín. 8 caracteres y al menos 1 letra mayúscula.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/restablecer-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenResetUrl,
          nueva_password: password,
          confirmar_password: confirmarPassword,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al restablecer contraseña.");
      setMensajeExito(data.mensaje);
      setTimeout(() => {
        setModo("login");
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  // 6. Confirmar Baja Definitiva de Cuenta
  const handleConfirmarBaja = async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("http://localhost:8000/api/v1/auth/confirmar-baja-cuenta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenBajaUrl }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Error al dar de baja la cuenta.");
      setMensajeExito(data.mensaje);
      setTimeout(() => {
        setModo("login");
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className={
        esModal
          ? "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          : "min-h-screen bg-[#0f172a] flex items-center justify-center p-4"
      }
    >
      <div className="bg-[#131d35] border border-slate-700 shadow-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 text-slate-100 relative my-auto animate-in zoom-in-95 duration-200">
        
        {/* Botón Cerrar (en modo modal) */}
        {onCerrar && (
          <button
            type="button"
            onClick={onCerrar}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        )}

        {/* Cabecera ReqGen */}
        <div className="text-center pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#d4f63b]"></span>
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-300">
              ReqGen Platform
            </span>
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">
            {modo === "login" && "Iniciar sesión"}
            {modo === "registro" && "Crear cuenta de analista"}
            {modo === "recuperar" && "Recuperar contraseña"}
            {modo === "reset_password" && "Restablecer contraseña"}
            {modo === "verificando_email" && "Verificación de correo"}
            {modo === "baja_cuenta" && "Confirmar baja de cuenta"}
            {modo === "registro_exitoso" && "¡Confirmación enviada!"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {modo === "login" || modo === "registro"
              ? "Trazabilidad formal y derivación de requerimientos con asistencia de IA."
              : "Gestión de seguridad y acceso."}
          </p>
        </div>

        {/* Selector de Pestañas Iniciar Sesión / Registrarse */}
        {(modo === "login" || modo === "registro") && (
          <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 mb-2">
            <button
              type="button"
              onClick={() => {
                setModo("login");
                setError(null);
                setMensajeExito(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                modo === "login"
                  ? "bg-[#d4f63b] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("registro");
                setError(null);
                setMensajeExito(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                modo === "registro"
                  ? "bg-[#d4f63b] text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Mensaje de Error */}
        {error && (
          <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 text-xs rounded-xl flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Mensaje de Éxito */}
        {mensajeExito && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs rounded-xl flex items-start gap-2">
            <span className="shrink-0">✓</span>
            <div className="flex-1">{mensajeExito}</div>
          </div>
        )}

        {/* Aviso de Email No Verificado con botón para reenviar */}
        {emailNoVerificado && (
          <div className="p-3.5 bg-amber-950/70 border border-amber-800 text-amber-200 text-xs rounded-xl space-y-2">
            <div className="font-semibold flex items-center gap-1.5">
              <span>✉️</span> Correo pendiente de verificación
            </div>
            <p className="text-[11px] text-amber-300">
              Para ingresar debes haber confirmado tu email ({emailNoVerificado}). Revisa tu bandeja de entrada o spam.
            </p>
            <button
              type="button"
              onClick={handleReenviarConfirmacion}
              disabled={cargando}
              className="text-xs font-bold text-[#d4f63b] hover:underline flex items-center gap-1"
            >
              <span>{cargando ? "Reenviando..." : "↻ Reenviar correo de confirmación"}</span>
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* VISTA 1: REGISTRO EXITOSO (ESPERA CONFIRMACIÓN)                  */}
        {/* ================================================================= */}
        {modo === "registro_exitoso" && (
          <div className="text-center space-y-4 py-2">
            <div className="w-16 h-16 bg-blue-950/60 border border-blue-500/30 text-blue-400 rounded-full flex items-center justify-center text-3xl mx-auto shadow-inner">
              ✉️
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-white">Revisa tu bandeja de entrada</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hemos enviado un enlace de confirmación a <strong className="text-white">{email}</strong>. Por seguridad, no podrás ingresar al sistema hasta que valides tu correo.
              </p>
            </div>

            {ultimoDevLink && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-left text-xs space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4f63b] bg-slate-800 px-1.5 py-0.5 rounded">
                  Modo Desarrollo / Local
                </span>
                <p className="text-[11px] text-slate-400">
                  Simulación de correo recibido. Haz clic para activar tu cuenta:
                </p>
                <a
                  href={ultimoDevLink}
                  className="block text-xs font-bold text-[#d4f63b] hover:underline break-all"
                >
                  Confirmar Email Ahora →
                </a>
              </div>
            )}

            <button
              onClick={() => {
                setModo("login");
                setError(null);
                setMensajeExito(null);
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* VISTA 2: VERIFICANDO EMAIL DESDE LINK                             */}
        {/* ================================================================= */}
        {modo === "verificando_email" && (
          <div className="text-center space-y-4 py-3">
            {cargando ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4f63b] mx-auto"></div>
                <p className="text-xs text-slate-400">Validando tu token de confirmación...</p>
              </div>
            ) : mensajeExito ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-emerald-950 text-emerald-400 border border-emerald-700 rounded-full flex items-center justify-center text-2xl mx-auto">
                  ✓
                </div>
                <h3 className="font-bold text-base text-white">¡Cuenta activada con éxito!</h3>
                <p className="text-xs text-slate-300">
                  Tu correo electrónico ha sido verificado. Ya puedes iniciar sesión con tu contraseña.
                </p>
                <button
                  onClick={() => {
                    setModo("login");
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="w-full py-2.5 bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 text-xs font-bold rounded-xl shadow-xs transition"
                >
                  Entrar a ReqGen
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setModo("login");
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* VISTA 3: INICIO DE SESIÓN                                         */}
        {/* ================================================================= */}
        {modo === "login" && (
          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Correo electrónico:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analista@empresa.com"
                className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-300">Contraseña:</label>
                <button
                  type="button"
                  onClick={() => {
                    setModo("recuperar");
                    setError(null);
                    setMensajeExito(null);
                  }}
                  className="text-[11px] text-[#d4f63b] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 font-black rounded-xl shadow-xs transition disabled:opacity-50 text-xs mt-2"
            >
              {cargando ? "Iniciando sesión..." : "Entrar →"}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* VISTA 4: REGISTRO CON DOBLE CORREO, CONTRASEÑA, APODO Y CAPTCHA   */}
        {/* ================================================================= */}
        {modo === "registro" && (
          <form onSubmit={handleRegistro} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Nombre completo:</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Don Analista"
                  className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Apodo (Dashboard):
                </label>
                <input
                  type="text"
                  required
                  value={apodo}
                  onChange={(e) => setApodo(e.target.value)}
                  placeholder="Analizator"
                  className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
                  title="Este apodo aparecerá en el saludo de tu Dashboard principal"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Correo electrónico:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analista@empresa.com"
                className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Confirmar correo electrónico:
              </label>
              <input
                type="email"
                required
                value={confirmarEmail}
                onChange={(e) => setConfirmarEmail(e.target.value)}
                placeholder="Repite tu correo para verificar"
                className={`w-full p-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                  confirmarEmail && email.toLowerCase() !== confirmarEmail.toLowerCase()
                    ? "border-red-500 focus:ring-red-400"
                    : "border-slate-700 focus:border-[#d4f63b] focus:ring-[#d4f63b]"
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Contraseña <span className="text-[10px] text-slate-500">(8+ car., 1 mayús.)</span>:
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">
                  Confirmar contraseña:
                </label>
                <input
                  type="password"
                  required
                  value={confirmarPassword}
                  onChange={(e) => setConfirmarPassword(e.target.value)}
                  placeholder="Repite contraseña"
                  className={`w-full p-2.5 bg-slate-900/90 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                    confirmarPassword && password !== confirmarPassword
                      ? "border-red-500 focus:ring-red-400"
                      : "border-slate-700 focus:border-[#d4f63b] focus:ring-[#d4f63b]"
                  }`}
                />
              </div>
            </div>

            {/* Desafío Captcha */}
            <div className="p-3 bg-slate-900/80 border border-slate-700 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <span>🤖</span> Verificación anti-robot:
                </span>
                <button
                  type="button"
                  onClick={cargarCaptcha}
                  className="text-[10px] text-[#d4f63b] hover:underline"
                >
                  ↻ Cambiar
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg font-mono font-bold text-xs text-[#d4f63b] tracking-wider">
                  {captchaPregunta || "¿Cuánto es 5 + 3?"}
                </span>
                <input
                  type="text"
                  required
                  value={captchaRespuesta}
                  onChange={(e) => setCaptchaRespuesta(e.target.value)}
                  placeholder="Tu respuesta"
                  className="w-28 p-2 bg-slate-950 border border-slate-700 rounded-lg text-center font-bold text-white focus:outline-none focus:border-[#d4f63b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 font-black rounded-xl shadow-xs transition disabled:opacity-50 text-xs mt-1"
            >
              {cargando ? "Registrando..." : "Crear cuenta y validar email →"}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* VISTA 5: SOLICITAR RECUPERACIÓN DE CONTRASEÑA                    */}
        {/* ================================================================= */}
        {modo === "recuperar" && (
          <form onSubmit={handleSolicitarRecuperacion} className="space-y-3.5 text-xs">
            <p className="text-slate-400 text-xs">
              Ingresa el correo electrónico asociado a tu cuenta de analista. Te enviaremos un enlace para crear una nueva contraseña.
            </p>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Correo electrónico:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analista@empresa.com"
                className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
              />
            </div>

            {ultimoDevLink && (
              <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-left text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4f63b] bg-slate-800 px-1.5 py-0.5 rounded">
                  Modo Desarrollo / Local
                </span>
                <p className="text-[11px] text-slate-400">Enlace de recuperación generado:</p>
                <a href={ultimoDevLink} className="block text-xs font-bold text-[#d4f63b] hover:underline break-all">
                  Restablecer Contraseña →
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 font-black rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>

            <div className="border-t border-slate-800 pt-3 text-center">
              <button
                type="button"
                onClick={() => {
                  setModo("login");
                  setError(null);
                  setMensajeExito(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Volver a Iniciar Sesión
              </button>
            </div>
          </form>
        )}

        {/* ================================================================= */}
        {/* VISTA 6: RESTABLECER CONTRASEÑA CON TOKEN                         */}
        {/* ================================================================= */}
        {modo === "reset_password" && (
          <form onSubmit={handleRestablecerPassword} className="space-y-3.5 text-xs">
            <p className="text-slate-400 text-xs">
              Crea tu nueva contraseña. Debe tener al menos 8 caracteres y una letra mayúscula.
            </p>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Nueva contraseña:</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
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
                className="w-full p-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#d4f63b] focus:ring-1 focus:ring-[#d4f63b]"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full py-2.5 bg-[#d4f63b] hover:bg-[#c6f523] text-slate-950 font-black rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {cargando ? "Actualizando clave..." : "Guardar nueva contraseña"}
            </button>
          </form>
        )}

        {/* ================================================================= */}
        {/* VISTA 7: CONFIRMAR BAJA DEFINITIVA DE CUENTA                      */}
        {/* ================================================================= */}
        {modo === "baja_cuenta" && (
          <div className="space-y-4 text-center py-2 text-xs">
            <div className="w-14 h-14 bg-red-950/80 text-red-400 border border-red-800 rounded-full flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-base text-white">¿Confirmar baja definitiva?</h3>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Esta acción eliminará de forma irreversible tu cuenta de usuario, tus proyectos y todos los requisitos, historias de usuario y tareas asociados en PostgreSQL.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConfirmarBaja}
              disabled={cargando}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {cargando ? "Eliminando cuenta..." : "Sí, dar de baja definitivamente"}
            </button>

            <button
              type="button"
              onClick={() => {
                setModo("login");
                window.history.replaceState({}, document.title, window.location.pathname);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
            >
              Cancelar y volver
            </button>
          </div>
        )}

      </div>
    </div>
  );
};