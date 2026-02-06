-- ============================================================================
-- Migración: Agregar catálogo de estados de empleado
-- Fecha: 2026-02-06
-- ============================================================================

-- 1. Crear tabla de catálogo: estados_empleado
CREATE TABLE IF NOT EXISTS estados_empleado (
    id_estado INTEGER PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL
);

-- 2. Insertar valores iniciales
INSERT INTO estados_empleado (id_estado, descripcion) VALUES
(1, 'Activo'),
(2, 'Inactivo'),
(3, 'Incapacidad')
ON CONFLICT (id_estado) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- 3. Modificar tabla empleados para agregar id_estado
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'empleados' AND column_name = 'id_estado'
    ) THEN
        ALTER TABLE empleados ADD COLUMN id_estado INTEGER DEFAULT 1;
        ALTER TABLE empleados ADD CONSTRAINT fk_empleados_estado 
            FOREIGN KEY (id_estado) REFERENCES estados_empleado(id_estado);
        CREATE INDEX idx_empleados_estado ON empleados(id_estado);
    END IF;
END $$;

-- 4. Actualizar vista: v_empleados_completo
-- NOTA: Se usa DROP VIEW para evitar errores de cambio de nombre de columnas en PostgreSQL
DROP VIEW IF EXISTS v_empleados_completo CASCADE;

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
    e.id_estado,
    ee.descripcion AS estado_nombre,
    e.created_at AS fecha_registro
FROM empleados e
JOIN comedores c ON e.comedor_id = c.id
JOIN empresas emp ON c.empresa_id = emp.id
JOIN estados_empleado ee ON e.id_estado = ee.id_estado;

COMMENT ON VIEW v_empleados_completo IS 'Vista completa de empleados incluyendo empresa, comedor y estado actual';

-- 5. Verificación de resultados
DO $$
BEGIN
    RAISE NOTICE '✅ Migración de estados de empleado completada';
    RAISE NOTICE 'Tabla estados_empleado creada y poblada.';
    RAISE NOTICE 'Columna id_estado agregada a empleados con default 1.';
    RAISE NOTICE 'Vista v_empleados_completo actualizada.';
END $$;
