import re
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
import models
from api.schemas import (
    UsuarioRegistroRequest,
    TokenResponse,
    UsuarioResponse,
    CaptchaResponse,
    ReenviarConfirmacionRequest,
    SolicitarRecuperacionRequest,
    RestablecerPasswordRequest,
    ActualizarPerfilRequest,
    CambiarPasswordRequest,
    ConfirmarBajaRequest,
)
from api.services.auth_service import (
    hashear_password,
    verificar_password,
    crear_token_acceso,
    obtener_usuario_actual,
)
from api.services.captcha_service import (
    generar_desafio_captcha,
    validar_respuesta_captcha,
)
from api.services.email_service import (
    generar_token_verificacion_email,
    verificar_token_email,
    generar_token_recuperacion_password,
    verificar_token_recuperacion,
    generar_token_baja_cuenta,
    verificar_token_baja_cuenta,
    enviar_email_confirmacion_registro,
    enviar_email_recuperacion_password,
    enviar_email_baja_cuenta,
    ULTIMOS_EMAILS_DEV,
)

router = APIRouter(prefix="/auth", tags=["Autenticación, Seguridad y Perfil"])


# =====================================================================
# 1. CAPTCHA AMIGABLE
# =====================================================================

@router.get("/captcha", response_model=CaptchaResponse)
def obtener_captcha():
    """Genera un desafío aritmético sencillo para validar interacción humana."""
    return generar_desafio_captcha()


# =====================================================================
# 2. REGISTRO CON DOBLE CORREO, CONTRASEÑA SEGURA Y VALIDACIÓN EMAIL
# =====================================================================

@router.post("/registro")
def registrar_usuario(solicitud: UsuarioRegistroRequest, db: Session = Depends(get_db)):
    """
    Registra un nuevo analista con validación de:
    - Doble ingreso de email coincidente.
    - Doble ingreso de contraseña coincidente (mínimo 8 caracteres y 1 mayúscula).
    - Verificación humana por Captcha.
    - Envío de enlace de confirmación por correo (sin acceso hasta validar).
    """
    email_limpio = solicitud.email.strip().lower()
    confirm_email_limpio = solicitud.confirmar_email.strip().lower()

    # 1. Coincidencia de correo
    if email_limpio != confirm_email_limpio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Los correos electrónicos ingresados no coinciden."
        )

    # 2. Coincidencia de contraseña
    if solicitud.password != solicitud.confirmar_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Las contraseñas ingresadas no coinciden."
        )

    # 3. Políticas de seguridad de contraseña: mín 8 car y al menos 1 mayúscula
    if len(solicitud.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe tener un mínimo de 8 caracteres."
        )
    if not re.search(r"[A-Z]", solicitud.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña debe contener al menos una letra mayúscula."
        )

    # 4. Validación de Captcha
    if not validar_respuesta_captcha(solicitud.captcha_token, solicitud.captcha_respuesta):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La respuesta del Captcha anti-robot es incorrecta. Inténtalo de nuevo."
        )

    # 5. Comprobar si ya existe el correo
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.email == email_limpio).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado."
        )

    # 6. Crear usuario con email no verificado
    nombre_limpio = solicitud.nombre.strip()
    apodo_limpio = solicitud.apodo.strip() if solicitud.apodo else nombre_limpio.split()[0]

    nuevo_usuario = models.Usuario(
        nombre=nombre_limpio,
        apodo=apodo_limpio,
        email=email_limpio,
        password_hash=hashear_password(solicitud.password),
        email_verificado=False,
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    # 7. Generar token y enviar correo de confirmación
    token_verif = generar_token_verificacion_email(str(nuevo_usuario.id), nuevo_usuario.email)
    dev_link = enviar_email_confirmacion_registro(nuevo_usuario.email, nuevo_usuario.apodo, token_verif)

    return {
        "mensaje": "Cuenta creada exitosamente. Hemos enviado un correo de confirmación a tu dirección de email. Por favor confirma tu cuenta antes de iniciar sesión.",
        "email": nuevo_usuario.email,
        "email_verificado": False,
        "dev_link": dev_link
    }


# =====================================================================
# 3. CONFIRMACIÓN Y REENVÍO DE CORREO
# =====================================================================

@router.get("/verificar-email")
def verificar_correo_cuenta(token: str = Query(...), db: Session = Depends(get_db)):
    """Activa la cuenta del usuario validando el token firmado recibido por correo."""
    payload = verificar_token_email(token)
    usuario_id = payload.get("sub")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if usuario.email_verificado:
        return {
            "exito": True,
            "mensaje": "Tu correo electrónico ya había sido verificado anteriormente. Puedes iniciar sesión.",
            "ya_verificado": True
        }

    usuario.email_verificado = True
    db.commit()

    return {
        "exito": True,
        "mensaje": "¡Correo electrónico confirmado exitosamente! Ya puedes iniciar sesión con tu cuenta.",
        "email": usuario.email
    }


@router.post("/reenviar-confirmacion")
def reenviar_correo_confirmacion(solicitud: ReenviarConfirmacionRequest, db: Session = Depends(get_db)):
    """Reenvía el enlace de verificación al correo del usuario si aún no está validado."""
    email_limpio = solicitud.email.strip().lower()
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email_limpio).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="No existe una cuenta asociada a este correo electrónico.")

    if usuario.email_verificado:
        raise HTTPException(status_code=400, detail="Esta cuenta ya se encuentra verificada. Puedes iniciar sesión directamente.")

    token_verif = generar_token_verificacion_email(str(usuario.id), usuario.email)
    dev_link = enviar_email_confirmacion_registro(usuario.email, usuario.apodo or usuario.nombre, token_verif)

    return {
        "mensaje": f"Se ha reenviado un nuevo correo de confirmación a {usuario.email}.",
        "dev_link": dev_link
    }


