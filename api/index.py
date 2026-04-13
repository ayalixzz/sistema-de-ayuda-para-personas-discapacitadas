import sys
import os

# Vercel ejecuta el archivo desde /var/task/
# Necesitamos que Python encuentre la carpeta api/app/
# Agregamos tanto api/ como el directorio actual al sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))  # /var/task/api/
parent_dir = os.path.dirname(current_dir)                 # /var/task/

for path in [current_dir, parent_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from app.main import app
