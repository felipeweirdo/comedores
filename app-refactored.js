// ============================================================================
// Sistema de Registro de Comida - JavaScript Refactorizado (PostgreSQL)
// ============================================================================
// Versión: 2.0 - Multi-empresa con API REST
// Sin Firebase - Usando PostgreSQL vía API REST
// ============================================================================

// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Constantes
const ADMIN_PASSWORD = '1560';
const COMEDOR_PASSWORD = 'comedoresadmin';
const INACTIVITY_THRESHOLD_DAYS = 21;

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const displayDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Estado de la aplicación
let appState = {
    empresas: [],
    comedores: [],
    activeEmpresaId: null,
    activeComedorId: null,
    employeeDBs: {},
    consumptionLogs: {},
    consumptionHistories: {},
    tablets: []
};

// Variables globales
let onPasswordSuccess = null;
let audioStarted = false;
let currentAdminPage = 'gestion';

// ID de la tablet (localStorage)
const tabletIdKey = 'comedor_tablet_id';
let tabletId = localStorage.getItem(tabletIdKey);
if (!tabletId) {
    tabletId = crypto.randomUUID();
    localStorage.setItem(tabletIdKey, tabletId);
}

// ============================================================================
// FUNCIONES DE API
// ============================================================================

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showFullscreenMessage(false, 'Error de Conexión', 'No se pudo conectar con el servidor');
        throw error;
    }
}

