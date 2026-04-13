import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

# Vercel serverless no soporta psycopg2-binary
# Convertimos a pg8000 y LIMPIAMOS parámetros no soportados como sslmode
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)
    else:
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    
    # Eliminar sslmode porque pg8000 no lo reconoce en el connect()
    parsed = urlparse(DATABASE_URL)
    query = parse_qs(parsed.query)
    query.pop('sslmode', None)
    new_query = urlencode(query, doseq=True)
    DATABASE_URL = urlunparse(parsed._replace(query=new_query))

# Para SQLite necesita connect_args especial
connect_args = {}
if "sqlite" in DATABASE_URL:
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
