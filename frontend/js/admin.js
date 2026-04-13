const adminState = {
    solicitudes: [],
    inventario: [],
    alertas: [],
    mantenimiento: []
};

document.addEventListener('DOMContentLoaded', () => {
    wireLayout();
    wireFilters();

    const token = localStorage.getItem('admin_token');
    if (token) {
        showDashboard();
    } else {
        document.getElementById('login-container').style.display = 'flex';
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'username': username,
                    'password': password
                })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('admin_token', data.access_token);
                showDashboard();
            } else {
                showToast(data.detail || 'Error de autenticación', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });
});

window.logout = () => {
    localStorage.removeItem('admin_token');
    location.reload();
};

function showDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'flex';
    switchTab('solicitudes');

    // Populate metric cards in the background
    loadInventario();
    loadAlertas();
    loadMantenimiento();
}

window.switchTab = (tab) => {
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    
    const btn = document.querySelector(`button[onclick="switchTab('${tab}')"]`);
    if (btn) btn.classList.add('active');

    setTopbarTitle(tab);
    closeSidebar();
    
    if (tab === 'solicitudes') loadSolicitudes();
    if (tab === 'inventario') loadInventario();
    if (tab === 'alertas') loadAlertas();
    if (tab === 'mantenimiento') loadMantenimiento();
};

window.refreshActiveTab = () => {
    const active = document.querySelector('.admin-tab.active');
    if (!active || !active.id) return;
    const tab = active.id.replace(/^tab-/, '');
    if (tab === 'solicitudes') loadSolicitudes();
    if (tab === 'inventario') loadInventario();
    if (tab === 'alertas') loadAlertas();
    if (tab === 'mantenimiento') loadMantenimiento();
};

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('admin_token');
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        logout();
        throw new Error('No autorizado');
    }
    return res;
}

function setTopbarTitle(tab) {
    const el = document.getElementById('current-view-name');
    if (!el) return;
    const map = {
        solicitudes: 'Solicitudes',
        inventario: 'Inventario',
        alertas: 'Auditoría pacientes',
        mantenimiento: 'Mantenimiento crítico'
    };
    el.textContent = map[tab] || 'Panel';
}

function tbodyLoading(tbody, cols) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${cols}" style="color: rgba(100,116,139,0.95); font-weight: 700;">Cargando...</td></tr>`;
}

function tbodyEmpty(tbody, cols, msg) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${cols}" style="color: rgba(100,116,139,0.95); font-weight: 700;">${msg}</td></tr>`;
}

function norm(s) {
    return String(s || '').toLowerCase();
}

// SOLICITUDES
async function loadSolicitudes() {
    const tbody = document.getElementById('solicitudes-body');
    tbodyLoading(tbody, 6);

    try {
        const res = await fetchWithAuth('/api/admin/solicitudes');
        const data = await res.json();

        adminState.solicitudes = Array.isArray(data) ? data : [];
        renderSolicitudes();
    } catch(e) {
        console.error(e);
        tbodyEmpty(tbody, 6, 'No fue posible cargar solicitudes.');
    }
}

