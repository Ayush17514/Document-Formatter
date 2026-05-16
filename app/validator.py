def validate_document(classified_data: dict) -> dict:
    """
    Normalize multiple possible classified_data shapes and validate.
    Accepts:
      - {'paragraphs': [...]} 
      - {'classified': [...]} 
      - {'elements': [...]}  (each element may be {'type','data','label'})
      - a list-like of paragraph strings/dicts when passed directly
    Returns a dict with score/issues/stats.
    """
    # Accept direct list, or keys 'paragraphs' / 'classified' / 'elements'
    if isinstance(classified_data, list):
        paragraphs = classified_data
    else:
        paragraphs = (
            classified_data.get("paragraphs")
            or classified_data.get("classified")
            or classified_data.get("elements")
            or []
        )

    # Normalize entries: strings -> {'data': {'text': str}, 'label': 'BODY'}
    normalized = []
    for p in paragraphs:
        if isinstance(p, dict):
            # If element has 'data' with 'text', keep as-is
            normalized.append(p)
        elif isinstance(p, str):
            normalized.append({"data": {"text": p}, "label": "BODY"})
        else:
            # unknown type: skip
            continue

    paragraphs = normalized

    if not isinstance(paragraphs, list) or len(paragraphs) == 0:
        return {
            "score": 0,
            "issues": ["No paragraphs found in classified data"],
            "stats": {
                "total_paragraphs": 0,
                "label_distribution": {}
            }
        }

    labels = [p.get("label", "UNKNOWN") for p in paragraphs]

    issues = []
    score = 100

    if "TITLE" not in labels:
        issues.append("Missing Title")
        score -= 20
    if "ABSTRACT" not in labels:
        issues.append("Missing Abstract section")
        score -= 15
    if "REFERENCES" not in labels:
        issues.append("Missing References section")
        score -= 10

    counts = {}
    for l in labels:
        counts[l] = counts.get(l, 0) + 1

    return {
        "score": max(0, score),
        "issues": issues,
        "stats": {
            "total_paragraphs": len(paragraphs),
            "label_distribution": counts
        }
    }
