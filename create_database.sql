-- ============================================================================
-- Sistema de Registro de Comida - Base de Datos SQL
-- ============================================================================
-- Autor: Sistema de Comedor
-- Fecha: 2026-02-03
-- Descripción: Script completo para crear la base de datos del sistema
-- ============================================================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS sistema_comedor
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE sistema_comedor;

-- ============================================================================
-- TABLA: comedores
-- Descripción: Almacena los diferentes comedores del sistema
-- ============================================================================
CREATE TABLE comedores (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    require_pin BOOLEAN DEFAULT TRUE COMMENT 'Indica si se requiere PIN para registros vía QR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: empleados
-- Descripción: Almacena información de empleados por comedor
-- ============================================================================
CREATE TABLE empleados (
    internal_id VARCHAR(50) PRIMARY KEY,
    comedor_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    number VARCHAR(50) NULL COMMENT 'Número de empleado (opcional)',
    type VARCHAR(50) NULL COMMENT 'Tipo: Guardias, Limpieza, etc. (solo si no tiene número)',
    pin VARCHAR(4) NULL COMMENT 'PIN de seguridad de 4 dígitos',
    last_active_date TIMESTAMP NULL COMMENT 'Última fecha de actividad para detectar inactivos',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comedor_id) REFERENCES comedores(id) ON DELETE CASCADE,
    INDEX idx_comedor (comedor_id),
    INDEX idx_number (number),
    INDEX idx_name (name),
    INDEX idx_last_active (last_active_date),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: consumption_logs
-- Descripción: Registra los consumos diarios de cada empleado
-- ============================================================================
CREATE TABLE consumption_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    comedor_id VARCHAR(50) NOT NULL,
    day_name VARCHAR(20) NOT NULL COMMENT 'Lunes, Martes, Miércoles, etc.',
    consumption_count INT DEFAULT 1 COMMENT 'Número de consumos en ese día',
    week_id VARCHAR(20) NOT NULL COMMENT 'Formato: YYYY-M-D del lunes de la semana',
    consumption_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES empleados(internal_id) ON DELETE CASCADE,
    FOREIGN KEY (comedor_id) REFERENCES comedores(id) ON DELETE CASCADE,
    INDEX idx_employee (employee_id),
    INDEX idx_comedor (comedor_id),
    INDEX idx_week (week_id),
    INDEX idx_date (consumption_date),
    INDEX idx_day_name (day_name),
    UNIQUE KEY unique_consumption (employee_id, comedor_id, consumption_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: consumption_histories
-- Descripción: Almacena el historial de semanas guardadas
-- ============================================================================
CREATE TABLE consumption_histories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comedor_id VARCHAR(50) NOT NULL,
    week_id VARCHAR(20) NOT NULL COMMENT 'Identificador de la semana guardada',
    save_date TIMESTAMP NOT NULL COMMENT 'Fecha en que se guardó la semana',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comedor_id) REFERENCES comedores(id) ON DELETE CASCADE,
    INDEX idx_comedor (comedor_id),
    INDEX idx_week (week_id),
    INDEX idx_save_date (save_date),
    UNIQUE KEY unique_week_history (comedor_id, week_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: consumption_history_details
-- Descripción: Detalles de los consumos guardados en el historial
-- ============================================================================
CREATE TABLE consumption_history_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    history_id INT NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    consumption_count INT DEFAULT 0,
    FOREIGN KEY (history_id) REFERENCES consumption_histories(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES empleados(internal_id) ON DELETE CASCADE,
    INDEX idx_history (history_id),
    INDEX idx_employee (employee_id),
    INDEX idx_day (day_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLA: tablet_configs
-- Descripción: Configuración de tablets/dispositivos del sistema
-- ============================================================================
CREATE TABLE tablet_configs (
    tablet_id VARCHAR(50) PRIMARY KEY,
    active_comedor_id VARCHAR(50) NULL,
    nickname VARCHAR(100) DEFAULT 'Sin sobrenombre',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (active_comedor_id) REFERENCES comedores(id) ON DELETE SET NULL,
    INDEX idx_comedor (active_comedor_id),
    INDEX idx_nickname (nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Insertar comedores iniciales
INSERT INTO comedores (id, name, require_pin) VALUES
('comedor_principal_01', 'Comedor Principal', TRUE),
('comedor_secundario_02', 'Comedor Secundario', TRUE);

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista: Empleados con información de comedor
CREATE OR REPLACE VIEW v_empleados_completo AS
SELECT 
    e.internal_id,
    e.name AS empleado_nombre,
    e.number AS empleado_numero,
    e.type AS empleado_tipo,
    CASE WHEN e.pin IS NOT NULL THEN 'Sí' ELSE 'No' END AS tiene_pin,
    e.last_active_date,
    DATEDIFF(NOW(), e.last_active_date) AS dias_inactivo,
    c.id AS comedor_id,
    c.name AS comedor_nombre,
    e.created_at AS fecha_registro
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id;

-- Vista: Empleados inactivos (más de 21 días)
CREATE OR REPLACE VIEW v_empleados_inactivos AS
SELECT 
    e.internal_id,
    e.name AS empleado_nombre,
    e.number AS empleado_numero,
    c.name AS comedor_nombre,
    e.last_active_date,
    DATEDIFF(NOW(), e.last_active_date) AS dias_inactivo
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
WHERE e.last_active_date IS NOT NULL
  AND DATEDIFF(NOW(), e.last_active_date) >= 21
ORDER BY dias_inactivo DESC;

-- Vista: Resumen de consumos por semana
CREATE OR REPLACE VIEW v_consumos_semana AS
SELECT 
    cl.week_id,
    c.name AS comedor_nombre,
    e.name AS empleado_nombre,
    e.number AS empleado_numero,
    cl.day_name,
    SUM(cl.consumption_count) AS total_consumos,
    MAX(cl.consumption_date) AS ultima_fecha
FROM consumption_logs cl
JOIN empleados e ON cl.employee_id = e.internal_id
JOIN comedores c ON cl.comedor_id = c.id
GROUP BY cl.week_id, cl.comedor_id, cl.employee_id, cl.day_name
ORDER BY cl.week_id DESC, e.name, cl.day_name;

-- Vista: Total de consumos por empleado
CREATE OR REPLACE VIEW v_total_consumos_empleado AS
SELECT 
    e.internal_id,
    e.name AS empleado_nombre,
    e.number AS empleado_numero,
    c.name AS comedor_nombre,
    COUNT(DISTINCT cl.consumption_date) AS dias_registrados,
    SUM(cl.consumption_count) AS total_consumos,
    MAX(cl.consumption_date) AS ultimo_consumo
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
LEFT JOIN consumption_logs cl ON e.internal_id = cl.employee_id
GROUP BY e.internal_id, c.id
ORDER BY total_consumos DESC;

-- ============================================================================
-- PROCEDIMIENTOS ALMACENADOS
-- ============================================================================

DELIMITER //

-- Procedimiento: Registrar consumo
CREATE PROCEDURE sp_registrar_consumo(
    IN p_employee_id VARCHAR(50),
    IN p_comedor_id VARCHAR(50),
    IN p_consumption_date DATE
)
BEGIN
    DECLARE v_day_name VARCHAR(20);
    DECLARE v_week_id VARCHAR(20);
    
    -- Obtener el nombre del día
    SET v_day_name = CASE DAYOFWEEK(p_consumption_date)
        WHEN 1 THEN 'Domingo'
        WHEN 2 THEN 'Lunes'
        WHEN 3 THEN 'Martes'
        WHEN 4 THEN 'Miércoles'
        WHEN 5 THEN 'Jueves'
        WHEN 6 THEN 'Viernes'
        WHEN 7 THEN 'Sábado'
    END;
    
    -- Calcular week_id (lunes de la semana)
    SET v_week_id = DATE_FORMAT(
        DATE_SUB(p_consumption_date, INTERVAL (DAYOFWEEK(p_consumption_date) - 2) DAY),
        '%Y-%c-%e'
    );
    
    -- Insertar o actualizar el consumo
    INSERT INTO consumption_logs (
        employee_id, 
        comedor_id, 
        day_name, 
        consumption_count, 
        week_id, 
        consumption_date
    )
    VALUES (
        p_employee_id,
        p_comedor_id,
        v_day_name,
        1,
        v_week_id,
        p_consumption_date
    )
    ON DUPLICATE KEY UPDATE
        consumption_count = consumption_count + 1;
    
    -- Actualizar última fecha de actividad del empleado
    UPDATE empleados
    SET last_active_date = NOW()
    WHERE internal_id = p_employee_id;
END //

-- Procedimiento: Obtener consumos de la semana actual
CREATE PROCEDURE sp_consumos_semana_actual(
    IN p_comedor_id VARCHAR(50)
)
BEGIN
    DECLARE v_week_id VARCHAR(20);
    
    -- Calcular week_id de la semana actual
    SET v_week_id = DATE_FORMAT(
        DATE_SUB(CURDATE(), INTERVAL (DAYOFWEEK(CURDATE()) - 2) DAY),
        '%Y-%c-%e'
    );
    
    SELECT 
        e.name AS empleado_nombre,
        e.number AS empleado_numero,
        e.type AS empleado_tipo,
        cl.day_name,
        SUM(cl.consumption_count) AS total_consumos
    FROM consumption_logs cl
    JOIN empleados e ON cl.employee_id = e.internal_id
    WHERE cl.comedor_id = p_comedor_id
      AND cl.week_id = v_week_id
    GROUP BY e.internal_id, cl.day_name
    ORDER BY e.name, 
             FIELD(cl.day_name, 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo');
END //

-- Procedimiento: Guardar semana en historial
CREATE PROCEDURE sp_guardar_semana_historial(
    IN p_comedor_id VARCHAR(50),
    IN p_week_id VARCHAR(20)
)
BEGIN
    DECLARE v_history_id INT;
    
    -- Insertar o actualizar el registro de historial
    INSERT INTO consumption_histories (comedor_id, week_id, save_date)
    VALUES (p_comedor_id, p_week_id, NOW())
    ON DUPLICATE KEY UPDATE 
        save_date = NOW(),
        id = LAST_INSERT_ID(id);
    
    SET v_history_id = LAST_INSERT_ID();
    
    -- Copiar los detalles de consumo al historial
    INSERT INTO consumption_history_details (history_id, employee_id, day_name, consumption_count)
    SELECT 
        v_history_id,
        employee_id,
        day_name,
        SUM(consumption_count)
    FROM consumption_logs
    WHERE comedor_id = p_comedor_id
      AND week_id = p_week_id
    GROUP BY employee_id, day_name
    ON DUPLICATE KEY UPDATE
        consumption_count = consumption_count + VALUES(consumption_count);
    
    SELECT 'Semana guardada exitosamente' AS mensaje, v_history_id AS history_id;
END //

DELIMITER ;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

DELIMITER //

-- Trigger: Actualizar fecha de modificación en empleados
CREATE TRIGGER trg_empleados_before_update
BEFORE UPDATE ON empleados
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END //

-- Trigger: Validar PIN de 4 dígitos
CREATE TRIGGER trg_empleados_validate_pin
BEFORE INSERT ON empleados
FOR EACH ROW
BEGIN
    IF NEW.pin IS NOT NULL AND (LENGTH(NEW.pin) != 4 OR NEW.pin NOT REGEXP '^[0-9]{4}$') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El PIN debe ser de exactamente 4 dígitos numéricos';
    END IF;
END //

CREATE TRIGGER trg_empleados_validate_pin_update
BEFORE UPDATE ON empleados
FOR EACH ROW
BEGIN
    IF NEW.pin IS NOT NULL AND (LENGTH(NEW.pin) != 4 OR NEW.pin NOT REGEXP '^[0-9]{4}$') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El PIN debe ser de exactamente 4 dígitos numéricos';
    END IF;
END //

DELIMITER ;

-- ============================================================================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ============================================================================

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX idx_consumption_week_comedor ON consumption_logs(week_id, comedor_id);
CREATE INDEX idx_employee_comedor_name ON empleados(comedor_id, name);

-- ============================================================================
-- PERMISOS Y USUARIOS (Opcional)
-- ============================================================================

-- Crear usuario para la aplicación (ajustar según necesidades)
-- CREATE USER 'comedor_app'@'localhost' IDENTIFIED BY 'password_seguro';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sistema_comedor.* TO 'comedor_app'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

SELECT 'Base de datos creada exitosamente' AS mensaje;
