#!/usr/bin/env python3
import sys
import json
from pathlib import Path

# Ensure we can import app.parser by adjusting sys.path
repo_root = Path(__file__).resolve().parents[1]
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

try:
    from app.parser import parse_document
except Exception as e:
    print(json.dumps({"error": f"Failed to import parser: {e}"}))
    sys.exit(2)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing file path"}))
        sys.exit(2)

    path = sys.argv[1]
    try:
        parsed = parse_document(path)
        # Extract paragraph texts
        paragraphs = []
        for el in parsed.get('elements', []):
            if el.get('type') == 'paragraph':
                txt = el.get('data', {}).get('text', '')
                if txt is None:
                    txt = ''
                paragraphs.append(txt)
        print(json.dumps(paragraphs, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()
