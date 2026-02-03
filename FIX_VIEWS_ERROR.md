# 🔧 Solución al Error: "relation v_comedores_empresa does not exist"

## ✅ Problema Resuelto

El error ocurrió porque las vistas no se crearon durante la migración inicial.

## 🎯 Solución Aplicada

He creado el script `create-views.js` que crea todas las vistas necesarias:

- ✅ `v_comedores_empresa`
- ✅ `v_empleados_completo`
- ✅ `v_empleados_inactivos`
- ✅ `v_consumos_semana`
- ✅ `v_total_consumos_empleado`

## 🚀 Pasos para Reiniciar el Servidor

### Opción 1: Detener y Reiniciar (Windows)

1. **Detener el servidor actual:**
   - Presiona `Ctrl + C` en la terminal donde está corriendo `node server.js`

2. **Reiniciar el servidor:**
   ```bash
   node server.js
   ```

### Opción 2: Usar PowerShell para Matar el Proceso

```powershell
# Encontrar el proceso en el puerto 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }

# Luego reiniciar
node server.js
```

### Opción 3: Reiniciar desde el Task Manager

1. Abrir Task Manager (`Ctrl + Shift + Esc`)
2. Buscar proceso "Node.js"
3. Click derecho → "End Task"
4. Ejecutar `node server.js` de nuevo

## ✅ Verificación

Después de reiniciar, deberías ver:

```
🚀 ============================================
🚀  API REST - Sistema de Comedor Multi-Empresa
🚀 ============================================
🌐  Servidor corriendo en: http://localhost:3000
📊  Health check: http://localhost:3000/api/health
📚  Base de datos: comedores
🏢  Host: orbital.c1si04wy4fib.us-east-2.rds.amazonaws.com
🚀 ============================================

✅ Conectado a PostgreSQL
```

**Sin errores.**

## 🧪 Probar que Funciona

```bash
# Probar el endpoint de comedores
node test-api.js
```

O abre en el navegador:
```
http://localhost:3000/api/comedores
```

Deberías ver un JSON con los comedores.

## 📝 Comandos Útiles

```bash
# Ver vistas creadas
node test-connection.js

# Recrear vistas si es necesario
node create-views.js

# Probar API
node test-api.js

# Iniciar servidor
node server.js
```

## ✨ Estado Actual

- ✅ Base de datos: OK
- ✅ Vistas: Creadas
- ✅ API: Lista (solo necesita reinicio)
- ✅ Frontend: Listo en `index-refactored.html`

## 🎯 Próximo Paso

1. Detén el servidor actual (`Ctrl + C`)
2. Reinicia con `node server.js`
3. Abre `index-refactored.html` en el navegador
4. ¡Listo para usar!

---

**Fecha:** 2026-02-03  
**Estado:** ✅ Resuelto
