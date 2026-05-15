import re
from typing import Any

LABEL_TITLE = "TITLE"
LABEL_AUTHORS = "AUTHORS"
LABEL_ABSTRACT = "ABSTRACT"
LABEL_HEADING1 = "HEADING1"
LABEL_HEADING2 = "HEADING2"
LABEL_BODY = "BODY"
LABEL_REFERENCES = "REFERENCES"

class ParagraphClassifier:
    def __init__(self):
        self.in_references = False
        
    def classify(self, paragraphs: list) -> list:
        classified = []
        total = len(paragraphs)
        
        for i, p in enumerate(paragraphs):
            text = p["text"]
            text_lower = text.lower()
            
            label = LABEL_BODY
            confidence = 0.7
            
            # Simple heuristic rules
            if self.in_references:
                label = LABEL_REFERENCES
                confidence = 0.9
            elif i == 0 and len(text) < 200:
                label = LABEL_TITLE
                confidence = 0.8
            elif i < 5 and (re.search(r"@|\w+, \w+", text) or "university" in text_lower):
                label = LABEL_AUTHORS
                confidence = 0.8
            elif "abstract" in text_lower and len(text) < 20:
                label = LABEL_ABSTRACT
                confidence = 0.95
            elif text_lower in ["references", "bibliography", "works cited"]:
                label = LABEL_REFERENCES
                self.in_references = True
                confidence = 0.99
            elif len(text) < 100 and (re.match(r"^[I|V|X|\d]+\.", text) or text.isupper()):
                label = LABEL_HEADING1
                confidence = 0.8
            elif len(text) < 100 and re.match(r"^\d+\.\d+", text):
                label = LABEL_HEADING2
                confidence = 0.8
                
            p["label"] = label
            p["confidence"] = confidence
            classified.append(p)
            
        return classified

def classify_document(parsed_data: dict) -> dict:
    classifier = ParagraphClassifier()
    parsed_data["paragraphs"] = classifier.classify(parsed_data["paragraphs"])
    return parsed_data
