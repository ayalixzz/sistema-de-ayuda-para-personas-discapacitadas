from fastapi import FastAPI, Depends, File, UploadFile, Form, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uuid
import os
import shutil
import jwt
from typing import Optional
from datetime import datetime, timedelta, timezone

from . import models, database
from .database import engine
from passlib.context import CryptContext
from pydantic import BaseModel

try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[WARNING] No se pudo crear tablas al inicio: {e}")
    # Las tablas ya existen en Supabase, continuamos normalmente

app = FastAPI(title="API Certificación Discapacidad y DAP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de carpetas para Vercel (solo lectura excepto /tmp)
IS_VERCEL = "VERCEL" in os.environ
UPLOAD_DIR = "/tmp/uploads" if IS_VERCEL else "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "my_super_secret_key"
ALGORITHM = "HS256"

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=60*24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    admin = db.query(models.AdminUser).filter(models.AdminUser.username == "admin").first()
    if not admin:
        new_admin = models.AdminUser(username="admin", password_hash=get_password_hash("admin123"))
        db.add(new_admin)
        db.commit()
    db.close()


def save_upload_file(upload_file: UploadFile, radicado: str) -> Optional[str]:
    if not upload_file or not upload_file.filename:
        return None
    file_extension = upload_file.filename.split(".")[-1]
    unique_filename = f"{radicado}_{uuid.uuid4().hex[:8]}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    return file_path

@app.post("/api/solicitudes")
def create_solicitud(
    nombres: str = Form(...),
    apellidos: str = Form(...),
    tipo_documento: str = Form(...),
    numero_documento: str = Form(...),
    fecha_nacimiento: str = Form(...),
    celular: str = Form(...),
    correo: str = Form(...),
    direccion: str = Form(...),
    departamento: str = Form(...),
    municipio: str = Form(...),
    requiere_cuidador: bool = Form(False),
    cuidador_nombre: Optional[str] = Form(None),
    cuidador_cedula: Optional[str] = Form(None),
    cuidador_telefono: Optional[str] = Form(None),
    categoria_discapacidad: str = Form(...),
    enfoque_diferencial: Optional[str] = Form(None),
    tipo_dap: str = Form(...),
    dispositivo_requerido: str = Form(...),
    acepta_politica: bool = Form(...),
    autoriza_notificacion: bool = Form(...),
    declaracion_juramentada: bool = Form(...),
    
    # Nuevos campos
    poblacion_especial: Optional[str] = Form(None),
    clasificacion_sisben: Optional[str] = Form(None),
    tipo_afiliacion_salud: Optional[str] = Form(None),
    
    doc_identidad: UploadFile = File(...),
    doc_cuidador: Optional[UploadFile] = File(None),
    historia_clinica: UploadFile = File(...),
    recibo_publico: UploadFile = File(...),
    certificado_salud: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    try:
        now = datetime.now(timezone.utc)
        
        # Validar si ya tiene un equipo asignado en los últimos 4 años
        hace_4_anios = now - timedelta(days=1460)
        solicitud_aprobada = db.query(models.Solicitud).join(models.Asignacion).filter(
            models.Solicitud.numero_documento == numero_documento,
            models.Solicitud.tipo_documento == tipo_documento,
            models.Asignacion.fecha_asignacion >= hace_4_anios
        ).first()

        if solicitud_aprobada:
            raise HTTPException(status_code=400, detail="El usuario ya se le ha aprobado y asignado un dispositivo en los últimos 4 años.")

        # Generar número de radicado
        radicado = f"RAD-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        # Guardar archivos
        path_identidad = save_upload_file(doc_identidad, radicado)
        path_cuidador = save_upload_file(doc_cuidador, radicado) if doc_cuidador else None
        path_historia = save_upload_file(historia_clinica, radicado)
        path_recibo = save_upload_file(recibo_publico, radicado)
        path_salud = save_upload_file(certificado_salud, radicado)

        nueva_solicitud = models.Solicitud(
            numero_radicado=radicado,
            nombres=nombres,
            apellidos=apellidos,
            tipo_documento=tipo_documento,
            numero_documento=numero_documento,
            fecha_nacimiento=fecha_nacimiento,
            celular=celular,
            correo=correo,
            direccion=direccion,
            departamento=departamento,
            municipio=municipio,
            requiere_cuidador=requiere_cuidador,
            cuidador_nombre=cuidador_nombre,
            cuidador_cedula=cuidador_cedula,
            cuidador_telefono=cuidador_telefono,
            categoria_discapacidad=categoria_discapacidad,
            enfoque_diferencial=enfoque_diferencial,
            tipo_dap=tipo_dap,
            dispositivo_requerido=dispositivo_requerido,
            acepta_politica=acepta_politica,
            autoriza_notificacion=autoriza_notificacion,
            declaracion_juramentada=declaracion_juramentada,
            
            poblacion_especial=poblacion_especial,
            clasificacion_sisben=clasificacion_sisben,
            tipo_afiliacion_salud=tipo_afiliacion_salud,
            
            doc_identidad_ruta=path_identidad,
            doc_cuidador_ruta=path_cuidador,
            historia_clinica_ruta=path_historia,
            recibo_publico_ruta=path_recibo,
            certificado_salud_ruta=path_salud
        )

        db.add(nueva_solicitud)
        db.commit()
        db.refresh(nueva_solicitud)

        return {"status": "success", "radicado": radicado, "mensaje": "Solicitud radicada con éxito"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.AdminUser).filter(models.AdminUser.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/admin/solicitudes")
def get_solicitudes(db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    solicitudes = db.query(models.Solicitud).order_by(models.Solicitud.fecha_creacion.desc()).all()
    return solicitudes


@app.get("/api/admin/inventario")
def get_inventario(db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    equipos = db.query(models.Equipo).all()
    result = []
    for eq in equipos:
        asignacion_activa = db.query(models.Asignacion).filter(models.Asignacion.equipo_id == eq.id, models.Asignacion.estado_asignacion == "Activa").first()
        eq_data = {
            "id": eq.id,
            "codigo_inventario": eq.codigo_inventario,
            "tipo_dap": eq.tipo_dap,
            "estado": eq.estado,
            "asignado_a": f"{asignacion_activa.solicitud.nombres} {asignacion_activa.solicitud.apellidos}" if asignacion_activa else None,
            "ubicacion": asignacion_activa.ubicacion_entrega if asignacion_activa else None,
            "fecha_devolucion": asignacion_activa.fecha_devolucion_programada if asignacion_activa else None
        }
        result.append(eq_data)
    return result


class EquipoCreate(BaseModel):
    codigo_inventario: str
    tipo_dap: str

@app.post("/api/admin/equipos")
def create_equipo(equipo: EquipoCreate, db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    db_equipo = models.Equipo(codigo_inventario=equipo.codigo_inventario, tipo_dap=equipo.tipo_dap)
    db.add(db_equipo)
    db.commit()
    return {"status": "success"}


class AsignacionCreate(BaseModel):
    solicitud_id: int
    equipo_id: int
    ubicacion_entrega: str
    fecha_devolucion_programada: str

@app.post("/api/admin/asignar")
def asignar_equipo(asignacion: AsignacionCreate, db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    solicitud = db.query(models.Solicitud).filter(models.Solicitud.id == asignacion.solicitud_id).first()
    equipo = db.query(models.Equipo).filter(models.Equipo.id == asignacion.equipo_id).first()
    
    if not solicitud or not equipo:
        raise HTTPException(status_code=404, detail="Solicitud o equipo no encontrado")
        
    if equipo.estado != "Disponible":
        raise HTTPException(status_code=400, detail="El equipo no está disponible")
        
    fecha_dev = datetime.strptime(asignacion.fecha_devolucion_programada, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    fecha_rev = datetime.now(timezone.utc) + timedelta(days=90)
    
    nueva_asignacion = models.Asignacion(
        solicitud_id=solicitud.id,
        equipo_id=equipo.id,
        ubicacion_entrega=asignacion.ubicacion_entrega,
        fecha_devolucion_programada=fecha_dev,
        fecha_proxima_revision=fecha_rev
    )
    
    solicitud.estado_solicitud = "Aprobada"
    equipo.estado = "Asignado"
    
    db.add(nueva_asignacion)
    db.commit()
    return {"status": "success", "mensaje": "Equipo asignado exitosamente"}


@app.get("/api/admin/alertas")
def get_alertas(db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    limite = datetime.now(timezone.utc) + timedelta(days=7)
    alertas = db.query(models.Asignacion).filter(
        models.Asignacion.estado_asignacion == "Activa",
        models.Asignacion.fecha_proxima_revision <= limite
    ).all()
    
    result = []
    for a in alertas:
        result.append({
            "id_asignacion": a.id,
            "equipo_codigo": a.equipo.codigo_inventario,
            "tipo_dap": a.equipo.tipo_dap,
            "beneficiario": f"{a.solicitud.nombres} {a.solicitud.apellidos}",
            "telefono": a.solicitud.celular,
            "fecha_revision": a.fecha_proxima_revision,
            "ubicacion_entrega": a.ubicacion_entrega
        })
    return result

@app.get("/api/admin/mantenimiento/alertas")
def get_alertas_mantenimiento(db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    hace_90_dias = datetime.now(timezone.utc) - timedelta(days=90)
    # Filtramos todos los equipos cuya ultima revisión superó los 90 días
    equipos_criticos = db.query(models.Equipo).filter(models.Equipo.ultima_revision <= hace_90_dias).all()
    
    result = []
    for eq in equipos_criticos:
        result.append({
            "id": eq.id,
            "codigo_inventario": eq.codigo_inventario,
            "tipo_dap": eq.tipo_dap,
            "estado": eq.estado,
            "ultima_revision": eq.ultima_revision,
            "dias_retraso": (datetime.now(timezone.utc) - eq.ultima_revision).days - 90
        })
    return result

@app.post("/api/admin/mantenimiento/completar/{equipo_id}")
def completar_mantenimiento(equipo_id: int, db: Session = Depends(database.get_db), current_admin=Depends(get_current_admin)):
    equipo = db.query(models.Equipo).filter(models.Equipo.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    
    equipo.ultima_revision = datetime.now(timezone.utc)
    equipo.estado_mantenimiento = "Al Día"
    db.commit()
    
    return {"status": "success", "mensaje": "Revisión marcada como completada exitosamente."}


@app.get("/api/consulta-estado/{numero_documento}")
def consulta_estado(numero_documento: str, db: Session = Depends(database.get_db)):
    solicitud = db.query(models.Solicitud).filter(models.Solicitud.numero_documento == numero_documento).order_by(models.Solicitud.fecha_creacion.desc()).first()
    
    if not solicitud:
        raise HTTPException(status_code=404, detail="No se encontró ninguna solicitud para este documento")
        
    resultado = {
        "radicado": solicitud.numero_radicado,
        "estado_solicitud": solicitud.estado_solicitud,
        "fecha_creacion": solicitud.fecha_creacion,
    }
    
    if solicitud.estado_solicitud == "Aprobada":
        asignacion = db.query(models.Asignacion).filter(models.Asignacion.solicitud_id == solicitud.id, models.Asignacion.estado_asignacion == "Activa").first()
        if asignacion:
            resultado["equipo"] = asignacion.equipo.codigo_inventario
            resultado["tipo_dap"] = asignacion.equipo.tipo_dap
            resultado["fecha_devolucion"] = asignacion.fecha_devolucion_programada
            resultado["fecha_proxima_revision"] = asignacion.fecha_proxima_revision
            
            if asignacion.fecha_proxima_revision and asignacion.fecha_proxima_revision <= datetime.now(timezone.utc) + timedelta(days=7):
                resultado["alerta_revision"] = True
            else:
                resultado["alerta_revision"] = False
                
    return resultado
