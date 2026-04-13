import sys
import os

# Get absolute path to backend folder
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(base_dir, "backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

# This exports the FastAPI app as a Vercel serverless function
