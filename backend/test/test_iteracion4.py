import uuid
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
import models
import jwt
from api.services.captcha_service import SECRET_KEY, ALGORITHM

client = TestClient(app)

def resolver_captcha():
    res = client.get("/api/v1/auth/captcha")
    assert res.status_code == 200
    data = res.json()
    payload = jwt.decode(data["token"], SECRET_KEY, algorithms=[ALGORITHM])
    return data["token"], payload["ans"]

# =====================================================================
# 1. PRUEBAS DE CAPTCHA Y POLÍTICAS DE VALIDACIÓN EN REGISTRO
# =====================================================================

def test_captcha_generacion_y_validacion():
    token, respuesta = resolver_captcha()
    assert token is not None
    assert str(respuesta).isdigit() or "-" in str(respuesta)


def test_registro_correos_no_coinciden():
    token, respuesta = resolver_captcha()
    payload = {
        "nombre": "Carlos Perez",
        "apodo": "Charlie",
        "email": "carlos@test.com",
        "confirmar_email": "carlos_distinto@test.com",
        "password": "Password123!",
        "confirmar_password": "Password123!",
        "captcha_token": token,
        "captcha_respuesta": respuesta
    }
    res = client.post("/api/v1/auth/registro", json=payload)
    assert res.status_code == 400
    assert "correos electrónicos ingresados no coinciden" in res.json()["detail"]


def test_registro_passwords_no_coinciden():
    token, respuesta = resolver_captcha()
    payload = {
        "nombre": "Carlos Perez",
        "apodo": "Charlie",
        "email": "carlos@test.com",
        "confirmar_email": "carlos@test.com",
        "password": "Password123!",
        "confirmar_password": "Password999!",
        "captcha_token": token,
        "captcha_respuesta": respuesta
    }
    res = client.post("/api/v1/auth/registro", json=payload)
    assert res.status_code == 400
    assert "contraseñas ingresadas no coinciden" in res.json()["detail"]


def test_registro_password_sin_mayuscula_o_menor_a_8_caracteres():
    token, respuesta = resolver_captcha()
    # Caso 1: menor a 8 caracteres
    p1 = {
        "nombre": "Ana", "apodo": "Ani",
        "email": "ana@test.com", "confirmar_email": "ana@test.com",
        "password": "Pass1", "confirmar_password": "Pass1",
        "captcha_token": token, "captcha_respuesta": respuesta
    }
    assert client.post("/api/v1/auth/registro", json=p1).status_code == 400

    # Caso 2: sin mayúscula
    token2, respuesta2 = resolver_captcha()
    p2 = {
        "nombre": "Ana", "apodo": "Ani",
        "email": "ana2@test.com", "confirmar_email": "ana2@test.com",
        "password": "password_sin_mayuscula123", "confirmar_password": "password_sin_mayuscula123",
        "captcha_token": token2, "captcha_respuesta": respuesta2
    }
    res = client.post("/api/v1/auth/registro", json=p2)
    assert res.status_code == 400
    assert "al menos una letra mayúscula" in res.json()["detail"]


def test_registro_captcha_incorrecto():
    token, _ = resolver_captcha()
    payload = {
        "nombre": "Pedro", "apodo": "Peter",
        "email": "pedro@test.com", "confirmar_email": "pedro@test.com",
        "password": "Password123!", "confirmar_password": "Password123!",
        "captcha_token": token, "captcha_respuesta": "99999"  # Respuesta incorrecta
    }
    res = client.post("/api/v1/auth/registro", json=payload)
    assert res.status_code == 400
    assert "anti-robot es incorrecta" in res.json()["detail"]


# =====================================================================
# 2. PRUEBA DE FLUJO COMPLETO: REGISTRO -> BLOQUEO -> CONFIRMAR EMAIL -> LOGIN
# =====================================================================

def test_flujo_verificacion_email_y_bloqueo_login():
    unique = str(uuid.uuid4())[:8]
    email = f"nuevo_analista_{unique}@correo.com"
    password = "PasswordSegura2026!"
    token_cap, ans_cap = resolver_captcha()

    # 1. Registro exitoso
    reg_payload = {
        "nombre": f"Analista {unique}",
        "apodo": f"Apodo{unique}",
        "email": email,
        "confirmar_email": email,
        "password": password,
        "confirmar_password": password,
        "captcha_token": token_cap,
        "captcha_respuesta": ans_cap
    }
    reg_res = client.post("/api/v1/auth/registro", json=reg_payload)
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["email_verificado"] is False
    assert "dev_link" in reg_data

    # 2. Intento de login antes de verificar -> DEBE SER RECHAZADO CON 403
    login_intento = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert login_intento.status_code == 403
    assert "no ha sido verificado" in login_intento.json()["detail"]

    # 3. Obtener token del correo desde el búfer dev
    dev_email_res = client.get(f"/api/v1/auth/dev/ultimo-email?email={email}")
    assert dev_email_res.status_code == 200
    link = dev_email_res.json()["link_accion"]
    token_verif = link.split("verificar_email=")[1]

    # 4. Validar correo vía endpoint
    verif_res = client.get(f"/api/v1/auth/verificar-email?token={token_verif}")
    assert verif_res.status_code == 200
    assert verif_res.json()["exito"] is True

    # 5. Intentar login nuevamente -> DEBE SER EXITOSO (HTTP 200)
    login_exito = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert login_exito.status_code == 200
    user_data = login_exito.json()["usuario"]
    assert user_data["email_verificado"] is True
    assert user_data["apodo"] == f"Apodo{unique}"


