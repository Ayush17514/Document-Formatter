import os
import shutil
import uuid
import mammoth
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.parser import parse_document
from app.classifier import classify_document
from app.validator import validate_document
from app.formatter import format_manuscript
from app.ai_template_resolver import resolve_formatting_rules
from app.publication_rules import PUBLICATION_RULES
from app.utils.logger import logger

app = FastAPI(
    title="Manuscript Formatter AI",
    description="AI-powered manuscript formatting platform",
    version="3.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
OUTPUT_DIR = os.path.join(os.getcwd(), "outputs")
STATIC_DIR = os.path.join(BASE_DIR, "static")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Registry for session data (in-memory for demo, should use DB for production)
file_registry = {}

@app.get("/", response_class=HTMLResponse)
async def home():
    index_path = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_path):
        return HTMLResponse("<h1>Frontend Missing</h1><p>Please check app/static/index.html</p>")
    with open(index_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/api/options")
async def get_options():
    return JSONResponse(content=PUBLICATION_RULES)

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")
    
    file_id = str(uuid.uuid4())
    filepath = os.path.join(UPLOAD_DIR, f"{file_id}.docx")
    
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    try:
        parsed = parse_document(filepath)
        classified = classify_document(parsed)
        validation = validate_document(classified)
        
        file_registry[file_id] = {
            "original_name": file.filename,
            "path": filepath,
            "classified": classified,
            "validation": validation,
            "status": "uploaded"
        }
        
        return {
            "file_id": file_id,
            "validation_score": validation["score"],
            "stats": validation["stats"]
        }
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

@app.post("/api/process")
async def process_file(
    file_id: str = Form(...),
    doc_type: str = Form(...),
    publication: str = Form(...)
):
    if file_id not in file_registry:
        raise HTTPException(status_code=404, detail="File session not found")
        
    info = file_registry[file_id]
    
    try:
        # Resolve rules using Gemini AI fallback if not in strict rules
        rules = await resolve_formatting_rules(publication, doc_type)
        
        output_filename = f"formatted_{file_id}.docx"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        format_manuscript(
            classified_data=info["classified"],
            publication=publication,
            doc_type=doc_type,
            output_path=output_path,
            rules=rules
        )
        
        info["output_path"] = output_path
        info["status"] = "processed"
        
        # Also generate HTML preview
        with open(output_path, "rb") as doc_file:
            result = mammoth.convert_to_html(doc_file)
            preview_html = result.value
            
        return {
            "status": "success",
            "preview_html": preview_html,
            "rules": rules
        }
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download/{file_id}")
async def download_file(file_id: str):
    if file_id not in file_registry or "output_path" not in file_registry[file_id]:
        raise HTTPException(status_code=404, detail="Processed file not found")
        
    path = file_registry[file_id]["output_path"]
    return FileResponse(
        path, 
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=os.path.basename(path)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
