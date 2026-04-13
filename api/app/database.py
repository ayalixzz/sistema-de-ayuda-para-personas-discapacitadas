import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Detectar si estamos en Vercel
IS_VERCEL = "VERCEL" in os.environ
default_db = "sqlite:////tmp/test.db" if IS_VERCEL else "sqlite:///./test.db"

# Obtener URL y limpiar espacios/comillas accidentales
DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL.strip():
    DATABASE_URL = default_db
else:
    DATABASE_URL = DATABASE_URL.strip().strip('"').strip("'")

# SQLAlchemy 1.4+ requiere postgresql:// en lugar de postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
engine_kwargs = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Configuraciones recomendadas para Supabase Pooler (Supavisor) con Vercel
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["connect_args"] = {
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

# Crear el engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
else:
    engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
