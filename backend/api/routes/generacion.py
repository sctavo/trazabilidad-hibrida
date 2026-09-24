from fastapi import APIRouter
from api.schemas import TextoEntradaRequest, RequisitosResponse
from api.services.llm_service import extraer_requisitos_llm

router = APIRouter(prefix="/generar", tags=["Motor de Generación IA"])

@router.post("/requisitos/", response_model=RequisitosResponse)
async def generar_requisitos(solicitud: TextoEntradaRequest):
    requisitos = await extraer_requisitos_llm(solicitud.texto)
    return {"requisitos": requisitos}