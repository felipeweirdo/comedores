# Sistema de Registro de Comida - Análisis y Separación de Código

## 📋 Resumen del Análisis

Este documento describe la separación del código HTML monolítico en archivos modulares y el diseño de la base de datos SQL equivalente.

---

## 📁 Estructura de Archivos Generados

### 1. **styles.css**
- **Ubicación:** `c:\comedor\styles.css`
- **Contenido:** Todos los estilos CSS personalizados
- **Tamaño:** ~40 líneas
- **Características:**
  - Fuente personalizada (Inter de Google Fonts)
  - Animaciones de modales y páginas
  - Estilos para inputs numéricos
  - Estilos para selects deshabilitados

### 2. **app.js**
- **Ubicación:** `c:\comedor\app.js`
- **Contenido:** Lógica JavaScript completa de la aplicación
- **Características principales:**
  - Configuración de Firebase (Firestore)
  - Gestión de estado global
  - Manejo de tablets/dispositivos
  - Funciones de renderizado
  - Event listeners
  - Lógica de negocio

### 3. **database_diagram.md**
- **Ubicación:** `c:\comedor\database_diagram.md`
- **Contenido:** Documentación completa del diseño de base de datos
- **Incluye:**
  - Estructura de 6 tablas principales
  - Relaciones entre tablas
  - Diagrama visual ASCII
  - Consultas SQL útiles
  - Notas de migración Firebase → SQL

### 4. **create_database.sql**
- **Ubicación:** `c:\comedor\create_database.sql`
- **Contenido:** Script SQL completo para crear la base de datos
- **Incluye:**
  - Creación de base de datos
  - 6 tablas con índices
  - 4 vistas útiles
  - 3 procedimientos almacenados
  - 3 triggers de validación
  - Datos iniciales

---

## 🗄️ Diseño de Base de Datos SQL

### Tablas Principales

#### 1. **comedores**
Almacena los diferentes comedores del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | VARCHAR(50) PK | Identificador único (UUID) |
| name | VARCHAR(100) | Nombre del comedor |
| require_pin | BOOLEAN | ¿Requiere PIN para QR? |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

#### 2. **empleados**
Información de empleados por comedor.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| internal_id | VARCHAR(50) PK | ID interno único |
| comedor_id | VARCHAR(50) FK | Comedor asignado |
| name | VARCHAR(200) | Nombre completo |
| number | VARCHAR(50) | Número de empleado (opcional) |
| type | VARCHAR(50) | Tipo: Guardias, Limpieza, etc. |
| pin | VARCHAR(4) | PIN de 4 dígitos |
| last_active_date | TIMESTAMP | Última actividad |
| created_at | TIMESTAMP | Fecha de registro |
| updated_at | TIMESTAMP | Última modificación |

#### 3. **consumption_logs**
Registros de consumos diarios.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO_INCREMENT | ID único |
| employee_id | VARCHAR(50) FK | Empleado |
| comedor_id | VARCHAR(50) FK | Comedor |
| day_name | VARCHAR(20) | Día de la semana |
| consumption_count | INT | Cantidad de consumos |
| week_id | VARCHAR(20) | ID de la semana |
| consumption_date | DATE | Fecha del consumo |
| created_at | TIMESTAMP | Timestamp del registro |

#### 4. **consumption_histories**
Historial de semanas guardadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO_INCREMENT | ID único |
| comedor_id | VARCHAR(50) FK | Comedor |
| week_id | VARCHAR(20) | ID de la semana |
| save_date | TIMESTAMP | Fecha de guardado |
| created_at | TIMESTAMP | Creación |
| updated_at | TIMESTAMP | Actualización |

#### 5. **consumption_history_details**
Detalles de consumos guardados.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO_INCREMENT | ID único |
| history_id | INT FK | Historial padre |
| employee_id | VARCHAR(50) FK | Empleado |
| day_name | VARCHAR(20) | Día de la semana |
| consumption_count | INT | Cantidad |

#### 6. **tablet_configs**
Configuración de dispositivos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| tablet_id | VARCHAR(50) PK | ID de la tablet (UUID) |
| active_comedor_id | VARCHAR(50) FK | Comedor asignado |
| nickname | VARCHAR(100) | Sobrenombre del dispositivo |
| created_at | TIMESTAMP | Creación |
| updated_at | TIMESTAMP | Actualización |

---

## 🔗 Relaciones entre Tablas

```
comedores (1) ----< (N) empleados
comedores (1) ----< (N) consumption_logs
comedores (1) ----< (N) consumption_histories
comedores (1) ----< (N) tablet_configs

empleados (1) ----< (N) consumption_logs
empleados (1) ----< (N) consumption_history_details

consumption_histories (1) ----< (N) consumption_history_details
```

---

## 📊 Vistas Creadas

### 1. **v_empleados_completo**
Vista completa de empleados con información de comedor.

### 2. **v_empleados_inactivos**
Empleados con más de 21 días de inactividad.

### 3. **v_consumos_semana**
Resumen de consumos agrupados por semana.

