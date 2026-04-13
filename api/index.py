import sys
import os

# Vercel mounts the api/ folder at /var/task/api
# Our app/ folder is now at api/app/ so imports work directly
from app.main import app
