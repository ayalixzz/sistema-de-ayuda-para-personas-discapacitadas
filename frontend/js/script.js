document.addEventListener('DOMContentLoaded', () => {
    // 0. Auto-Save Draft & File Upload UI
    initAutoSave();
    initFileUploadUI();

    // 1. Navigation logic
    const steps = document.querySelectorAll('.wizard-step');
    const indicators = document.querySelectorAll('.wizard-progress .step');
    const wizardContainer = document.querySelector('.wizard-section');
    const totalSteps = 5;

    function getCurrentStepIndex() {
        const active = document.querySelector('.wizard-step.active');
        if (!active || !active.id) return 1;
        const m = active.id.match(/^step-(\d+)$/);
        return m ? parseInt(m[1], 10) : 1;
    }

    function setProgress(stepIndex) {
        // step 1 => 0%, step 5 => 100%
        const pct = totalSteps <= 1 ? 0 : Math.round(((stepIndex - 1) / (totalSteps - 1)) * 100);
        if (wizardContainer) wizardContainer.style.setProperty('--wizard-progress', `${pct}%`);

        indicators.forEach(el => el.removeAttribute('aria-current'));
        const activeIndicator = document.getElementById(`indicator-${stepIndex}`);
        if (activeIndicator) activeIndicator.setAttribute('aria-current', 'step');
    }

    function goToStep(targetStep) {
        const currentStep = getCurrentStepIndex();
        if (targetStep === currentStep) return;

        const current = document.getElementById(`step-${currentStep}`);
        const next = document.getElementById(`step-${targetStep}`);
        if (!next) return;
        if (current) current.classList.remove('active');
        next.classList.add('active');

        for (let i = 1; i <= totalSteps; i++) {
            const ind = document.getElementById(`indicator-${i}`);
            if (!ind) continue;
            ind.classList.remove('active');
            if (i < targetStep) ind.classList.add('completed');
            if (i >= targetStep) ind.classList.remove('completed');
            if (i === targetStep) ind.classList.add('active');
        }

        setProgress(targetStep);
        window.scrollTo(0, 0);
    }

    window.nextStep = (currentStep) => {
        if (!validateStep(currentStep)) return;

        goToStep(currentStep + 1);
    };

    window.prevStep = (currentStep) => {
        goToStep(currentStep - 1);
    };

    // Allow going back by clicking progress steps
    indicators.forEach(ind => {
        ind.addEventListener('click', () => {
            const target = parseInt(ind.getAttribute('data-step') || '', 10);
            const current = getCurrentStepIndex();
            if (!Number.isFinite(target)) return;
            if (target < current) goToStep(target);
        });
    });

    // 2. Conditional visibility for "Cuidador"
    const reqCuidadorCheckbox = document.getElementById('requiere_cuidador');
    const cuidadorSection = document.getElementById('cuidador_section');
    const fileCuidadorSection = document.getElementById('file_cuidador_section');

    reqCuidadorCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            cuidadorSection.style.display = 'block';
            fileCuidadorSection.style.display = 'block';
            document.getElementById('cuidador_nombre').setAttribute('required', 'true');
            document.getElementById('cuidador_cedula').setAttribute('required', 'true');
            document.getElementById('doc_cuidador').setAttribute('required', 'true');
        } else {
            cuidadorSection.style.display = 'none';
            fileCuidadorSection.style.display = 'none';
            document.getElementById('cuidador_nombre').removeAttribute('required');
            document.getElementById('cuidador_cedula').removeAttribute('required');
            document.getElementById('doc_cuidador').removeAttribute('required');
        }
    });

    // 3. Document validation real-time
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const errorSpan = document.getElementById(`err_${e.target.id}`);
            errorSpan.textContent = "";

            if (file) {
                // Check size: 5MB
                if (file.size > 5 * 1024 * 1024) {
                    errorSpan.textContent = "El archivo excede los 5MB requeridos.";
                    e.target.value = ""; // clear input
                    return;
                }
                // Check type
                if (!['application/pdf', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                    errorSpan.textContent = "Solo se permiten formatos PDF o JPG.";
                    e.target.value = ""; // clear input
                    return;
                }
            }
        });
    });

    // 4. DAP dynamic options
    const tipoDap = document.getElementById('tipo_dap');
    const dispDap = document.getElementById('dispositivo_requerido');

    // Hide category error as soon as user interacts
    const categoriaError = document.getElementById('categoria-error');
    document.querySelectorAll('input[name="categoria_discapacidad"]').forEach(cb => {
        cb.addEventListener('change', () => {
            if (categoriaError) categoriaError.hidden = true;
        });
    });

    const daps = {
        'Movilidad': [
            'Silla de ruedas estándar',
            'Silla de ruedas neurológica',
            'Silla de ruedas deportiva',
            'Silla de ruedas eléctrica',
            'Silla de ruedas neuropediátrica',
            'Caminador estándar',
            'Caminador con ruedas',
            'Bastón guía',
            'Bastón 4 apoyos',
            'Bastón cuello de cisne',
            'Muletas'
        ],
        'Cuidado en casa': [
            'Silla sanitaria',
            'Colchoneta antiescaras'
        ],
        'Otros': [
            'Gafas especiales no PBS',
            'Ayudas de comunicación aumentativa',
            'Otros dispositivos'
        ]
    };

    tipoDap.addEventListener('change', (e) => {
        const cat = e.target.value;
        dispDap.innerHTML = '<option value="">Seleccione el dispositivo...</option>';
        if (cat && daps[cat]) {
            dispDap.disabled = false;
            daps[cat].forEach(d => {
                const opt = document.createElement('option');
                opt.value = d;
                opt.textContent = d;
                dispDap.appendChild(opt);
            });
        } else {
            dispDap.disabled = true;
        }
    });

    // 5. Form submission
    const form = document.getElementById('wizard-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!validateStep(5)) return;

        document.getElementById('loading').style.display = 'flex';

        // Prepare FormData
        const formData = new FormData();
        
        const textFields = [
            'nombres', 'apellidos', 'tipo_documento', 'numero_documento', 
            'fecha_nacimiento', 'celular', 'correo', 'direccion', 
            'departamento', 'municipio', 'cuidador_nombre', 'cuidador_cedula', 
            'cuidador_telefono', 'enfoque_diferencial', 'poblacion_especial', 
            'clasificacion_sisben', 'tipo_afiliacion_salud', 'tipo_dap', 'dispositivo_requerido'
        ];

        textFields.forEach(field => {
            const el = document.getElementById(field);
            if(el) formData.append(field, el.value);
        });

        // Checkboxes defaults and values
        formData.append('requiere_cuidador', document.getElementById('requiere_cuidador').checked);
        formData.append('acepta_politica', document.getElementById('acepta_politica').checked);
        formData.append('autoriza_notificacion', document.getElementById('autoriza_notificacion').checked);
        formData.append('declaracion_juramentada', document.getElementById('declaracion_juramentada').checked);

        // Multiple checkboxes for categories
        const catCheckboxes = document.querySelectorAll('input[name="categoria_discapacidad"]:checked');
        const categorias = Array.from(catCheckboxes).map(cb => cb.value).join(', ');
        formData.append('categoria_discapacidad', categorias);

        // Files
        const fileFields = ['doc_identidad', 'historia_clinica', 'recibo_publico', 'certificado_salud'];
        fileFields.forEach(field => {
            const file = document.getElementById(field).files[0];
            if(file) formData.append(field, file);
        });

        if (document.getElementById('requiere_cuidador').checked) {
            const docCuid = document.getElementById('doc_cuidador').files[0];
            if(docCuid) formData.append('doc_cuidador', docCuid);
        }

        try {
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            document.getElementById('loading').style.display = 'none';

            if (response.ok) {
                // Limpiar auto-save
                localStorage.removeItem('dap_draft');

                // Show success step
                document.getElementById('step-5').classList.remove('active');
                document.getElementById('step-success').classList.add('active');
                document.getElementById('radicado-number').textContent = result.radicado;
                setProgress(5);
            } else {
                alert("Hubo un error al procesar su solicitud: " + JSON.stringify(result));
            }
        } catch (error) {
            document.getElementById('loading').style.display = 'none';
            alert("Error de conexión al servidor. Intente más tarde.");
            console.error(error);
        }
    });

    // Helper: Validations before next step
    function validateStep(stepIndex) {
        const stepSec = document.getElementById(`step-${stepIndex}`);
        const inputs = stepSec.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            input.classList.remove('is-invalid');

            if (!input.checkValidity()) {
                input.classList.add('is-invalid');

                // Remove error style when user edits
                const clear = () => input.classList.remove('is-invalid');
                input.addEventListener('input', clear, { once: true });
                input.addEventListener('change', clear, { once: true });

                input.reportValidity();
                isValid = false;
            }
        });

        // Custom valids
        if (stepIndex === 2 && isValid) {
            const checked = document.querySelectorAll('input[name="categoria_discapacidad"]:checked');
            if (checked.length === 0) {
                const err = document.getElementById('categoria-error');
                if (err) {
                    err.hidden = false;
                    err.scrollIntoView({ block: 'nearest' });
                }
                isValid = false;
            } else {
                const err = document.getElementById('categoria-error');
                if (err) err.hidden = true;
            }
        }

        return isValid;
    }

    // Modal Consulta Functions
    const consultaModal = document.getElementById('consulta-modal');
    const consultaInput = document.getElementById('consulta_documento');

    window.abrirConsulta = () => {
        if (!consultaModal) return;
        consultaModal.hidden = false;
        setTimeout(() => consultaInput && consultaInput.focus(), 0);
    };

    window.cerrarConsulta = () => {
        if (consultaModal) consultaModal.hidden = true;
        if (consultaInput) consultaInput.value = '';

        const res = document.getElementById('consulta-resultado');
        if (res) {
            res.hidden = true;
            res.innerHTML = '';
        }
    };

    if (consultaModal) {
        consultaModal.addEventListener('click', (e) => {
            if (e.target === consultaModal) cerrarConsulta();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && consultaModal && !consultaModal.hidden) cerrarConsulta();
    });

    window.realizarConsulta = async () => {
        const doc = document.getElementById('consulta_documento').value.trim();
        const resDiv = document.getElementById('consulta-resultado');
        if(!doc) {
            resDiv.hidden = false;
            resDiv.innerHTML = `<span style="color:red;">Por favor ingrese un número.</span>`;
            return;
        }

        resDiv.hidden = false;
        resDiv.innerHTML = `Buscando...`;
        
        try {
            const res = await fetch(`/api/consulta-estado/${doc}`);
            const data = await res.json();
            
            if(res.ok) {
                let html = `<strong>Radicado:</strong> ${data.radicado}<br>`;
                html += `<strong>Estado Solicitud:</strong> ${data.estado_solicitud}<br>`;
                if(data.estado_solicitud === 'Aprobada' && data.equipo) {
                    html += `<strong>Equipo Asignado:</strong> ${data.tipo_dap} (Cód: ${data.equipo})<br>`;
                    html += `<strong>Fecha Devolución:</strong> ${new Date(data.fecha_devolucion).toLocaleDateString()}<br>`;
                    if(data.alerta_revision) {
                        html += `<p style="color:red; margin-top:5px; font-weight:bold;">⚠️ Su equipo requiere revisión de estado inmediatamente. Comuníquese con la entidad.</p>`;
                    } else {
                        html += `<p style="color:green; margin-top:5px;">Próxima revisión: ${new Date(data.fecha_proxima_revision).toLocaleDateString()}</p>`;
                    }
                }
                resDiv.innerHTML = html;
            } else {
                resDiv.innerHTML = `<span style="color:red;">${data.detail || 'Solicitud no encontrada.'}</span>`;
            }
            } catch (e) {
                console.error(e);
                resDiv.innerHTML = `<span style="color:red;">Error de red. Intente más tarde.</span>`;
            }
    };

    // Initialize progress
    setProgress(1);

    // --- Funciones de Utilidad UX ---
    
    function initAutoSave() {
        const form = document.getElementById('wizard-form');
        if(!form) return;

        // Cargar datos previos
        const draft = localStorage.getItem('dap_draft');
        if(draft) {
            try {
                const data = JSON.parse(draft);
                Object.keys(data).forEach(key => {
                    const field = form.elements[key];
                    if(!field) return;
                    if(field.type === 'checkbox' || field.type === 'radio') {
                        // Para grupos de checkbox/radio
                        if(field.length) {
                            Array.from(field).forEach(f => {
                                if(Array.isArray(data[key])) {
                                    f.checked = data[key].includes(f.value);
                                } else {
                                    f.checked = (f.value === data[key]);
                                }
                            });
                        } else {
                            field.checked = data[key];
                        }
                    } else if (field.type !== 'file') {
                        field.value = data[key];
                    }
                });
                
                // Disparar eventos para actualizar ui (ej: cuidador, daps)
                if(data.requiere_cuidador) {
                    reqCuidadorCheckbox.dispatchEvent(new Event('change'));
                }
                if(data.tipo_dap) {
                    tipoDap.dispatchEvent(new Event('change'));
                    setTimeout(() => {
                        if(data.dispositivo_requerido && dispDap) {
                            dispDap.value = data.dispositivo_requerido;
                        }
                    }, 10);
                }

            } catch(e) {
                console.error("No se pudo parsear el borrador", e);
            }
        }

        // Guardar progreso al escribir/cambiar
        form.addEventListener('input', saveDraft);
        form.addEventListener('change', saveDraft);
    }

    function saveDraft() {
        const form = document.getElementById('wizard-form');
        const formData = new FormData(form);
        const data = {};
        for(let [k, v] of formData.entries()) {
            // Ignorar archivos porque no se pueden guardar en localStorage
            if(v instanceof File) continue;
            
            if(data[k]) {
                if(!Array.isArray(data[k])) data[k] = [data[k]];
                data[k].push(v);
            } else {
                data[k] = v;
            }
        }
        localStorage.setItem('dap_draft', JSON.stringify(data));
    }

    function initFileUploadUI() {
        document.querySelectorAll('.file-group input[type="file"]').forEach(input => {
            // Crear elemento para el nombre del archivo
            const display = document.createElement('div');
            display.className = 'file-name-display';
            display.style.marginTop = '8px';
            display.style.fontSize = '0.9rem';
            display.style.fontWeight = '500';
            display.style.color = 'var(--primary-color)';
            input.insertAdjacentElement('afterend', display);

            input.addEventListener('change', (e) => {
                if(input.files && input.files.length > 0) {
                    const name = input.files[0].name;
                    const size = (input.files[0].size / 1024 / 1024).toFixed(2);
                    display.innerHTML = `📄 <strong>Archivo cargado:</strong> ${name} (${size} MB)`;
                    display.style.color = '#10b981'; // Verde exito
                } else {
                    display.innerHTML = '';
                }
            });
        });
    }

});
