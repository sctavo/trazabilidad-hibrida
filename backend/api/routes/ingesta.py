# Aquí irá la lógica de PyMuPDF

import fitz  # PyMuPDF
from fastapi import APIRouter, UploadFile, HTTPException

router = APIRouter(tags=["Ingesta de Documentos"])

@router.post("/upload/")
async def procesar_documento(file: UploadFile):
    texto_extraido = ""
    
    # Procesamiento de archivos TXT (RF01)
    if file.filename.endswith(".txt"):
        contenido = await file.read()
        texto_extraido = contenido.decode("utf-8")
        
    # Procesamiento de archivos PDF (RF02 y RF03)
    elif file.filename.endswith(".pdf"):
        contenido = await file.read()
        # Invocamos el parser PDF usando PyMuPDF
        documento = fitz.open(stream=contenido, filetype="pdf")
        for pagina in documento:
            texto_extraido += pagina.get_text()
        documento.close()
        
        # Validar si el PDF contenía texto extraíble (Criterio de aceptación HU-02)
        if not texto_extraido.strip():
            raise HTTPException(
                status_code=400, 
                detail="El PDF no contiene texto extraíble."
            )
            
    else:
        raise HTTPException(
            status_code=400, 
            detail="Error: Formato no soportado. Solo .txt o .pdf"
        )
        
    # El texto extraído servirá como base de conocimiento inicial (RF04)
    return {
        "estado": "Carga exitosa",
        "archivo": file.filename,
        "contenido": texto_extraido
    }