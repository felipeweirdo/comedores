-- ============================================================================
-- Migración: Actualizar sp_guardar_semana_historial con limpieza de logs
-- Fecha: 2026-02-06
-- ============================================================================

CREATE OR REPLACE FUNCTION sp_guardar_semana_historial(
    p_comedor_id VARCHAR(50),
    p_week_id VARCHAR(20)
)
RETURNS TABLE(mensaje TEXT, history_id INTEGER) AS $$
DECLARE
    v_history_id INTEGER;
BEGIN
    -- 1. Insertar o actualizar el registro de cabecera en el historial
    INSERT INTO consumption_histories (comedor_id, week_id, save_date)
    VALUES (p_comedor_id, p_week_id, CURRENT_TIMESTAMP)
    ON CONFLICT (comedor_id, week_id)
    DO UPDATE SET 
        save_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_history_id;
    
    -- 2. Eliminar detalles existentes en el historial para evitar duplicados de la misma semana
    DELETE FROM consumption_history_details WHERE history_id = v_history_id;
    
    -- 3. Copiar los detalles de consumo desde logs hacia el historial
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

    -- 4. NUEVO: Limpiar los registros originales de la tabla consumption_logs
    -- Solo llegamos aquí si la inserción anterior fue exitosa
    DELETE FROM consumption_logs
    WHERE comedor_id = p_comedor_id
      AND week_id = p_week_id;
    
    RETURN QUERY SELECT 'Semana guardada y logs limpiados exitosamente'::TEXT, v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Notificación de éxito
DO $$
BEGIN
    RAISE NOTICE '✅ Procedimiento sp_guardar_semana_historial actualizado con lógica de limpieza';
END $$;
