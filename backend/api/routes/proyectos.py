import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
from api.schemas import (
    GuardarProyectoRequest,
    ProyectoResumenResponse,
    ProyectoDetalleResponse,
    RequisitoItem,
    HistoriaUsuarioItem,
    TareaItem
)
from api.services.auth_service import obtener_usuario_actual

router = APIRouter(prefix="/proyectos", tags=["Gestión y Guardado de Proyectos"])

@router.get("/", response_model=List[ProyectoResumenResponse])
def listar_proyectos_usuario(
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Obtiene todos los proyectos del analista autenticado (HU-23)."""
    proyectos = db.query(models.Proyecto).filter(
        models.Proyecto.usuario_id == usuario_actual.id
    ).order_by(models.Proyecto.creado_en.desc()).all()
    
    return [
        {
            "id": str(p.id),
            "nombre": p.nombre,
            "descripcion": p.descripcion,
            "etapa_actual": p.etapa_actual,
            "creado_en": p.creado_en
        }
        for p in proyectos
    ]

@router.post("/", response_model=ProyectoDetalleResponse)
def guardar_o_actualizar_proyecto(
    solicitud: GuardarProyectoRequest,
    proyecto_id: str = None,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Persiste en base de datos: documento, requisitos, HU y tareas con su etapa (HU-22 / RF30)."""
    # 1. Obtener proyecto existente o instanciar uno nuevo
    if proyecto_id:
        proyecto = db.query(models.Proyecto).filter(
            models.Proyecto.id == uuid.UUID(proyecto_id),
            models.Proyecto.usuario_id == usuario_actual.id
        ).first()
        if not proyecto:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado.")
        proyecto.nombre = solicitud.nombre
        proyecto.descripcion = solicitud.descripcion
        proyecto.etapa_actual = solicitud.etapa_actual
    else:
        proyecto = models.Proyecto(
            usuario_id=usuario_actual.id,
            nombre=solicitud.nombre,
            descripcion=solicitud.descripcion,
            etapa_actual=solicitud.etapa_actual
        )
        db.add(proyecto)
        db.flush()

    # 2. Persistir Documento
    if solicitud.texto_documento:
        documento = db.query(models.Documento).filter(models.Documento.proyecto_id == proyecto.id).first()
        if not documento:
            documento = models.Documento(
                proyecto_id=proyecto.id,
                nombre_archivo=solicitud.nombre_archivo or "Documento base",
                texto_extraido=solicitud.texto_documento
            )
            db.add(documento)
        else:
            documento.texto_extraido = solicitud.texto_documento
            documento.nombre_archivo = solicitud.nombre_archivo or documento.nombre_archivo
        db.flush()

    # 3. Persistir Requisitos (RU)
    db.query(models.Requisito).filter(models.Requisito.proyecto_id == proyecto.id).delete()
    db_requisitos = {}
    for r in solicitud.requisitos:
        nuevo_ru = models.Requisito(
            proyecto_id=proyecto.id,
            codigo=r.id,
            nombre=r.nombre,
            descripcion=r.descripcion,
            fuente=r.fuente,
            estabilidad=r.estabilidad,
            tipo=r.tipo
        )
        db.add(nuevo_ru)
        db_requisitos[r.id] = nuevo_ru
    db.flush()

    # 4. Persistir Historias de Usuario (HU)
    db.query(models.HistoriaUsuario).filter(models.HistoriaUsuario.proyecto_id == proyecto.id).delete()
    db_historias = {}
    for h in solicitud.historias_usuario:
        nueva_hu = models.HistoriaUsuario(
            proyecto_id=proyecto.id,
            codigo=h.id,
            titulo=h.titulo,
            rol=h.rol,
            accion=h.quiero,
            beneficio=h.para,
            criterios_aceptacion=h.criterios_aceptacion
        )
        # Vínculo trazabilidad N:M
        ru_padre = db_requisitos.get(h.rf_origen)
        if ru_padre:
            nueva_hu.requisitos_origen.append(ru_padre)
            
        db.add(nueva_hu)
        db_historias[h.id] = nueva_hu
    db.flush()

    # 5. Persistir Tareas Técnicas (TSK)
    db.query(models.Tarea).filter(models.Tarea.proyecto_id == proyecto.id).delete()
    for t in solicitud.tareas:
        hu_padre = db_historias.get(t.hu_origen)
        if hu_padre:
            nueva_tsk = models.Tarea(
                proyecto_id=proyecto.id,
                historia_usuario_id=hu_padre.id,
                codigo=t.id,
                titulo=t.titulo,
                descripcion=t.descripcion,
                tipo=t.tipo,
                estimacion=t.estimacion_horas
            )
            db.add(nueva_tsk)

    db.commit()
    db.refresh(proyecto)

    doc_actual = db.query(models.Documento).filter(models.Documento.proyecto_id == proyecto.id).first()

    return {
        "id": str(proyecto.id),
        "nombre": proyecto.nombre,
        "descripcion": proyecto.descripcion,
        "etapa_actual": proyecto.etapa_actual,
        "texto_documento": doc_actual.texto_extraido if doc_actual else "",
        "nombre_archivo": doc_actual.nombre_archivo if doc_actual else "",
        "requisitos": solicitud.requisitos,
        "historias_usuario": solicitud.historias_usuario,
        "tareas": solicitud.tareas
    }

@router.get("/{proyecto_id}", response_model=ProyectoDetalleResponse)
def cargar_proyecto_completo(
    proyecto_id: str,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Recupera el estado completo de un proyecto guardado (HU-23 / RF31)."""
    proyecto = db.query(models.Proyecto).filter(
        models.Proyecto.id == uuid.UUID(proyecto_id),
        models.Proyecto.usuario_id == usuario_actual.id
    ).first()

    if not proyecto:
        raise HTTPException(status_code=404, detail="El proyecto solicitado no existe.")

    doc = db.query(models.Documento).filter(models.Documento.proyecto_id == proyecto.id).first()
    
    # Reconstrucción de artefactos
    requisitos_db = db.query(models.Requisito).filter(models.Requisito.proyecto_id == proyecto.id).all()
    requisitos_dto = [
        RequisitoItem(
            id=r.codigo,
            nombre=r.nombre,
            descripcion=r.descripcion,
            fuente=r.fuente,
            estabilidad=r.estabilidad,
            tipo=r.tipo
        )
        for r in requisitos_db
    ]

    historias_db = db.query(models.HistoriaUsuario).filter(models.HistoriaUsuario.proyecto_id == proyecto.id).all()
    historias_dto = []
    for h in historias_db:
        origen = h.requisitos_origen[0].codigo if h.requisitos_origen else "RU1"
        historias_dto.append(
            HistoriaUsuarioItem(
                id=h.codigo,
                rf_origen=origen,
                titulo=h.titulo,
                rol=h.rol,
                quiero=h.accion,
                para=h.beneficio,
                criterios_aceptacion=h.criterios_aceptacion or []
            )
        )

    tareas_db = db.query(models.Tarea).filter(models.Tarea.proyecto_id == proyecto.id).all()
    tareas_dto = [
        TareaItem(
            id=t.codigo,
            hu_origen=t.historia_usuario.codigo if t.historia_usuario else "HU-01",
            titulo=t.titulo,
            descripcion=t.descripcion,
            tipo=t.tipo,
            estimacion_horas=t.estimacion
        )
        for t in tareas_db
    ]

    return {
        "id": str(proyecto.id),
        "nombre": proyecto.nombre,
        "descripcion": proyecto.descripcion,
        "etapa_actual": proyecto.etapa_actual,
        "texto_documento": doc.texto_extraido if doc else "",
        "nombre_archivo": doc.nombre_archivo if doc else "",
        "requisitos": requisitos_dto,
        "historias_usuario": historias_dto,
        "tareas": tareas_dto
    }

@router.delete("/{proyecto_id}")
def eliminar_proyecto(
    proyecto_id: str,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Elimina un proyecto y todos sus artefactos asociados en cascada."""
    proyecto = db.query(models.Proyecto).filter(
        models.Proyecto.id == uuid.UUID(proyecto_id),
        models.Proyecto.usuario_id == usuario_actual.id
    ).first()
    if not proyecto:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado.")

    db.delete(proyecto)
    db.commit()
    return {"mensaje": "Proyecto eliminado exitosamente."}