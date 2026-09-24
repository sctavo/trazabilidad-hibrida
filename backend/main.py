from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import ingesta

app = FastAPI(title="Trazabilidad IA - Backend")

# Configuración de CORS para permitir peticiones desde React (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Origen del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inyectamos el módulo de ingesta
app.include_router(ingesta.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"mensaje": "API de Trazabilidad Híbrida Operativa"}