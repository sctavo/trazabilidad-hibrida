from pydantic import BaseModel
from typing import List, Literal

# --- Esquema de Requisito de Usuario (RU) formalizado ---
class RequisitoItem(BaseModel):
    id: str  # Ej: "RU1", "RU2"
    nombre: str  # Ej: "Registrar Vehículo"
    descripcion: str
    fuente: str = "Documento base"
    estabilidad: Literal["Transable", "Intransable"] = "Transable"
    tipo: Literal["Funcional", "No Funcional"] = "Funcional"

class RequisitosResponse(BaseModel):
    requisitos: List[RequisitoItem]

class TextoEntradaRequest(BaseModel):
    texto: str

# --- Esquemas de Historias de Usuario ---
class HistoriaUsuarioItem(BaseModel):
    id: str
    rf_origen: str  # ID del RU origen (ej: "RU1")
    titulo: str
    rol: str
    quiero: str
    para: str
    criterios_aceptacion: List[str]

class HistoriasUsuarioResponse(BaseModel):
    historias_usuario: List[HistoriaUsuarioItem]

class GenerarHistoriasRequest(BaseModel):
    requisitos: List[RequisitoItem]

# --- Esquema para regenerar Criterios de Aceptación con IA ---
class RegenerarCriteriosRequest(BaseModel):
    id: str
    titulo: str
    rol: str
    quiero: str
    para: str

class CriteriosResponse(BaseModel):
    criterios_aceptacion: List[str]