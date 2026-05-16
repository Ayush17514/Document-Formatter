import os
from typing import Any, Dict, List
import google.generativeai as genai
from app.utils.logger import logger

def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    genai.configure(api_key=api_key)
    return genai.GenerativeModel('gemini-1.5-flash')


def get_optimized_layout(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    client = get_gemini_client()
    if not client:
        logger.warning("No Gemini API key found. Skipping layout optimization.")
        return elements

    # Prepare the content for the AI
    text_content = "\n".join([e['data']['text'] for e in elements if e.get('type') == 'paragraph' and e.get('data')])
    
    prompt = f"""
    You are an expert in document layout and formatting.
    I have a document with the following text content:
    ---
    {text_content}
    ---
    
    I also have a list of elements (paragraphs, tables, images) in the order they appear in the original document.
    Your task is to re-order these elements to create a professional, readable document.
    
    Please provide the new order of elements as a comma-separated list of their original indices.
    For example: 0,1,3,2,4
    
    Original elements (with their index):
    {[(i, e.get('type')) for i, e in enumerate(elements)]}
    """

    try:
        response = client.generate_content(prompt)
        new_order_str = response.text.strip()
        
        # Parse the new order safely
        new_order = []
        for token in new_order_str.split(','):
            token = token.strip()
            if token == '':
                continue
            try:
                new_order.append(int(token))
            except ValueError:
                logger.warning(f"Skipping invalid index from AI: {token}")
                continue
        
        if len(new_order) != len(elements):
            logger.warning("AI returned an invalid new order. Using original order.")
            return elements
        
        # Reorder the elements
        reordered_elements = [elements[i] for i in new_order]
        
        logger.info("Successfully reordered elements with AI.")
        return reordered_elements

    except Exception as e:
        logger.error(f"AI layout optimization failed: {e}. Using original order.")
        return elements
