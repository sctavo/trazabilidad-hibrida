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
    """Elimina etiquetas ```json y ``` para evitar fallos de parseo."""
    contenido = re.sub(r"^```json\s*", "", contenido.strip(), flags=re.IGNORECASE)
    contenido = re.sub(r"^```\s*", "", contenido.strip())
    contenido = re.sub(r"```$", "", contenido.strip())
    return contenido.strip()


#Aqui: Extraer Requisitos Funcionales a partir de Texto Fuente
async def extraer_requisitos_llm(texto_fuente: str) -> list:
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="OPENROUTER_API_KEY no está configurada en las variables de entorno."
        )

    # Prompt basado en las especificaciones del Experimento 2
    prompt_sistema = (
        "Eres un analista de requerimientos experto en ingeniería de software. "
        "Tu tarea es analizar el siguiente documento o notas y derivar los requisitos "
        "funcionales formales del sistema.\n"
        "Reglas estrictas:\n"
        "1. Devuelve EXCLUSIVAMENTE un arreglo JSON válido.\n"
        "2. No incluyas textos introductorios, explicaciones ni bloques de código markdown.\n"
        "3. Cada objeto debe tener la estructura: {\"id\": \"RF01\", \"descripcion\": \"...\", \"prioridad\": \"Alta|Media|Baja\"}."
    )

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173", # Requisito de OpenRouter
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
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Error en OpenRouter: {response.text}"
                )

            data = response.json()
            contenido_ia = data["choices"][0]["message"]["content"]
            
            # Limpiar posible markdown devuelto por el modelo
            contenido_limpio = limpiar_markdown_json(contenido_ia)
            requisitos_json = json.loads(contenido_limpio)
            
            return requisitos_json

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=502, 
                detail=f"El LLM no devolvió un JSON válido. Respuesta: {contenido_ia}"
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=504, 
                detail=f"Fallo de conexión con la API de IA: {str(exc)}"
            )



#AQUI: Derivar Historias de Usuario a partir de Requisitos Funcionales Aprobados
async def derivar_historias_usuario_llm(requisitos_aprobados: list) -> list:
    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="OPENROUTER_API_KEY no configurada."
        )

    prompt_sistema = (
        "Eres un Product Owner experto y analista de metodologías ágiles. Tu tarea es derivar "
        "Historias de Usuario a partir de un conjunto de requisitos funcionales formales aprobados.\n"
        "Reglas estrictas:\n"
        "1. Devuelve EXCLUSIVAMENTE un arreglo JSON válido sin texto introductorio ni bloques de código markdown.\n"
        "2. UN REQUISITO FUNCIONAL PUEDE GENERAR UNA O MÁS HISTORIAS DE USUARIO (relación 1 a N). "
        "Si un requisito contiene flujos distintos, validaciones o perfiles de usuario diferentes, "
        "desglósalo en múltiples historias para que sean atómicas y manejables en sprints.\n"
        "3. Cada Historia de Usuario debe referenciar su requisito formal padre en el campo 'rf_origen'.\n"
        "4. Genera IDs correlativos secuenciales (HU-01, HU-02, HU-03, ...).\n"
        "5. La estructura de cada objeto debe ser:\n"
        "   {\n"
        "     \"id\": \"HU-01\",\n"
        "     \"rf_origen\": \"RF01\",\n"
        "     \"titulo\": \"Título descriptivo de la historia\",\n"
        "     \"rol\": \"usuario analista | administrador | etc.\",\n"
        "     \"quiero\": \"acción o comportamiento deseado\",\n"
        "     \"para\": \"beneficio o valor de negocio\",\n"
        "     \"criterios_aceptacion\": [\"criterio 1\", \"criterio 2\"]\n"
        "   }"
    )

    # Formatear requisitos de entrada para el contexto
    requisitos_texto = "\n".join([f"- [{r['id']}] {r['descripcion']} (Prioridad: {r['prioridad']})" for r in requisitos_aprobados])

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
            {"role": "user", "content": f"Requisitos formales aprobados:\n\n{requisitos_texto}"}
        ],
        "temperature": 0.2
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        try:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Error en OpenRouter: {response.text}"
                )

            data = response.json()
            contenido_ia = data["choices"][0]["message"]["content"]
            contenido_limpio = limpiar_markdown_json(contenido_ia)
            historias_json = json.loads(contenido_limpio)
            return historias_json

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=502, 
                detail=f"Error al decodificar JSON de Historias de Usuario: {contenido_ia}"
            )
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=504, 
                detail=f"Error de red con la API de IA: {str(exc)}"
            )