import uuid
import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException
from main import app
from api.services.llm_service import (
    MODELOS_DISPONIBLES,
    MODELO_RECOMENDADO,
    limpiar_markdown_json,
    ejecutar_solicitud_llm,
)
from api.schemas import GuardarProyectoRequest

client = TestClient(app)

# =====================================================================
# BLOQUE 1: PRUEBAS DEL CATÁLOGO MULTI-MODELO Y MITIGACIÓN DE FALLOS
# =====================================================================

def test_catalogo_modelos_disponibles():
    """Valida que los 5 modelos solicitados estén formalmente registrados en el catálogo."""
    modelos_esperados = [
        "google/gemini-2.5-flash-lite",
        "google/gemma-3-4b-it",
        "nex-agi/nex-n2.5-mini",
        "mistralai/mistral-nemo",
        "amazon/nova-micro-v1",
    ]
    for modelo_id in modelos_esperados:
        assert modelo_id in MODELOS_DISPONIBLES, f"El modelo {modelo_id} no está en MODELOS_DISPONIBLES"

    # Verificar que el modelo por defecto y recomendado sea Gemini 2.5 Flash Lite
    assert MODELOS_DISPONIBLES["google/gemini-2.5-flash-lite"]["es_recomendado"] is True
    assert MODELOS_DISPONIBLES["google/gemma-3-4b-it"]["es_recomendado"] is False
    assert MODELOS_DISPONIBLES["mistralai/mistral-nemo"]["es_recomendado"] is False


def test_limpiar_markdown_json_robusto():
    """Valida la limpieza de formatos markdown, texto conversacional y delimitadores extra."""
    # Caso 1: Bloque con etiqueta ```json
    texto_1 = "```json\n[{\"id\": \"RU1\", \"nombre\": \"GPS\"}]\n```"
    assert limpiar_markdown_json(texto_1) == '[{"id": "RU1", "nombre": "GPS"}]'

    # Caso 2: Preamble conversacional emitido por un modelo experimental
    texto_2 = "Aquí está tu lista de requisitos solicitados:\n\n[{\"id\": \"RU2\"}]\n\nEspero te sirva."
    assert limpiar_markdown_json(texto_2) == '[{"id": "RU2"}]'

    # Caso 3: Objeto diccionario
    texto_3 = "```\n{\"criterios\": [\"Dado...\", \"Cuando...\"]}\n```"
    assert limpiar_markdown_json(texto_3) == '{"criterios": ["Dado...", "Cuando..."]}'


@pytest.mark.asyncio
async def test_mitigacion_failover_automatico_modelo_experimental():
    """
    Prueba clave de mitigación:
    Si un modelo experimental (ej: Gemma 3) sufre rate-limit o caída (HTTP 429/500/timeout),
    ejecutar_solicitud_llm debe capturar el error y reintentar automáticamente con Gemini 2.5 Flash Lite.
    """
    mensajes = [{"role": "user", "content": "Generar requisitos"}]
    respuesta_gemini_exitosa = [{"id": "RU1", "nombre": "Requisito con Fallback"}]

    with patch("api.services.llm_service._llamar_openrouter", new_callable=AsyncMock) as mock_llamar:
        # Primer llamado (Gemma 3) lanza excepción de saturación;
        # Segundo llamado (Gemini fallback) responde exitosamente.
        mock_llamar.side_effect = [
            HTTPException(status_code=429, detail="Rate Limit Exceeded en proveedor"),
            respuesta_gemini_exitosa
        ]

        resultado = await ejecutar_solicitud_llm(
            messages=mensajes,
            modelo_solicitado="google/gemma-3-4b-it"
        )

        # Validar que el resultado final provino de la contingencia exitosa
        assert resultado == respuesta_gemini_exitosa
        # Validar que se invocó dos veces: intento 1 (experimental) e intento 2 (recomendado)
        assert mock_llamar.call_count == 2
        args_primer_intento = mock_llamar.call_args_list[0][0]
        args_segundo_intento = mock_llamar.call_args_list[1][0]
        assert args_primer_intento[1] == "google/gemma-3-4b-it"
        assert args_segundo_intento[1] == MODELO_RECOMENDADO


@pytest.mark.asyncio
async def test_mitigacion_falla_total_ambos_modelos():
    """Verifica que si fallan tanto el modelo solicitado como el de contingencia, se levante HTTP 504."""
    mensajes = [{"role": "user", "content": "Generar requisitos"}]

    with patch("api.services.llm_service._llamar_openrouter", new_callable=AsyncMock) as mock_llamar:
        mock_llamar.side_effect = [
            Exception("Error modelo experimental"),
            Exception("Error conexión Gemini")
        ]

        with pytest.raises(HTTPException) as excinfo:
            await ejecutar_solicitud_llm(
                messages=mensajes,
                modelo_solicitado="mistralai/mistral-nemo"
            )

        assert excinfo.value.status_code == 504
        assert "Fallo en modelo seleccionado" in excinfo.value.detail


