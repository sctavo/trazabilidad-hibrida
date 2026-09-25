from pydantic import BaseModel
from typing import List, Literal

# --- Esquemas para Requisitos de Usuario ---
class RequisitoItem(BaseModel):
    id: str  # Ej: "RF01"
    descripcion: str
    prioridad: Literal["Alta", "Media", "Baja"]

class RequisitosResponse(BaseModel):
    requisitos: List[RequisitoItem]

class TextoEntradaRequest(BaseModel):
    texto: str



# --- Esquemas para Historias de Usuario ---
class HistoriaUsuarioItem(BaseModel):
    id: str
    rf_origen: str
    titulo: str
    rol: str
    quiero: str
    para: str
    criterios_aceptacion: List[str]

class HistoriasUsuarioResponse(BaseModel):
    historias_usuario: List[HistoriaUsuarioItem]

class GenerarHistoriasRequest(BaseModel):
    requisitos: List[RequisitoItem]