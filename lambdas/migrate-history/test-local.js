/**
 * Script para probar localmente la función Lambda de migración.
 * Asegúrate de tener las variables de entorno configuradas.
 */
require('dotenv').config({ path: '../../.env' }); // Apunta al .env del proyecto principal

const lambda = require('./index');

async function test() {
    console.log('--- Iniciando prueba local de Lambda ---');
    
    // Simular evento de EventBridge
    const event = {
        source: "aws.events",
        detail: {}
    };
    
    try {
        const response = await lambda.handler(event);
        console.log('Respuesta de Lambda:', JSON.stringify(response, null, 2));
    } catch (error) {
        console.error('La prueba falló:', error);
    }
}

test();
