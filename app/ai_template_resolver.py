import os
import json
import google.generativeai as genai
from app.publication_rules import PUBLICATION_RULES, DEFAULT_RULES
from app.utils.logger import logger

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-flash')

async def resolve_formatting_rules(publication: str, doc_type: str) -> dict:
    # 1. Try strict rules first
    if doc_type in PUBLICATION_RULES and publication in PUBLICATION_RULES[doc_type]:
        logger.info(f"Using strict rules for {publication}")
        return PUBLICATION_RULES[doc_type][publication]
    
    # 2. AI Fallback
    client = get_gemini_client()
    if not client:
        logger.warning("No Gemini API key. Using default rules.")
        return DEFAULT_RULES
        
    prompt = f"""
    You are an expert in academic publication formatting.
    Provide the official formatting rules for:
    Publication: {publication}
    Document Type: {doc_type}
    
    Return ONLY a JSON object with these keys:
    {{
        "font_family": "string",
        "font_size_body": number,
        "font_size_heading": number,
        "columns": 1 or 2,
        "line_spacing": number,
        "margins": {{"top": num, "bottom": num, "left": num, "right": num}}
    }}
    Use inches for margins. If unknown, use reasonable standard values.
    """
    
    try:
        response = client.generate_content(prompt)
        text = response.text.strip()
        # Clean up possible markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
            
        rules = json.loads(text)
        logger.info(f"AI generated rules for {publication}")
        return rules
    except Exception as e:
        logger.error(f"AI rule resolution failed: {e}")
        return DEFAULT_RULES
