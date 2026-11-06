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
    modelo: Optional[str] = "google/gemini-2.5-flash-lite"

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
    modelo: Optional[str] = "google/gemini-2.5-flash-lite"

# --- 3. Regeneración de Criterios con IA ---
class RegenerarCriteriosRequest(BaseModel):
    id: str
    titulo: str
    rol: str
    quiero: str
    para: str
    modelo: Optional[str] = "google/gemini-2.5-flash-lite"

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
    modelo: Optional[str] = "google/gemini-2.5-flash-lite"

# ------------------------------Esquemas de Autenticación y Perfil ------------------------
class CaptchaResponse(BaseModel):
    pregunta: str
    token: str

class UsuarioRegistroRequest(BaseModel):
    nombre: str
    apodo: str
    email: str
    confirmar_email: str
    password: str
    confirmar_password: str
    captcha_token: str
    captcha_respuesta: str

class UsuarioLoginRequest(BaseModel):
    email: str
    password: str

class UsuarioResponse(BaseModel):
    id: str
    nombre: str
    apodo: Optional[str] = None
    email: str
    rol: str
    email_verificado: bool = True

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse

class ReenviarConfirmacionRequest(BaseModel):
    email: str

class SolicitarRecuperacionRequest(BaseModel):
    email: str

class RestablecerPasswordRequest(BaseModel):
    token: str
    nueva_password: str
    confirmar_password: str

class ActualizarPerfilRequest(BaseModel):
    apodo: str

class CambiarPasswordRequest(BaseModel):
    password_actual: str
    nueva_password: str
    confirmar_password: str

class ConfirmarBajaRequest(BaseModel):
    token: str

# --- Esquemas de Persistencia de Proyectos  ---
class GuardarProyectoRequest(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    etapa_actual: int
    modelo_ia: Optional[str] = "google/gemini-2.5-flash-lite"
    texto_documento: Optional[str] = None
    nombre_archivo: Optional[str] = "Entrada directa"
    requisitos: List[RequisitoItem] = []
    historias_usuario: List[HistoriaUsuarioItem] = []
    tareas: List[TareaItem] = []

class ProyectoResumenResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str] = None
    etapa_actual: int
    modelo_ia: Optional[str] = "google/gemini-2.5-flash-lite"
    creado_en: datetime
    total_requisitos: Optional[int] = 0
    total_historias: Optional[int] = 0
    total_tareas: Optional[int] = 0
    total_horas: Optional[int] = 0

    class Config:
        from_attributes = True

class ProyectoDetalleResponse(BaseModel):
    id: str
    nombre: str
    descripcion: Optional[str]
    etapa_actual: int
    modelo_ia: Optional[str] = "google/gemini-2.5-flash-lite"
    texto_documento: Optional[str]
    nombre_archivo: Optional[str]
    requisitos: List[RequisitoItem]
    historias_usuario: List[HistoriaUsuarioItem]
    tareas: List[TareaItem]