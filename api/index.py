import sys
import os

# Determinar la raíz del proyecto (un nivel arriba de /api)
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

# Agregar la raíz y la carpeta backend al path de Python
if project_root not in sys.path:
    sys.path.insert(0, project_root)

backend_dir = os.path.join(project_root, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Intentar importar la aplicación de FastAPI
try:
    from app.main import app
except ImportError as e:
    # Si falla, intentamos con el path completo
    try:
        from backend.app.main import app
    except ImportError:
        raise ImportError(f"No se pudo encontrar el módulo 'app'. Path actual: {sys.path}. Error: {str(e)}")
