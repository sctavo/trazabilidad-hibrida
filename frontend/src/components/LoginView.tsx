import React, { useState } from "react";

interface LoginViewProps {
  onLoginExitoso: (token: string, usuario: { id: string; nombre: string; email: string }) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginExitoso }) => {
  const [esRegistro, setEsRegistro] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      if (esRegistro) {
        const resp = await fetch("http://localhost:8000/api/v1/auth/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, email, password }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.detail || "Error en el registro.");
        }
        const data = await resp.json();
        onLoginExitoso(data.access_token, data.usuario);
      } else {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const resp = await fetch("http://localhost:8000/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.detail || "Credenciales inválidas.");
        }
        const data = await resp.json();
        onLoginExitoso(data.access_token, data.usuario);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 max-w-md w-full space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Trazabilidad Híbrida IA
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            {esRegistro ? "Crear cuenta de analista" : "Iniciar sesión en la plataforma"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Control de especificación, artefactos ágiles y persistencia relacional.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {esRegistro && (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nombre completo:</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Gustavo Sánchez"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Correo electrónico:</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analista@empresa.com"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Contraseña:</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            {cargando ? "Autenticando..." : esRegistro ? "Registrarse" : "Entrar al sistema"}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setEsRegistro(!esRegistro);
              setError(null);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {esRegistro
              ? "¿Ya tienes cuenta? Inicia sesión aquí"
              : "¿No tienes cuenta? Regístrate aquí"}
          </button>
        </div>
      </div>
    </div>
  );
};