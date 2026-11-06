import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
import jwt
from fastapi import HTTPException, status
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super_secret_thesis_key_2026_change_in_production")
ALGORITHM = "HS256"

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", "ReqGen <no-reply@reqgen.com>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Almacén en memoria de los últimos correos generados (útil para pruebas y modo desarrollo)
ULTIMOS_EMAILS_DEV = {}

def construir_plantilla_reqgen(
    titulo_tarjeta: str,
    saludo_destinatario: str,
    cuerpo_texto: str,
    texto_boton: str,
    link_boton: str,
) -> str:
    """
    Genera el HTML del correo electrónico reproduciendo fielmente la estética
    oficial de ReqGen: tipografía moderna, tarjeta blanca centrada, botón charcoal
    y firma institucional.
    """
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{titulo_tarjeta}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 16px;
      color: #334155;
    }}
    .email-wrapper {{
      max-width: 540px;
      margin: 0 auto;
      text-align: center;
    }}
    .brand-logo {{
      font-size: 26px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.03em;
      margin-bottom: 28px;
    }}
    .card-container {{
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 44px 36px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
    }}
    .card-title {{
      font-size: 21px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 24px;
      letter-spacing: -0.02em;
    }}
    .greeting {{
      font-size: 15px;
      font-weight: 600;
      color: #334155;
      margin-bottom: 12px;
    }}
    .body-text {{
      font-size: 14px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 32px;
    }}
    .btn-action {{
      display: inline-block;
      background-color: #27272a;
      color: #ffffff !important;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 14px 36px;
      border-radius: 8px;
      text-decoration: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
      transition: background-color 0.2s ease;
    }}
    .btn-action:hover {{
      background-color: #18181b;
    }}
    .footer {{
      margin-top: 36px;
      font-size: 13px;
      color: #64748b;
      line-height: 1.5;
    }}
    .footer-brand {{
      font-weight: 800;
      color: #0f172a;
      font-size: 14px;
    }}
    .alt-link {{
      margin-top: 24px;
      font-size: 11px;
      color: #94a3b8;
      word-break: break-all;
    }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="brand-logo">ReqGen</div>
    <div class="card-container">
      <h1 class="card-title">{titulo_tarjeta}</h1>
      <p class="greeting">Hola {saludo_destinatario}</p>
      <p class="body-text">{cuerpo_texto}</p>
      
      <div>
        <a href="{link_boton}" class="btn-action" target="_blank">{texto_boton}</a>
      </div>

      <div class="footer">
        Gracias,<br>
        <span class="footer-brand">ReqGen</span>
      </div>

      <div class="alt-link">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
        <a href="{link_boton}" style="color: #3b82f6;">{link_boton}</a>
      </div>
    </div>
  </div>
</body>
</html>"""


# =====================================================================
# GESTIÓN DE TOKENS CON JWT
# =====================================================================

def generar_token_verificacion_email(usuario_id: str, email: str) -> str:
    expira = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "sub": str(usuario_id),
        "email": email.lower(),
        "tipo": "verificar_email",
        "exp": expira
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token_email(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "verificar_email":
            raise HTTPException(status_code=400, detail="Token no corresponde a verificación de email.")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El enlace de verificación ha expirado. Solicita uno nuevo.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Enlace de verificación inválido o corrupto.")


def generar_token_recuperacion_password(usuario_id: str, email: str, password_hash: str) -> str:
    expira = datetime.utcnow() + timedelta(hours=1)
    payload = {
        "sub": str(usuario_id),
        "email": email.lower(),
        "tipo": "recuperar_password",
        "fingerprint": password_hash[-10:],
        "exp": expira
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token_recuperacion(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "recuperar_password":
            raise HTTPException(status_code=400, detail="Token no corresponde a recuperación de contraseña.")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El enlace de recuperación ha expirado. Solicita uno nuevo.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Enlace de recuperación inválido.")


def generar_token_baja_cuenta(usuario_id: str, email: str) -> str:
    expira = datetime.utcnow() + timedelta(hours=2)
    payload = {
        "sub": str(usuario_id),
        "email": email.lower(),
        "tipo": "baja_cuenta",
        "exp": expira
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verificar_token_baja_cuenta(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "baja_cuenta":
            raise HTTPException(status_code=400, detail="Token no corresponde a confirmación de baja de cuenta.")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="El enlace de confirmación de baja ha expirado.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Enlace de confirmación inválido.")


# =====================================================================
# ENVÍO DE CORREOS ELECTRÓNICOS
# =====================================================================

def despachar_email(destinatario: str, asunto: str, html_content: str, link_accion: str):
    """
    Envía el correo por SMTP real si está configurado en .env; de lo contrario,
    lo registra en consola y en el búfer de desarrollo para pruebas sin SMTP.
    """
    destinatario_limpio = destinatario.strip().lower()
    ULTIMOS_EMAILS_DEV[destinatario_limpio] = {
        "destinatario": destinatario_limpio,
        "asunto": asunto,
        "link_accion": link_accion,
        "enviado_en": datetime.utcnow().isoformat(),
        "html": html_content
    }

    if SMTP_HOST and SMTP_USER and SMTP_PASSWORD:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = asunto
            msg["From"] = SMTP_FROM
            msg["To"] = destinatario_limpio
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_FROM, [destinatario_limpio], msg.as_string())
            print(f"[EMAIL SERVICE] Correo '{asunto}' enviado exitosamente a {destinatario_limpio}")
            return True
        except Exception as e:
            print(f"[EMAIL SERVICE] Error enviando por SMTP real a {destinatario_limpio}: {e}")
            return False
    else:
        print(f"\n[EMAIL DEV SIMULATOR] ----------------------------------------")
        print(f"Para: {destinatario_limpio}")
        print(f"Asunto: {asunto}")
        print(f"Enlace de acción: {link_accion}")
        print(f"-------------------------------------------------------------\n")
        return True


def enviar_email_confirmacion_registro(destinatario: str, apodo_o_nombre: str, token: str):
    link = f"{FRONTEND_URL}/?verificar_email={token}"
    html = construir_plantilla_reqgen(
        titulo_tarjeta="Email de Confirmación",
        saludo_destinatario=apodo_o_nombre,
        cuerpo_texto="Estás a un paso de empezar, solo necesitamos validar tu correo electrónico primero.",
        texto_boton="CONFIRMAR EMAIL",
        link_boton=link
    )
    despachar_email(destinatario, "Confirma tu cuenta en ReqGen", html, link)
    return link


def enviar_email_recuperacion_password(destinatario: str, apodo_o_nombre: str, token: str):
    link = f"{FRONTEND_URL}/?reset_token={token}"
    html = construir_plantilla_reqgen(
        titulo_tarjeta="Recuperación de Contraseña",
        saludo_destinatario=apodo_o_nombre,
        cuerpo_texto="Hemos recibido una solicitud para restablecer tu contraseña en ReqGen. Haz clic en el botón a continuación para crear tu nueva clave:",
        texto_boton="RESTABLECER CONTRASEÑA",
        link_boton=link
    )
    despachar_email(destinatario, "Restablece tu contraseña en ReqGen", html, link)
    return link


def enviar_email_baja_cuenta(destinatario: str, apodo_o_nombre: str, token: str):
    link = f"{FRONTEND_URL}/?baja_token={token}"
    html = construir_plantilla_reqgen(
        titulo_tarjeta="Confirmación de Baja de Cuenta",
        saludo_destinatario=apodo_o_nombre,
        cuerpo_texto="Has solicitado dar de baja tu cuenta en ReqGen. Al confirmar, tu usuario y todos tus proyectos, requisitos, historias y tareas serán eliminados permanentemente.",
        texto_boton="CONFIRMAR BAJA DE CUENTA",
        link_boton=link
    )
    despachar_email(destinatario, "Confirmación de baja de cuenta en ReqGen", html, link)
    return link