function renderSolicitudes() {
    const tbody = document.getElementById('solicitudes-body');
    if (!tbody) return;

    const q = norm(document.getElementById('solicitudes-search')?.value);
    const estado = document.getElementById('solicitudes-estado')?.value || '';

    const rows = adminState.solicitudes.filter(s => {
        if (estado && s.estado_solicitud !== estado) return false;
        if (!q) return true;
        const hay = [
            s.numero_radicado,
            s.numero_documento,
            `${s.nombres || ''} ${s.apellidos || ''}`,
            s.tipo_dap,
            s.dispositivo_requerido
        ].some(v => norm(v).includes(q));
        return hay;
    });

    tbody.innerHTML = '';
    if (rows.length === 0) return tbodyEmpty(tbody, 6, 'Sin resultados.');

    rows.forEach(s => {
        const tr = document.createElement('tr');
        const nombre = `${s.nombres || ''} ${s.apellidos || ''}`.trim();
        const nombreJs = JSON.stringify(nombre);
        
        let badgeClass = 'badge--warning';
        if (s.estado_solicitud === 'Aprobada') badgeClass = 'badge--success';
        if (s.estado_solicitud === 'Rechazada') badgeClass = 'badge--danger';

        tr.innerHTML = `
            <td style="font-weight:700; color:var(--navy-mid)">#${s.numero_radicado}</td>
            <td style="font-family:var(--ff-head); font-weight:700;">${s.numero_documento}</td>
            <td>${nombre || '-'}</td>
            <td><span style="font-size:0.75rem; color:var(--gray-400); font-weight:700;">${s.tipo_dap.toUpperCase()}</span><br>${s.dispositivo_requerido}</td>
            <td>
                <span class="badge ${badgeClass}">${s.estado_solicitud}</span>
            </td>
            <td>
                ${s.estado_solicitud === 'Pendiente' ? `<button class="btn btn--primary btn--table" onclick="openAsignarModal(${s.id}, ${nombreJs})">Gestionar</button>` : '---'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.openAsignarModal = async (solicitudId, nombre) => {
    const modal = document.getElementById('asignar-modal');
    if (modal) modal.hidden = false;
    document.getElementById('asig_sol_id').value = solicitudId;
    document.getElementById('asig_beneficiario').textContent = nombre;
    
    // Load available equipments
    try {
        const res = await fetchWithAuth('/api/admin/inventario');
        const data = await res.json();
        const select = document.getElementById('asig_equipo');
        select.innerHTML = '<option value="">Seleccione Equipo...</option>';
        data.filter(e => e.estado === 'Disponible').forEach(e => {
            select.innerHTML += `<option value="${e.id}">${e.codigo_inventario} - ${e.tipo_dap}</option>`;
        });
    } catch(e) { console.error(e); }
};

window.cerrarAsignarModal = () => {
    const modal = document.getElementById('asignar-modal');
    if (modal) modal.hidden = true;
};

window.submitAsignar = async () => {
    const solicitud_id = document.getElementById('asig_sol_id').value;
    const equipo_id = document.getElementById('asig_equipo').value;
    const ubicacion = document.getElementById('asig_ubicacion').value;
    const fecha = document.getElementById('asig_fecha_dev').value;
    
    if(!equipo_id || !ubicacion || !fecha) return showToast("Complete los campos", 'warning');
    
    try {
        const res = await fetchWithAuth('/api/admin/asignar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                solicitud_id: parseInt(solicitud_id),
                equipo_id: parseInt(equipo_id),
                ubicacion_entrega: ubicacion,
                fecha_devolucion_programada: fecha
            })
        });
        if(res.ok) {
            cerrarAsignarModal();
            loadSolicitudes();
            showToast("Equipo asignado correctamente", 'success');
        } else {
            const data = await res.json();
            showToast("Error: " + data.detail, 'error');
        }
    } catch(e) { console.error(e); }
};

// INVENTARIO
async function loadInventario() {
    const tbody = document.getElementById('inventario-body');
    tbodyLoading(tbody, 5);

    try {
        const res = await fetchWithAuth('/api/admin/inventario');
        const data = await res.json();

        adminState.inventario = Array.isArray(data) ? data : [];
        document.getElementById('metric-total').textContent = adminState.inventario.length;
        document.getElementById('metric-asignados').textContent = adminState.inventario.filter(e => e.estado === 'Asignado').length;

        renderInventario();
    } catch(e) {
        console.error(e);
        tbodyEmpty(tbody, 5, 'No fue posible cargar inventario.');
    }
}

function renderInventario() {
    const tbody = document.getElementById('inventario-body');
    if (!tbody) return;

    const q = norm(document.getElementById('inventario-search')?.value);
    const estado = document.getElementById('inventario-estado')?.value || '';

    const rows = adminState.inventario.filter(e => {
        if (estado && e.estado !== estado) return false;
        if (!q) return true;
        return [e.codigo_inventario, e.tipo_dap, e.estado, e.asignado_a].some(v => norm(v).includes(q));
    });

    tbody.innerHTML = '';
    if (rows.length === 0) return tbodyEmpty(tbody, 6, 'Sin resultados.');

    rows.forEach(e => {
        const tr = document.createElement('tr');
        const badgeClass = e.estado === 'Disponible' ? 'badge--success' : (e.estado === 'Asignado' ? 'badge--info' : 'badge--warning');
        tr.innerHTML = `
            <td style="font-weight:700;">${e.codigo_inventario}</td>
            <td>${e.tipo_dap}</td>
            <td><span class="badge ${badgeClass}">${e.estado}</span></td>
            <td>${e.asignado_a || '<span style="color:var(--gray-300)">Ninguno</span>'}</td>
            <td>${e.fecha_devolucion ? new Date(e.fecha_devolucion).toLocaleDateString() : '-'}</td>
            <td>---</td>
        `;
        tbody.appendChild(tr);
    });
}

window.addEquipo = async () => {
    const code = prompt("Código de Inventario:");
    if(!code) return;
    const type = prompt("Tipo DAP (P. ej. Silla de ruedas):");
    if(!type) return;
    
    try {
        const res = await fetchWithAuth('/api/admin/equipos', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({codigo_inventario: code, tipo_dap: type})
        });
        if(res.ok) {
            loadInventario();
            showToast("Equipo añadido exitosamente", 'success');
        }
    } catch(e) { console.error(e); showToast("Error al añadir equipo", 'error'); }
};

// ALERTAS
async function loadAlertas() {
    const tbody = document.getElementById('alertas-body');
    tbodyLoading(tbody, 6);

    try {
        const res = await fetchWithAuth('/api/admin/alertas');
        const data = await res.json();

        adminState.alertas = Array.isArray(data) ? data : [];
        document.getElementById('metric-alertas').textContent = adminState.alertas.length;
        renderAlertas();
    } catch(e) {
        console.error(e);
        tbodyEmpty(tbody, 6, 'No fue posible cargar alertas.');
    }
}

function renderAlertas() {
    const tbody = document.getElementById('alertas-body');
    if (!tbody) return;

    const q = norm(document.getElementById('alertas-search')?.value);
    const rows = adminState.alertas.filter(a => {
        if (!q) return true;
        return [a.equipo_codigo, a.tipo_dap, a.beneficiario, a.telefono, a.ubicacion_entrega].some(v => norm(v).includes(q));
    });

    tbody.innerHTML = '';
    if (rows.length === 0) return tbodyEmpty(tbody, 6, 'Sin resultados.');

    rows.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:700;">${a.equipo_codigo} <br> <small style="color:var(--gray-400)">${a.tipo_dap}</small></td>
            <td style="font-weight:600;">${a.beneficiario}</td>
            <td>${a.telefono}</td>
            <td><span class="badge badge--danger">${new Date(a.fecha_revision).toLocaleDateString()}</span></td>
            <td>${a.ubicacion_entrega}</td>
            <td><button class="btn btn--secondary btn--table" onclick="showToast('Notificando via manual...', 'warning')">Notificar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

// MANTENIMIENTO
async function loadMantenimiento() {
    const tbody = document.getElementById('mantenimiento-body');
    tbodyLoading(tbody, 6);

    try {
        const res = await fetchWithAuth('/api/admin/mantenimiento/alertas');
        const data = await res.json();

        adminState.mantenimiento = Array.isArray(data) ? data : [];
        document.getElementById('metric-mantenimiento').textContent = adminState.mantenimiento.length;
        renderMantenimiento();
    } catch (e) {
        console.error(e);
        tbodyEmpty(tbody, 6, 'No fue posible cargar mantenimiento.');
    }
}

function renderMantenimiento() {
    const tbody = document.getElementById('mantenimiento-body');
    if (!tbody) return;

    const q = norm(document.getElementById('mantenimiento-search')?.value);
    const rows = adminState.mantenimiento.filter(m => {
        if (!q) return true;
        return [m.codigo_inventario, m.tipo_dap, m.estado].some(v => norm(v).includes(q));
    });

    tbody.innerHTML = '';
    if (rows.length === 0) return tbodyEmpty(tbody, 6, 'Sin resultados.');

    rows.forEach(m => {
        const tr = document.createElement('tr');
        const codigoJs = JSON.stringify(m.codigo_inventario || '');
        const badgeClass = m.estado === 'Disponible' ? 'badge--success' : 'badge--warning';
        
        tr.innerHTML = `
            <td style="font-weight:700;">${m.codigo_inventario}</td>
            <td>${m.tipo_dap}</td>
            <td><span class="badge ${badgeClass}">${m.estado}</span></td>
            <td>${m.ultima_revision ? new Date(m.ultima_revision).toLocaleDateString() : 'Sin registro'}</td>
            <td><span style="color:var(--danger); font-weight:900;">${m.dias_retraso} días</span></td>
            <td><button class="btn btn--submit btn--table" style="background:var(--danger); color:white" onclick="openMantenimientoModal(${m.id}, ${codigoJs})">Marcar revisado</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.openMantenimientoModal = (equipoId, codigo) => {
    const modal = document.getElementById('mantenimiento-modal');
    if (!modal) return;
    modal.hidden = false;
    document.getElementById('manto_equipo_id').value = equipoId;
    document.getElementById('manto_codigo').textContent = codigo;
};

window.cerrarMantenimientoModal = () => {
    const modal = document.getElementById('mantenimiento-modal');
    if (modal) modal.hidden = true;
};

window.submitMantenimiento = async () => {
    const equipoId = document.getElementById('manto_equipo_id').value;
    if (!equipoId) return;

    try {
        const res = await fetchWithAuth(`/api/admin/mantenimiento/completar/${equipoId}`, {
            method: 'POST'
        });

        if (res.ok) {
            cerrarMantenimientoModal();
            loadMantenimiento();
            showToast('Mantenimiento registrado', 'success');
        } else {
            const data = await res.json();
            showToast(data.detail || 'No fue posible completar mantenimiento.', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Error de red.', 'error');
    }
};

// Layout wiring
let closeSidebar = () => {};

function wireLayout() {
    const overlay = document.getElementById('sidebar-overlay');
    const toggle = document.getElementById('sidebar-toggle');

    const open = () => {
        document.body.classList.add('sidebar-open');
        if (overlay) overlay.hidden = false;
    };

    closeSidebar = () => {
        document.body.classList.remove('sidebar-open');
        if (overlay) overlay.hidden = true;
    };

    if (toggle) {
        toggle.addEventListener('click', () => {
            const openNow = document.body.classList.contains('sidebar-open');
            if (openNow) closeSidebar();
            else open();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const asignar = document.getElementById('asignar-modal');
            const manto = document.getElementById('mantenimiento-modal');
            if (asignar && !asignar.hidden) cerrarAsignarModal();
            if (manto && !manto.hidden) cerrarMantenimientoModal();
            closeSidebar();
        }
    });

    // Close modals on backdrop click
    const asignar = document.getElementById('asignar-modal');
    if (asignar) {
        asignar.addEventListener('click', (e) => {
            if (e.target === asignar) cerrarAsignarModal();
        });
    }

    const manto = document.getElementById('mantenimiento-modal');
    if (manto) {
        manto.addEventListener('click', (e) => {
            if (e.target === manto) cerrarMantenimientoModal();
        });
    }
}

function wireFilters() {
    const w = (id, ev, fn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener(ev, fn);
    };

    w('solicitudes-search', 'input', renderSolicitudes);
    w('solicitudes-estado', 'change', renderSolicitudes);

    w('inventario-search', 'input', renderInventario);
    w('inventario-estado', 'change', renderInventario);

    w('alertas-search', 'input', renderAlertas);

    w('mantenimiento-search', 'input', renderMantenimiento);
}

// Toast Functionality
window.showToast = (message, type = 'success') => {
    let container = document.getElementById('toast-container');
    if (!container) return; // Should be created in HTML
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span style="flex:1">${message}</span>
        <button class="icon-btn" style="border:none; box-shadow:none; background:transparent; width:auto; height:auto; padding:0; font-size:1.2rem; cursor:pointer;" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};
