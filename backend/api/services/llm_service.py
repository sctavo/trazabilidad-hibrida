import os
import json
import re
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash-lite")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

def limpiar_markdown_json(contenido: str) -> str:
    contenido = re.sub(r"^```json\s*", "", contenido.strip(), flags=re.IGNORECASE)
    contenido = re.sub(r"^```\s*", "", contenido.strip())
    contenido = re.sub(r"```$", "", contenido.strip())
    return contenido.strip()

async def extraer_requisitos_llm(texto_fuente: str) -> list:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY no configurada.")

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

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Tesis Trazabilidad Hibrida"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": f"Documento de entrada:\n\n{texto_fuente}"}
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Error OpenRouter: {response.text}")

            data = response.json()
            contenido_limpio = limpiar_markdown_json(data["choices"][0]["message"]["content"])
            return json.loads(contenido_limpio)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="El LLM no devolvió un JSON válido.")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=504, detail=f"Fallo de conexión: {str(exc)}")

async def derivar_historias_usuario_llm(requisitos_aprobados: list) -> list:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY no configurada.")

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

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Tesis Trazabilidad Hibrida"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": f"Requisitos formales aprobados:\n\n{ru_texto}"}
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Error OpenRouter: {response.text}")
            data = response.json()
            contenido_limpio = limpiar_markdown_json(data["choices"][0]["message"]["content"])
            return json.loads(contenido_limpio)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="Error decodificando Historias de Usuario.")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=504, detail=f"Fallo de conexión: {str(exc)}")

# --- Nueva función IA para regenerar criterios tras una edición manual ---
async def regenerar_criterios_hu_llm(hu_data: dict) -> list:
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY no configurada.")

    prompt_sistema = (
        "Eres un QA Lead y Product Owner experto en criterios de aceptación (estilo Gherkin o listas comprobables).\n"
        "Tu tarea es generar o actualizar entre 2 y 4 criterios de aceptación técnicos y medibles "
        "para una Historia de Usuario que ha sido redactada o editada por el analista.\n"
        "Reglas estrictas:\n"
        "1. Devuelve ÚNICAMENTE un arreglo JSON de strings (ej: [\"El sistema valida...\", \"Si el dato es nulo...\"]).\n"
        "2. No agregues bloques ```json ni texto introductorio."
    )

    hu_contexto = (
        f"Historia: {hu_data['titulo']}\n"
        f"Como: {hu_data['rol']}\n"
        f"Quiero: {hu_data['quiero']}\n"
        f"Para: {hu_data['para']}"
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Tesis Trazabilidad Hibrida"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": prompt_sistema},
            {"role": "user", "content": f"Historia de Usuario editada:\n{hu_contexto}"}
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Error OpenRouter: {response.text}")
            data = response.json()
            contenido_limpio = limpiar_markdown_json(data["choices"][0]["message"]["content"])
            return json.loads(contenido_limpio)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="Error decodificando criterios de aceptación.")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=504, detail=f"Fallo de conexión: {str(exc)}")