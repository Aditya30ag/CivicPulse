import json
import re
import requests
from typing import Any, Dict
from google import genai
from google.genai import types
from server.config import settings

def get_genai_client() -> genai.Client:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment variables.")
    return genai.Client(api_key=api_key)

def clean_and_parse_json(text: str, context: str) -> Dict[str, Any]:
    cleaned_text = text.strip()
    code_block_regex = r"```(?:json)?\s*([\s\S]*?)\s*```"
    match = re.search(code_block_regex, cleaned_text)
    
    if match:
        cleaned_text = match.group(1).strip()
    else:
        first_brace = cleaned_text.find("{")
        last_brace = cleaned_text.rfind("}")
        first_bracket = cleaned_text.find("[")
        last_bracket = cleaned_text.rfind("]")
        
        start_idx = -1
        end_idx = -1
        
        if first_brace != -1 and last_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            start_idx = first_brace
            end_idx = last_brace
        elif first_bracket != -1 and last_bracket != -1:
            start_idx = first_bracket
            end_idx = last_bracket
            
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned_text = cleaned_text[start_idx:end_idx + 1].strip()
            
    cleaned_text = re.sub(r"^[`'\s]+|[`'\s]+$", "", cleaned_text).strip()
    
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed for {context}: {e}. Raw response: {text}")
        raise ValueError(f"Failed to parse Gemini response for {context}")

def generate_content_with_image(image_url: str, prompt: str) -> str:
    client = get_genai_client()
    
    # Fetch image content
    response = requests.get(image_url)
    if response.status_code != 200:
        raise ValueError(f"Failed to fetch image from URL: {image_url}")
        
    content_type = response.headers.get("content-type", "image/jpeg")
    image_bytes = response.content

    # Call Gemini model using google-genai SDK
    result = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=content_type),
            prompt
        ]
    )
    return result.text or ""

def generate_text_content(prompt: str) -> str:
    client = get_genai_client()
    result = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return result.text or ""
