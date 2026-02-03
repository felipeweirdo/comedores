-- ============================================================================
-- Sistema de Registro de Comida - MULTI-EMPRESA - PostgreSQL
-- ============================================================================
-- Versión: 2.0 (Multi-empresa)
-- Fecha: 2026-02-03
-- ============================================================================

\c comedores;

-- ============================================================================
-- NUEVA TABLA: empresas
-- Descripción: Almacena las diferentes empresas del sistema
-- ============================================================================
CREATE TABLE IF NOT EXISTS empresas (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    logo_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(nombre);
CREATE INDEX IF NOT EXISTS idx_empresas_activa ON empresas(activa);

COMMENT ON TABLE empresas IS 'Almacena las diferentes empresas del sistema';
COMMENT ON COLUMN empresas.activa IS 'Indica si la empresa está activa en el sistema';

-- ============================================================================
-- MODIFICAR TABLA: comedores (agregar empresa_id)
-- ============================================================================
-- Agregar columna empresa_id si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comedores' AND column_name = 'empresa_id'
    ) THEN
        ALTER TABLE comedores ADD COLUMN empresa_id VARCHAR(50);
        ALTER TABLE comedores ADD CONSTRAINT fk_comedores_empresa 
            FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
        CREATE INDEX idx_comedores_empresa ON comedores(empresa_id);
    END IF;
END $$;

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Insertar empresa de ejemplo
INSERT INTO empresas (id, nombre, descripcion, activa) 
VALUES ('empresa_demo_01', 'Empresa Demo', 'Empresa de demostración del sistema', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Actualizar comedores existentes para asignarlos a la empresa demo
UPDATE comedores 
SET empresa_id = 'empresa_demo_01' 
WHERE empresa_id IS NULL;

-- Hacer empresa_id NOT NULL después de asignar valores
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comedores' 
        AND column_name = 'empresa_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE comedores ALTER COLUMN empresa_id SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- VISTAS ACTUALIZADAS
-- ============================================================================

-- Vista: Empleados con información completa (empresa + comedor)
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
    emp.id AS empresa_id,
    emp.nombre AS empresa_nombre,
    e.created_at AS fecha_registro
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
JOIN empresas emp ON c.empresa_id = emp.id;

-- Vista: Comedores con información de empresa
CREATE OR REPLACE VIEW v_comedores_empresa AS
SELECT 
    c.id AS comedor_id,
    c.name AS comedor_nombre,
    c.require_pin,
    emp.id AS empresa_id,
    emp.nombre AS empresa_nombre,
    emp.activa AS empresa_activa,
    c.created_at,
    c.updated_at
FROM comedores c
JOIN empresas emp ON c.empresa_id = emp.id;

-- ============================================================================
-- FUNCIONES ACTUALIZADAS
-- ============================================================================

-- Función: Obtener comedores por empresa
CREATE OR REPLACE FUNCTION sp_get_comedores_by_empresa(p_empresa_id VARCHAR(50))
RETURNS TABLE(
    comedor_id VARCHAR(50),
    comedor_nombre VARCHAR(100),
    require_pin BOOLEAN,
    total_empleados BIGINT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.require_pin,
        COUNT(e.internal_id) AS total_empleados,
        c.created_at
    FROM comedores c
    LEFT JOIN empleados e ON c.id = e.comedor_id
    WHERE c.empresa_id = p_empresa_id
    GROUP BY c.id, c.name, c.require_pin, c.created_at
    ORDER BY c.name;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener estadísticas de empresa
CREATE OR REPLACE FUNCTION sp_get_empresa_stats(p_empresa_id VARCHAR(50))
RETURNS TABLE(
    total_comedores BIGINT,
    total_empleados BIGINT,
    total_consumos_hoy BIGINT,
    total_consumos_semana BIGINT
) AS $$
DECLARE
    v_week_id VARCHAR(20);
BEGIN
    v_week_id := get_week_id(CURRENT_DATE);
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM comedores WHERE empresa_id = p_empresa_id),
        (SELECT COUNT(*) 
         FROM empleados e 
         JOIN comedores c ON e.comedor_id = c.id 
         WHERE c.empresa_id = p_empresa_id),
        (SELECT COALESCE(SUM(consumption_count), 0)
         FROM consumption_logs cl
         JOIN comedores c ON cl.comedor_id = c.id
         WHERE c.empresa_id = p_empresa_id
         AND cl.consumption_date = CURRENT_DATE),
        (SELECT COALESCE(SUM(consumption_count), 0)
         FROM consumption_logs cl
         JOIN comedores c ON cl.comedor_id = c.id
         WHERE c.empresa_id = p_empresa_id
         AND cl.week_id = v_week_id);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER PARA EMPRESAS
-- ============================================================================

CREATE TRIGGER trg_empresas_updated_at
    BEFORE UPDATE ON empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PERMISOS (Opcional)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON empresas TO comedor_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO comedor_app;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migración a multi-empresa completada';
    RAISE NOTICE 'Tablas: empresas (nueva), comedores (actualizada)';
    RAISE NOTICE 'Vistas: v_empleados_completo, v_comedores_empresa';
    RAISE NOTICE 'Funciones: sp_get_comedores_by_empresa, sp_get_empresa_stats';
END $$;

-- Mostrar estructura actualizada
SELECT 
    'empresas' as tabla,
    COUNT(*) as registros
FROM empresas
UNION ALL
SELECT 
    'comedores' as tabla,
    COUNT(*) as registros
FROM comedores;
