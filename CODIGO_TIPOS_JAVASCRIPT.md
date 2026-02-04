# Código JavaScript para Agregar al index-refactored.html

## Instrucciones
Agrega este código en el archivo `index-refactored.html` justo ANTES de la línea que dice `// Tabs de admin`

```javascript
// ============================================================================
// FUNCIONES PARA TIPOS
// ============================================================================

async function loadTipos() {
    try {
        appState.tipos = await apiRequest('/tipos');
        renderTiposSelect();
        renderTiposTable();
    } catch (error) {
        console.error('Error cargando tipos:', error);
    }
}

function renderTiposSelect() {
    const select = document.getElementById('new-employee-tipo');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione tipo...</option>';
    appState.tipos.forEach(tipo => {
        const option = document.createElement('option');
        option.value = tipo.id_tipo;
        option.textContent = tipo.descripcion;
        select.appendChild(option);
    });
}

function renderTiposTable() {
    const container = document.getElementById('tipos-table-container');
    if (!container) return;

    if (appState.tipos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p class="text-lg">No hay tipos registrados</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="min-w-full bg-white">
            <thead class="bg-gray-100">
                <tr>
                    <th class="px-4 py-2 text-left">ID</th>
                    <th class="px-4 py-2 text-left">Descripción</th>
                    <th class="px-4 py-2 text-left">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${appState.tipos.map(tipo => `
                    <tr class="border-b hover:bg-gray-50">
                        <td class="px-4 py-2">${tipo.id_tipo}</td>
                        <td class="px-4 py-2">
                            <span id="tipo-desc-${tipo.id_tipo}">${tipo.descripcion}</span>
                            <input type="text" id="tipo-edit-${tipo.id_tipo}" value="${tipo.descripcion}" 
                                class="hidden p-2 border rounded">
                        </td>
                        <td class="px-4 py-2 space-x-2">
                            <button onclick="editTipo(${tipo.id_tipo})" id="btn-edit-${tipo.id_tipo}"
                                class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                                Editar
                            </button>
                            <button onclick="saveTipo(${tipo.id_tipo})" id="btn-save-${tipo.id_tipo}"
                                class="hidden bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                                Guardar
                            </button>
                            <button onclick="cancelEditTipo(${tipo.id_tipo})" id="btn-cancel-${tipo.id_tipo}"
                                class="hidden bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">
                                Cancelar
                            </button>
                            <button onclick="deleteTipo(${tipo.id_tipo})"
                                class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                                Eliminar
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.editTipo = function(id) {
    document.getElementById(`tipo-desc-${id}`).classList.add('hidden');
    document.getElementById(`tipo-edit-${id}`).classList.remove('hidden');
    document.getElementById(`btn-edit-${id}`).classList.add('hidden');
    document.getElementById(`btn-save-${id}`).classList.remove('hidden');
    document.getElementById(`btn-cancel-${id}`).classList.remove('hidden');
};

window.cancelEditTipo = function(id) {
    document.getElementById(`tipo-desc-${id}`).classList.remove('hidden');
    document.getElementById(`tipo-edit-${id}`).classList.add('hidden');
    document.getElementById(`btn-edit-${id}`).classList.remove('hidden');
    document.getElementById(`btn-save-${id}`).classList.add('hidden');
    document.getElementById(`btn-cancel-${id}`).classList.add('hidden');
};

