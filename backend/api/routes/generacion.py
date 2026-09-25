from fastapi import APIRouter
from api.schemas import (
    TextoEntradaRequest, 
    RequisitosResponse, 
    GenerarHistoriasRequest, 
    HistoriasUsuarioResponse
)
from api.services.llm_service import extraer_requisitos_llm, derivar_historias_usuario_llm

router = APIRouter(prefix="/generar", tags=["Motor de Generación IA"])

@router.post("/requisitos/", response_model=RequisitosResponse)
async def generar_requisitos(solicitud: TextoEntradaRequest):
    requisitos = await extraer_requisitos_llm(solicitud.texto)
    return {"requisitos": requisitos}

@router.post("/historias-usuario/", response_model=HistoriasUsuarioResponse)
async def generar_historias_usuario(solicitud: GenerarHistoriasRequest):
    historias = await derivar_historias_usuario_llm([r.model_dump() for r in solicitud.requisitos])
    return {"historias_usuario": historias}