def test_endpoints_generacion_aceptan_parametro_modelo():
    """Verifica que los endpoints de generación admitan el campo 'modelo' en sus payloads."""
    with patch("api.routes.generacion.extraer_requisitos_llm", new_callable=AsyncMock) as mock_gen_ru:
        mock_gen_ru.return_value = [
            {"id": "RU1", "nombre": "Req 1", "descripcion": "Desc", "fuente": "Base", "estabilidad": "Transable", "tipo": "Funcional"}
        ]

        payload = {
            "texto": "Sistema de prueba",
            "modelo": "google/gemma-3-4b-it"
        }
        res = client.post("/api/v1/generar/requisitos/", json=payload)
        assert res.status_code == 200
        mock_gen_ru.assert_called_once()
        # Verificar que el modelo solicitado se propagó hacia la función de servicio
        _, kwargs = mock_gen_ru.call_args
        assert kwargs.get("modelo") == "google/gemma-3-4b-it" or mock_gen_ru.call_args[0][1] == "google/gemma-3-4b-it"


# =====================================================================
# BLOQUE 2: PRUEBAS DE DASHBOARD, PERSISTENCIA MULTIPROYECTO Y AUTOGUARDADO
# =====================================================================

def obtener_token_autenticado_test(email_prefix: str = "analista_it3") -> tuple:
    """Registra o loguea un usuario analista de prueba para interactuar con la API."""
    unique_id = str(uuid.uuid4())[:8]
    email = f"{email_prefix}_{unique_id}@tesis.com"
    password = "PasswordTest123!"

    # 1. Registro
    reg_res = client.post(
        "/api/v1/auth/registro",
        json={"nombre": f"Analista {unique_id}", "email": email, "password": password}
    )
    assert reg_res.status_code in [200, 201]

    # 2. Login con OAuth2PasswordRequestForm (form-data: username & password)
    login_res = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    return headers, email


