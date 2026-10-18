import os
import json
import re
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MODELO_RECOMENDADO = "google/gemini-2.5-flash-lite"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", MODELO_RECOMENDADO)
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Catálogo oficial de modelos soportados en el proyecto
MODELOS_DISPONIBLES = {
    "google/gemini-2.5-flash-lite": {
        "id": "google/gemini-2.5-flash-lite",
        "nombre": "Gemini 2.5 Flash Lite",
        "proveedor": "Google",
        "es_recomendado": True,
        "descripcion": "Alta velocidad, máxima precisión en estructuras JSON y razonamiento de requisitos.",
    },
    "google/gemma-3-4b-it": {
        "id": "google/gemma-3-4b-it",
        "nombre": "Gemma 3 (4B)",
        "proveedor": "Google",
        "es_recomendado": False,
        "descripcion": "Modelo abierto y ligero de Google optimizado para seguimiento estricto de instrucciones.",
    },
    "nex-agi/nex-n2.5-mini": {
        "id": "nex-agi/nex-n2.5-mini",
        "nombre": "Nex-Agi N2.5 Mini",
        "proveedor": "Nex-Agi",
        "es_recomendado": False,
        "descripcion": "Modelo experimental enfocado en síntesis rápida de lenguaje natural.",
    },
    "mistralai/mistral-nemo": {
        "id": "mistralai/mistral-nemo",
        "nombre": "Mistral Nemo",
        "proveedor": "Mistral AI",
        "es_recomendado": False,
        "descripcion": "Excelente comprensión lingüística y razonamiento analítico multilingüe.",
    },
    "amazon/nova-micro-v1": {
        "id": "amazon/nova-micro-v1",
        "nombre": "Amazon Nova-Micro",
        "proveedor": "Amazon",
        "es_recomendado": False,
        "descripcion": "Modelo ultraligero de Amazon con respuestas concisas.",
    },
}

def limpiar_markdown_json(contenido: str) -> str:
    """Limpia bloques de código markdown y extrae arrays o diccionarios JSON válidos."""
    contenido = re.sub(r"^```json\s*", "", contenido.strip(), flags=re.IGNORECASE)
    contenido = re.sub(r"^```\s*", "", contenido.strip())
    contenido = re.sub(r"```$", "", contenido.strip())
    contenido = contenido.strip()

    # Si el LLM incluyó texto conversacional antes o después, rescatar el bloque JSON estructurado
    if not (contenido.startswith("[") or contenido.startswith("{")):
        match = re.search(r"(\[[\s\S]*\]|\{[\s\S]*\})", contenido)
        if match:
            contenido = match.group(1).strip()
    return contenido

async def _llamar_openrouter(headers: dict, model_name: str, messages: list, temperature: float, timeout_segundos: float):
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature
    }
    async with httpx.AsyncClient(timeout=timeout_segundos) as client:
        response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Error devuelto por OpenRouter ({model_name}): {response.text}"
            )
        data = response.json()
        contenido_limpio = limpiar_markdown_json(data["choices"][0]["message"]["content"])
        return json.loads(contenido_limpio)

