import pytest
from fastapi.testclient import TestClient
from main import app
from api.services.llm_service import limpiar_markdown_json
from api.schemas import RequisitoItem

client = TestClient(app)

# ---------------------------------------------------------
# 1. Pruebas Unitarias a Funciones y Reglas de Negocio
# ---------------------------------------------------------

def test_limpiar_markdown_json_utilidad():
    """Valida la eliminación de bloques markdown en respuestas LLM."""
    texto_sucio_1 = '```json\n[{"id": "RU1"}]\n```'
    assert limpiar_markdown_json(texto_sucio_1) == '[{"id": "RU1"}]'

    texto_sucio_2 = '```\n[{"id": "RU2"}]\n```'
    assert limpiar_markdown_json(texto_sucio_2) == '[{"id": "RU2"}]'

    texto_limpio = '[{"id": "RU3"}]'
    assert limpiar_markdown_json(texto_limpio) == '[{"id": "RU3"}]'

def test_requisito_schema_estabilidad_por_defecto():
    """Valida que Pydantic asigne 'Transable' por defecto (Regla Profesor Guía)."""
    req = RequisitoItem(
        id="RU1",
        nombre="Registrar Vehículo",
        descripcion="Permitir ingresar un nuevo vehículo al sistema."
    )
    assert req.estabilidad == "Transable"
    assert req.tipo == "Funcional"
    assert req.fuente == "Documento base"

# ---------------------------------------------------------
# 2. Pruebas de Integración a Endpoints de Generación
# ---------------------------------------------------------

def test_endpoint_generar_requisitos_formato_ru():
    """Verifica generación de RUs y estructura formal."""
    payload = {
        "texto": "El sistema debe registrar vehículos asociados a un GPS indicando patente y modelo."
    }
    response = client.post("/api/v1/generar/requisitos/", json=payload)
    assert response.status_code == 200
    
    datos = response.json()
    assert "requisitos" in datos
    assert len(datos["requisitos"]) > 0

    primer_ru = datos["requisitos"][0]
    assert "RU" in primer_ru["id"]
    assert "nombre" in primer_ru
    assert "descripcion" in primer_ru
    assert primer_ru["estabilidad"] in ["Transable", "Intransable"]
    assert primer_ru["tipo"] in ["Funcional", "No Funcional"]

def test_endpoint_generar_historias_usuario_trazabilidad():
    """Verifica que las HUs deriven con trazabilidad hacia el RU padre."""
    payload = {
        "requisitos": [
            {
                "id": "RU1",
                "nombre": "Registrar Vehículo",
                "descripcion": "Registrar nuevo vehículo asociado a un GPS.",
                "fuente": "Aplicación",
                "estabilidad": "Transable",
                "tipo": "Funcional"
            }
        ]
    }
    response = client.post("/api/v1/generar/historias-usuario/", json=payload)
    assert response.status_code == 200

    datos = response.json()
    assert "historias_usuario" in datos
    assert len(datos["historias_usuario"]) > 0

    hu = datos["historias_usuario"][0]
    assert hu["rf_origen"] == "RU1"
    assert len(hu["rol"]) > 0
    assert len(hu["quiero"]) > 0
    assert len(hu["para"]) > 0
    assert isinstance(hu["criterios_aceptacion"], list)

def test_endpoint_regenerar_criterios_hu():
    """Verifica el servicio puntual de regeneración de criterios con IA."""
    payload = {
        "id": "HU-01",
        "titulo": "Registro de vehículo con GPS",
        "rol": "administrador de flota",
        "quiero": "asociar un código GPS al vehículo",
        "para": "monitorear la ubicación en tiempo real"
    }
    response = client.post("/api/v1/generar/criterios-hu/", json=payload)
    assert response.status_code == 200

    datos = response.json()
    assert "criterios_aceptacion" in datos
    assert isinstance(datos["criterios_aceptacion"], list)
    assert len(datos["criterios_aceptacion"]) >= 1

def test_endpoint_generar_tareas_tecnicas():
    """Verifica la derivación de tareas técnicas, enlace a HU y estimación en horas."""
    payload = {
        "historias_usuario": [
            {
                "id": "HU-01",
                "rf_origen": "RU1",
                "titulo": "Registro de vehículos",
                "rol": "analista",
                "quiero": "registrar vehículos",
                "para": "gestión de inventario",
                "criterios_aceptacion": ["Validar que la patente no esté duplicada."]
            }
        ]
    }
    response = client.post("/api/v1/generar/tareas/", json=payload)
    assert response.status_code == 200

    datos = response.json()
    assert "tareas" in datos
    assert len(datos["tareas"]) > 0

    tarea = datos["tareas"][0]
    assert tarea["hu_origen"] == "HU-01"
    assert tarea["tipo"] in ["Frontend", "Backend", "Base de Datos", "Pruebas", "DevOps"]
    assert isinstance(tarea["estimacion_horas"], int)
    assert tarea["estimacion_horas"] > 0

def test_rechazo_payload_invalido_http_422():
    """Verifica la robustez de la API ante solicitudes mal estructuradas."""
    # Enviando un tipo de dato incorrecto en lugar de lista
    response = client.post("/api/v1/generar/historias-usuario/", json={"requisitos": "no-es-una-lista"})
    assert response.status_code == 422