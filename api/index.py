import sys
import os

# Add the backend folder to the python path so imports inside app.main work
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app

# This exports the FastAPI app as a Vercel serverless function