// Funciones de API específicas
const API = {
    // Empresas
    getEmpresas: () => apiRequest('/empresas'),
    getEmpresa: (id) => apiRequest(`/empresas/${id}`),
    getEmpresaStats: (id) => apiRequest(`/empresas/${id}/stats`),

    // Comedores
    getComedores: (empresaId) => apiRequest(`/comedores${empresaId ? `?empresa_id=${empresaId}` : ''}`),
    getComedor: (id) => apiRequest(`/comedores/${id}`),
    createComedor: (data) => apiRequest('/comedores', { method: 'POST', body: JSON.stringify(data) }),
    updateComedor: (id, data) => apiRequest(`/comedores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteComedor: (id) => apiRequest(`/comedores/${id}`, { method: 'DELETE' }),

    // Empleados
    getEmpleados: (comedorId, search) => {
        let url = '/empleados';
        const params = new URLSearchParams();
        if (comedorId) params.append('comedor_id', comedorId);
        if (search) params.append('search', search);
        if (params.toString()) url += `?${params}`;
        return apiRequest(url);
    },
    getEmpleado: (id) => apiRequest(`/empleados/${id}`),
    createEmpleado: (data) => apiRequest('/empleados', { method: 'POST', body: JSON.stringify(data) }),
    updateEmpleado: (id, data) => apiRequest(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteEmpleado: (id) => apiRequest(`/empleados/${id}`, { method: 'DELETE' }),
    getEmpleadosInactivos: (comedorId) => apiRequest(`/empleados/inactivos/list${comedorId ? `?comedor_id=${comedorId}` : ''}`),

    // Consumos
    registrarConsumo: (data) => apiRequest('/consumos', { method: 'POST', body: JSON.stringify(data) }),
    getConsumosSemanaActual: (comedorId) => apiRequest(`/consumos/semana-actual/${comedorId}`),

    // Tablets
    getTablet: (tabletId) => apiRequest(`/tablets/${tabletId}`),
    saveTablet: (data) => apiRequest('/tablets', { method: 'POST', body: JSON.stringify(data) })
};

// ============================================================================
// ELEMENTOS DEL DOM
// ============================================================================

const allElements = {
    pageContainers: document.querySelectorAll('.page-container'),
    adminComedorSelector: document.getElementById('admin-comedor-selector'),
    mainContentContainer: document.getElementById('main-content-container'),
    employeeSearchInput: document.getElementById('employeeSearch'),
    searchResultsContainer: document.getElementById('search-results-container'),
    submitButton: document.getElementById('submitButton'),
    addEmployeeButton: document.getElementById('add-employee-button'),
    newEmployeeIdInput: document.getElementById('new-employee-id'),
    newEmployeeNameInput: document.getElementById('new-employee-name'),
    newEmployeeType: document.getElementById('new-employee-type'),
    adminTableContainer: document.getElementById('admin-table-container'),
    currentLogTableContainer: document.getElementById('current-log-table-container'),
    historyContainer: document.getElementById('history-container'),
    clearLogButton: document.getElementById('clear-log-button'),
    saveWeekButton: document.getElementById('save-week-button'),
    exportCurrentLogButton: document.getElementById('export-current-log-button'),
    exportHistoryButton: document.getElementById('export-history-button'),
    confirmationModal: document.getElementById('confirmation-modal'),
    adminPasswordModal: document.getElementById('admin-password-modal'),
    comedorPasswordModal: document.getElementById('comedor-password-modal'),
    comedorSelectorModal: document.getElementById('comedor-selector-modal'),
    fullscreenMessageContainer: document.getElementById('fullscreen-message-container'),
    comedoresList: document.getElementById('comedores-list'),
    newComedorNameInput: document.getElementById('new-comedor-name'),
    addComedorButton: document.getElementById('add-comedor-button'),
    currentComedorNameSpan: document.getElementById('current-comedor-name'),
    adminEmployeeSearch: document.getElementById('admin-employee-search'),
    badgeModal: document.getElementById('badge-modal'),
    editEmployeeModal: document.getElementById('edit-employee-modal'),
    csvFileInput: document.getElementById('csv-file-input'),
    importCsvButton: document.getElementById('import-csv-button'),
    importStatusContainer: document.getElementById('import-status-container'),
    consumptionSummary: document.getElementById('consumption-summary'),
    showComedorSelectorButton: document.getElementById('show-comedor-selector-button'),
    activeComedorName: document.getElementById('active-comedor-name'),
    adminNavButtons: document.querySelectorAll('.admin-nav-button'),
    adminGestionPage: document.getElementById('admin-gestion-page'),
    adminConsumosPage: document.getElementById('admin-consumos-page'),
    adminHistorialPage: document.getElementById('admin-historial-page'),
    showAdminLoginButton: document.getElementById('show-admin-login-button'),
    backToMainButton: document.getElementById('back-to-main-button'),
    deleteEmployeeModal: document.getElementById('delete-employee-modal'),
    inactiveEmployeesContainer: document.getElementById('inactive-employees-container'),
    generateBulkBadgesButton: document.getElementById('generate-bulk-badges-button'),
    requirePinToggle: document.getElementById('require-pin-toggle'),
    adminDispositivosPage: document.getElementById('admin-dispositivos-page'),
    devicesContainer: document.getElementById('devices-container'),
    deleteDeviceModal: document.getElementById('delete-device-modal'),
    editDeviceModal: document.getElementById('edit-device-modal'),
    deleteAllDevicesModal: document.getElementById('delete-all-devices-modal'),
    deleteAllDevicesButton: document.getElementById('delete-all-devices-button')
};

// ============================================================================
// LÓGICA DE SONIDO
// ============================================================================

const successSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
}).toDestination();

const errorSynth = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 1 }
}).toDestination();

const startAudio = () => {
    if (!audioStarted) {
        Tone.start();
        audioStarted = true;
    }
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

const generateInternalId = () => crypto.randomUUID();

const getWeekId = (date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
};

const getWeekRange = (date = new Date()) => {
    const monday = new Date(date);
    const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
    const options = { day: 'numeric', month: 'long' };
    const mondayStr = monday.toLocaleDateString('es-MX', options);
    const sundayStr = sunday.toLocaleDateString('es-MX', options);
    return `Semana del Lunes ${mondayStr} al Domingo ${sundayStr}`;
};

// ============================================================================
// CARGA Y GUARDADO DE DATOS
// ============================================================================

async function loadAllData() {
    try {
        showLoadingOverlay(true);

        // Cargar empresas
        appState.empresas = await API.getEmpresas();

        // Si hay empresas, usar la primera por defecto
        if (appState.empresas.length > 0 && !appState.activeEmpresaId) {
            appState.activeEmpresaId = appState.empresas[0].id;
        }

        // Cargar comedores de la empresa activa
        if (appState.activeEmpresaId) {
            appState.comedores = await API.getComedores(appState.activeEmpresaId);
        }

        // Cargar configuración de tablet
        try {
            const tabletConfig = await API.getTablet(tabletId);
            if (tabletConfig && tabletConfig.active_comedor_id) {
                appState.activeComedorId = tabletConfig.active_comedor_id;
            }
        } catch (error) {
            // Si no existe, se creará al seleccionar un comedor
            console.log('Tablet no registrada, se creará al seleccionar comedor');
        }

        // Si no hay comedor activo, usar el primero disponible
        if (!appState.activeComedorId && appState.comedores.length > 0) {
            appState.activeComedorId = appState.comedores[0].comedor_id;
        }

        // Cargar empleados del comedor activo
        if (appState.activeComedorId) {
            const empleados = await API.getEmpleados(appState.activeComedorId);
            appState.employeeDBs[appState.activeComedorId] = empleados;
        }

        showLoadingOverlay(false);
        renderAll();

    } catch (error) {
        console.error('Error cargando datos:', error);
        showLoadingOverlay(false);
        showFullscreenMessage(false, 'Error', 'No se pudieron cargar los datos del sistema');
    }
}

function showLoadingOverlay(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// ============================================================================
// CONTINUARÁ EN EL SIGUIENTE ARCHIVO...
// ============================================================================
// Este archivo es parte 1 de 3. Continúa en app-refactored-part2.js
