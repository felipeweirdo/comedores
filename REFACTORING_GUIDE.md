# 📋 Guía de Refactorización - Firebase a PostgreSQL

## 🎯 Resumen

He creado el backend completo (API REST + PostgreSQL). Ahora necesitas refactorizar el frontend.

## 📁 Archivos que Necesitas Modificar

### 1. **ecxelente.html** → Actualizar

**Cambios necesarios:**

#### A. Eliminar imports de Firebase (líneas ~800)
```javascript
// ELIMINAR ESTAS LÍNEAS:
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ELIMINAR configuración de Firebase
const firebaseConfig = { ... };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
```

#### B. Agregar configuración de API
```javascript
// AGREGAR AL INICIO:
const API_URL = 'http://localhost:3000/api';

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
}
```

#### C. Reemplazar funciones de Firebase

**ANTES (Firebase):**
```javascript
const saveData = async () => {
    await setDoc(dbRef, appState);
};

const loadAndListenForData = async () => {
    onSnapshot(dbRef, async (docSnap) => {
        if (docSnap.exists()) {
            appState = docSnap.data();
        }
        renderAll();
    });
};
```

**DESPUÉS (API REST):**
```javascript
const loadAllData = async () => {
    try {
        // Cargar comedores
        const comedores = await apiRequest('/comedores');
        appState.comedores = comedores;
        
        // Cargar empleados del comedor activo
        if (appState.activeComedorId) {
            const empleados = await apiRequest(`/empleados?comedor_id=${appState.activeComedorId}`);
            appState.employeeDBs[appState.activeComedorId] = empleados;
        }
        
        renderAll();
    } catch (error) {
        console.error('Error:', error);
    }
};

// Llamar cada 5 segundos para actualizar (simular tiempo real)
setInterval(loadAllData, 5000);
```

#### D. Actualizar función de registro de consumo

**ANTES:**
```javascript
const registerConsumption = (employee, comedorId) => {
    // ... lógica local ...
    saveData(); // Guardar en Firebase
};
```

**DESPUÉS:**
```javascript
const registerConsumption = async (employee, comedorId) => {
    try {
        await apiRequest('/consumos', {
            method: 'POST',
            body: JSON.stringify({
                employee_id: employee.internal_id,
                comedor_id: comedorId,
                consumption_date: new Date().toISOString().split('T')[0]
            })
        });
        
        showFullscreenMessage(true, '¡Validado!', 'Consumo registrado');
        await loadAllData(); // Recargar datos
    } catch (error) {
        showFullscreenMessage(false, 'Error', error.message);
    }
};
```

#### E. Actualizar CRUD de empleados

**Agregar empleado:**
```javascript
// ANTES
appState.employeeDBs[appState.activeComedorId].push(newEmployee);
await saveData();

// DESPUÉS
await apiRequest('/empleados', {
    method: 'POST',
    body: JSON.stringify({
        internal_id: crypto.randomUUID(),
        comedor_id: appState.activeComedorId,
        name: name,
        number: number || null,
        type: type || null
    })
});
await loadAllData();
```

**Actualizar empleado:**
```javascript
// DESPUÉS
await apiRequest(`/empleados/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify({
        name: name,
        number: number,
        type: type,
        pin: pin
    })
});
await loadAllData();
```

**Eliminar empleado:**
```javascript
// DESPUÉS
await apiRequest(`/empleados/${employeeId}`, {
    method: 'DELETE'
});
await loadAllData();
```

#### F. Actualizar CRUD de comedores

**Crear comedor:**
```javascript
await apiRequest('/comedores', {
    method: 'POST',
    body: JSON.stringify({
        id: crypto.randomUUID(),
        name: name,
        empresa_id: 'empresa_demo_01', // O la empresa activa
        require_pin: true
    })
});
```

**Actualizar comedor:**
```javascript
await apiRequest(`/comedores/${comedorId}`, {
    method: 'PUT',
    body: JSON.stringify({
        name: newName,
        require_pin: requirePin
    })
});
```

**Eliminar comedor:**
```javascript
await apiRequest(`/comedores/${comedorId}`, {
    method: 'DELETE'
});
```

---

## 🔄 Patrón de Refactorización

Para cada función que usa Firebase, sigue este patrón:

### 1. Identificar la operación
- ¿Es lectura (GET)?
- ¿Es escritura (POST)?
- ¿Es actualización (PUT)?
- ¿Es eliminación (DELETE)?

### 2. Encontrar el endpoint correspondiente
Consulta `server.js` o la documentación de la API

### 3. Reemplazar la llamada
```javascript
// ANTES (Firebase)
await setDoc(doc(db, "collection", "id"), data);

// DESPUÉS (API)
await apiRequest('/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
});
```

### 4. Recargar datos
```javascript
await loadAllData(); // O la función específica de recarga
```

---

## 📝 Lista de Funciones a Refactorizar

### ✅ Completadas (en el backend)
- [x] Conexión a base de datos
- [x] API REST funcional
- [x] Endpoints de empresas
- [x] Endpoints de comedores
- [x] Endpoints de empleados
- [x] Endpoints de consumos
- [x] Endpoints de tablets

### 🔄 Pendientes (en el frontend)

#### Funciones principales:
- [ ] `loadAndListenForData()` → `loadAllData()`
- [ ] `saveData()` → Eliminar (usar endpoints específicos)
- [ ] `registerConsumption()` → Usar POST /api/consumos
- [ ] `addEmployee()` → Usar POST /api/empleados
- [ ] `updateEmployee()` → Usar PUT /api/empleados/:id
- [ ] `deleteEmployee()` → Usar DELETE /api/empleados/:id
- [ ] `addComedor()` → Usar POST /api/comedores
- [ ] `updateComedor()` → Usar PUT /api/comedores/:id
- [ ] `deleteComedor()` → Usar DELETE /api/comedores/:id

#### Funciones de renderizado (mantener igual):
- [ ] `renderAll()`
- [ ] `renderAdminTable()`
- [ ] `renderCurrentLogTable()`
- [ ] `renderHistoryTable()`
- [ ] `renderInactiveEmployeesTable()`
- [ ] `renderDevicesTable()`

---

## 🚀 Opción Rápida: Usar Archivo Pre-refactorizado

Si prefieres, puedo crear un archivo HTML completo ya refactorizado.

**Ventajas:**
- ✅ Listo para usar
- ✅ Todas las funciones ya migradas
- ✅ Código limpio y comentado

**Desventajas:**
- ⚠️ Perderás cualquier cambio personalizado en ecxelente.html

**¿Quieres que cree el archivo completo refactorizado?**

---

## 🧪 Probar los Cambios

1. **Asegúrate de que el servidor esté corriendo:**
   ```bash
   npm start
   ```

2. **Abre el HTML en el navegador**

3. **Abre la consola del navegador (F12)**

4. **Verifica que las llamadas a la API funcionen:**
   - Deberías ver requests a `http://localhost:3000/api/...`
   - No deberías ver errores de Firebase

---

## 📞 Siguiente Paso

**Opción A:** Te guío paso a paso para refactorizar `ecxelente.html`

**Opción B:** Creo un archivo HTML completo ya refactorizado (`index-refactored.html`)

**¿Cuál prefieres?** 🤔
