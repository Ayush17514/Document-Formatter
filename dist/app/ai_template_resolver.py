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
        # Ensure even strict rules are complete
        final_rules = DEFAULT_RULES.copy()
        final_rules.update(PUBLICATION_RULES[doc_type][publication])
        return final_rules
    
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
            
        ai_rules = json.loads(text)
        
        # Merge AI rules with defaults to ensure all keys are present
        final_rules = DEFAULT_RULES.copy()
        final_rules.update(ai_rules)
        
        # Deep merge for nested dictionaries like 'margins'
        if 'margins' in ai_rules and isinstance(ai_rules['margins'], dict):
            final_rules['margins'] = DEFAULT_RULES['margins'].copy()
            final_rules['margins'].update(ai_rules['margins'])

        logger.info(f"AI generated rules for {publication}")
        return final_rules
        
    except Exception as e:
        logger.error(f"AI rule resolution failed: {e}. Falling back to default rules.")
        return DEFAULT_RULES