window.saveTipo = async function(id) {
    const newDesc = document.getElementById(`tipo-edit-${id}`).value.trim();
    
    if (!newDesc) {
        alert('La descripción no puede estar vacía');
        return;
    }

    try {
        await apiRequest(`/tipos/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ descripcion: newDesc })
        });

        await loadTipos();
        showFullscreenMessage(true, 'Éxito', 'Tipo actualizado');
    } catch (error) {
        showFullscreenMessage(false, 'Error', error.message);
    }
};

window.deleteTipo = async function(id) {
    if (!confirm('¿Estás seguro de eliminar este tipo?')) return;

    try {
        await apiRequest(`/tipos/${id}`, { method: 'DELETE' });
        await loadTipos();
        showFullscreenMessage(true, 'Éxito', 'Tipo eliminado');
    } catch (error) {
        showFullscreenMessage(false, 'Error', error.message);
    }
};
```

## Event Listeners para Agregar

Agrega estos event listeners DESPUÉS de los event listeners existentes:

```javascript
// Event listener para habilitar/deshabilitar select de tipo
document.getElementById('new-employee-id')?.addEventListener('input', (e) => {
    const tipoSelect = document.getElementById('new-employee-tipo');
    if (e.target.value.trim()) {
        // Si hay número, deshabilitar tipo
        tipoSelect.disabled = true;
        tipoSelect.classList.add('bg-gray-100');
        tipoSelect.value = '';
    } else {
        // Si no hay número, habilitar tipo
        tipoSelect.disabled = false;
        tipoSelect.classList.remove('bg-gray-100');
    }
});

// Event listener para agregar tipo
document.getElementById('add-tipo-button')?.addEventListener('click', async () => {
    const descripcion = document.getElementById('new-tipo-descripcion').value.trim();

    if (!descripcion) {
        alert('La descripción es obligatoria');
        return;
    }

    try {
        await apiRequest('/tipos', {
            method: 'POST',
            body: JSON.stringify({ descripcion })
        });

        document.getElementById('new-tipo-descripcion').value = '';
        await loadTipos();
        showFullscreenMessage(true, 'Éxito', 'Tipo agregado');
    } catch (error) {
        showFullscreenMessage(false, 'Error', error.message);
    }
});
```

## Modificar el Event Listener de add-employee-button

Reemplaza el event listener existente de `add-employee-button` con este:

```javascript
document.getElementById('add-employee-button')?.addEventListener('click', async () => {
    const number = document.getElementById('new-employee-id').value;
    const name = document.getElementById('new-employee-name').value;
    const tipoId = document.getElementById('new-employee-tipo').value;

    if (!name) {
        alert('El nombre es obligatorio');
        return;
    }

    // Validar que si no hay número, debe haber tipo
    if (!number && !tipoId) {
        alert('Debe ingresar un número o seleccionar un tipo');
        return;
    }

    try {
        await apiRequest('/empleados', {
            method: 'POST',
            body: JSON.stringify({
                internal_id: crypto.randomUUID(),
                comedor_id: appState.activeComedorId,
                name: name,
                number: number || null,
                tipo_id: tipoId || null
            })
        });

        document.getElementById('new-employee-id').value = '';
        document.getElementById('new-employee-name').value = '';
        document.getElementById('new-employee-tipo').value = '';
        await loadAllData();
        showFullscreenMessage(true, 'Éxito', 'Empleado agregado');
    } catch (error) {
        showFullscreenMessage(false, 'Error', error.message);
    }
});
```

## Modificar loadAllData()

Agrega esta línea dentro de la función `loadAllData()`:

```javascript
// Cargar tipos
await loadTipos();
```

## Modificar el Tab de Tipos

En el event listener de tabs, agrega el caso para tipos:

```javascript
// Cargar datos específicos de la página
if (page === 'consumos') {
    console.log('🔄 Recargando consumos...');
    await renderConsumosTable();
} else if (page === 'tipos') {
    console.log('🔄 Recargando tipos...');
    await loadTipos();
}
```

## Modificar renderAdminTable()

Agrega la columna de tipo en la tabla de empleados:

```javascript
<th class="px-4 py-2 text-left">Tipo</th>
```

Y en el tbody:

```javascript
<td class="px-4 py-2">${emp.tipo_descripcion || emp.type || '-'}</td>
```

## Modificar el selector para ocultar páginas

En el event listener de tabs, cambia:

```javascript
// Ocultar todas las páginas admin
document.getElementById('admin-gestion-page')?.classList.add('hidden');
document.getElementById('admin-consumos-page')?.classList.add('hidden');
document.getElementById('admin-tipos-page')?.classList.add('hidden');
```
