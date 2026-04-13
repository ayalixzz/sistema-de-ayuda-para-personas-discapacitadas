import os
import ssl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import urlparse, urlunparse

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db").strip()

connect_args = {}

if DATABASE_URL.startswith("postgres"):
    parsed = urlparse(DATABASE_URL)
    
    # Reconstruimos la URL limpiamente para usar pg8000
    # Mantenemos TODO (usuario, password, host, port, db) pero eliminamos los query params (sslmode)
    # Es crucial que las credenciales sigan en la URL para que Supabase identifique el Tenant.
    clean_url = urlunparse((
        'postgresql+pg8000', 
        parsed.netloc, 
        parsed.path, 
        parsed.params, 
        '', # Eliminamos todos los query parameters (?sslmode=require)
        parsed.fragment
    ))
    
    DATABASE_URL = clean_url
    
    # Desactivar verificación de certificado SSL (necesario para Supabase en Vercel)
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl_context"] = ssl_context

elif "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

# Crear el engine
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