# =====================================================================
# 4. INICIO DE SESIÓN (BLOQUEADO SI EMAIL NO ESTÁ VERIFICADO)
# =====================================================================

@router.post("/login", response_model=TokenResponse)
def iniciar_sesion(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Autentica al usuario. Si el correo no ha sido verificado, bloquea el acceso
    con HTTP 403 Forbidden para exigir la confirmación.
    """
    email_limpio = form_data.username.strip().lower()
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email_limpio).first()

    if not usuario or not verificar_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo electrónico o contraseña incorrectos."
        )

    # Exigir validación previa de correo electrónico
    if not usuario.email_verificado:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu correo electrónico no ha sido verificado. Por favor valida tu cuenta a través del correo que te enviamos o solicita un reenvío."
        )

    token = crear_token_acceso({"sub": str(usuario.id), "email": usuario.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": str(usuario.id),
            "nombre": usuario.nombre,
            "apodo": usuario.apodo or usuario.nombre.split()[0],
            "email": usuario.email,
            "rol": usuario.rol,
            "email_verificado": usuario.email_verificado,
        }
    }


# =====================================================================
# 5. RECUPERACIÓN DE CONTRASEÑA ("OLVIDÉ MI CONTRASEÑA")
# =====================================================================

@router.post("/solicitar-recuperacion")
def solicitar_recuperacion_password(solicitud: SolicitarRecuperacionRequest, db: Session = Depends(get_db)):
    """Envía un correo con token temporal para restablecer la contraseña."""
    email_limpio = solicitud.email.strip().lower()
    usuario = db.query(models.Usuario).filter(models.Usuario.email == email_limpio).first()

    dev_link = None
    if usuario:
        token_reset = generar_token_recuperacion_password(str(usuario.id), usuario.email, usuario.password_hash)
        dev_link = enviar_email_recuperacion_password(usuario.email, usuario.apodo or usuario.nombre, token_reset)

    return {
        "mensaje": "Si el correo electrónico ingresado está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.",
        "dev_link": dev_link
    }


@router.post("/restablecer-password")
def restablecer_password(solicitud: RestablecerPasswordRequest, db: Session = Depends(get_db)):
    """Valida el token recibido por correo y actualiza la contraseña del analista."""
    payload = verificar_token_recuperacion(solicitud.token)
    usuario_id = payload.get("sub")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if solicitud.nueva_password != solicitud.confirmar_password:
        raise HTTPException(status_code=400, detail="Las nuevas contraseñas no coinciden.")

    if len(solicitud.nueva_password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres.")
    if not re.search(r"[A-Z]", solicitud.nueva_password):
        raise HTTPException(status_code=400, detail="La contraseña debe incluir al menos una letra mayúscula.")

    usuario.password_hash = hashear_password(solicitud.nueva_password)
    db.commit()

    return {"mensaje": "Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva clave."}


# =====================================================================
# 6. CONFIGURACIÓN DE PERFIL Y CAMBIO DE APODO / CONTRASEÑA
# =====================================================================

@router.get("/me", response_model=UsuarioResponse)
@router.get("/perfil", response_model=UsuarioResponse)
def obtener_perfil_usuario(usuario_actual: models.Usuario = Depends(obtener_usuario_actual)):
    """Obtiene los datos completos del perfil del usuario autenticado."""
    return {
        "id": str(usuario_actual.id),
        "nombre": usuario_actual.nombre,
        "apodo": usuario_actual.apodo or usuario_actual.nombre.split()[0],
        "email": usuario_actual.email,
        "rol": usuario_actual.rol,
        "email_verificado": usuario_actual.email_verificado,
    }


@router.put("/perfil", response_model=UsuarioResponse)
def actualizar_apodo_perfil(
    solicitud: ActualizarPerfilRequest,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Actualiza el apodo del analista que se visualiza en el Dashboard principal."""
    nuevo_apodo = solicitud.apodo.strip()
    if len(nuevo_apodo) < 2:
        raise HTTPException(status_code=400, detail="El apodo debe tener al menos 2 caracteres.")

    usuario_actual.apodo = nuevo_apodo
    db.commit()
    db.refresh(usuario_actual)

    return {
        "id": str(usuario_actual.id),
        "nombre": usuario_actual.nombre,
        "apodo": usuario_actual.apodo,
        "email": usuario_actual.email,
        "rol": usuario_actual.rol,
        "email_verificado": usuario_actual.email_verificado,
    }


@router.put("/cambiar-password")
def cambiar_password_perfil(
    solicitud: CambiarPasswordRequest,
    db: Session = Depends(get_db),
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Permite al usuario cambiar su contraseña verificando la actual."""
    if not verificar_password(solicitud.password_actual, usuario_actual.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual ingresada es incorrecta.")

    if solicitud.nueva_password != solicitud.confirmar_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña y su confirmación no coinciden.")

    if len(solicitud.nueva_password) < 8:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 8 caracteres.")
    if not re.search(r"[A-Z]", solicitud.nueva_password):
        raise HTTPException(status_code=400, detail="La nueva contraseña debe incluir al menos una letra mayúscula.")

    usuario_actual.password_hash = hashear_password(solicitud.nueva_password)
    db.commit()

    return {"mensaje": "Contraseña actualizada exitosamente."}


# =====================================================================
# 7. DAR DE BAJA LA CUENTA CON CONFIRMACIÓN AL CORREO
# =====================================================================

@router.post("/solicitar-baja-cuenta")
def solicitar_baja_cuenta(
    usuario_actual: models.Usuario = Depends(obtener_usuario_actual)
):
    """Genera token y envía correo para confirmar la eliminación irreversible de la cuenta."""
    token_baja = generar_token_baja_cuenta(str(usuario_actual.id), usuario_actual.email)
    dev_link = enviar_email_baja_cuenta(usuario_actual.email, usuario_actual.apodo or usuario_actual.nombre, token_baja)

    return {
        "mensaje": f"Se ha enviado un correo de confirmación de baja a {usuario_actual.email}. Revisa tu bandeja de entrada para autorizar la eliminación.",
        "dev_link": dev_link
    }


@router.post("/confirmar-baja-cuenta")
def confirmar_baja_cuenta(solicitud: ConfirmarBajaRequest, db: Session = Depends(get_db)):
    """Elimina permanentemente al usuario y todos sus proyectos/datos tras validar el token de correo."""
    payload = verificar_token_baja_cuenta(solicitud.token)
    usuario_id = payload.get("sub")

    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o ya fue dado de baja.")

    db.delete(usuario)
    db.commit()

    return {"mensaje": "Tu cuenta y todos tus datos han sido dados de baja de manera definitiva de ReqGen."}


# =====================================================================
# 8. DEV HELPER PARA PRUEBAS LOCALES (SIN NECESIDAD DE CONFIGURAR SMTP)
# =====================================================================

@router.get("/dev/ultimo-email")
def obtener_ultimo_email_dev(email: str = Query(...)):
    """Permite recuperar el enlace del último correo generado para un destinatario en entorno local."""
    email_key = email.strip().lower()
    info = ULTIMOS_EMAILS_DEV.get(email_key)
    if not info:
        raise HTTPException(status_code=404, detail="No hay correos en búfer para esta dirección.")
    return info