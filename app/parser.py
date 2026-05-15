from docx import Document
from typing import Any
from app.utils.logger import logger

def parse_document(filepath: str) -> dict[str, Any]:
    try:
        doc = Document(filepath)
        paragraphs = []
        
        for idx, para in enumerate(doc.paragraphs):
            text = para.text.strip()
            if not text:
                continue
                
            runs = []
            for run in para.runs:
                runs.append({
                    "text": run.text,
                    "bold": run.bold or False,
                    "italic": run.italic or False,
                    "font_size": run.font.size.pt if run.font.size else None,
                    "font_name": run.font.name
                })
                
            paragraphs.append({
                "index": idx,
                "text": text,
                "style": para.style.name if para.style else "Normal",
                "alignment": str(para.alignment) if para.alignment else None,
                "runs": runs
            })
            
        return {
            "paragraphs": paragraphs,
            "metadata": {
                "author": doc.core_properties.author,
                "title": doc.core_properties.title
            }
        }
    except Exception as e:
        logger.error(f"Error parsing document: {e}")
        raise
