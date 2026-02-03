# Guía Rápida - PostgreSQL para Sistema de Comedor

## 🐘 Instalación de PostgreSQL

### Windows
1. Descargar desde: https://www.postgresql.org/download/windows/
2. Ejecutar el instalador
3. Configurar contraseña para el usuario `postgres`
4. Puerto por defecto: 5432
5. Instalar pgAdmin 4 (incluido en el instalador)

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### macOS
```bash
brew install postgresql@15
brew services start postgresql@15
```

---

## 🚀 Crear la Base de Datos

### Opción 1: Usando psql (línea de comandos)

```bash
# Conectar como superusuario
psql -U postgres

# Crear la base de datos
CREATE DATABASE sistema_comedor
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'es_MX.UTF-8'
    LC_CTYPE = 'es_MX.UTF-8'
    TEMPLATE = template0;

# Salir
\q

# Ejecutar el script
psql -U postgres -d sistema_comedor -f create_database_postgresql.sql
```

### Opción 2: Usando pgAdmin 4

1. Abrir pgAdmin 4
2. Conectar al servidor PostgreSQL
3. Click derecho en "Databases" → "Create" → "Database"
4. Nombre: `sistema_comedor`
5. Encoding: UTF8
6. Click en "Save"
7. Click derecho en la base de datos → "Query Tool"
8. Abrir el archivo `create_database_postgresql.sql`
9. Ejecutar (F5 o botón ▶)

---

## 📊 Verificar la Instalación

```sql
-- Conectar a la base de datos
\c sistema_comedor

-- Ver todas las tablas
\dt

-- Ver todas las vistas
\dv

-- Ver todas las funciones
\df

-- Ver estructura de una tabla
\d empleados

-- Ver datos iniciales
SELECT * FROM comedores;
```

---

## 🔧 Diferencias Clave: MySQL vs PostgreSQL

### 1. **AUTO_INCREMENT → SERIAL**
```sql
-- MySQL
id INT AUTO_INCREMENT PRIMARY KEY

-- PostgreSQL
id SERIAL PRIMARY KEY
```

### 2. **Funciones de Fecha**
```sql
-- MySQL
NOW(), CURDATE(), DATEDIFF()

-- PostgreSQL
CURRENT_TIMESTAMP, CURRENT_DATE, AGE()
```

### 3. **Strings**
```sql
-- MySQL
CONCAT(a, b), SUBSTRING(str, 1, 5)

-- PostgreSQL
a || b, SUBSTRING(str FROM 1 FOR 5)
```

### 4. **LIMIT**
```sql
-- MySQL
SELECT * FROM tabla LIMIT 10 OFFSET 20;

-- PostgreSQL (igual, pero también soporta)
SELECT * FROM tabla LIMIT 10 OFFSET 20;
-- O
SELECT * FROM tabla OFFSET 20 LIMIT 10;
```

### 5. **Procedimientos Almacenados**
```sql
-- MySQL
DELIMITER //
CREATE PROCEDURE nombre() BEGIN ... END //
DELIMITER ;

-- PostgreSQL
CREATE OR REPLACE FUNCTION nombre()
RETURNS TABLE(...) AS $$
BEGIN
    ...
END;
$$ LANGUAGE plpgsql;
```

### 6. **ON DUPLICATE KEY UPDATE → ON CONFLICT**
```sql
-- MySQL
INSERT INTO tabla (id, name) VALUES (1, 'Juan')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- PostgreSQL
INSERT INTO tabla (id, name) VALUES (1, 'Juan')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
```

---

## 📝 Ejemplos de Uso

### Registrar un Consumo
```sql
SELECT * FROM sp_registrar_consumo(
    'c7a8b2f1',                    -- employee_id
    'comedor_principal_01',         -- comedor_id
    CURRENT_DATE                    -- consumption_date
);
```

### Obtener Consumos de la Semana Actual
```sql
SELECT * FROM sp_consumos_semana_actual('comedor_principal_01');
```

### Guardar Semana en Historial
```sql
SELECT * FROM sp_guardar_semana_historial(
    'comedor_principal_01',
    get_week_id(CURRENT_DATE)
);
```

### Ver Empleados Inactivos
```sql
SELECT * FROM v_empleados_inactivos;
```

### Insertar un Nuevo Empleado
```sql
INSERT INTO empleados (
    internal_id, 
    comedor_id, 
    name, 
    number, 
    last_active_date
)
VALUES (
    gen_random_uuid()::TEXT,
    'comedor_principal_01',
    'JUAN PÉREZ GARCÍA',
    '1234',
    CURRENT_TIMESTAMP
);
```

---

## 🔍 Consultas Útiles

### Empleados con más consumos
```sql
SELECT 
    empleado_nombre,
    empleado_numero,
    total_consumos
FROM v_total_consumos_empleado
ORDER BY total_consumos DESC
LIMIT 10;
```

### Consumos del día de hoy
```sql
SELECT 
    e.name,
    e.number,
    cl.consumption_count,
    cl.created_at
FROM consumption_logs cl
JOIN empleados e ON cl.employee_id = e.internal_id
WHERE cl.consumption_date = CURRENT_DATE
ORDER BY cl.created_at DESC;
```

### Empleados sin PIN
```sql
SELECT 
    name,
    number,
    comedor_id
FROM empleados
WHERE pin IS NULL
ORDER BY name;
```