def test_guardar_proyecto_con_modelo_ia_y_etapa():
    """Valida la persistencia en PostgreSQL de un proyecto completo con modelo_ia asignado y etapa."""
    headers, _ = obtener_token_autenticado_test("guardar_test")

    payload = {
        "nombre": "Proyecto Sistema Satelital",
        "descripcion": "Gestión de telemetría y sensores",
        "etapa_actual": 2,
        "modelo_ia": "mistralai/mistral-nemo",
        "texto_documento": "Documento con especificaciones satelitales.",
        "nombre_archivo": "satelite.txt",
        "requisitos": [
            {
                "id": "RU1",
                "nombre": "Conexión a Satélite",
                "descripcion": "El sistema debe conectarse a órbita baja",
                "fuente": "satelite.txt",
                "estabilidad": "Intransable",
                "tipo": "Funcional"
            }
        ],
        "historias_usuario": [],
        "tareas": []
    }

    res = client.post("/api/v1/proyectos/", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    assert data["nombre"] == "Proyecto Sistema Satelital"
    assert data["etapa_actual"] == 2
    assert data["modelo_ia"] == "mistralai/mistral-nemo"
    assert len(data["requisitos"]) == 1
    assert data["requisitos"][0]["id"] == "RU1"

    # Verificar recuperación en detalle
    proyecto_id = data["id"]
    res_detalle = client.get(f"/api/v1/proyectos/{proyecto_id}", headers=headers)
    assert res_detalle.status_code == 200
    data_detalle = res_detalle.json()
    assert data_detalle["modelo_ia"] == "mistralai/mistral-nemo"
    assert data_detalle["texto_documento"] == "Documento con especificaciones satelitales."


def test_dashboard_listar_proyectos_y_metricas_artefactos():
    """
    Valida el contrato del Dashboard:
    - Retorna lista de proyectos del usuario con métricas calculadas (total_requisitos, total_historias, total_tareas).
    - Retorna el modelo_ia para visualización de badges en tarjetas.
    - Respeta la etapa actual del proyecto.
    """
    headers, _ = obtener_token_autenticado_test("dashboard_test")

    # Guardar un proyecto en etapa 3 con 2 RUs, 2 HUs y 0 Tareas
    payload = {
        "nombre": "Proyecto Dashboard Métricas",
        "etapa_actual": 3,
        "modelo_ia": "google/gemma-3-4b-it",
        "texto_documento": "Texto prueba",
        "requisitos": [
            {"id": "RU1", "nombre": "R1", "descripcion": "D1", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"},
            {"id": "RU2", "nombre": "R2", "descripcion": "D2", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"}
        ],
        "historias_usuario": [
            {"id": "HU-01", "rf_origen": "RU1", "titulo": "T1", "rol": "User", "quiero": "Q1", "para": "P1", "criterios_aceptacion": ["C1"]},
            {"id": "HU-02", "rf_origen": "RU2", "titulo": "T2", "rol": "User", "quiero": "Q2", "para": "P2", "criterios_aceptacion": ["C2"]}
        ],
        "tareas": []
    }
    client.post("/api/v1/proyectos/", json=payload, headers=headers)

    # Consultar listado de proyectos para el Dashboard
    res_listado = client.get("/api/v1/proyectos/", headers=headers)
    assert res_listado.status_code == 200
    proyectos = res_listado.json()
    assert len(proyectos) >= 1

    p = proyectos[0]
    assert p["nombre"] == "Proyecto Dashboard Métricas"
    assert p["etapa_actual"] == 3
    assert p["modelo_ia"] == "google/gemma-3-4b-it"
    assert p["total_requisitos"] == 2
    assert p["total_historias"] == 2
    assert p["total_tareas"] == 0


def test_autoguardado_actualizar_proyecto_existente():
    """
    Valida la funcionalidad de auto-guardado en base de datos:
    Al enviar 'proyecto_id', actualiza el proyecto existente sin duplicarlo.
    """
    headers, _ = obtener_token_autenticado_test("autoguardado_test")

    # 1. Crear proyecto inicial en Etapa 1
    crear_payload = {
        "nombre": "Proyecto Para Actualizar",
        "etapa_actual": 1,
        "modelo_ia": "google/gemini-2.5-flash-lite",
        "texto_documento": "Borrador inicial",
        "requisitos": [],
        "historias_usuario": [],
        "tareas": []
    }
    res_crear = client.post("/api/v1/proyectos/", json=crear_payload, headers=headers)
    proyecto_id = res_crear.json()["id"]

    # 2. Simular autoguardado al avanzar a Etapa 4
    actualizar_payload = {
        "nombre": "Proyecto Actualizado y Avanzado",
        "etapa_actual": 4,
        "modelo_ia": "google/gemini-2.5-flash-lite",
        "texto_documento": "Documento completo",
        "requisitos": [
            {"id": "RU1", "nombre": "R1", "descripcion": "D1", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"}
        ],
        "historias_usuario": [
            {"id": "HU-01", "rf_origen": "RU1", "titulo": "T1", "rol": "User", "quiero": "Q1", "para": "P1", "criterios_aceptacion": ["C1"]}
        ],
        "tareas": [
            {"id": "TSK-01", "hu_origen": "HU-01", "titulo": "Tsk1", "descripcion": "Desc", "tipo": "Backend", "estimacion_horas": 4}
        ]
    }
    res_actualizar = client.post(
        f"/api/v1/proyectos/?proyecto_id={proyecto_id}",
        json=actualizar_payload,
        headers=headers
    )
    assert res_actualizar.status_code == 200
    data_actualizada = res_actualizar.json()
    assert data_actualizada["id"] == proyecto_id
    assert data_actualizada["nombre"] == "Proyecto Actualizado y Avanzado"
    assert data_actualizada["etapa_actual"] == 4
    assert len(data_actualizada["tareas"]) == 1


def test_aislamiento_de_proyectos_entre_usuarios():
    """Valida que un analista no pueda ver ni listar los proyectos de otro analista (HU-23)."""
    headers_user1, _ = obtener_token_autenticado_test("analista_alpha")
    headers_user2, _ = obtener_token_autenticado_test("analista_beta")

    # Usuario 1 crea un proyecto confidencial
    payload_u1 = {
        "nombre": "Proyecto Privado Alpha",
        "etapa_actual": 1,
        "modelo_ia": "google/gemini-2.5-flash-lite",
        "texto_documento": "Info confidencial",
        "requisitos": [],
        "historias_usuario": [],
        "tareas": []
    }
    res_u1 = client.post("/api/v1/proyectos/", json=payload_u1, headers=headers_user1)
    p1_id = res_u1.json()["id"]

    # Usuario 2 lista sus proyectos y no debe ver el de Usuario 1
    res_listado_u2 = client.get("/api/v1/proyectos/", headers=headers_user2)
    proyectos_u2 = res_listado_u2.json()
    ids_u2 = [p["id"] for p in proyectos_u2]
    assert p1_id not in ids_u2

    # Usuario 2 intenta consultar directamente por ID el proyecto de Usuario 1
    res_detalle_u2 = client.get(f"/api/v1/proyectos/{p1_id}", headers=headers_user2)
    assert res_detalle_u2.status_code == 404


def test_eliminar_proyecto_cascada():
    """Valida la eliminación completa de un proyecto y sus artefactos hijos en PostgreSQL."""
    headers, _ = obtener_token_autenticado_test("eliminar_test")

    # 1. Crear proyecto
    payload = {
        "nombre": "Proyecto Temporal Para Borrar",
        "etapa_actual": 2,
        "modelo_ia": "amazon/nova-micro-v1",
        "texto_documento": "Texto breve",
        "requisitos": [
            {"id": "RU1", "nombre": "Req A", "descripcion": "Desc A", "fuente": "Doc", "estabilidad": "Transable", "tipo": "Funcional"}
        ],
        "historias_usuario": [],
        "tareas": []
    }
    crear_res = client.post("/api/v1/proyectos/", json=payload, headers=headers)
    p_id = crear_res.json()["id"]

    # 2. Eliminar proyecto
    del_res = client.delete(f"/api/v1/proyectos/{p_id}", headers=headers)
    assert del_res.status_code == 200
    assert "eliminado exitosamente" in del_res.json()["mensaje"].lower()

    # 3. Confirmar que ya no existe (404)
    get_res = client.get(f"/api/v1/proyectos/{p_id}", headers=headers)
    assert get_res.status_code == 404
