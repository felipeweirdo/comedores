-- ============================================================================
-- Sistema de Registro de Comida - Base de Datos PostgreSQL
-- ============================================================================
-- Autor: Sistema de Comedor
-- Fecha: 2026-02-03
-- Descripción: Script completo para crear la base de datos en PostgreSQL
-- ============================================================================

-- Crear la base de datos (ejecutar como superusuario)
-- CREATE DATABASE sistema_comedor
--     WITH 
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'es_MX.UTF-8'
--     LC_CTYPE = 'es_MX.UTF-8'
--     TEMPLATE = template0;

-- Conectar a la base de datos
\c sistema_comedor;

-- Habilitar extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLA: comedores
-- Descripción: Almacena los diferentes comedores del sistema
-- ============================================================================
CREATE TABLE comedores (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    require_pin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_comedores_name ON comedores(name);

-- Comentarios
COMMENT ON TABLE comedores IS 'Almacena los diferentes comedores del sistema';
COMMENT ON COLUMN comedores.require_pin IS 'Indica si se requiere PIN para registros vía QR';

-- ============================================================================
-- TABLA: empleados
-- Descripción: Almacena información de empleados por comedor
-- ============================================================================
CREATE TABLE empleados (
    internal_id VARCHAR(50) PRIMARY KEY,
    comedor_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    number VARCHAR(50) NULL,
    type VARCHAR(50) NULL,
    pin VARCHAR(4) NULL,
    last_active_date TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_empleados_comedor FOREIGN KEY (comedor_id) 
        REFERENCES comedores(id) ON DELETE CASCADE,
    CONSTRAINT chk_pin_format CHECK (pin IS NULL OR pin ~ '^[0-9]{4}$')
);

-- Índices
CREATE INDEX idx_empleados_comedor ON empleados(comedor_id);
CREATE INDEX idx_empleados_number ON empleados(number);
CREATE INDEX idx_empleados_name ON empleados(name);
CREATE INDEX idx_empleados_last_active ON empleados(last_active_date);
CREATE INDEX idx_empleados_type ON empleados(type);
CREATE INDEX idx_empleados_comedor_name ON empleados(comedor_id, name);

-- Comentarios
COMMENT ON TABLE empleados IS 'Almacena información de empleados por comedor';
COMMENT ON COLUMN empleados.number IS 'Número de empleado (opcional)';
COMMENT ON COLUMN empleados.type IS 'Tipo: Guardias, Limpieza, etc. (solo si no tiene número)';
COMMENT ON COLUMN empleados.pin IS 'PIN de seguridad de 4 dígitos';
COMMENT ON COLUMN empleados.last_active_date IS 'Última fecha de actividad para detectar inactivos';

-- ============================================================================
-- TABLA: consumption_logs
-- Descripción: Registra los consumos diarios de cada empleado
-- ============================================================================
CREATE TABLE consumption_logs (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    comedor_id VARCHAR(50) NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    consumption_count INTEGER DEFAULT 1,
    week_id VARCHAR(20) NOT NULL,
    consumption_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_consumption_employee FOREIGN KEY (employee_id) 
        REFERENCES empleados(internal_id) ON DELETE CASCADE,
    CONSTRAINT fk_consumption_comedor FOREIGN KEY (comedor_id) 
        REFERENCES comedores(id) ON DELETE CASCADE,
    CONSTRAINT uq_consumption UNIQUE (employee_id, comedor_id, consumption_date)
);

-- Índices
CREATE INDEX idx_consumption_employee ON consumption_logs(employee_id);
CREATE INDEX idx_consumption_comedor ON consumption_logs(comedor_id);
CREATE INDEX idx_consumption_week ON consumption_logs(week_id);
CREATE INDEX idx_consumption_date ON consumption_logs(consumption_date);
CREATE INDEX idx_consumption_day_name ON consumption_logs(day_name);
CREATE INDEX idx_consumption_week_comedor ON consumption_logs(week_id, comedor_id);

-- Comentarios
COMMENT ON TABLE consumption_logs IS 'Registra los consumos diarios de cada empleado';
COMMENT ON COLUMN consumption_logs.day_name IS 'Lunes, Martes, Miércoles, etc.';
COMMENT ON COLUMN consumption_logs.consumption_count IS 'Número de consumos en ese día';
COMMENT ON COLUMN consumption_logs.week_id IS 'Formato: YYYY-M-D del lunes de la semana';

-- ============================================================================
-- TABLA: consumption_histories
-- Descripción: Almacena el historial de semanas guardadas
-- ============================================================================
CREATE TABLE consumption_histories (
    id SERIAL PRIMARY KEY,
    comedor_id VARCHAR(50) NOT NULL,
    week_id VARCHAR(20) NOT NULL,
    save_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_comedor FOREIGN KEY (comedor_id) 
        REFERENCES comedores(id) ON DELETE CASCADE,
    CONSTRAINT uq_week_history UNIQUE (comedor_id, week_id)
);

-- Índices
CREATE INDEX idx_history_comedor ON consumption_histories(comedor_id);
CREATE INDEX idx_history_week ON consumption_histories(week_id);
CREATE INDEX idx_history_save_date ON consumption_histories(save_date);

-- Comentarios
COMMENT ON TABLE consumption_histories IS 'Almacena el historial de semanas guardadas';
COMMENT ON COLUMN consumption_histories.week_id IS 'Identificador de la semana guardada';
COMMENT ON COLUMN consumption_histories.save_date IS 'Fecha en que se guardó la semana';

-- ============================================================================
-- TABLA: consumption_history_details
-- Descripción: Detalles de los consumos guardados en el historial
-- ============================================================================
CREATE TABLE consumption_history_details (
    id SERIAL PRIMARY KEY,
    history_id INTEGER NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    day_name VARCHAR(20) NOT NULL,
    consumption_count INTEGER DEFAULT 0,
    CONSTRAINT fk_details_history FOREIGN KEY (history_id) 
        REFERENCES consumption_histories(id) ON DELETE CASCADE,
    CONSTRAINT fk_details_employee FOREIGN KEY (employee_id) 
        REFERENCES empleados(internal_id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_details_history ON consumption_history_details(history_id);
CREATE INDEX idx_details_employee ON consumption_history_details(employee_id);
CREATE INDEX idx_details_day ON consumption_history_details(day_name);

-- Comentarios
COMMENT ON TABLE consumption_history_details IS 'Detalles de los consumos guardados en el historial';

-- ============================================================================
-- TABLA: tablet_configs
-- Descripción: Configuración de tablets/dispositivos del sistema
-- ============================================================================
CREATE TABLE tablet_configs (
    tablet_id VARCHAR(50) PRIMARY KEY,
    active_comedor_id VARCHAR(50) NULL,
    nickname VARCHAR(100) DEFAULT 'Sin sobrenombre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tablet_comedor FOREIGN KEY (active_comedor_id) 
        REFERENCES comedores(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_tablet_comedor ON tablet_configs(active_comedor_id);
CREATE INDEX idx_tablet_nickname ON tablet_configs(nickname);

-- Comentarios
COMMENT ON TABLE tablet_configs IS 'Configuración de tablets/dispositivos del sistema';

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Insertar comedores iniciales
INSERT INTO comedores (id, name, require_pin) VALUES
('comedor_principal_01', 'Comedor Principal', TRUE),
('comedor_secundario_02', 'Comedor Secundario', TRUE);

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para calcular el ID de la semana
CREATE OR REPLACE FUNCTION get_week_id(fecha DATE)
RETURNS VARCHAR(20) AS $$
DECLARE
    monday DATE;
BEGIN
    -- Calcular el lunes de la semana
    monday := fecha - ((EXTRACT(DOW FROM fecha)::INTEGER + 6) % 7);
    RETURN TO_CHAR(monday, 'YYYY-FMMM-FMDD');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función para obtener el nombre del día en español
CREATE OR REPLACE FUNCTION get_day_name_es(fecha DATE)
RETURNS VARCHAR(20) AS $$
BEGIN
    RETURN CASE EXTRACT(DOW FROM fecha)::INTEGER
        WHEN 0 THEN 'Domingo'
        WHEN 1 THEN 'Lunes'
        WHEN 2 THEN 'Martes'
        WHEN 3 THEN 'Miércoles'
        WHEN 4 THEN 'Jueves'
        WHEN 5 THEN 'Viernes'
        WHEN 6 THEN 'Sábado'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
    CURRENT_DATE - e.last_active_date::DATE AS dias_inactivo,
    c.id AS comedor_id,
    c.name AS comedor_nombre,
    e.created_at AS fecha_registro
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id;

COMMENT ON VIEW v_empleados_completo IS 'Vista completa de empleados con información de comedor';

-- Vista: Empleados inactivos (más de 21 días)
CREATE OR REPLACE VIEW v_empleados_inactivos AS
SELECT 
    e.internal_id,
    e.name AS empleado_nombre,
    e.number AS empleado_numero,
    c.name AS comedor_nombre,
    e.last_active_date,
    CURRENT_DATE - e.last_active_date::DATE AS dias_inactivo
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
WHERE e.last_active_date IS NOT NULL
  AND CURRENT_DATE - e.last_active_date::DATE >= 21
ORDER BY dias_inactivo DESC;

COMMENT ON VIEW v_empleados_inactivos IS 'Empleados con más de 21 días de inactividad';

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
GROUP BY cl.week_id, cl.comedor_id, c.name, cl.employee_id, e.name, e.number, cl.day_name
ORDER BY cl.week_id DESC, e.name, cl.day_name;

COMMENT ON VIEW v_consumos_semana IS 'Resumen de consumos agrupados por semana';

-- Vista: Total de consumos por empleado
CREATE OR REPLACE VIEW v_total_consumos_empleado AS
SELECT 
    e.internal_id,
    e.name AS empleado_nombre,
    e.number AS empleado_numero,
    c.name AS comedor_nombre,
    COUNT(DISTINCT cl.consumption_date) AS dias_registrados,
    COALESCE(SUM(cl.consumption_count), 0) AS total_consumos,
    MAX(cl.consumption_date) AS ultimo_consumo
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
LEFT JOIN consumption_logs cl ON e.internal_id = cl.employee_id
GROUP BY e.internal_id, e.name, e.number, c.name
ORDER BY total_consumos DESC;

COMMENT ON VIEW v_total_consumos_empleado IS 'Total de consumos históricos por empleado';

-- ============================================================================
-- FUNCIONES Y PROCEDIMIENTOS ALMACENADOS
-- ============================================================================

-- Procedimiento: Registrar consumo
CREATE OR REPLACE FUNCTION sp_registrar_consumo(
    p_employee_id VARCHAR(50),
    p_comedor_id VARCHAR(50),
    p_consumption_date DATE
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_day_name VARCHAR(20);
    v_week_id VARCHAR(20);
BEGIN
    -- Obtener el nombre del día
    v_day_name := get_day_name_es(p_consumption_date);
    
    -- Calcular week_id
    v_week_id := get_week_id(p_consumption_date);
    
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
    ON CONFLICT (employee_id, comedor_id, consumption_date)
    DO UPDATE SET consumption_count = consumption_logs.consumption_count + 1;
    
    -- Actualizar última fecha de actividad del empleado
    UPDATE empleados
    SET last_active_date = CURRENT_TIMESTAMP
    WHERE internal_id = p_employee_id;
    
    RETURN QUERY SELECT TRUE, 'Consumo registrado exitosamente'::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_registrar_consumo IS 'Registra un nuevo consumo y actualiza la última actividad del empleado';

-- Procedimiento: Obtener consumos de la semana actual
CREATE OR REPLACE FUNCTION sp_consumos_semana_actual(p_comedor_id VARCHAR(50))
RETURNS TABLE(
    empleado_nombre VARCHAR(200),
    empleado_numero VARCHAR(50),
    empleado_tipo VARCHAR(50),
    day_name VARCHAR(20),
    total_consumos BIGINT
) AS $$
DECLARE
    v_week_id VARCHAR(20);
BEGIN
    -- Calcular week_id de la semana actual
    v_week_id := get_week_id(CURRENT_DATE);
    
    RETURN QUERY
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
    GROUP BY e.internal_id, e.name, e.number, e.type, cl.day_name
    ORDER BY e.name, 
             CASE cl.day_name
                 WHEN 'Lunes' THEN 1
                 WHEN 'Martes' THEN 2
                 WHEN 'Miércoles' THEN 3
                 WHEN 'Jueves' THEN 4
                 WHEN 'Viernes' THEN 5
                 WHEN 'Sábado' THEN 6
                 WHEN 'Domingo' THEN 7
             END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_consumos_semana_actual IS 'Obtiene todos los consumos de la semana actual para un comedor';

-- Procedimiento: Guardar semana en historial
CREATE OR REPLACE FUNCTION sp_guardar_semana_historial(
    p_comedor_id VARCHAR(50),
    p_week_id VARCHAR(20)
)
RETURNS TABLE(mensaje TEXT, history_id INTEGER) AS $$
DECLARE
    v_history_id INTEGER;
BEGIN
    -- Insertar o actualizar el registro de historial
    INSERT INTO consumption_histories (comedor_id, week_id, save_date)
    VALUES (p_comedor_id, p_week_id, CURRENT_TIMESTAMP)
    ON CONFLICT (comedor_id, week_id)
    DO UPDATE SET 
        save_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_history_id;
    
    -- Eliminar detalles existentes para evitar duplicados
    DELETE FROM consumption_history_details WHERE history_id = v_history_id;
    
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
    GROUP BY employee_id, day_name;
    
    RETURN QUERY SELECT 'Semana guardada exitosamente'::TEXT, v_history_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sp_guardar_semana_historial IS 'Guarda la semana actual en el historial';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para empleados
CREATE TRIGGER trg_empleados_updated_at
    BEFORE UPDATE ON empleados
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para comedores
CREATE TRIGGER trg_comedores_updated_at
    BEFORE UPDATE ON comedores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para consumption_histories
CREATE TRIGGER trg_histories_updated_at
    BEFORE UPDATE ON consumption_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tablet_configs
CREATE TRIGGER trg_tablets_updated_at
    BEFORE UPDATE ON tablet_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERMISOS Y ROLES (Opcional)
-- ============================================================================

-- Crear rol para la aplicación
-- CREATE ROLE comedor_app WITH LOGIN PASSWORD 'password_seguro';
-- GRANT CONNECT ON DATABASE sistema_comedor TO comedor_app;
-- GRANT USAGE ON SCHEMA public TO comedor_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO comedor_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO comedor_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO comedor_app;

-- ============================================================================
-- CONSULTAS ÚTILES PARA VERIFICACIÓN
-- ============================================================================

-- Verificar tablas creadas
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar vistas
-- SELECT table_name FROM information_schema.views WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar funciones
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' ORDER BY routine_name;

-- Verificar triggers
-- SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' ORDER BY trigger_name;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos creada exitosamente en PostgreSQL';
    RAISE NOTICE 'Tablas: 6 | Vistas: 4 | Funciones: 5 | Triggers: 4';
END $$;