async def ejecutar_solicitud_llm(messages: list, modelo_solicitado: str = None, temperature: float = 0.2, timeout: float = 45.0):
    """
    Invoca OpenRouter con mecanismo de mitigación y failover automático:
    Si un modelo experimental solicitado falla (por timeout, caída, rate-limit o JSON malformado),
    se reintenta automáticamente con el modelo recomendado (Gemini 2.5 Flash Lite) como salvaguarda.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY no configurada.")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Tesis Trazabilidad Hibrida"
    }

    modelo_principal = modelo_solicitado or OPENROUTER_MODEL or MODELO_RECOMENDADO

    # Intento 1: Con el modelo seleccionado
    try:
        return await _llamar_openrouter(headers, modelo_principal, messages, temperature, timeout)
    except Exception as exc_principal:
        # Medida de Mitigación: Si el modelo elegido falló y no era el recomendado, activamos el fallback
        if modelo_principal != MODELO_RECOMENDADO:
            print(f"[MITIGACIÓN FAILOVER] El modelo '{modelo_principal}' falló ({str(exc_principal)}). Activando fallback de contingencia a '{MODELO_RECOMENDADO}'...")
            try:
                resultado_fallback = await _llamar_openrouter(headers, MODELO_RECOMENDADO, messages, temperature, timeout)
                return resultado_fallback
            except Exception as exc_fallback:
                raise HTTPException(
                    status_code=504,
                    detail=f"Fallo en modelo seleccionado ({modelo_principal}) y en contingencia ({MODELO_RECOMENDADO}): {str(exc_fallback)}"
                )
        else:
            if isinstance(exc_principal, HTTPException):
                raise exc_principal
            elif isinstance(exc_principal, json.JSONDecodeError):
                raise HTTPException(status_code=502, detail="El LLM no devolvió un JSON válido.")
            else:
                raise HTTPException(status_code=504, detail=f"Fallo de conexión LLM: {str(exc_principal)}")

# 1. Extracción de Requisitos de Usuario (RU)
async def extraer_requisitos_llm(texto_fuente: str, modelo: str = None) -> list:
    prompt_sistema = (
        "Eres un Ingeniero de Requisitos experto. Tu tarea es analizar el documento en lenguaje "
        "natural y extraer los Requisitos de Usuario (RU) formales del sistema.\n"
        "Reglas estrictas:\n"
        "1. Devuelve EXCLUSIVAMENTE un arreglo JSON válido sin texto adicional ni bloques markdown.\n"
        "2. Formato de cada objeto:\n"
        "   {\n"
        "     \"id\": \"RU1\",\n"
        "     \"nombre\": \"Nombre corto de la funcionalidad (ej. Registrar Vehículo)\",\n"
        "     \"descripcion\": \"Descripción detallada del requisito\",\n"
        "     \"fuente\": \"Documento base | Stakeholder | Aplicación\",\n"
        "     \"estabilidad\": \"Transable | Intransable\",\n"
        "     \"tipo\": \"Funcional | No Funcional\"\n"
        "   }\n"
        "3. REGLA OBLIGATORIA DE ESTABILIDAD: Si en el texto no se especifica si el requisito es transable o intransable, "
        "debes asignarle POR DEFECTO el valor 'Transable'.\n"
        "4. Genera IDs correlativos como RU1, RU2, RU3..."
    )

    messages = [
        {"role": "system", "content": prompt_sistema},
        {"role": "user", "content": f"Documento de entrada:\n\n{texto_fuente}"}
    ]

    return await ejecutar_solicitud_llm(messages, modelo_solicitado=modelo, timeout=45.0)

# 2. Derivación de Historias de Usuario (HU)
async def derivar_historias_usuario_llm(requisitos_aprobados: list, modelo: str = None) -> list:
    prompt_sistema = (
        "Eres un Product Owner experto. Deriva Historias de Usuario a partir de los Requisitos de Usuario (RU) aprobados.\n"
        "Reglas:\n"
        "1. Devuelve EXCLUSIVAMENTE un arreglo JSON válido sin texto ni markdown.\n"
        "2. UN REQUISITO PUEDE GENERAR UNA O MÁS HISTORIAS DE USUARIO (1 a N).\n"
        "3. 'rf_origen' debe guardar el ID exacto del requisito padre (ej: 'RU1').\n"
        "4. Estructura:\n"
        "   {\n"
        "     \"id\": \"HU-01\",\n"
        "     \"rf_origen\": \"RU1\",\n"
        "     \"titulo\": \"Título de la historia\",\n"
        "     \"rol\": \"usuario analista | administrador | etc.\",\n"
        "     \"quiero\": \"acción deseada\",\n"
        "     \"para\": \"beneficio de negocio\",\n"
        "     \"criterios_aceptacion\": [\"criterio 1\", \"criterio 2\"]\n"
        "   }"
    )

    ru_texto = "\n".join([
        f"- [{r['id']} - {r['nombre']}] {r['descripcion']} (Tipo: {r['tipo']}, Estabilidad: {r['estabilidad']}, Fuente: {r['fuente']})"
        for r in requisitos_aprobados
    ])

    messages = [
        {"role": "system", "content": prompt_sistema},
        {"role": "user", "content": f"Requisitos formales aprobados:\n\n{ru_texto}"}
    ]

    return await ejecutar_solicitud_llm(messages, modelo_solicitado=modelo, timeout=45.0)

# 3. Regeneración de criterios de aceptación con IA
async def regenerar_criterios_hu_llm(hu_data: dict, modelo: str = None) -> list:
    prompt_sistema = (
        "Eres un QA Lead y Product Owner experto en criterios de aceptación.\n"
        "Genera entre 2 y 4 criterios de aceptación técnicos y medibles para la siguiente Historia de Usuario editada.\n"
        "Reglas:\n"
        "1. Devuelve ÚNICAMENTE un arreglo JSON de strings (ej: [\"El sistema valida...\", \"Si el dato es nulo...\"]).\n"
        "2. No agregues bloques markdown ```json ni texto adicional."
    )

    hu_contexto = (
        f"Historia: {hu_data['titulo']}\n"
        f"Como: {hu_data['rol']}\n"
        f"Quiero: {hu_data['quiero']}\n"
        f"Para: {hu_data['para']}"
    )

    messages = [
        {"role": "system", "content": prompt_sistema},
        {"role": "user", "content": f"Historia de Usuario editada:\n{hu_contexto}"}
    ]

    return await ejecutar_solicitud_llm(messages, modelo_solicitado=modelo, timeout=30.0)

# 4. Derivación de Tareas Técnicas (TSK)
async def derivar_tareas_llm(historias_aprobadas: list, modelo: str = None) -> list:
    prompt_sistema = (
        "Eres un Líder Técnico y Scrum Master. Desglosa las Historias de Usuario aprobadas en tareas técnicas accionables.\n"
        "Reglas estrictas:\n"
        "1. Devuelve EXCLUSIVAMENTE un arreglo JSON válido sin bloques markdown ni texto adicional.\n"
        "2. Por cada Historia de Usuario, desglosa entre 1 y 3 tareas técnicas necesarias para completarla.\n"
        "3. Cada tarea debe enlazar a su historia padre en 'hu_origen'.\n"
        "4. Asigna un tipo de tarea válido: 'Frontend', 'Backend', 'Base de Datos', 'Pruebas' o 'DevOps'.\n"
        "5. Asigna una estimación realista en horas enteras ('estimacion_horas', entre 1 y 16).\n"
        "6. Formato de cada objeto:\n"
        "   {\n"
        "     \"id\": \"TSK-01\",\n"
        "     \"hu_origen\": \"HU-01\",\n"
        "     \"titulo\": \"Título conciso de la tarea\",\n"
        "     \"descripcion\": \"Detalle técnico de implementación\",\n"
        "     \"tipo\": \"Frontend | Backend | Base de Datos | Pruebas | DevOps\",\n"
        "     \"estimacion_horas\": 4\n"
        "   }"
    )

    hu_resumen = []
    for hu in historias_aprobadas:
        criterios = "; ".join(hu.get("criterios_aceptacion", []))
        hu_resumen.append(
            f"- [{hu['id']}] {hu['titulo']} (Como {hu['rol']}, quiero {hu['quiero']}). Criterios: {criterios}"
        )
    hu_texto = "\n".join(hu_resumen)

    messages = [
        {"role": "system", "content": prompt_sistema},
        {"role": "user", "content": f"Historias de Usuario aprobadas:\n\n{hu_texto}"}
    ]

    return await ejecutar_solicitud_llm(messages, modelo_solicitado=modelo, timeout=50.0)