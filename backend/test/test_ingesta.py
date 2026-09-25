import io
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_activo():
    """Verifica que el servicio esté operativo."""
    response = client.get("/")
    assert response.status_code == 200
    assert "operativa" in response.json()["mensaje"].lower()

def test_ingesta_txt_valido():
    """Prueba: Ingresar documento válido con formato .txt"""
    contenido = b"Requerimiento del sistema: Permitir inicio de sesion seguro."
    archivo = io.BytesIO(contenido)
    
    response = client.post(
        "/api/v1/upload/",
        files={"file": ("requisitos.txt", archivo, "text/plain")}
    )
    assert response.status_code == 200
    assert response.json()["estado"] == "Carga exitosa"
    assert "Permitir inicio de sesion seguro" in response.json()["contenido"]

def test_ingesta_formato_no_valido():
    """Prueba: Ingresar documento no válido con formato .csv o .project"""
    archivo = io.BytesIO(b"columna1,columna2\nvalor1,valor2")
    response = client.post(
        "/api/v1/upload/",
        files={"file": ("datos.csv", archivo, "text/csv")}
    )
    assert response.status_code == 400
    assert "Formato no soportado" in response.json()["detail"]

def test_generar_requisitos_formato_pydantic():
    """Prueba básica del endpoint de generación con esquema estricto"""
    payload = {"texto": "El sistema debe permitir gestionar usuarios analistas."}
    response = client.post("/api/v1/generar/requisitos/", json=payload)
    
    assert response.status_code == 200
    datos = response.json()
    assert "requisitos" in datos
    assert isinstance(datos["requisitos"], list)
    if len(datos["requisitos"]) > 0:
        req = datos["requisitos"][0]
        assert "id" in req
        assert "descripcion" in req
        assert req["prioridad"] in ["Alta", "Media", "Baja"]