from pydantic import BaseModel
from typing import List, Literal

class RequisitoItem(BaseModel):
    id: str  # Ej: "RF01"
    descripcion: str
    prioridad: Literal["Alta", "Media", "Baja"]

class RequisitosResponse(BaseModel):
    requisitos: List[RequisitoItem]

class TextoEntradaRequest(BaseModel):
    texto: str