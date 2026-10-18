from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import engine, get_db, Base
import models  # Importa los modelos ORM
from api.routes import ingesta, generacion, auth, proyectos

# Crea las tablas en PostgreSQL si no existen al iniciar la app
Base.metadata.create_all(bind=engine)

# Asegura que las columnas adicionales existan si las tablas ya habían sido creadas previamente
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE proyecto ADD COLUMN IF NOT EXISTS modelo_ia VARCHAR(100) DEFAULT 'google/gemini-2.5-flash-lite'"))
        conn.execute(text("ALTER TABLE usuario ADD COLUMN IF NOT EXISTS apodo VARCHAR(50)"))
        conn.execute(text("ALTER TABLE usuario ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT TRUE"))
        # Asignar apodo por defecto para cuentas existentes que no lo tengan
        conn.execute(text("UPDATE usuario SET apodo = split_part(nombre, ' ', 1) WHERE apodo IS NULL OR apodo = ''"))
        # Preservar cuentas existentes asegurando que queden verificadas
        conn.execute(text("UPDATE usuario SET email_verificado = TRUE WHERE email_verificado IS NULL"))
        conn.commit()
except Exception as e:
    print(f"Aviso migración base de datos: {e}")

app = FastAPI(title="Trazabilidad IA - Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de enrutadores
app.include_router(auth.router, prefix="/api/v1")
app.include_router(proyectos.router, prefix="/api/v1")
app.include_router(ingesta.router, prefix="/api/v1")
app.include_router(generacion.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"mensaje": "API de Trazabilidad Híbrida Operativa"}

@app.get("/api/v1/health/db")
def check_db_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"estado": "Conectado", "base_de_datos": "PostgreSQL activa en Docker"}
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error conectando a PostgreSQL: {str(e)}"
        )