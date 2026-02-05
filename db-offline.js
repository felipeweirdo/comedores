
const DB_NAME = 'ComedorOfflineDB';
const DB_VERSION = 1;
const STORE_EMPLOYEES = 'employees';
const STORE_CONSUMPTIONS = 'consumptions';

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error opening IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_EMPLOYEES)) {
                db.createObjectStore(STORE_EMPLOYEES, { keyPath: 'internal_id' });
            }
            if (!db.objectStoreNames.contains(STORE_CONSUMPTIONS)) {
                db.createObjectStore(STORE_CONSUMPTIONS, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            console.log('✅ IndexedDB initialized');
            resolve(event.target.result);
        };
    });
}

function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = (event) => reject(event.target.error);
        request.onsuccess = (event) => resolve(event.target.result);
    });
}

export async function saveEmployees(employees) {
    if (!employees || !Array.isArray(employees)) return;
    const db = await getDB();
    const tx = db.transaction(STORE_EMPLOYEES, 'readwrite');
    const store = tx.objectStore(STORE_EMPLOYEES);

    // Clear old data first? Or merge? better clear to keep in sync
    await new Promise((resolve, reject) => {
        const clearReq = store.clear();
        clearReq.onsuccess = resolve;
        clearReq.onerror = reject;
    });

    for (const emp of employees) {
        store.put(emp);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            console.log(`💾 Saved ${employees.length} employees to offline DB`);
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

export async function getEmployees() {
    const db = await getDB();
    const tx = db.transaction(STORE_EMPLOYEES, 'readonly');
    const store = tx.objectStore(STORE_EMPLOYEES);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveConsumption(consumption) {
    const db = await getDB();
    const tx = db.transaction(STORE_CONSUMPTIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONSUMPTIONS);

    store.add({
        ...consumption,
        timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            console.log('📦 Consumption saved offline');
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    });
}

export async function getPendingConsumptions() {
    const db = await getDB();
    const tx = db.transaction(STORE_CONSUMPTIONS, 'readonly');
    const store = tx.objectStore(STORE_CONSUMPTIONS);

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function deleteConsumption(id) {
    const db = await getDB();
    const tx = db.transaction(STORE_CONSUMPTIONS, 'readwrite');
    const store = tx.objectStore(STORE_CONSUMPTIONS);

    store.delete(id);

    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}
