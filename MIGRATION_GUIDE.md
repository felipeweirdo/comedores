# Guía de Migración - Firebase a SQL

Esta guía te ayudará a migrar tu sistema de Firebase (Firestore) a una base de datos SQL (MySQL/MariaDB).

---

## 📋 Tabla de Contenidos

1. [Preparación](#preparación)
2. [Instalación de MySQL](#instalación-de-mysql)
3. [Creación de la Base de Datos](#creación-de-la-base-de-datos)
4. [Script de Migración de Datos](#script-de-migración-de-datos)
5. [Actualización del Frontend](#actualización-del-frontend)
6. [Creación de API REST](#creación-de-api-rest)
7. [Pruebas](#pruebas)
8. [Despliegue](#despliegue)

---

## 1. Preparación

### Requisitos Previos

- Node.js instalado (v14 o superior)
- MySQL o MariaDB instalado
- Acceso a tu proyecto de Firebase
- Backup de tus datos actuales

### Backup de Datos de Firebase

```javascript
// script: backup-firebase.js
const admin = require('firebase-admin');
const fs = require('fs');

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function backupFirestore() {
  const backup = {
    comedorData: null,
    tabletConfigs: []
  };

  // Backup de comedorData
  const comedorDoc = await db.collection('comedorData').doc('main').get();
  if (comedorDoc.exists) {
    backup.comedorData = comedorDoc.data();
  }

  // Backup de tabletConfigs
  const tabletsSnapshot = await db.collection('tabletConfigs').get();
  tabletsSnapshot.forEach(doc => {
    backup.tabletConfigs.push({
      id: doc.id,
      ...doc.data()
    });
  });

  // Guardar en archivo JSON
  fs.writeFileSync(
    'firebase-backup.json',
    JSON.stringify(backup, null, 2)
  );

  console.log('Backup completado: firebase-backup.json');
}

backupFirestore().catch(console.error);
```

Ejecutar:
```bash
npm install firebase-admin
node backup-firebase.js
```

---

## 2. Instalación de MySQL

### Windows

1. Descargar MySQL desde: https://dev.mysql.com/downloads/installer/
2. Ejecutar el instalador
3. Seleccionar "Developer Default"
4. Configurar contraseña de root
5. Completar la instalación

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### macOS

```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

### Verificar Instalación

```bash
mysql --version
mysql -u root -p
```

---

## 3. Creación de la Base de Datos

### Opción A: Usando el Script SQL

```bash
mysql -u root -p < create_database.sql
```

### Opción B: Manualmente

```bash
mysql -u root -p
```

```sql
CREATE DATABASE sistema_comedor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sistema_comedor;
source create_database.sql;
```

### Verificar Creación

```sql
SHOW DATABASES;
USE sistema_comedor;
SHOW TABLES;
DESCRIBE empleados;
```

---

## 4. Script de Migración de Datos

### Instalar Dependencias

```bash
npm install mysql2 dotenv
```

### Crear archivo .env

```env
# .env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=sistema_comedor
DB_PORT=3306
```

### Script de Migración

```javascript
// migrate-firebase-to-sql.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

// Leer backup de Firebase
const firebaseBackup = JSON.parse(fs.readFileSync('firebase-backup.json', 'utf8'));

async function migrate() {
  // Conectar a MySQL
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  console.log('Conectado a MySQL');

  try {
    const data = firebaseBackup.comedorData;

    // 1. Migrar Comedores
    console.log('Migrando comedores...');
    for (const comedor of data.comedores) {
      await connection.execute(
        'INSERT INTO comedores (id, name, require_pin) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
        [comedor.id, comedor.name, comedor.requirePin || true]
      );
    }
    console.log(`✓ ${data.comedores.length} comedores migrados`);

    // 2. Migrar Empleados
    console.log('Migrando empleados...');
    let employeeCount = 0;
    for (const comedorId in data.employeeDBs) {
      const employees = data.employeeDBs[comedorId];
      for (const emp of employees) {
        await connection.execute(
          `INSERT INTO empleados 
           (internal_id, comedor_id, name, number, type, pin, last_active_date) 
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), 
           number = VALUES(number),
           type = VALUES(type),
           pin = VALUES(pin),
           last_active_date = VALUES(last_active_date)`,
          [
            emp.internalId,
            comedorId,
            emp.name,
            emp.number || null,
            emp.type || null,
            emp.pin || null,
            emp.lastActiveDate || null
          ]
        );
        employeeCount++;
      }
    }
    console.log(`✓ ${employeeCount} empleados migrados`);

    // 3. Migrar Consumption Logs
    console.log('Migrando consumption logs...');
    let logCount = 0;
    for (const comedorId in data.consumptionLogs) {
      const logs = data.consumptionLogs[comedorId];
      for (const employeeId in logs) {
        for (const dayName in logs[employeeId]) {
          const count = logs[employeeId][dayName];
          
          // Calcular fecha aproximada basada en el día de la semana
          const today = new Date();
          const dayIndex = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].indexOf(dayName);
          const currentDayIndex = today.getDay();
          const diff = dayIndex - currentDayIndex;
          const consumptionDate = new Date(today);
          consumptionDate.setDate(today.getDate() + diff);
          
          // Calcular week_id
          const monday = new Date(consumptionDate);
          const day = monday.getDay();
          const mondayDiff = monday.getDate() - day + (day === 0 ? -6 : 1);
          monday.setDate(mondayDiff);
          const weekId = `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;

          await connection.execute(
            `INSERT INTO consumption_logs 
             (employee_id, comedor_id, day_name, consumption_count, week_id, consumption_date)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE consumption_count = VALUES(consumption_count)`,
            [
              employeeId,
              comedorId,
              dayName,
              count,
              weekId,
              consumptionDate.toISOString().split('T')[0]
            ]
          );
          logCount++;
        }
      }
    }
    console.log(`✓ ${logCount} consumption logs migrados`);

    // 4. Migrar Consumption Histories
    console.log('Migrando historial...');
    let historyCount = 0;
    for (const comedorId in data.consumptionHistories) {
      const histories = data.consumptionHistories[comedorId];
      for (const history of histories) {
        // Insertar historial
        const [result] = await connection.execute(
          `INSERT INTO consumption_histories (comedor_id, week_id, save_date)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE save_date = VALUES(save_date), id = LAST_INSERT_ID(id)`,
          [comedorId, history.weekId, history.date]
        );
        
        const historyId = result.insertId;

        // Insertar detalles
        for (const employeeId in history.log) {
          for (const dayName in history.log[employeeId]) {
            const count = history.log[employeeId][dayName];
            await connection.execute(
              `INSERT INTO consumption_history_details 
               (history_id, employee_id, day_name, consumption_count)
               VALUES (?, ?, ?, ?)`,
              [historyId, employeeId, dayName, count]
            );
          }
        }
        historyCount++;
      }
    }
    console.log(`✓ ${historyCount} historiales migrados`);

    // 5. Migrar Tablet Configs
    console.log('Migrando configuraciones de tablets...');
    for (const tablet of firebaseBackup.tabletConfigs) {
      await connection.execute(
        `INSERT INTO tablet_configs (tablet_id, active_comedor_id, nickname)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         active_comedor_id = VALUES(active_comedor_id),
         nickname = VALUES(nickname)`,
        [
          tablet.id,
          tablet.activeComedorId || null,
          tablet.nickname || 'Sin sobrenombre'
        ]
      );
    }
    console.log(`✓ ${firebaseBackup.tabletConfigs.length} tablets migradas`);

    console.log('\n✅ Migración completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    await connection.end();
  }
}

migrate();
```

### Ejecutar Migración

```bash
node migrate-firebase-to-sql.js
```

---

## 5. Actualización del Frontend

### Opción A: Mantener Firebase (Híbrido)

Puedes mantener Firebase para sincronización en tiempo real y usar SQL para reportes y análisis.

### Opción B: Migración Completa a API REST

Necesitarás crear una API REST que reemplace las llamadas a Firebase.

---

## 6. Creación de API REST

### Instalar Express

```bash
npm init -y
npm install express mysql2 cors dotenv body-parser
```

### Crear API Básica

```javascript
// server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ============= ENDPOINTS =============

// GET: Obtener todos los comedores
app.get('/api/comedores', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM comedores');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Obtener empleados de un comedor
app.get('/api/comedores/:id/empleados', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM empleados WHERE comedor_id = ? ORDER BY name',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Registrar consumo
app.post('/api/consumos', async (req, res) => {
  const { employee_id, comedor_id, consumption_date } = req.body;
  try {
    await pool.query(
      'CALL sp_registrar_consumo(?, ?, ?)',
      [employee_id, comedor_id, consumption_date]
    );
    res.json({ success: true, message: 'Consumo registrado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Consumos de la semana actual
app.get('/api/comedores/:id/consumos-semana', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'CALL sp_consumos_semana_actual(?)',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Empleados inactivos
app.get('/api/empleados/inactivos', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM v_empleados_inactivos');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Crear empleado
app.post('/api/empleados', async (req, res) => {
  const { internal_id, comedor_id, name, number, type, pin } = req.body;
  try {
    await pool.query(
      `INSERT INTO empleados (internal_id, comedor_id, name, number, type, pin, last_active_date)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [internal_id, comedor_id, name, number || null, type || null, pin || null]
    );
    res.json({ success: true, message: 'Empleado creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Actualizar empleado
app.put('/api/empleados/:id', async (req, res) => {
  const { name, number, type, pin } = req.body;
  try {
    await pool.query(
      'UPDATE empleados SET name = ?, number = ?, type = ?, pin = ? WHERE internal_id = ?',
      [name, number || null, type || null, pin || null, req.params.id]
    );
    res.json({ success: true, message: 'Empleado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Eliminar empleado
app.delete('/api/empleados/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM empleados WHERE internal_id = ?', [req.params.id]);
    res.json({ success: true, message: 'Empleado eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API REST corriendo en http://localhost:${PORT}`);
});
```

### Ejecutar API

```bash
node server.js
```

---

## 7. Pruebas

### Probar Endpoints con cURL

```bash
# Obtener comedores
curl http://localhost:3000/api/comedores

# Obtener empleados de un comedor
curl http://localhost:3000/api/comedores/comedor_principal_01/empleados

# Registrar consumo
curl -X POST http://localhost:3000/api/consumos \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"c7a8b2f1","comedor_id":"comedor_principal_01","consumption_date":"2026-02-03"}'
```

### Probar con Postman

1. Importar colección de endpoints
2. Configurar variables de entorno
3. Ejecutar pruebas

---

## 8. Despliegue

### Opción A: Servidor VPS (DigitalOcean, AWS, etc.)

1. Configurar servidor con MySQL
2. Subir código de la API
3. Configurar Nginx como reverse proxy
4. Usar PM2 para mantener la API corriendo

```bash
npm install -g pm2
pm2 start server.js --name comedor-api
pm2 save
pm2 startup
```

### Opción B: Serverless (AWS Lambda + RDS)

1. Crear base de datos RDS en AWS
2. Desplegar API como Lambda functions
3. Configurar API Gateway

### Opción C: Docker

```dockerfile
# Dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t comedor-api .
docker run -p 3000:3000 comedor-api
```

---

## 📝 Checklist de Migración

- [ ] Backup de datos de Firebase
- [ ] Instalación de MySQL
- [ ] Creación de base de datos
- [ ] Ejecución de script de migración
- [ ] Verificación de datos migrados
- [ ] Creación de API REST
- [ ] Pruebas de endpoints
- [ ] Actualización del frontend
- [ ] Pruebas de integración
- [ ] Despliegue en producción
- [ ] Monitoreo y logs

---

## 🆘 Solución de Problemas

### Error: "Access denied for user"
```bash
mysql -u root -p
CREATE USER 'comedor_app'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON sistema_comedor.* TO 'comedor_app'@'localhost';
FLUSH PRIVILEGES;
```

### Error: "Table doesn't exist"
Verificar que el script SQL se ejecutó correctamente:
```sql
SHOW TABLES;
```

### Error de conexión en la API
Verificar variables de entorno en `.env`

---

## 📚 Recursos Adicionales

- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

**¡Buena suerte con tu migración!** 🚀
