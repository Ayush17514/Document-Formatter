def validate_document(classified_data: dict) -> dict:
    # Handle both 'paragraphs' and 'classified' keys for backward compatibility
    paragraphs = classified_data.get("paragraphs") or classified_data.get("classified", [])
    
    if not paragraphs:
        return {
            "score": 0,
            "issues": ["No paragraphs found in classified data"],
            "stats": {
                "total_paragraphs": 0,
                "label_distribution": {}
            }
        }
    
    labels = [p["label"] for p in paragraphs]
    
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
