import os
import json
import tempfile
import subprocess
from pathlib import Path
from docx import Document


def create_doc_with_paragraphs(texts, path):
    doc = Document()
    for t in texts:
        doc.add_paragraph(t)
    doc.save(path)


def test_parse_cli(tmp_path):
    # create a small docx
    p = tmp_path / "sample.docx"
    create_doc_with_paragraphs(["Title", "Abstract: This is an abstract.", "Introduction content."], str(p))

    # call the parse_cli
    repo_root = Path(__file__).resolve().parents[1]
    cli = repo_root / 'app' / 'parse_cli.py'

    result = subprocess.run(['python3', str(cli), str(p)], capture_output=True, text=True)
    assert result.returncode == 0, f"parse_cli failed: {result.stderr}"

    data = json.loads(result.stdout)
    assert isinstance(data, list)
    assert len(data) >= 3
    assert data[0] == 'Title'
