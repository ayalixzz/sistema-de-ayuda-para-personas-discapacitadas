import os
import ssl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Vercel fix: pg8000 no entiende sslmode en la URL, se pasa por connect_args
connect_args = {}

if DATABASE_URL.startswith("postgres"):
    # Convertir a pg8000
    if "postgresql+pg8000" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    
    # Limpiar sslmode de la URL para evitar errores de parámetro inesperado
    if "sslmode=" in DATABASE_URL:
        if "?" in DATABASE_URL:
            base, params = DATABASE_URL.split("?", 1)
            clean_params = "&".join([p for p in params.split("&") if not p.startswith("sslmode=")])
            DATABASE_URL = base + ("?" + clean_params if clean_params else "")
    
    # Forzar SSL para Supabase usando pg8000
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    connect_args["ssl_context"] = ssl_context

elif "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