# =====================================================================
# 3. RECUPERACIÓN DE CONTRASEÑA
# =====================================================================

def test_recuperacion_de_password():
    unique = str(uuid.uuid4())[:8]
    email = f"recuperar_{unique}@correo.com"
    pwd_inicial = "PasswordVieja123!"
    pwd_nueva = "PasswordNueva456!"

    token_cap, ans_cap = resolver_captcha()
    client.post("/api/v1/auth/registro", json={
        "nombre": "User Recup", "apodo": "Recup",
        "email": email, "confirmar_email": email,
        "password": pwd_inicial, "confirmar_password": pwd_inicial,
        "captcha_token": token_cap, "captcha_respuesta": ans_cap
    })

    # Verificar cuenta en BD para permitir login
    db = SessionLocal()
    u = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    u.email_verificado = True
    db.commit()
    db.close()

    # 1. Solicitar recuperación
    sol_res = client.post("/api/v1/auth/solicitar-recuperacion", json={"email": email})
    assert sol_res.status_code == 200

    # 2. Rescatar token del email de recuperación
    dev_email = client.get(f"/api/v1/auth/dev/ultimo-email?email={email}").json()
    token_reset = dev_email["link_accion"].split("reset_token=")[1]

    # 3. Restablecer con nueva contraseña
    reset_res = client.post("/api/v1/auth/restablecer-password", json={
        "token": token_reset,
        "nueva_password": pwd_nueva,
        "confirmar_password": pwd_nueva
    })
    assert reset_res.status_code == 200

    # 4. Probar login con nueva contraseña
    login_res = client.post("/api/v1/auth/login", data={"username": email, "password": pwd_nueva})
    assert login_res.status_code == 200


# =====================================================================
# 4. CONFIGURACIÓN DE PERFIL: CAMBIAR APODO Y CAMBIAR CONTRASEÑA
# =====================================================================

def test_configuracion_perfil_y_cambio_apodo():
    unique = str(uuid.uuid4())[:8]
    email = f"perfil_{unique}@correo.com"
    pwd = "PasswordUser2026!"

    token_cap, ans_cap = resolver_captcha()
    client.post("/api/v1/auth/registro", json={
        "nombre": "Nombre Original", "apodo": "ApodoViejo",
        "email": email, "confirmar_email": email,
        "password": pwd, "confirmar_password": pwd,
        "captcha_token": token_cap, "captcha_respuesta": ans_cap
    })
    # Activar
    db = SessionLocal()
    u = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    u.email_verificado = True
    db.commit()
    db.close()

    # Login
    tok = client.post("/api/v1/auth/login", data={"username": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}

    # 1. Obtener perfil
    perfil_res = client.get("/api/v1/auth/perfil", headers=headers)
    assert perfil_res.status_code == 200
    assert perfil_res.json()["apodo"] == "ApodoViejo"

    # 2. Modificar apodo
    put_res = client.put("/api/v1/auth/perfil", json={"apodo": "SuperAnalista"}, headers=headers)
    assert put_res.status_code == 200
    assert put_res.json()["apodo"] == "SuperAnalista"

    # 3. Cambiar contraseña desde el perfil
    pwd_res = client.put("/api/v1/auth/cambiar-password", json={
        "password_actual": pwd,
        "nueva_password": "NuevaPassword789!",
        "confirmar_password": "NuevaPassword789!"
    }, headers=headers)
    assert pwd_res.status_code == 200

    # 4. Verificar login con la contraseña cambiada
    login_nuevo = client.post("/api/v1/auth/login", data={"username": email, "password": "NuevaPassword789!"})
    assert login_nuevo.status_code == 200


# =====================================================================
# 5. DAR DE BAJA LA CUENTA CON CONFIRMACIÓN AL CORREO
# =====================================================================

def test_baja_de_cuenta_con_confirmacion_email():
    unique = str(uuid.uuid4())[:8]
    email = f"borrar_{unique}@correo.com"
    pwd = "PasswordBorrar2026!"

    token_cap, ans_cap = resolver_captcha()
    client.post("/api/v1/auth/registro", json={
        "nombre": "Usuario Para Borrar", "apodo": "BorrarMe",
        "email": email, "confirmar_email": email,
        "password": pwd, "confirmar_password": pwd,
        "captcha_token": token_cap, "captcha_respuesta": ans_cap
    })
    db = SessionLocal()
    u = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    u.email_verificado = True
    db.commit()
    db.close()

    tok = client.post("/api/v1/auth/login", data={"username": email, "password": pwd}).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}

    # 1. Solicitar baja
    baja_req = client.post("/api/v1/auth/solicitar-baja-cuenta", headers=headers)
    assert baja_req.status_code == 200

    # 2. Obtener token del correo de baja
    dev_email = client.get(f"/api/v1/auth/dev/ultimo-email?email={email}").json()
    baja_token = dev_email["link_accion"].split("baja_token=")[1]

    # 3. Confirmar baja
    confirm_res = client.post("/api/v1/auth/confirmar-baja-cuenta", json={"token": baja_token})
    assert confirm_res.status_code == 200

    # 4. Verificar que el usuario ya no existe en BD
    login_post_baja = client.post("/api/v1/auth/login", data={"username": email, "password": pwd})
    assert login_post_baja.status_code == 401

