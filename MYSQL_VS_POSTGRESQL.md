# Comparación: MySQL vs PostgreSQL para Sistema de Comedor

## 📊 Tabla Comparativa Rápida

| Característica | MySQL | PostgreSQL | Ganador |
|----------------|-------|------------|---------|
| **Licencia** | GPL (Oracle) | PostgreSQL License (MIT-like) | PostgreSQL ✓ |
| **Estándares SQL** | Parcial | Completo (SQL:2016) | PostgreSQL ✓ |
| **Tipos de Datos** | Básicos | Avanzados (JSON, Arrays, etc.) | PostgreSQL ✓ |
| **Procedimientos** | Limitados | Completos (PL/pgSQL) | PostgreSQL ✓ |
| **Rendimiento Lectura** | Excelente | Muy bueno | MySQL ✓ |
| **Rendimiento Escritura** | Muy bueno | Excelente | PostgreSQL ✓ |
| **Facilidad de Uso** | Muy fácil | Moderada | MySQL ✓ |
| **Comunidad** | Grande | Grande | Empate |
| **Hosting** | Muy común | Común | MySQL ✓ |
| **Integridad de Datos** | Buena | Excelente | PostgreSQL ✓ |

---

## 🔍 Diferencias Principales

### 1. Sintaxis de Procedimientos Almacenados

#### MySQL
```sql
DELIMITER //
CREATE PROCEDURE sp_registrar_consumo(
    IN p_employee_id VARCHAR(50),
    IN p_comedor_id VARCHAR(50),
    IN p_consumption_date DATE
)
BEGIN
    DECLARE v_day_name VARCHAR(20);
    -- Lógica aquí
END //
DELIMITER ;

-- Llamar
CALL sp_registrar_consumo('emp123', 'com01', '2026-02-03');
```

#### PostgreSQL
```sql
CREATE OR REPLACE FUNCTION sp_registrar_consumo(
    p_employee_id VARCHAR(50),
    p_comedor_id VARCHAR(50),
    p_consumption_date DATE
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_day_name VARCHAR(20);
BEGIN
    -- Lógica aquí
    RETURN QUERY SELECT TRUE, 'Éxito'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Llamar
SELECT * FROM sp_registrar_consumo('emp123', 'com01', '2026-02-03');
```

---

### 2. Auto-incremento

#### MySQL
```sql
CREATE TABLE empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200)
);
```

#### PostgreSQL
```sql
CREATE TABLE empleados (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200)
);

-- O más moderno
CREATE TABLE empleados (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200)
);
```

---

### 3. Manejo de Duplicados

#### MySQL
```sql
INSERT INTO empleados (id, name) 
VALUES (1, 'Juan')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

#### PostgreSQL
```sql
INSERT INTO empleados (id, name) 
VALUES (1, 'Juan')
ON CONFLICT (id) 
DO UPDATE SET name = EXCLUDED.name;
```

---

### 4. Funciones de Fecha

#### MySQL
```sql
-- Fecha actual
NOW(), CURDATE(), CURTIME()

-- Diferencia de días
DATEDIFF(fecha1, fecha2)

-- Agregar días
DATE_ADD(fecha, INTERVAL 7 DAY)

-- Formato
DATE_FORMAT(fecha, '%Y-%m-%d')
```

#### PostgreSQL
```sql
-- Fecha actual
CURRENT_TIMESTAMP, CURRENT_DATE, CURRENT_TIME

-- Diferencia de días
fecha1 - fecha2  -- Retorna INTERVAL
AGE(fecha1, fecha2)

-- Agregar días
fecha + INTERVAL '7 days'

-- Formato
TO_CHAR(fecha, 'YYYY-MM-DD')
```

---

### 5. Concatenación de Strings

#### MySQL
```sql
SELECT CONCAT(nombre, ' ', apellido) AS nombre_completo
FROM empleados;

-- O
SELECT CONCAT_WS(' ', nombre, apellido) AS nombre_completo
FROM empleados;
```

#### PostgreSQL
```sql
SELECT nombre || ' ' || apellido AS nombre_completo
FROM empleados;

-- O
SELECT CONCAT(nombre, ' ', apellido) AS nombre_completo
FROM empleados;
```

---

### 6. LIMIT y OFFSET

#### MySQL
```sql
SELECT * FROM empleados
LIMIT 10 OFFSET 20;
```

#### PostgreSQL
```sql
-- Igual que MySQL
SELECT * FROM empleados
LIMIT 10 OFFSET 20;

-- O al revés
SELECT * FROM empleados
OFFSET 20 LIMIT 10;
```

---

### 7. Tipos de Datos Especiales

#### MySQL
```sql
-- JSON (desde 5.7)
CREATE TABLE config (
    id INT PRIMARY KEY,
    settings JSON
);

-- Limitado en funcionalidad
```

#### PostgreSQL
```sql
-- JSON y JSONB (binario, más rápido)
CREATE TABLE config (
    id INT PRIMARY KEY,
    settings JSONB
);

-- Muchas funciones para manipular JSON
SELECT settings->>'key' FROM config;
SELECT settings @> '{"key": "value"}';

-- Arrays nativos
CREATE TABLE tags (
    id INT PRIMARY KEY,
    labels TEXT[]
);

-- Tipos personalizados (ENUM)
CREATE TYPE estado AS ENUM ('activo', 'inactivo', 'suspendido');
```

---

### 8. Triggers

#### MySQL
```sql
DELIMITER //
CREATE TRIGGER trg_empleados_before_update
BEFORE UPDATE ON empleados
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //
DELIMITER ;
```

#### PostgreSQL
```sql
-- Primero crear la función
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Luego crear el trigger
CREATE TRIGGER trg_empleados_updated_at
    BEFORE UPDATE ON empleados
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### 9. Transacciones

