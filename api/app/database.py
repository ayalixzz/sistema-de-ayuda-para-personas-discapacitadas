import os
import ssl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import urlparse

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

connect_args = {}

# Si es Postgres, desarmamos la URL para evitar errores de parsing en el Gateway de Supabase
if DATABASE_URL.startswith("postgres"):
    parsed = urlparse(DATABASE_URL)
    
    # Extraer credenciales manualmente
    # format: postgresql://user:password@host:port/dbname
    auth = parsed.netloc.split('@')[0]
    user = auth.split(':')[0]
    password = auth.split(':')[1] if ':' in auth else ""
    
    endpoint = parsed.netloc.split('@')[1]
    host = endpoint.split(':')[0]
    port = int(endpoint.split(':')[1]) if ':' in endpoint else 5432
    
    dbname = parsed.path.lstrip('/')

    # Reconstruimos la URL base para SQLAlchemy SIN credenciales
    # Las credenciales las pasamos por connect_args para que pg8000 las maneje directo
    DATABASE_URL = f"postgresql+pg8000://{host}:{port}/{dbname}"
    
    connect_args.update({
        "user": user,
        "password": password,
        "ssl_context": ssl.create_default_context()
    })
    
    # Desactivar verificación de certificado (necesario para Supabase en Vercel)
    connect_args["ssl_context"].check_hostname = False
    connect_args["ssl_context"].verify_mode = ssl.CERT_NONE

elif "sqlite" in DATABASE_URL:
    connect_args["check_same_thread"] = False

# Crear el engine con los argumentos explícitos
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
