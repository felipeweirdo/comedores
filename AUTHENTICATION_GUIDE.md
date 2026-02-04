# Sistema de Autenticación - Comedor

## ✅ Implementación Completada

Se ha implementado un sistema de autenticación completo con roles de usuario.

## 🔐 Credenciales de Acceso

### Usuario Administrador
- **Email:** admin@comedor.com
- **Contraseña:** (la que está en la base de datos en el campo `password_hash`)
- **Rol:** administrador
- **Acceso:** Panel de Administración completo

### Usuarios Regulares
- **Rol:** usuario
- **Acceso:** Solo pantalla de registro de comida

## 🎯 Funcionalidades Implementadas

### 1. Pantalla de Login
- Formulario de autenticación con email y contraseña
- Validación de credenciales contra la base de datos
- Mensajes de error claros
- Diseño moderno con gradiente

### 2. Autenticación por Roles

#### Administrador (`role: 'administrador'`)
- Al iniciar sesión, se redirige al **Panel de Administración**
- Acceso completo a:
  - Gestión de Empleados
  - Visualización de Consumos
  - Gestión de Tipos de Empleados
- Botón de "Cerrar Sesión" en el panel

#### Usuario Regular (`role: 'usuario'`)
- Al iniciar sesión, se redirige a la **Pantalla de Registro de Comida**
- Solo puede registrar consumos de empleados
- No tiene acceso al panel de administración

### 3. Persistencia de Sesión
- La sesión se guarda en `localStorage`
- Al recargar la página, el usuario permanece autenticado
- Se redirige automáticamente a la página correspondiente según el rol

### 4. Endpoints de API Creados

#### POST `/api/auth/login`
```json
Request:
{
  "email": "admin@comedor.com",
  "password": "contraseña"
}

Response (éxito):
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@comedor.com",
    "fullName": "Nombre Completo",
    "role": "administrador",
    "comedorId": "comedor1"
  }
}

Response (error):
{
  "error": "Credenciales inválidas"
}
```

#### GET `/api/auth/me?userId=uuid`
Verifica la sesión del usuario (para futuras mejoras)

## 📋 Estructura de la Tabla `users`

```sql
- id (uuid) - Primary Key
- email (varchar) - Email del usuario (único)
- full_name (varchar) - Nombre completo
- phone (varchar) - Teléfono
- password_hash (varchar) - Contraseña (en texto plano por ahora)
- role (varchar) - Rol: 'administrador' o 'usuario'
- comedor_id (varchar) - Comedor asignado
- active (boolean) - Si el usuario está activo
- created_at (timestamp) - Fecha de creación
- updated_at (timestamp) - Fecha de actualización
```

## 🚀 Flujo de Autenticación

1. **Usuario abre la aplicación**
   - Se verifica si hay sesión guardada en localStorage
   - Si hay sesión: redirige según rol
   - Si no hay sesión: muestra pantalla de login

2. **Usuario ingresa credenciales**
   - Se envía POST a `/api/auth/login`
   - Backend valida contra la base de datos
   - Si es válido: guarda sesión y redirige según rol
   - Si es inválido: muestra mensaje de error

3. **Usuario cierra sesión**
   - Click en "Cerrar Sesión"
   - Se elimina la sesión de localStorage
   - Se redirige a la pantalla de login

## 🔒 Seguridad

⚠️ **IMPORTANTE:** Actualmente las contraseñas se almacenan en texto plano en el campo `password_hash`. 

### Mejoras de Seguridad Recomendadas (Producción):
1. Implementar bcrypt para hashear contraseñas
2. Agregar tokens JWT para autenticación
3. Implementar refresh tokens
4. Agregar rate limiting en el endpoint de login
5. Implementar HTTPS
6. Agregar autenticación de dos factores (2FA)

## 📝 Archivos Modificados

1. **server.js** - Agregados endpoints de autenticación
2. **index-refactored-v2.html** - Agregada pantalla de login y lógica de roles
3. **check-users-table.js** - Script para verificar estructura de usuarios

## 🧪 Cómo Probar

1. Abrir http://localhost:3000/
2. Ingresar credenciales de administrador
3. Verificar que se muestra el Panel de Administración
4. Cerrar sesión
5. Crear un usuario con rol 'usuario' en la base de datos
6. Iniciar sesión con ese usuario
7. Verificar que solo se muestra la pantalla de Registro de Comida

## 📊 Consulta SQL para Crear Usuarios de Prueba

```sql
-- Usuario administrador
INSERT INTO users (email, full_name, password_hash, role, comedor_id, active)
VALUES ('admin@comedor.com', 'Administrador', 'admin123', 'administrador', 'comedor1', TRUE);

-- Usuario regular
INSERT INTO users (email, full_name, password_hash, role, comedor_id, active)
VALUES ('usuario@comedor.com', 'Usuario Regular', 'user123', 'usuario', 'comedor1', TRUE);
```

## ✨ Próximos Pasos Sugeridos

1. Implementar bcrypt para seguridad de contraseñas
2. Agregar página de "Recuperar Contraseña"
3. Agregar página de "Registro de Nuevos Usuarios"
4. Implementar permisos más granulares
5. Agregar logs de auditoría de accesos
6. Implementar timeout de sesión automático
