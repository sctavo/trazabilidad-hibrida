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