#### MySQL
```sql
START TRANSACTION;

INSERT INTO empleados (name) VALUES ('Juan');
UPDATE consumption_logs SET count = count + 1 WHERE id = 1;

COMMIT;
-- O ROLLBACK;
```

#### PostgreSQL
```sql
BEGIN;

INSERT INTO empleados (name) VALUES ('Juan');
UPDATE consumption_logs SET count = count + 1 WHERE id = 1;

COMMIT;
-- O ROLLBACK;

-- PostgreSQL también soporta SAVEPOINT
BEGIN;
INSERT INTO empleados (name) VALUES ('Juan');
SAVEPOINT sp1;
UPDATE consumption_logs SET count = count + 1 WHERE id = 1;
ROLLBACK TO sp1;  -- Solo deshace el UPDATE
COMMIT;
```

---

### 10. Búsqueda de Texto Completo

#### MySQL
```sql
-- Crear índice FULLTEXT
CREATE FULLTEXT INDEX idx_name ON empleados(name);

-- Buscar
SELECT * FROM empleados
WHERE MATCH(name) AGAINST('Juan' IN NATURAL LANGUAGE MODE);
```

#### PostgreSQL
```sql
-- Más potente con tsvector
ALTER TABLE empleados ADD COLUMN name_tsv tsvector;

UPDATE empleados 
SET name_tsv = to_tsvector('spanish', name);

CREATE INDEX idx_name_tsv ON empleados USING gin(name_tsv);

-- Buscar
SELECT * FROM empleados
WHERE name_tsv @@ to_tsquery('spanish', 'Juan');

-- O con similitud (requiere pg_trgm)
CREATE EXTENSION pg_trgm;
SELECT * FROM empleados
WHERE name % 'Juan'  -- Operador de similitud
ORDER BY similarity(name, 'Juan') DESC;
```

---

## 💰 Costos de Hosting

### MySQL
- **Compartido:** $3-10/mes
- **VPS:** $5-20/mes
- **Managed (AWS RDS):** $15-100+/mes
- **Muy común en hosting compartido** ✓

### PostgreSQL
- **Compartido:** Menos común
- **VPS:** $5-20/mes
- **Managed (AWS RDS):** $15-100+/mes
- **Heroku Postgres:** Gratis-$50+/mes
- **DigitalOcean Managed:** $15+/mes

---

## 🎯 Recomendaciones por Caso de Uso

### Usar MySQL si:
- ✅ Necesitas hosting barato y fácil
- ✅ Tu aplicación es principalmente de lectura
- ✅ Quieres máxima compatibilidad con hosting compartido
- ✅ El equipo ya conoce MySQL
- ✅ Usas WordPress, Joomla, etc.

### Usar PostgreSQL si:
- ✅ Necesitas integridad de datos estricta
- ✅ Usas tipos de datos complejos (JSON, Arrays)
- ✅ Requieres procedimientos almacenados complejos
- ✅ Necesitas búsqueda de texto completo avanzada
- ✅ Planeas escalar a gran volumen de escrituras
- ✅ Quieres cumplir estándares SQL estrictos

---

## 🚀 Para el Sistema de Comedor

### Recomendación: **PostgreSQL** ✓

**Razones:**

1. **Integridad de Datos:** Los consumos y registros de empleados requieren alta confiabilidad
2. **Procedimientos Almacenados:** Las funciones complejas son más fáciles en PostgreSQL
3. **Tipos de Datos:** Podrías expandir a usar JSON para configuraciones
4. **Escalabilidad:** Si crece el sistema, PostgreSQL maneja mejor las escrituras concurrentes
5. **Gratuito y Open Source:** Sin preocupaciones de licenciamiento

**Pero MySQL también funciona bien si:**
- Ya tienes hosting MySQL
- El equipo está más familiarizado con MySQL
- Prefieres la simplicidad

---

## 📈 Rendimiento en Nuestro Caso

### Operaciones Comunes

| Operación | MySQL | PostgreSQL | Notas |
|-----------|-------|------------|-------|
| Registrar consumo | Rápido | Rápido | Similar |
| Buscar empleado | Muy rápido | Rápido | MySQL ligeramente más rápido |
| Consultas complejas | Bueno | Muy bueno | PostgreSQL optimiza mejor |
| Inserciones masivas | Bueno | Muy bueno | PostgreSQL con COPY es más rápido |
| Reportes semanales | Bueno | Muy bueno | PostgreSQL con mejores agregaciones |

---

## 🔄 Migración entre Bases de Datos

### De MySQL a PostgreSQL
```bash
# Usar pgloader
pgloader mysql://user:pass@localhost/sistema_comedor \
          postgresql://user:pass@localhost/sistema_comedor
```

### De PostgreSQL a MySQL
```bash
# Más complejo, requiere ajustes manuales
pg_dump -U postgres sistema_comedor > dump.sql
# Editar dump.sql para sintaxis MySQL
mysql -u root -p sistema_comedor < dump_edited.sql
```

---

## 📝 Conclusión

**Para este proyecto específico:**

| Aspecto | MySQL | PostgreSQL |
|---------|-------|------------|
| **Facilidad inicial** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Funcionalidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Rendimiento** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Hosting** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Escalabilidad** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Comunidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Recomendación Final:** 
- **PostgreSQL** para producción seria y a largo plazo
- **MySQL** si necesitas simplicidad y hosting barato inmediato

**Ambos scripts están disponibles:**
- `create_database.sql` (MySQL)
- `create_database_postgresql.sql` (PostgreSQL)

¡Elige el que mejor se adapte a tus necesidades! 🎯
