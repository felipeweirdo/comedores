const { Client } = require('pg');

/**
 * AWS Lambda function to migrate consumption_logs to consumption_histories
 * and consumption_history_details.
 * 
 * Schedule: Every Sunday at 11:00 PM (EventBridge / CloudWatch Events)
 */
exports.handler = async (event) => {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

    const client = new Client(config);
    
    try {
        await client.connect();
        
        // 1. Obtener todos los comedores activos
        const comedoresRes = await client.query('SELECT id FROM comedores');
        const comedores = comedoresRes.rows;
        
        console.log(`Procesando ${comedores.length} comedores...`);
        
        // 2. Obtener el ID de la semana actual (de la cual queremos guardar el historial)
        // Usamos la función de la DB para ser consistentes
        const weekRes = await client.query('SELECT get_week_id(CURRENT_DATE) as week_id');
        const currentWeekId = weekRes.rows[0].week_id;
        
        console.log(`Semana actual a procesar: ${currentWeekId}`);
        
        const results = [];
        
        // 3. Ejecutar el procedimiento almacenado para cada comedor
        for (const comedor of comedores) {
            try {
                const res = await client.query(
                    'SELECT * FROM sp_guardar_semana_historial($1, $2)',
                    [comedor.id, currentWeekId]
                );
                
                const message = res.rows[0].mensaje;
                const historyId = res.rows[0].history_id;
                
                console.log(`Comedor ${comedor.id}: ${message} (History ID: ${historyId})`);
                
                results.push({
                    comedor_id: comedor.id,
                    success: true,
                    message,
                    history_id: historyId
                });
            } catch (err) {
                console.error(`Error procesando comedor ${comedor.id}:`, err.message);
                results.push({
                    comedor_id: comedor.id,
                    success: false,
                    error: err.message
                });
            }
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Migración completada',
                processed_at: new Date().toISOString(),
                week_id: currentWeekId,
                details: results
            })
        };
        
    } catch (error) {
        console.error('Error crítico en la ejecución:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Error interno del servidor en la migración',
                details: error.message
            })
        };
    } finally {
        await client.end();
    }
};
