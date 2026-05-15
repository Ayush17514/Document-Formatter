def validate_document(classified_data: dict) -> dict:
    paragraphs = classified_data["paragraphs"]
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