### Total de consumos por día de la semana
```sql
SELECT 
    day_name,
    COUNT(*) as total_registros,
    SUM(consumption_count) as total_consumos
FROM consumption_logs
WHERE week_id = get_week_id(CURRENT_DATE)
GROUP BY day_name
ORDER BY 
    CASE day_name
        WHEN 'Lunes' THEN 1
        WHEN 'Martes' THEN 2
        WHEN 'Miércoles' THEN 3
        WHEN 'Jueves' THEN 4
        WHEN 'Viernes' THEN 5
        WHEN 'Sábado' THEN 6
        WHEN 'Domingo' THEN 7
    END;
```

---

## 🔐 Crear Usuario para la Aplicación

```sql
-- Crear usuario
CREATE ROLE comedor_app WITH LOGIN PASSWORD 'tu_password_seguro';

-- Otorgar permisos
GRANT CONNECT ON DATABASE sistema_comedor TO comedor_app;
GRANT USAGE ON SCHEMA public TO comedor_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO comedor_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO comedor_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO comedor_app;

-- Hacer permanentes los permisos para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO comedor_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO comedor_app;
```

---

## 🔄 Backup y Restore

### Crear Backup
```bash
# Backup completo
pg_dump -U postgres -d sistema_comedor -F c -f backup_comedor.dump

# Backup solo esquema
pg_dump -U postgres -d sistema_comedor -s -f schema_only.sql

# Backup solo datos
pg_dump -U postgres -d sistema_comedor -a -f data_only.sql
```

### Restaurar Backup
```bash
# Restaurar desde dump
pg_restore -U postgres -d sistema_comedor -c backup_comedor.dump

# Restaurar desde SQL
psql -U postgres -d sistema_comedor -f backup.sql
```

---

## 🐛 Solución de Problemas

### Error: "database does not exist"
```sql
-- Crear la base de datos primero
CREATE DATABASE sistema_comedor;
```

### Error: "permission denied"
```sql
-- Otorgar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE sistema_comedor TO tu_usuario;
```

### Error: "relation already exists"
```sql
-- Eliminar y recrear (¡CUIDADO! Esto borra todos los datos)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
-- Luego ejecutar el script de nuevo
```

### Ver logs de errores
```bash
# Linux
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Windows
# Ver en: C:\Program Files\PostgreSQL\15\data\log\
```

---

## 📦 Conectar desde Node.js

### Instalar driver
```bash
npm install pg dotenv
```

### Código de conexión
```javascript
// db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'sistema_comedor',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Probar conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error conectando a PostgreSQL:', err);
  } else {
    console.log('✓ Conectado a PostgreSQL:', res.rows[0].now);
  }
});

module.exports = pool;
```

### Ejemplo de uso
```javascript
const pool = require('./db');

// Registrar consumo
async function registrarConsumo(employeeId, comedorId) {
  const query = 'SELECT * FROM sp_registrar_consumo($1, $2, $3)';
  const values = [employeeId, comedorId, new Date()];
  
  try {
    const result = await pool.query(query, values);
    console.log('Consumo registrado:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Obtener empleados
async function getEmpleados(comedorId) {
  const query = `
    SELECT * FROM empleados 
    WHERE comedor_id = $1 
    ORDER BY name
  `;
  
  try {
    const result = await pool.query(query, [comedorId]);
    return result.rows;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

---

## 🎯 Comandos Útiles de psql

```bash
\l              # Listar bases de datos
\c dbname       # Conectar a una base de datos
\dt             # Listar tablas
\dv             # Listar vistas
\df             # Listar funciones
\d tablename    # Describir tabla
\du             # Listar usuarios/roles
\dn             # Listar schemas
\dp             # Listar permisos
\timing         # Activar/desactivar tiempo de ejecución
\x              # Activar/desactivar vista expandida
\q              # Salir
\?              # Ayuda de comandos
\h SELECT       # Ayuda de sintaxis SQL
```

---

## 📈 Optimización

### Crear índices adicionales
```sql
-- Si hay muchas búsquedas por nombre
CREATE INDEX idx_empleados_name_trgm ON empleados 
USING gin (name gin_trgm_ops);

-- Requiere extensión
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Analizar rendimiento
```sql
-- Ver estadísticas de una consulta
EXPLAIN ANALYZE 
SELECT * FROM v_total_consumos_empleado;

-- Actualizar estadísticas
ANALYZE empleados;
VACUUM ANALYZE;
```

---

## 🌐 Acceso Remoto

### Editar postgresql.conf
```bash
# Linux
sudo nano /etc/postgresql/15/main/postgresql.conf

# Buscar y cambiar
listen_addresses = '*'
```

### Editar pg_hba.conf
```bash
# Linux
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Agregar al final
host    all             all             0.0.0.0/0               md5
```

### Reiniciar PostgreSQL
```bash
sudo systemctl restart postgresql
```

---

## 📚 Recursos Adicionales

- **Documentación Oficial:** https://www.postgresql.org/docs/
- **Tutorial Interactivo:** https://www.postgresqltutorial.com/
- **pgAdmin:** https://www.pgadmin.org/
- **DBeaver (Cliente Universal):** https://dbeaver.io/

---

**¡Tu base de datos PostgreSQL está lista para usar!** 🎉
