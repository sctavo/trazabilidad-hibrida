from pydantic import BaseModel
from typing import Optional
from typing import List, Literal
import uuid
from datetime import datetime

# --- 1. Requisitos de Usuario (RU) ---
class RequisitoItem(BaseModel):
    id: str  # Ej: "RU1", "RU2"
    nombre: str
    descripcion: str
    fuente: str = "Documento base"
    estabilidad: Literal["Transable", "Intransable"] = "Transable"
    tipo: Literal["Funcional", "No Funcional"] = "Funcional"

class RequisitosResponse(BaseModel):
    requisitos: List[RequisitoItem]

class TextoEntradaRequest(BaseModel):
    texto: str

# --- 2. Historias de Usuario (HU) ---
class HistoriaUsuarioItem(BaseModel):
    id: str  # Ej: "HU-01"
    rf_origen: str  # ID del RU padre (ej: "RU1")
    titulo: str
    rol: str
    quiero: str
    para: str
    criterios_aceptacion: List[str]

class HistoriasUsuarioResponse(BaseModel):
    historias_usuario: List[HistoriaUsuarioItem]

class GenerarHistoriasRequest(BaseModel):
    requisitos: List[RequisitoItem]

# --- 3. Regeneración de Criterios con IA ---
class RegenerarCriteriosRequest(BaseModel):
    id: str
    titulo: str
    rol: str
    quiero: str
    para: str

class CriteriosResponse(BaseModel):
    criterios_aceptacion: List[str]

# --- 4. Tareas Técnicas (TSK) ---
class TareaItem(BaseModel):
    id: str  # Ej: "TSK-01"
    hu_origen: str  # ID de la HU padre (ej: "HU-01")
    titulo: str
    descripcion: str
    tipo: Literal["Frontend", "Backend", "Base de Datos", "Pruebas", "DevOps"]
    estimacion_horas: int

class TareasResponse(BaseModel):
    tareas: List[TareaItem]

class GenerarTareasRequest(BaseModel):
    historias_usuario: List[HistoriaUsuarioItem]

# ------------------------------Esquemas de Autenticación ------------------------
class UsuarioRegistroRequest(BaseModel):
    nombre: str
    email: str
    password: str

class UsuarioLoginRequest(BaseModel):
    email: str
    password: str

class UsuarioResponse(BaseModel):
    id: str
    nombre: str
    email: str
    rol: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse

# --- Esquemas de Persistencia de Proyectos  ---
class GuardarProyectoRequest(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    etapa_actual: int
    texto_documento: Optional[str] = None
    nombre_archivo: Optional[str] = "Entrada directa"
    requisitos: List[RequisitoItem] = []
    historias_usuario: List[HistoriaUsuarioItem] = []
    tareas: List[TareaItem] = []

class ProyectoResumenResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    etapa_actual: int
    creado_en: datetime

    class Config:
        from_attributes = True

class ProyectoDetalleResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    etapa_actual: int
    texto_documento: Optional[str]
    nombre_archivo: Optional[str]
    requisitos: List[RequisitoItem]
    historias_usuario: List[HistoriaUsuarioItem]
    tareas: List[TareaItem]