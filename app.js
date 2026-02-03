// ===================================================================================
// --- IMPORTACIONES Y CONFIGURACIÓN DE FIREBASE ---
// ===================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs, updateDoc, deleteDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAPx9fSD_5CUdva6tmSvXR6NbFsj-dLgAw",
    authDomain: "gestor-de-platillos.firebaseapp.com",
    projectId: "gestor-de-platillos",
    storageBucket: "gestor-de-platillos.appspot.com",
    messagingSenderId: "243336313047",
    appId: "1:243336313047:web:b341de705b10069d8b5892",
    measurementId: "G-S2M9C969LY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===================================================================================
// --- CONFIGURACIÓN Y ESTADO GLOBAL ---
// ===================================================================================
const ADMIN_PASSWORD = '1560';
const COMEDOR_PASSWORD = 'comedoresadmin';
const INACTIVITY_THRESHOLD_DAYS = 21;

const initialData = {
    comedores: [
        { id: "comedor_principal_01", name: "Comedor Principal", requirePin: true },
        { id: "comedor_secundario_02", name: "Comedor Secundario", requirePin: true }
    ],
    activeComedorId: "comedor_principal_01",
    employeeDBs: {
        "comedor_principal_01": [
            // Datos de empleados del comedor principal...
        ],
        "comedor_secundario_02": [
            // Datos de empleados del comedor secundario...
        ]
    },
    "consumptionLogs": { "comedor_principal_01": {}, "comedor_secundario_02": {} },
    "consumptionHistories": { "comedor_principal_01": [], "comedor_secundario_02": [] }
};

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const displayDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

let appState = {};
let onPasswordSuccess = null;
let audioStarted = false;
let currentAdminPage = 'gestion';

// ===================================================================================
// --- CÓDIGO PARA LA LÓGICA DE TABLETS ---
// ===================================================================================
const tabletIdKey = 'comedor_tablet_id';
let tabletId = localStorage.getItem(tabletIdKey);
if (!tabletId) {
    tabletId = crypto.randomUUID();
    localStorage.setItem(tabletIdKey, tabletId);
}

const tabletConfigRef = doc(db, "tabletConfigs", tabletId);
let tabletConfig = {};

// ===================================================================================
// --- MANEJO DE DATOS (FIREBASE) ---
// ===================================================================================
const dbRef = doc(db, "comedorData", "main");

const saveData = async () => {
    try {
        await setDoc(dbRef, appState);
    } catch (e) {
        console.error("Error saving data to Firebase: ", e);
        showFullscreenMessage(false, 'Error', "No se pudo guardar la información. Revisa la conexión a internet.");
        setTimeout(() => allElements.fullscreenMessageContainer.classList.add('hidden'), 3000);
    }
};

const loadAndListenForData = async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    onSnapshot(dbRef, async (docSnap) => {
        if (docSnap.exists()) {
            appState = docSnap.data();

            appState.comedores.forEach(comedor => {
                if (typeof comedor.requirePin === 'undefined') {
                    comedor.requirePin = true;
                }
            });
            console.log("Datos cargados/actualizados desde Firebase.");
        } else {
            console.log("No hay datos en Firebase. Creando documento inicial...");
            appState = initialData;
            await saveData();
        }

        if (loadingOverlay && loadingOverlay.style.display !== 'none') {
            loadingOverlay.style.display = 'none';
            switchPage('main-page');
        }
        renderAll();
    }, (error) => {
        console.error("Error al escuchar datos de Firebase:", error);
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `<div class="text-center p-4"><h2 class="text-2xl font-bold text-red-600 mb-4">Error de Base de Datos</h2><p class="text-gray-700">No se pudo conectar a Firestore. Revisa las reglas de seguridad en tu consola de Firebase.</p></div>`;
        }
    });
};

const listenForTabletConfig = () => {
    onSnapshot(tabletConfigRef, async (docSnap) => {
        if (docSnap.exists()) {
            tabletConfig = docSnap.data();
            if (tabletConfig.activeComedorId && appState.activeComedorId !== tabletConfig.activeComedorId) {
                appState.activeComedorId = tabletConfig.activeComedorId;
            }
        } else {
            tabletConfig = { activeComedorId: null };
            appState.activeComedorId = null;
            await setDoc(tabletConfigRef, tabletConfig);
        }
        renderAll();
    });
};

// ===================================================================================
// --- ELEMENTOS DEL DOM ---
// ===================================================================================
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

// ===================================================================================
// --- LÓGICA DE SONIDO ---
// ===================================================================================
const successSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
const errorSynth = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 1 } }).toDestination();

const startAudio = () => {
    if (!audioStarted) {
        Tone.start();
        audioStarted = true;
    }
};

// ===================================================================================
// --- FUNCIONES AUXILIARES ---
// ===================================================================================
const generateInternalId = () => Math.random().toString(36).substring(2, 10);

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

// ===================================================================================
// --- FUNCIONES DE RENDERIZADO ---
// ===================================================================================
// (Aquí irían todas las funciones de renderizado como renderAdminTable, renderCurrentLogTable, etc.)
// Por brevedad, se omiten pero están en el código original

// ===================================================================================
// --- INICIALIZACIÓN ---
// ===================================================================================
document.addEventListener('DOMContentLoaded', () => {
    signInAnonymously(auth).then(() => {
        loadAndListenForData();
        listenForTabletConfig();
    }).catch((error) => {
        console.error("Error de autenticación con Firebase: ", error);
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.innerHTML = `<div class="text-center p-4">
                <h2 class="text-2xl font-bold text-red-600 mb-4">Error de Conexión</h2>
                <p class="text-gray-700">No se pudo conectar a la base de datos.</p>
                <p class="text-gray-500 mt-2">Por favor, asegúrate de haber habilitado el "Inicio de sesión anónimo" en tu consola de Firebase.</p>
                <p class="text-gray-500 mt-1">(Authentication -> Sign-in method -> Anónimo -> Habilitar)</p>
            </div>`;
        }
    });
});
