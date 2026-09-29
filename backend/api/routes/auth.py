from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
from api.schemas import (
    UsuarioRegistroRequest,
    TokenResponse,
    UsuarioResponse
)
from api.services.auth_service import (
    hashear_password,
    verificar_password,
    crear_token_acceso,
    obtener_usuario_actual
)

router = APIRouter(prefix="/auth", tags=["Autenticación y Seguridad"])

@router.post("/registro", response_model=TokenResponse)
def registrar_usuario(solicitud: UsuarioRegistroRequest, db: Session = Depends(get_db)):
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == solicitud.email.lower()).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado."
        )

    nuevo_usuario = models.Usuario(
        nombre=solicitud.nombre,
        email=solicitud.email.lower(),
        password_hash=hashear_password(solicitud.password)
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    token = crear_token_acceso({"sub": str(nuevo_usuario.id), "email": nuevo_usuario.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": str(nuevo_usuario.id),
            "nombre": nuevo_usuario.nombre,
            "email": nuevo_usuario.email,
            "rol": nuevo_usuario.rol
        }
    }

@router.post("/login", response_model=TokenResponse)
def iniciar_sesion(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # form_data.username recibe el email ingresado en Swagger
    usuario = db.query(models.Usuario).filter(models.Usuario.email == form_data.username.lower()).first()
    if not usuario or not verificar_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    token = crear_token_acceso({"sub": str(usuario.id), "email": usuario.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": str(usuario.id),
            "nombre": usuario.nombre,
            "email": usuario.email,
            "rol": usuario.rol
        }
    }

@router.get("/me", response_model=UsuarioResponse)
def obtener_perfil_usuario(usuario_actual: models.Usuario = Depends(obtener_usuario_actual)):
    return {
        "id": str(usuario_actual.id),
        "nombre": usuario_actual.nombre,
        "email": usuario_actual.email,
        "rol": usuario_actual.rol
    }