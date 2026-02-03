// Script para probar la API REST
const API_URL = 'http://localhost:3000/api';

async function testAPI() {
    console.log('🧪 Probando API REST...\n');

    try {
        // 1. Health Check
        console.log('1️⃣  Health Check...');
        const healthResponse = await fetch(`${API_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('   ✅', healthData);
        console.log('');

        // 2. Obtener empresas
        console.log('2️⃣  Obtener empresas...');
        const empresasResponse = await fetch(`${API_URL}/empresas`);
        const empresas = await empresasResponse.json();
        console.log(`   ✅ ${empresas.length} empresas encontradas`);
        console.table(empresas);
        console.log('');

        // 3. Obtener comedores
        console.log('3️⃣  Obtener comedores...');
        const comedoresResponse = await fetch(`${API_URL}/comedores`);
        const comedores = await comedoresResponse.json();
        console.log(`   ✅ ${comedores.length} comedores encontrados`);
        console.table(comedores);
        console.log('');

        // 4. Obtener empleados del primer comedor
        if (comedores.length > 0) {
            const comedorId = comedores[0].comedor_id;
            console.log(`4️⃣  Obtener empleados del comedor "${comedores[0].comedor_nombre}"...`);
            const empleadosResponse = await fetch(`${API_URL}/empleados?comedor_id=${comedorId}`);
            const empleados = await empleadosResponse.json();
            console.log(`   ✅ ${empleados.length} empleados encontrados`);
            if (empleados.length > 0) {
                console.table(empleados.slice(0, 5));
            }
            console.log('');
        }

        // 5. Obtener estadísticas de empresa
        if (empresas.length > 0) {
            const empresaId = empresas[0].id;
            console.log(`5️⃣  Obtener estadísticas de "${empresas[0].nombre}"...`);
            const statsResponse = await fetch(`${API_URL}/empresas/${empresaId}/stats`);
            const stats = await statsResponse.json();
            console.log('   ✅ Estadísticas:');
            console.table([stats]);
            console.log('');
        }

        console.log('✅ ¡Todas las pruebas pasaron!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAPI();
