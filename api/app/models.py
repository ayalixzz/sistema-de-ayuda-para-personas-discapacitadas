from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Solicitud(Base):
    __tablename__ = "solicitudes"

    id = Column(Integer, primary_key=True, index=True)
    numero_radicado = Column(String, unique=True, index=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    
    # Paso 1: Información Personal y de Contacto
    nombres = Column(String, nullable=False)
    apellidos = Column(String, nullable=False)
    tipo_documento = Column(String, nullable=False)
    numero_documento = Column(String, nullable=False)
    fecha_nacimiento = Column(String, nullable=False)
    celular = Column(String, nullable=False)
    correo = Column(String, nullable=False)
    direccion = Column(String, nullable=False)
    departamento = Column(String, nullable=False)
    municipio = Column(String, nullable=False)
    
    requiere_cuidador = Column(Boolean, default=False)
    cuidador_nombre = Column(String, nullable=True)
    cuidador_cedula = Column(String, nullable=True)
    cuidador_telefono = Column(String, nullable=True)

    # Paso 2: Caracterización de la Discapacidad
    # For simplicity, multiple selections stored as comma-separated or JSON string. Here we use String.
    categoria_discapacidad = Column(String, nullable=False) 
    enfoque_diferencial = Column(String, nullable=True)

    # Paso 3: Ayudas Técnicas / DAP
    tipo_dap = Column(String, nullable=False)
    dispositivo_requerido = Column(String, nullable=False)

    # Paso 4: Documentos -> Se guardan las rutas
    doc_identidad_ruta = Column(String, nullable=True)
    doc_cuidador_ruta = Column(String, nullable=True)
    historia_clinica_ruta = Column(String, nullable=True)
    recibo_publico_ruta = Column(String, nullable=True)
    certificado_salud_ruta = Column(String, nullable=True)

    # Paso 5: Declaraciones Legales
    acepta_politica = Column(Boolean, nullable=False)
    autoriza_notificacion = Column(Boolean, nullable=False)
    declaracion_juramentada = Column(Boolean, nullable=False)

    # Estado y Caracterización Adicional
    estado_solicitud = Column(String, default="Pendiente")
    poblacion_especial = Column(String, nullable=True)
    clasificacion_sisben = Column(String, nullable=True)
    tipo_afiliacion_salud = Column(String, nullable=True)


class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    rol = Column(String, default="Administrador")

class Equipo(Base):
    __tablename__ = "equipos"
    id = Column(Integer, primary_key=True, index=True)
    codigo_inventario = Column(String, unique=True, index=True)
    tipo_dap = Column(String, nullable=False)
    estado = Column(String, default="Disponible") # Disponible, Asignado, Mantenimiento
    ultima_revision = Column(DateTime(timezone=True), server_default=func.now())
    estado_mantenimiento = Column(String, default="Al Día") # Al Día, Pendiente Auditar

class Asignacion(Base):
    __tablename__ = "asignaciones"
    id = Column(Integer, primary_key=True, index=True)
    solicitud_id = Column(Integer, ForeignKey("solicitudes.id"))
    equipo_id = Column(Integer, ForeignKey("equipos.id"))
    ubicacion_entrega = Column(String, nullable=True)
    fecha_asignacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_devolucion_programada = Column(DateTime(timezone=True), nullable=True)
    fecha_proxima_revision = Column(DateTime(timezone=True), nullable=True)
    estado_asignacion = Column(String, default="Activa") # Activa, Devuelta

    solicitud = relationship("Solicitud")
    equipo = relationship("Equipo")
