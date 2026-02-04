// Script para generar index-refactored-v2.html con gestión de tipos
const fs = require('fs');

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Registro de Comida - PostgreSQL v2</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.7.77/Tone.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body class="bg-gray-100">
    
    <!-- Botón selector de comedor -->
    <button id="show-comedor-selector-button" class="fixed top-4 left-4 p-3 pr-5 bg-white text-gray-800 rounded-full shadow-lg hover:bg-gray-200 transition-colors z-30 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
        <span id="active-comedor-name" class="font-bold text-sm">Cargando...</span>
    </button>
    
    <!-- Botón Admin -->
    <button id="show-admin-login-button" class="fixed top-4 right-4 p-3 pr-5 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-30 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2v2a2 2 0 01-2 2m-4 0h-2M9 13H7m0 0h-2m2 0a2 2 0 01-2-2v-2a2 2 0 012-2m-4 4h10" />
        </svg>
        <span class="font-bold text-sm">Admin</span>
    </button>

    <!-- Loading Overlay -->
    <div id="loading-overlay" class="fixed inset-0 bg-white z-[200] flex items-center justify-center">
        <div class="text-xl font-bold text-gray-700">Cargando sistema...</div>
    </div>

    <!-- PÁGINA PRINCIPAL: REGISTRO -->
    <div id="main-page" class="page-container flex items-center justify-center p-4 min-h-screen">
        <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
            <img src="https://i.imgur.com/4SmaZVt.png" crossorigin="anonymous" alt="Logo" class="mx-auto h-36 w-auto mb-6">
            <h1 class="text-2xl font-bold text-center text-gray-800 mb-2">Registro de Comida</h1>
            <p class="text-center text-gray-500 mb-6">Busque por nombre o número de empleado</p>
            
            <div class="mb-4 relative text-left">
                <label for="employeeSearch" class="block text-gray-700 text-sm font-bold mb-2">Buscar Empleado:</label>
                <div id="search-results-container" class="absolute bottom-full left-0 right-0 bg-white border mb-1 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto hidden"></div>
                <input type="text" id="employeeSearch" class="shadow-inner appearance-none border-2 border-gray-200 rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Juan Perez o 12345" autocomplete="off">
            </div>

            <button id="submitButton" class="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transform hover:scale-105 transition-transform duration-200">Aceptar</button>
        </div>
    </div>

    <!-- PÁGINA ADMIN -->
    <div id="admin-dashboard-page" class="page-container hidden container mx-auto p-4 space-y-8 mt-24 md:mt-16 lg:mt-12">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-800">Panel de Administración</h1>
            <button id="back-to-main-button" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">Cerrar</button>
        </div>

        <div class="bg-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
            <label for="admin-comedor-selector" class="font-bold text-gray-600 mr-2">Comedor Activo:</label>
            <select id="admin-comedor-selector" class="p-2 border-2 border-gray-200 rounded-lg flex-grow"></select>
        </div>

        <!-- Tabs -->
        <div class="flex flex-wrap border-b border-gray-200">
            <button data-admin-page="gestion" class="admin-nav-button py-2 px-4 font-semibold text-blue-600 border-b-2 border-blue-600">Gestión de Empleados</button>
            <button data-admin-page="consumos" class="admin-nav-button py-2 px-4 font-semibold text-gray-500 hover:text-blue-600">Consumos</button>
            <button data-admin-page="tipos" class="admin-nav-button py-2 px-4 font-semibold text-gray-500 hover:text-blue-600">Tipos</button>
        </div>
        
        <!-- Contenido Admin -->
        <div id="admin-content-container">
            <!-- Gestión de Empleados -->
            <div id="admin-gestion-page">
                <div class="bg-white p-6 rounded-2xl shadow-lg mb-8">
                    <h2 class="text-xl font-bold text-gray-700 mb-4">Gestionar Empleados</h2>
                    
                    <div class="grid md:grid-cols-4 gap-4 mb-6">
                        <input type="number" id="new-employee-id" placeholder="Número (Opcional)" class="p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <input type="text" id="new-employee-name" placeholder="Nombre Completo" class="p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <select id="new-employee-tipo" disabled class="p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100">
                            <option value="">Seleccione tipo...</option>
                        </select>
                        <button id="add-employee-button" class="md:col-span-1 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg">Agregar Empleado</button>
                    </div>
                    
                    <div class="mb-4">
                        <input type="text" id="admin-employee-search" placeholder="Buscar empleado..." class="w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    
                    <div id="admin-table-container" class="overflow-x-auto"></div>
                </div>
            </div>

            <!-- Consumos -->
            <div id="admin-consumos-page" class="hidden">
                <div class="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 class="text-xl font-bold text-gray-700 mb-4">Consumos de la Semana Actual</h2>
                    <div id="current-log-table-container"></div>
                </div>
            </div>

            <!-- Tipos -->
            <div id="admin-tipos-page" class="hidden">
                <div class="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 class="text-xl font-bold text-gray-700 mb-4">Gestionar Tipos de Empleados</h2>
                    
                    <div class="grid md:grid-cols-3 gap-4 mb-6">
                        <input type="text" id="new-tipo-descripcion" placeholder="Descripción del tipo" class="md:col-span-2 p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button id="add-tipo-button" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">Agregar Tipo</button>
                    </div>

                    <div id="tipos-table-container" class="overflow-x-auto"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modales -->
    <div id="confirmation-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50"></div>
    <div id="admin-password-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50"></div>
    <div id="comedor-selector-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50"></div>
    <div id="fullscreen-message-container" class="hidden fixed inset-0 z-50 flex items-center justify-center text-white text-center transition-opacity duration-300"></div>

    <script type="module" src="app-v2.js"></script>
</body>
</html>`;

console.log('📝 Generando index-refactored-v2.html...');
fs.writeFileSync('index-refactored-v2.html', htmlContent, 'utf8');
console.log('✅ Archivo HTML creado');

console.log('\n📝 Ahora generando app-v2.js...');
console.log('⏳ Este archivo contiene todo el JavaScript...\n');
