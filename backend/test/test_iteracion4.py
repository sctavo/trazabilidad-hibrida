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


# =====================================================================
# 6. PLAN DE TRABAJO (ETAPA 4): PERSISTENCIA Y MODIFICACIÓN DE TAREAS
# =====================================================================

def obtener_token_autenticado_it4(prefijo: str = "analista_it4") -> tuple:
    """Helper que crea un usuario analista autenticado con correo verificado."""
    unique = str(uuid.uuid4())[:8]
    email = f"{prefijo}_{unique}@correo.com"
    pwd = "PasswordSegura2026!"
    token_cap, ans_cap = resolver_captcha()

    reg_res = client.post("/api/v1/auth/registro", json={
        "nombre": f"Analista {unique}",
        "apodo": f"User{unique}",
        "email": email,
        "confirmar_email": email,
        "password": pwd,
        "confirmar_password": pwd,
        "captcha_token": token_cap,
        "captcha_respuesta": ans_cap
    })
    assert reg_res.status_code == 200

    db = SessionLocal()
    u = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    u.email_verificado = True
    db.commit()
    db.close()

    tok = client.post("/api/v1/auth/login", data={"username": email, "password": pwd}).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}, email


def test_persistencia_modificacion_plan_trabajo_etapa4():
    """Valida la creación y actualización interactiva de tareas en etapa 4 (Plan de Trabajo)."""
    headers, _ = obtener_token_autenticado_it4("gantt_user")

    # 1. Crear proyecto consolidado en Etapa 4
    payload_inicial = {
        "nombre": "Proyecto E-Commerce Completo",
        "descripcion": "Backlog consolidado listo para cronograma",
        "etapa_actual": 4,
        "modelo_ia": "google/gemini-2.5-flash-lite",
        "texto_documento": "Documento con RFs técnicos",
        "requisitos": [
            {
                "id": "RU-01",
                "nombre": "Gestión de Catálogo",
                "descripcion": "El sistema debe permitir gestionar productos",
                "fuente": "Pliego de Requisitos",
                "estabilidad": "Transable",
                "tipo": "Funcional"
            }
        ],
        "historias_usuario": [
            {
                "id": "HU-01",
                "titulo": "Listar Productos",
                "rol": "Cliente",
                "quiero": "visualizar productos",
                "para": "comprar en línea",
                "criterios_aceptacion": ["Dado que ingreso, veo productos"],
                "rf_origen": "RU-01"
            }
        ],
        "tareas": [
            {
                "id": "TSK-01",
                "titulo": "Diseño de base de datos de productos",
                "descripcion": "Crear modelo relacional de tablas",
                "tipo": "Base de Datos",
                "estimacion_horas": 6,
                "hu_origen": "HU-01"
            },
            {
                "id": "TSK-02",
                "titulo": "API REST endpoint productos",
                "descripcion": "Rutas CRUD para catálogo",
                "tipo": "Backend",
                "estimacion_horas": 8,
                "hu_origen": "HU-01"
            },
            {
                "id": "TSK-03",
                "titulo": "Interfaz de catálogo de productos",
                "descripcion": "Componentes de tarjetas y filtros",
                "tipo": "Frontend",
                "estimacion_horas": 12,
                "hu_origen": "HU-01"
            }
        ]
    }

    crear_res = client.post("/api/v1/proyectos/", json=payload_inicial, headers=headers)
    assert crear_res.status_code == 200
    p_data = crear_res.json()
    proyecto_id = p_data["id"]
    assert p_data["etapa_actual"] == 4
    assert len(p_data["tareas"]) == 3
    assert sum(t["estimacion_horas"] for t in p_data["tareas"]) == 26  # 6 + 8 + 12

    # Verificar que el resumen en el listado reporte total_horas = 26
    listado_res = client.get("/api/v1/proyectos/", headers=headers)
    assert listado_res.status_code == 200
    resumen_p = next(p for p in listado_res.json() if p["id"] == proyecto_id)
    assert resumen_p["total_horas"] == 26

    # 2. Simular modificación del plan de trabajo por parte del usuario (re-estimación de horas)
    tareas_modificadas = [
        {
            "id": "TSK-01",
            "titulo": "Diseño de tablas normalizadas en PostgreSQL",
            "descripcion": "Tablas DDL migradas",
            "tipo": "Base de Datos",
            "estimacion_horas": 10,  # Aumenta de 6h a 10h
            "hu_origen": "HU-01"
        },
        {
            "id": "TSK-02",
            "titulo": "API REST endpoint productos",
            "descripcion": "Rutas CRUD para catálogo",
            "tipo": "Backend",
            "estimacion_horas": 14,  # Aumenta de 8h a 14h
            "hu_origen": "HU-01"
        },
        {
            "id": "TSK-03",
            "titulo": "Interfaz de catálogo de productos",
            "descripcion": "Componentes de tarjetas y filtros",
            "tipo": "Frontend",
            "estimacion_horas": 12,
            "hu_origen": "HU-01"
        }
    ]

    payload_actualizado = {
        **payload_inicial,
        "tareas": tareas_modificadas
    }

    update_res = client.post(f"/api/v1/proyectos/?proyecto_id={proyecto_id}", json=payload_actualizado, headers=headers)
    assert update_res.status_code == 200
    p_upd = update_res.json()
    assert p_upd["id"] == proyecto_id
    assert p_upd["etapa_actual"] == 4
    assert sum(t["estimacion_horas"] for t in p_upd["tareas"]) == 36  # 10 + 14 + 12

    # Verificar que el listado ahora reporte total_horas = 36
    listado_upd = client.get("/api/v1/proyectos/", headers=headers)
    resumen_upd = next(p for p in listado_upd.json() if p["id"] == proyecto_id)
    assert resumen_upd["total_horas"] == 36

    # Verificar que el nuevo título de TSK-01 se persistió correctamente
    tsk_01 = next(t for t in p_upd["tareas"] if t["id"] == "TSK-01")
    assert tsk_01["titulo"] == "Diseño de tablas normalizadas en PostgreSQL"
    assert tsk_01["estimacion_horas"] == 10