### 4. **v_total_consumos_empleado**
Total de consumos históricos por empleado.

---

## ⚙️ Procedimientos Almacenados

### 1. **sp_registrar_consumo**
Registra un nuevo consumo y actualiza la última actividad del empleado.

**Parámetros:**
- `p_employee_id`: ID del empleado
- `p_comedor_id`: ID del comedor
- `p_consumption_date`: Fecha del consumo

### 2. **sp_consumos_semana_actual**
Obtiene todos los consumos de la semana actual para un comedor.

**Parámetros:**
- `p_comedor_id`: ID del comedor

### 3. **sp_guardar_semana_historial**
Guarda la semana actual en el historial.

**Parámetros:**
- `p_comedor_id`: ID del comedor
- `p_week_id`: ID de la semana

---

## 🔒 Triggers de Validación

### 1. **trg_empleados_before_update**
Actualiza automáticamente el campo `updated_at`.

### 2. **trg_empleados_validate_pin**
Valida que el PIN sea de exactamente 4 dígitos numéricos (INSERT).

### 3. **trg_empleados_validate_pin_update**
Valida que el PIN sea de exactamente 4 dígitos numéricos (UPDATE).

---

## 🔍 Consultas SQL Útiles

### Empleados Inactivos
```sql
SELECT e.*, c.name as comedor_name,
       DATEDIFF(NOW(), e.last_active_date) as days_inactive
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
WHERE e.last_active_date IS NOT NULL
  AND DATEDIFF(NOW(), e.last_active_date) >= 21
ORDER BY days_inactive DESC;
```

### Consumos de la Semana Actual
```sql
SELECT e.name, e.number, cl.day_name, SUM(cl.consumption_count) as total
FROM consumption_logs cl
JOIN empleados e ON cl.employee_id = e.internal_id
WHERE cl.comedor_id = 'comedor_principal_01'
  AND cl.week_id = '2026-2-3'
GROUP BY e.internal_id, cl.day_name
ORDER BY e.name, cl.day_name;
```

### Total de Consumos por Empleado
```sql
SELECT e.name, e.number, COUNT(*) as total_registros,
       SUM(cl.consumption_count) as total_consumos
FROM consumption_logs cl
JOIN empleados e ON cl.employee_id = e.internal_id
WHERE cl.comedor_id = 'comedor_principal_01'
GROUP BY e.internal_id
ORDER BY total_consumos DESC;
```

---

## 🚀 Cómo Usar los Archivos

### 1. Actualizar el HTML
Modifica `ecxelente.html` para incluir los archivos separados:

```html
<head>
    <!-- ... otros meta tags ... -->
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- ... otras librerías ... -->
</head>
<body>
    <!-- ... contenido HTML ... -->
    
    <script type="module" src="app.js"></script>
</body>
```

### 2. Crear la Base de Datos SQL
```bash
# Conectar a MySQL
mysql -u root -p

# Ejecutar el script
source c:/comedor/create_database.sql
```

O usando un cliente GUI como MySQL Workbench, phpMyAdmin, etc.

### 3. Migrar Datos de Firebase a SQL
Necesitarás crear un script de migración que:
1. Lea los datos de Firebase
2. Los transforme al formato SQL
3. Los inserte en las tablas correspondientes

---

## 📝 Notas Importantes

### Diferencias Firebase vs SQL

**Firebase (NoSQL):**
- Estructura de datos anidada en JSON
- Flexible, sin esquema fijo
- Sincronización en tiempo real
- Escalabilidad automática

**SQL (Relacional):**
- Datos normalizados en tablas
- Esquema fijo con tipos de datos
- Mejor para consultas complejas
- Integridad referencial garantizada

### Ventajas de la Migración a SQL

1. **Integridad de Datos:** Constraints y foreign keys
2. **Consultas Complejas:** JOINs, agregaciones, subconsultas
3. **Reportes:** Mejor para análisis de datos históricos
4. **Transacciones:** ACID compliance
5. **Backup:** Herramientas maduras de respaldo

### Desventajas

1. **Configuración:** Requiere servidor de base de datos
2. **Escalabilidad:** Más complejo escalar horizontalmente
3. **Flexibilidad:** Cambios de esquema requieren migraciones
4. **Tiempo Real:** No tiene sincronización automática como Firebase

---

## 🛠️ Próximos Pasos Recomendados

1. **Crear script de migración** de Firebase a SQL
2. **Implementar API REST** para conectar el frontend con SQL
3. **Actualizar el código JavaScript** para usar la API en lugar de Firebase
4. **Configurar backup automático** de la base de datos
5. **Implementar autenticación** más robusta
6. **Crear dashboard de reportes** aprovechando las vistas SQL

---

## 📞 Soporte

Para dudas o problemas con la implementación, revisar:
- Documentación de MySQL: https://dev.mysql.com/doc/
- Firebase Migration Guide: https://firebase.google.com/docs/firestore/
- Tailwind CSS: https://tailwindcss.com/docs

---

**Fecha de Análisis:** 2026-02-03  
**Versión:** 1.0  
**Autor:** Sistema de Análisis de Código
