import uuid
import os

def generate_file_id():
    return str(uuid.uuid4())

def ensure_directories(*dirs):
    for d in dirs:
        os.makedirs(d, exist_ok=True)

def get_file_extension(filename):
    return os.path.splitext(filename)[1].lower()