def test_recuperacion_y_consistencia_trazabilidad_etapa4():
    """Valida la integridad de relaciones foráneas (RU -> HU -> TSK) para alimentar la Carta Gantt y Excel."""
    headers, _ = obtener_token_autenticado_it4("traceability_user")

    payload = {
        "nombre": "Proyecto Auditoría Trazabilidad",
        "etapa_actual": 4,
        "modelo_ia": "google/gemini-2.5-flash-lite",
        "texto_documento": "Documento completo",
        "requisitos": [
            {"id": "RU-01", "nombre": "Módulo Seguridad", "descripcion": "Seguridad", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"},
            {"id": "RU-02", "nombre": "Módulo Reportes", "descripcion": "Reportes", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"}
        ],
        "historias_usuario": [
            {"id": "HU-01", "titulo": "Login seguro", "rol": "Admin", "quiero": "autenticarme", "para": "gestionar", "criterios_aceptacion": [], "rf_origen": "RU-01"},
            {"id": "HU-02", "titulo": "Exportar Excel", "rol": "Admin", "quiero": "descargar xlsx", "para": "auditar", "criterios_aceptacion": [], "rf_origen": "RU-02"}
        ],
        "tareas": [
            {"id": "TSK-01", "titulo": "JWT auth", "descripcion": "Tokens", "tipo": "Backend", "estimacion_horas": 8, "hu_origen": "HU-01"},
            {"id": "TSK-02", "titulo": "Generar XLSX", "descripcion": "Hojas", "tipo": "Backend", "estimacion_horas": 6, "hu_origen": "HU-02"},
            {"id": "TSK-03", "titulo": "Tests E2E", "descripcion": "Pytest", "tipo": "Pruebas", "estimacion_horas": 4, "hu_origen": "HU-02"}
        ]
    }

    res_crear = client.post("/api/v1/proyectos/", json=payload, headers=headers)
    assert res_crear.status_code == 200
    p_id = res_crear.json()["id"]

    # Consultar detalle del proyecto
    res_get = client.get(f"/api/v1/proyectos/{p_id}", headers=headers)
    assert res_get.status_code == 200
    data = res_get.json()

    # Validar correspondencia estricta de jerarquía
    hu_map = {h["id"]: h for h in data["historias_usuario"]}
    ru_ids = {r["id"] for r in data["requisitos"]}

    for tarea in data["tareas"]:
        assert tarea["hu_origen"] in hu_map, f"La tarea {tarea['id']} no tiene HU origen válida"
        hu_padre = hu_map[tarea["hu_origen"]]
        assert hu_padre["rf_origen"] in ru_ids, f"La HU {hu_padre['id']} no tiene RU origen válido"


def test_disciplinas_tecnicas_y_sumatoria_horas_gantt():
    """Valida la diversidad de disciplinas técnicas soportadas y su cálculo de horas."""
    headers, _ = obtener_token_autenticado_it4("disciplinas_user")

    disciplinas = ["Base de Datos", "Backend", "Frontend", "DevOps", "Pruebas"]
    tareas_payload = [
        {
            "id": f"TSK-0{i+1}",
            "titulo": f"Tarea de {disc}",
            "descripcion": f"Descripción técnica para {disc}",
            "tipo": disc,
            "estimacion_horas": 5 * (i + 1),
            "hu_origen": "HU-01"
        }
        for i, disc in enumerate(disciplinas)
    ]

    payload = {
        "nombre": "Proyecto Multi-Disciplina",
        "etapa_actual": 4,
        "modelo_ia": "google/gemini-2.5-flash-lite",
        "texto_documento": "Doc",
        "requisitos": [{"id": "RU-01", "nombre": "Req Core", "descripcion": "Desc", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"}],
        "historias_usuario": [{"id": "HU-01", "titulo": "Historia Core", "rol": "User", "quiero": "X", "para": "Y", "criterios_aceptacion": [], "rf_origen": "RU-01"}],
        "tareas": tareas_payload
    }

    res = client.post("/api/v1/proyectos/", json=payload, headers=headers)
    assert res.status_code == 200
    p = res.json()

    # Horas esperadas: 5 + 10 + 15 + 20 + 25 = 75
    assert sum(t["estimacion_horas"] for t in p["tareas"]) == 75
    tipos_guardados = {t["tipo"] for t in p["tareas"]}
    assert tipos_guardados == set(disciplinas)

    # Validar que el listado de proyectos calcule total_horas = 75
    listado = client.get("/api/v1/proyectos/", headers=headers).json()
    p_resumen = next(proj for proj in listado if proj["id"] == p["id"])
    assert p_resumen["total_horas"] == 75


