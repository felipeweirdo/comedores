# Diagrama de Base de Datos - Sistema de Registro de Comida

## Estructura de Datos Identificada

Basado en el análisis del código, el sistema utiliza Firebase (NoSQL), pero aquí está el diseño equivalente para SQL:

---

## Tablas Principales

### 1. **comedores**
Almacena información sobre los diferentes comedores del sistema.

```sql
CREATE TABLE comedores (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    require_pin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Campos:**
- `id`: Identificador único del comedor (UUID)
- `name`: Nombre del comedor
- `require_pin`: Indica si se requiere PIN para registrar consumos vía QR
- `created_at`: Fecha de creación
- `updated_at`: Fecha de última actualización

---

### 2. **empleados** (employees)
Almacena la información de los empleados registrados en cada comedor.

```sql
CREATE TABLE empleados (
    internal_id VARCHAR(50) PRIMARY KEY,
    comedor_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    number VARCHAR(50),
    type VARCHAR(50),
    pin VARCHAR(4),
    last_active_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comedor_id) REFERENCES comedores(id) ON DELETE CASCADE,
    INDEX idx_comedor (comedor_id),
    INDEX idx_number (number),
    INDEX idx_name (name),
    INDEX idx_last_active (last_active_date)
);
```

**Campos:**
- `internal_id`: Identificador interno único del empleado
- `comedor_id`: ID del comedor al que pertenece
- `name`: Nombre completo del empleado
- `number`: Número de empleado (opcional)
- `type`: Tipo de empleado (ej: "Guardias", "Limpieza") - solo si no tiene número
- `pin`: PIN de seguridad de 4 dígitos
- `last_active_date`: Fecha de última actividad (para detectar inactivos)
- `created_at`: Fecha de registro
- `updated_at`: Fecha de última modificación

---

### 3. **consumption_logs**
Registra los consumos diarios de cada empleado.

```sql
CREATE TABLE consumption_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    comedor_id VARCHAR(50) NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    consumption_count INT DEFAULT 1,
    week_id VARCHAR(20) NOT NULL,
    consumption_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES empleados(internal_id) ON DELETE CASCADE,
    FOREIGN KEY (comedor_id) REFERENCES comedores(id) ON DELETE CASCADE,
    INDEX idx_employee (employee_id),
    INDEX idx_comedor (comedor_id),
    INDEX idx_week (week_id),
    INDEX idx_date (consumption_date),
    UNIQUE KEY unique_consumption (employee_id, comedor_id, consumption_date)
);
```

**Campos:**
- `id`: Identificador único del registro
- `employee_id`: ID del empleado que consumió
- `comedor_id`: ID del comedor donde se registró
- `day_name`: Nombre del día (Lunes, Martes, etc.)
- `consumption_count`: Número de consumos en ese día
- `week_id`: Identificador de la semana (formato: YYYY-M-D del lunes)
- `consumption_date`: Fecha exacta del consumo
- `created_at`: Timestamp del registro

---

### 4. **consumption_histories**
Almacena el historial de semanas guardadas.

```sql
CREATE TABLE consumption_histories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comedor_id VARCHAR(50) NOT NULL,
    week_id VARCHAR(20) NOT NULL,
    save_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comedor_id) REFERENCES comedores(id) ON DELETE CASCADE,
    INDEX idx_comedor (comedor_id),
    INDEX idx_week (week_id),
    UNIQUE KEY unique_week_history (comedor_id, week_id)
);
```

**Campos:**
- `id`: Identificador único
- `comedor_id`: ID del comedor
- `week_id`: Identificador de la semana guardada
- `save_date`: Fecha en que se guardó la semana
- `created_at`: Fecha de creación del registro
- `updated_at`: Fecha de última actualización

---

### 5. **consumption_history_details**
Detalles de los consumos guardados en el historial.

```sql
CREATE TABLE consumption_history_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    history_id INT NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    consumption_count INT DEFAULT 0,
    FOREIGN KEY (history_id) REFERENCES consumption_histories(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES empleados(internal_id) ON DELETE CASCADE,
    INDEX idx_history (history_id),
    INDEX idx_employee (employee_id)
);
```

**Campos:**
- `id`: Identificador único
- `history_id`: ID del registro de historial
- `employee_id`: ID del empleado
- `day_name`: Día de la semana
- `consumption_count`: Cantidad de consumos

---

### 6. **tablet_configs**
Configuración de las tablets/dispositivos del sistema.

```sql
CREATE TABLE tablet_configs (
    tablet_id VARCHAR(50) PRIMARY KEY,
    active_comedor_id VARCHAR(50),
    nickname VARCHAR(100) DEFAULT 'Sin sobrenombre',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (active_comedor_id) REFERENCES comedores(id) ON DELETE SET NULL,
    INDEX idx_comedor (active_comedor_id)
);
```

**Campos:**
- `tablet_id`: Identificador único de la tablet (UUID)
- `active_comedor_id`: ID del comedor asignado a esta tablet
- `nickname`: Sobrenombre del dispositivo
- `created_at`: Fecha de registro
- `updated_at`: Fecha de última actualización

---

## Relaciones entre Tablas

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

## Diagrama Visual (Texto ASCII)

```
┌─────────────────────┐
│     comedores       │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ require_pin         │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N
           │
    ┌──────┴──────┬──────────────┬──────────────┐
    │             │              │              │
    ▼             ▼              ▼              ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  empleados  │ │consumption_  │ │consumption_  │ │ tablet_      │
