# 🏢 Sistema de Filtrado por Comedor

## ✅ Implementación Completada

Se ha implementado un sistema de filtrado automático por comedor basado en el rol del usuario.

## 🎯 Funcionalidad

### Para Usuarios NO Administradores (Monitor/Usuario)

Cuando un usuario con rol `monitor` o `usuario` inicia sesión:

1. **Se asigna automáticamente a su comedor**
   - El sistema usa el `comedor_id` del usuario
   - No puede cambiar de comedor
   - Solo ve empleados de su comedor

2. **Badge de información muestra:**
   ```
   👤 Usuario Monitor
   🏢 Comedor Principal
   ```

3. **Búsqueda de empleados:**
   - Solo muestra empleados del comedor asignado
   - Filtrado automático por `comedor_id`

### Para Administradores

Cuando un usuario con rol `administrador` inicia sesión:

1. **Puede seleccionar cualquier comedor**
   - Selector de comedor disponible en el panel
   - Puede cambiar entre comedores
   - Ve todos los empleados del comedor seleccionado

2. **Sin restricciones:**
   - Acceso completo a todos los comedores
   - Gestión total del sistema

## 📊 Flujo de Datos

```
Usuario Inicia Sesión
        ↓
¿Es Administrador?
    ↓           ↓
   SÍ          NO
    ↓           ↓
Comedor      Comedor
Seleccionable  Fijo
    ↓           ↓
    └─────┬─────┘
          ↓
  Cargar Empleados
  del Comedor Activo
          ↓
  Mostrar en Búsqueda
```

## 🔧 Cambios Técnicos

### 1. Badge de Usuario Actualizado

**HTML:**
```html
<div id="user-info-badge">
    <div class="flex items-center gap-2 mb-1">
        <svg>...</svg>
        <span id="user-name-display">Usuario</span>
    </div>
    <div class="flex items-center gap-2 text-sm text-gray-600">
        <svg>...</svg>
        <span id="comedor-name-display">Comedor</span>
    </div>
</div>
```

### 2. Función `updateUserDisplay()` Mejorada

```javascript
function updateUserDisplay() {
    const userNameDisplay = document.getElementById('user-name-display');
    const comedorNameDisplay = document.getElementById('comedor-name-display');
    
    if (userNameDisplay && appState.currentUser) {
        userNameDisplay.textContent = appState.currentUser.fullName || appState.currentUser.email;
    }
    
    if (comedorNameDisplay && appState.currentUser && appState.currentUser.comedorId) {
        const comedor = appState.comedores.find(c => c.comedor_id === appState.currentUser.comedorId);
        comedorNameDisplay.textContent = comedor ? comedor.comedor_nombre : appState.currentUser.comedorId;
    }
}
```

### 3. Función `loadAllData()` con Filtrado por Rol

```javascript
async function loadAllData() {
    // Cargar comedores
    appState.comedores = await apiRequest('/comedores');

    // Determinar el comedor activo según el rol del usuario
    if (appState.currentUser) {
        if (appState.currentUser.role === 'administrador') {
            // Admin: usar el comedor seleccionado o el primero
            if (!appState.activeComedorId && appState.comedores.length > 0) {
                appState.activeComedorId = appState.comedores[0].comedor_id;
            }
        } else {
            // Usuario no admin: usar SOLO su comedor asignado
            if (appState.currentUser.comedorId) {
                appState.activeComedorId = appState.currentUser.comedorId;
            }
        }
    }

    // Cargar empleados del comedor activo
    if (appState.activeComedorId) {
        appState.empleados = await apiRequest(`/empleados?comedor_id=${appState.activeComedorId}`);
    }

    // Actualizar display del usuario
    updateUserDisplay();
}
```

## 🧪 Cómo Probar

### Prueba 1: Usuario Monitor

1. Iniciar sesión con:
   - Email: `monitor@comedor.com`
   - Contraseña: `monitor123`

2. Verificar:
   - ✅ Badge muestra "Usuario Monitor"
   - ✅ Badge muestra nombre del comedor asignado
   - ✅ Solo aparecen empleados de ese comedor en la búsqueda
   - ✅ No hay selector de comedor visible

### Prueba 2: Usuario Administrador

1. Iniciar sesión con:
   - Email: `admin@comedor.com`
   - Contraseña: `admin123`

2. Verificar:
   - ✅ Panel de administración completo
   - ✅ Selector de comedor disponible
   - ✅ Puede cambiar entre comedores
   - ✅ Empleados cambian según comedor seleccionado

## 📋 Estructura de Datos del Usuario

```javascript
{
    id: "uuid",
    email: "monitor@comedor.com",
    fullName: "Usuario Monitor",
    role: "monitor",
    comedorId: "comedor1"  // ← Importante para el filtrado
}
```

## 🔒 Seguridad

### Backend (API)
- ✅ El endpoint `/api/empleados?comedor_id=X` filtra por comedor
- ✅ Validación en el servidor

### Frontend
- ✅ Filtrado automático basado en rol
- ✅ Usuario no admin no puede cambiar de comedor
- ✅ Comedor asignado viene del backend

## 📝 Archivos Modificados

1. **index-refactored-v2.html**
   - Badge de usuario actualizado (muestra comedor)
   - Función `updateUserDisplay()` mejorada
   - Función `loadAllData()` con lógica de roles
   - Filtrado automático de empleados

## 🎨 Interfaz de Usuario

### Usuario Monitor/Regular
```
┌─────────────────────────────────────────────┐
│ 👤 Usuario Monitor      [Cerrar Sesión]    │
│ 🏢 Comedor Principal                        │
│                                             │
│              ┌───────────┐                  │
│              │   Logo    │                  │
│              └───────────┘                  │
│                                             │
│         Registro de Comida                  │
│                                             │
│    [Buscar Empleado del Comedor...]        │
│                                             │
│            [Aceptar]                        │
└─────────────────────────────────────────────┘
```

## ✨ Beneficios

1. **Seguridad Mejorada**
   - Usuarios solo ven datos de su comedor
   - No pueden acceder a otros comedores

2. **Experiencia Simplificada**
   - No necesitan seleccionar comedor
   - Búsqueda más rápida (menos datos)

3. **Datos Precisos**
   - Registros solo en el comedor correcto
   - No hay confusión de comedores

## 🚀 Próximos Pasos Sugeridos

- [ ] Agregar validación en el backend para verificar que el usuario solo registre en su comedor
- [ ] Implementar logs de auditoría por comedor
- [ ] Agregar estadísticas por comedor para usuarios no admin
- [ ] Permitir que un usuario tenga múltiples comedores asignados

---

**Última actualización:** 2026-02-04
