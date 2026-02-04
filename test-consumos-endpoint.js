// Script para probar el endpoint de consumos
const API_URL = 'http://localhost:3000/api';

async function testConsumosEndpoint() {
    try {
        console.log('🧪 Probando endpoint de consumos...\n');

        // 1. Obtener comedores
        console.log('1️⃣  Obteniendo comedores...');
        const comedoresResponse = await fetch(`${API_URL}/comedores`);
        const comedores = await comedoresResponse.json();
        console.log(`   ✅ Comedores encontrados: ${comedores.length}\n`);

        if (comedores.length === 0) {
            console.log('   ⚠️  No hay comedores. Crea uno primero.\n');
            return;
        }

        const comedorId = comedores[0].comedor_id;
        console.log(`   Usando comedor: ${comedores[0].comedor_nombre} (${comedorId})\n`);

        // 2. Obtener consumos de la semana actual
        console.log('2️⃣  Obteniendo consumos de la semana actual...');
        const consumosResponse = await fetch(`${API_URL}/consumos/semana-actual/${comedorId}`);
        const consumos = await consumosResponse.json();

        console.log(`   ✅ Consumos encontrados: ${consumos.length}\n`);

        if (consumos.length > 0) {
            console.log('   Datos de consumos:');
            console.table(consumos);
        } else {
            console.log('   ℹ️  No hay consumos registrados esta semana');
            console.log('   💡 Registra algunos consumos desde el frontend\n');
        }

        // 3. Obtener empleados
        console.log('3️⃣  Obteniendo empleados...');
        const empleadosResponse = await fetch(`${API_URL}/empleados?comedor_id=${comedorId}`);
        const empleados = await empleadosResponse.json();
        console.log(`   ✅ Empleados encontrados: ${empleados.length}\n`);

        if (empleados.length > 0) {
            console.log('   Primeros 3 empleados:');
            console.table(empleados.slice(0, 3).map(e => ({
                nombre: e.name,
                numero: e.number || '-',
                id: e.internal_id.substring(0, 8) + '...'
            })));
        }

        console.log('\n✅ ¡Prueba completada!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nAsegúrate de que el servidor esté corriendo: npm start\n');
    }
}

testConsumosEndpoint();