│             │ │logs          │ │histories     │ │ configs      │
├─────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│internal_id  │ │id (PK)       │ │id (PK)       │ │tablet_id(PK) │
│(PK)         │ │employee_id   │ │comedor_id    │ │active_       │
│comedor_id   │ │(FK)          │ │(FK)          │ │comedor_id    │
│(FK)         │ │comedor_id    │ │week_id       │ │(FK)          │
│name         │ │(FK)          │ │save_date     │ │nickname      │
│number       │ │day_name      │ │created_at    │ │created_at    │
│type         │ │consumption_  │ │updated_at    │ │updated_at    │
│pin          │ │count         │ └──────┬───────┘ └──────────────┘
│last_active_ │ │week_id       │        │
│date         │ │consumption_  │        │ 1:N
│created_at   │ │date          │        │
│updated_at   │ │created_at    │        ▼
└─────────────┘ └──────────────┘ ┌──────────────────┐
                                  │consumption_      │
                                  │history_details   │
                                  ├──────────────────┤
                                  │id (PK)           │
                                  │history_id (FK)   │
                                  │employee_id (FK)  │
                                  │day_name          │
                                  │consumption_count │
                                  └──────────────────┘
```

---

## Consultas SQL Útiles

### 1. Obtener empleados inactivos (más de 21 días)
```sql
SELECT e.*, c.name as comedor_name,
       DATEDIFF(NOW(), e.last_active_date) as days_inactive
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
WHERE e.last_active_date IS NOT NULL
  AND DATEDIFF(NOW(), e.last_active_date) >= 21
ORDER BY days_inactive DESC;
```

### 2. Consumos de la semana actual por comedor
```sql
SELECT e.name, e.number, cl.day_name, SUM(cl.consumption_count) as total
FROM consumption_logs cl
JOIN empleados e ON cl.employee_id = e.internal_id
WHERE cl.comedor_id = 'comedor_principal_01'
  AND cl.week_id = '2026-2-3'
GROUP BY e.internal_id, cl.day_name
ORDER BY e.name, cl.day_name;
```

### 3. Total de consumos por empleado
```sql
SELECT e.name, e.number, COUNT(*) as total_registros,
       SUM(cl.consumption_count) as total_consumos
FROM consumption_logs cl
JOIN empleados e ON cl.employee_id = e.internal_id
WHERE cl.comedor_id = 'comedor_principal_01'
GROUP BY e.internal_id
ORDER BY total_consumos DESC;
```

### 4. Dispositivos y sus comedores asignados
```sql
SELECT tc.tablet_id, tc.nickname, c.name as comedor_asignado
FROM tablet_configs tc
LEFT JOIN comedores c ON tc.active_comedor_id = c.id
ORDER BY tc.nickname;
```

---

## Notas de Migración Firebase → SQL

**Diferencias clave:**
1. Firebase almacena datos en formato JSON anidado
2. SQL requiere normalización en tablas relacionales
3. Los logs de consumo en Firebase están en formato: `{employeeId: {dayName: count}}`
4. En SQL se normalizan en registros individuales

**Ventajas de SQL:**
- Mejor integridad referencial
- Consultas más eficientes para reportes
- Transacciones ACID
- Mejor para análisis de datos históricos

**Desventajas:**
- Menos flexible para cambios de esquema
- Requiere servidor de base de datos
- Más complejo de configurar inicialmente
