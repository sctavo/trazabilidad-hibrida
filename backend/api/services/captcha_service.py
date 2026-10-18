import os
import random
from datetime import datetime, timedelta
import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super_secret_thesis_key_2026_change_in_production")
ALGORITHM = "HS256"

def generar_desafio_captcha() -> dict:
    """
    Genera un desafío aritmético sencillo para validar que el usuario es humano.
    Retorna la pregunta amigable y un token firmado con la respuesta esperada.
    """
    operacion = random.choice(["+", "-"])
    if operacion == "+":
        a = random.randint(2, 9)
        b = random.randint(1, 9)
        resultado = a + b
        pregunta = f"¿Cuánto es {a} + {b}?"
    else:
        a = random.randint(5, 12)
        b = random.randint(1, a - 1)
        resultado = a - b
        pregunta = f"¿Cuánto es {a} - {b}?"

    expira = datetime.utcnow() + timedelta(minutes=10)
    payload = {
        "tipo": "captcha_challenge",
        "ans": str(resultado),
        "exp": expira
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "pregunta": pregunta,
        "token": token
    }


def validar_respuesta_captcha(token: str, respuesta_usuario: str) -> bool:
    """
    Valida la respuesta del usuario contra el token de desafío firmado.
    """
    if not token or not respuesta_usuario:
        return False
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("tipo") != "captcha_challenge":
            return False
        return str(payload.get("ans")).strip() == str(respuesta_usuario).strip()
    except Exception:
        return False

