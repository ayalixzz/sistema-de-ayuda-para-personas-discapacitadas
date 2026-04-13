import sys
import os

# Add the current directory and backend to the python path
base_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.append(os.path.join(base_dir, "backend"))

from app.main import app

# This exports the FastAPI app as a Vercel serverless function
