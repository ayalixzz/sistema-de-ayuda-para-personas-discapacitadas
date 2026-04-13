# Ruta de atencion al ciudadano

Proyecto con:

- Frontend estatico (wizard ciudadano + panel administrador)
- Backend (API)
- Nginx como proxy y servidor de estaticos

## Cambios realizados (frontend)

### Wizard (frontend/index.html)

- Header mas consistente con marca, jerarquia tipografica y CTA claro para consulta.
- Progreso del wizard redisenado: numeros + labels, barra de avance (via CSS var `--wizard-progress`) y posibilidad de volver a pasos anteriores haciendo click en el progreso.
- Encabezados por paso con contexto ("Paso X de 5" + subtitulo).
- Validacion mas clara: error inline para "Categoria de discapacidad" y estilos de campo invalido.
- Modal de consulta: header con cierre, soporte `Esc` y click fuera, y uso de `hidden` en lugar de `style.display`.

Archivos tocados:

- `frontend/index.html`
- `frontend/css/style.css`
- `frontend/js/script.js`

### Panel administrador (frontend/admin.html)

- Topbar con titulo dinamico y accion de "Actualizar".
- Sidebar responsive tipo off-canvas en mobile con overlay y cierre por `Esc`.
- Herramientas de tabla: buscador y filtros por pestaña.
- Mantenimiento critico integrado:

Lista desde `GET /api/admin/mantenimiento/alertas`.
Accion desde `POST /api/admin/mantenimiento/completar/{equipo_id}`.

- Modales migrados a `hidden`, cierre por `Esc` y click fuera.
- Tablas con header sticky y estados (badges) mas consistentes.

Archivos tocados:

- `frontend/admin.html`
- `frontend/css/admin.css`
- `frontend/js/admin.js`

## Como ejecutar (Docker)

1. `docker compose up --build`
2. Abrir:

- Wizard: `http://localhost/`
- Admin: `http://localhost/admin.html`
