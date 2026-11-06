/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0f172a',      // Fondo base de la app (mismo que Landing)
          card: '#131d35',    // Superficie de tarjetas y modales (mismo que Login/Modal)
          elevated: '#1e293b',// Elementos elevados / hover
          border: '#1e293b',  // Bordes sutiles
          borderLight: '#334155',
        },
        brand: {
          blue: '#2563eb',    // Azul primario
          sky: '#38bdf8',     // Azul cielo / acento
          mint: '#2dd4bf',    // Verde menta / turquesa
          lime: '#d4f63b',    // Lima eléctrico (mismo que botón Landing)
        }
      }
    },
  },
  plugins: [],
}
