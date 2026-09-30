from fastapi import APIRouter
from api.schemas import (
    TextoEntradaRequest, 
    RequisitosResponse, 
    GenerarHistoriasRequest, 
    HistoriasUsuarioResponse,
    RegenerarCriteriosRequest,
    CriteriosResponse,
    GenerarTareasRequest,
    TareasResponse,
    RequisitoItem,
    HistoriaUsuarioItem
)

from api.services.llm_service import (
    extraer_requisitos_llm, 
    derivar_historias_usuario_llm,
    regenerar_criterios_hu_llm,
    derivar_tareas_llm
)

router = APIRouter(prefix="/generar", tags=["Motor de Generación IA"])

@router.post("/requisitos/", response_model=RequisitosResponse)
async def generar_requisitos(solicitud: TextoEntradaRequest):
    requisitos = await extraer_requisitos_llm(solicitud.texto)
    return {"requisitos": requisitos}

@router.post("/historias-usuario/", response_model=HistoriasUsuarioResponse)
async def generar_historias_usuario(solicitud: GenerarHistoriasRequest):
    historias = await derivar_historias_usuario_llm([r.model_dump() for r in solicitud.requisitos])
    return {"historias_usuario": historias}

@router.post("/criterios-hu/", response_model=CriteriosResponse)
async def generar_criterios(solicitud: RegenerarCriteriosRequest):
    criterios = await regenerar_criterios_hu_llm(solicitud.model_dump())
    return {"criterios_aceptacion": criterios}

@router.post("/tareas/", response_model=TareasResponse)
async def generar_tareas(solicitud: GenerarTareasRequest):
    tareas = await derivar_tareas_llm([hu.model_dump() for hu in solicitud.historias_usuario])
    return {"tareas": tareas}

@router.post("/historias-usuario/regenerar-ru/", response_model=HistoriasUsuarioResponse)
async def regenerar_historias_de_ru(ru: RequisitoItem):
    """Genera historias de usuario únicamente para un requisito que fue modificado."""
    historias = await derivar_historias_usuario_llm([ru.model_dump()])
    return {"historias_usuario": historias}

@router.post("/tareas/regenerar-hu/", response_model=TareasResponse)
async def regenerar_tareas_de_hu(hu: HistoriaUsuarioItem):
    """Regenera tareas técnicas únicamente para una Historia de Usuario que cambió."""
    tareas = await derivar_tareas_llm([hu.model_dump()])
    return {"tareas": tareas}