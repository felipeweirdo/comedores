# 👥 Usuarios del Sistema - Credenciales

## Usuarios Activos

### 1️⃣ Usuario Administrador
```
📧 Email:      admin@comedor.com
🔑 Contraseña: admin123
👤 Nombre:     Administrador
🎭 Rol:        administrador
🏢 Comedor:    comedor1
✅ Estado:     Activo
```

**Permisos:**
- ✅ Acceso completo al Panel de Administración
- ✅ Gestión de empleados
- ✅ Visualización de consumos
- ✅ Gestión de tipos de empleados
- ✅ Todas las funcionalidades del sistema
- ✅ Puede cambiar entre todos los comedores

---

### 2️⃣ Usuario Monitor (Comedor 1)
```
📧 Email:      monitor@comedor.com
🔑 Contraseña: monitor123
👤 Nombre:     Usuario Monitor
🎭 Rol:        monitor
🏢 Comedor:    comedor1
✅ Estado:     Activo
```

**Permisos:**
- ✅ Acceso a la pantalla de Registro de Comida
- ✅ Solo ve empleados de comedor1
- ❌ Sin acceso al Panel de Administración
- ❌ No puede cambiar de comedor

---

### 3️⃣ Usuario Monitor (Comedor 2)
```
📧 Email:      comedor2@comedor.com
🔑 Contraseña: comedor123
👤 Nombre:     Usuario Comedor 2
🎭 Rol:        monitor
🏢 Comedor:    comedor_secundario_02
✅ Estado:     Activo
```

**Permisos:**
- ✅ Acceso a la pantalla de Registro de Comida
- ✅ Solo ve empleados de comedor_secundario_02
- ❌ Sin acceso al Panel de Administración
- ❌ No puede cambiar de comedor

---

## 🔐 Roles Disponibles

### `administrador`
- Acceso completo al sistema
- Panel de administración
- Gestión de empleados, consumos y tipos

### `usuario` / `monitor`
- Solo pantalla de registro de comida
- Puede registrar consumos de empleados
- Sin acceso administrativo

---

## 🚀 Cómo Iniciar Sesión

1. Abrir: **http://localhost:3000/**
2. Ingresar email y contraseña
3. El sistema redirige automáticamente según el rol:
   - **Administrador** → Panel de Administración
   - **Monitor/Usuario** → Registro de Comida

---

## 📝 Crear Nuevos Usuarios

### Opción 1: Usar el script
```bash
node create-monitor-user.js
```

### Opción 2: SQL Directo
```sql
-- Primero generar el hash de la contraseña con bcrypt
-- Luego ejecutar:

INSERT INTO users (
    email, 
    password_hash, 
    full_name, 
    phone, 
    role, 
    comedor_id, 
    active
) VALUES (
    'nuevo@comedor.com',
    '$2b$10$...hash_generado...',
    'Nombre Completo',
    '1234567890',
    'monitor',  -- o 'administrador' o 'usuario'
    'comedor1',
    TRUE
);
```

---

## 🔧 Scripts Útiles

### Ver todos los usuarios
```bash
node show-credentials.js
```

### Actualizar contraseña del admin
```bash
node update-admin-password.js
```

### Crear usuario monitor
```bash
node create-monitor-user.js
```

---

## 🔒 Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Verificación segura con `bcrypt.compare()`
- ✅ Sesiones persistentes en localStorage
- ✅ Validación de roles en el backend

### ⚠️ Recomendaciones para Producción:
1. Implementar tokens JWT
2. Agregar refresh tokens
3. Implementar rate limiting
4. Usar HTTPS
5. Agregar 2FA (autenticación de dos factores)
6. Implementar timeout de sesión
7. Logs de auditoría de accesos

---

## 📊 Estructura de la Tabla Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(20) NOT NULL,
    comedor_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🎯 Próximos Pasos

- [ ] Agregar más roles según necesidades
- [ ] Implementar recuperación de contraseña
- [ ] Crear interfaz de gestión de usuarios
- [ ] Agregar permisos más granulares
- [ ] Implementar logs de auditoría
- [ ] Agregar timeout de sesión automático

---

**Última actualización:** 2026-02-04
