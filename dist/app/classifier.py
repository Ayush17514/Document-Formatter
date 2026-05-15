import re
from typing import Any, Dict

# Define labels for different document elements
LABEL_TITLE = "TITLE"
LABEL_AUTHORS = "AUTHORS"
LABEL_ABSTRACT = "ABSTRACT"
LABEL_HEADING1 = "HEADING1"
LABEL_HEADING2 = "HEADING2"
LABEL_BODY = "BODY"
LABEL_REFERENCES = "REFERENCES"
LABEL_TABLE = "TABLE"
LABEL_IMAGE = "IMAGE"

class DocumentClassifier:
    def __init__(self):
        self.in_references = False

    def classify(self, elements: list) -> list:
        classified_elements = []
        i = 0
        while i < len(elements):
            # Check for a sequence of paragraphs that could form a table.
            element = elements[i]
            if element.get("type") == "paragraph":
                j = i
                pseudo_table_buffer = []
                while j < len(elements) and elements[j].get("type") == "paragraph":
                    text = elements[j]["data"]["text"]
                    # Heuristic: a line is part of a pseudo-table if it's short.
                    if len(text.split()) < 5 and text.strip() != "":
                        pseudo_table_buffer.append(elements[j])
                        j += 1
                    else:
                        break
                
                # If we have a sequence of short paragraphs, treat it as a table.
                if len(pseudo_table_buffer) > 2: # at least 3 lines to be considered a table
                    table_data = [[p['data']['text']] for p in pseudo_table_buffer]
                    
                    new_table_element = {
                        "type": "table",
                        "data": table_data,
                        # The index of the first row is used as the element index
                        "index": pseudo_table_buffer[0]['index'] 
                    }
                    classified_elements.append(self._classify_table(new_table_element))
                    i = j # Skip the paragraphs that have been grouped.
                    continue

            # If not a pseudo-table or not a paragraph, classify the element normally.
            element_type = element.get("type")

            if element_type == "paragraph":
                classified_elements.append(self._classify_paragraph(element))
            elif element_type == "table":
                classified_elements.append(self._classify_table(element))
            elif element_type == "image":
                classified_elements.append(self._classify_image(element))
            else:
                # Keep unknown elements as they are.
                classified_elements.append(element)
            i += 1
            
        return classified_elements

    def _classify_paragraph(self, element: Dict[str, Any]) -> Dict[str, Any]:
        text = element["data"]["text"]
        text_lower = text.lower()
        
        label = LABEL_BODY
        confidence = 0.7

        if self.in_references:
            label = LABEL_REFERENCES
            confidence = 0.9
        elif element["index"] == 0 and len(text) < 200:
            label = LABEL_TITLE
            confidence = 0.8
        elif element["index"] < 5 and (re.search(r"@|\w+, \w+", text) or "university" in text_lower):
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

        element["label"] = label
        element["confidence"] = confidence
        return element

    def _classify_table(self, element: Dict[str, Any]) -> Dict[str, Any]:
        element["label"] = LABEL_TABLE
        element["confidence"] = 0.99
        return element

    def _classify_image(self, element: Dict[str, Any]) -> Dict[str, Any]:
        element["label"] = LABEL_IMAGE
        element["confidence"] = 0.99
        return element

def classify_document(parsed_data: dict) -> dict:
    classifier = DocumentClassifier()
    parsed_data["elements"] = classifier.classify(parsed_data["elements"])
    return parsed_data
