# Diagrama de Base de Datos - Formato Mermaid

Este archivo contiene el diagrama de la base de datos en formato Mermaid, que puede ser visualizado en GitHub, GitLab, o usando herramientas como Mermaid Live Editor (https://mermaid.live/).

## Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    comedores ||--o{ empleados : "tiene"
    comedores ||--o{ consumption_logs : "registra"
    comedores ||--o{ consumption_histories : "guarda"
    comedores ||--o{ tablet_configs : "asigna"
    empleados ||--o{ consumption_logs : "consume"
    empleados ||--o{ consumption_history_details : "aparece_en"
    consumption_histories ||--o{ consumption_history_details : "contiene"

    comedores {
        varchar id PK "UUID"
        varchar name "Nombre del comedor"
        boolean require_pin "Requiere PIN para QR"
        timestamp created_at "Fecha de creación"
        timestamp updated_at "Última actualización"
    }

    empleados {
        varchar internal_id PK "ID interno único"
        varchar comedor_id FK "Comedor asignado"
        varchar name "Nombre completo"
        varchar number "Número de empleado"
        varchar type "Tipo: Guardias, Limpieza"
        varchar pin "PIN de 4 dígitos"
        timestamp last_active_date "Última actividad"
        timestamp created_at "Fecha de registro"
        timestamp updated_at "Última modificación"
    }

    consumption_logs {
        int id PK "Auto increment"
        varchar employee_id FK "Empleado"
        varchar comedor_id FK "Comedor"
        varchar day_name "Día de la semana"
        int consumption_count "Cantidad de consumos"
        varchar week_id "ID de la semana"
        date consumption_date "Fecha del consumo"
        timestamp created_at "Timestamp del registro"
    }

    consumption_histories {
        int id PK "Auto increment"
        varchar comedor_id FK "Comedor"
        varchar week_id "ID de la semana"
        timestamp save_date "Fecha de guardado"
        timestamp created_at "Creación"
        timestamp updated_at "Actualización"
    }

    consumption_history_details {
        int id PK "Auto increment"
        int history_id FK "Historial padre"
        varchar employee_id FK "Empleado"
        varchar day_name "Día de la semana"
        int consumption_count "Cantidad"
    }

    tablet_configs {
        varchar tablet_id PK "UUID de la tablet"
        varchar active_comedor_id FK "Comedor asignado"
        varchar nickname "Sobrenombre del dispositivo"
        timestamp created_at "Creación"
        timestamp updated_at "Actualización"
    }
```

## Diagrama de Flujo - Registro de Consumo

```mermaid
flowchart TD
    A[Inicio] --> B{¿Búsqueda por QR o Manual?}
    B -->|QR| C[Escanear código QR]
    B -->|Manual| D[Buscar por nombre/número]
    
    C --> E[Encontrar empleado por internal_id]
    D --> F[Buscar empleado en BD]
    
    E --> G{¿Empleado encontrado?}
    F --> G
    
    G -->|No| H[Mostrar error]
    G -->|Sí| I[Mostrar modal de confirmación]
    
    I --> J{¿Usuario confirma?}
    J -->|No| K[Cancelar]
    J -->|Sí| L{¿Requiere PIN?}
    
    L -->|No| M[Registrar consumo]
    L -->|Sí| N{¿Tiene PIN creado?}
    
    N -->|No| O[Crear nuevo PIN]
    N -->|Sí| P[Solicitar PIN]
    
    O --> Q{¿PIN válido - 4 dígitos?}
    Q -->|No| R[Error: PIN inválido]
    Q -->|Sí| S[Guardar PIN]
    
    P --> T{¿PIN correcto?}
    T -->|No| U[Error: PIN incorrecto]
    T -->|Sí| M
    
    S --> M
    M --> V[Actualizar consumption_logs]
    V --> W[Actualizar last_active_date]
    W --> X[Mostrar mensaje de éxito]
    X --> Y[Fin]
    
    H --> Y
    K --> Y
    R --> Y
    U --> Y
```

## Diagrama de Flujo - Guardar Semana en Historial

```mermaid
flowchart TD
    A[Inicio: Guardar Semana] --> B[Solicitar contraseña de admin]
    B --> C{¿Contraseña correcta?}
    
    C -->|No| D[Mostrar error]
    C -->|Sí| E[Obtener consumption_logs de la semana]
    
    E --> F{¿Hay datos?}
    F -->|No| G[Error: No hay datos para guardar]
    F -->|Sí| H[Calcular week_id]
    
    H --> I{¿Ya existe en historial?}
    I -->|No| J[Crear nuevo registro en consumption_histories]
    I -->|Sí| K[Actualizar registro existente]
    
    J --> L[Copiar datos a consumption_history_details]
    K --> M[Actualizar datos en consumption_history_details]
    
    L --> N[Limpiar consumption_logs de la semana]
    M --> N
    
    N --> O[Mostrar mensaje de éxito]
    O --> P[Actualizar vistas]
    P --> Q[Fin]
    
    D --> Q
    G --> Q
```

## Diagrama de Estados - Empleado

```mermaid
stateDiagram-v2
    [*] --> Nuevo: Crear empleado
    Nuevo --> SinPIN: Registro inicial
    SinPIN --> ConPIN: Crear PIN
    ConPIN --> Activo: Primer consumo
    Activo --> Activo: Consumos regulares
    Activo --> Inactivo: +21 días sin actividad
    Inactivo --> Activo: Nuevo consumo
    ConPIN --> SinPIN: Resetear PIN (Admin)
    Activo --> [*]: Eliminar empleado
    Inactivo --> [*]: Eliminar empleado
```

## Diagrama de Componentes - Arquitectura del Sistema

```mermaid
graph TB
    subgraph "Frontend - Navegador"
        A[HTML/Tailwind CSS]
        B[JavaScript/Tone.js]
        C[QR Code Generator]
    end
    
    subgraph "Backend - Firebase"
        D[Firestore Database]
        E[Authentication]
    end
    
    subgraph "Alternativa SQL"
        F[MySQL/MariaDB]
        G[API REST]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    
    G --> F
    B -.Migración.-> G
    
    style D fill:#ff9900
    style E fill:#ff9900
    style F fill:#4479a1
    style G fill:#4479a1
```

## Diagrama de Secuencia - Proceso de Autenticación Admin

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Interfaz
    participant Auth as Sistema Auth
    participant DB as Base de Datos
    
    U->>UI: Click en "Admin"
    UI->>U: Mostrar modal de contraseña
    U->>UI: Ingresar contraseña
    UI->>Auth: Validar contraseña
    
    alt Contraseña correcta
        Auth->>UI: Autenticación exitosa
        UI->>DB: Cargar datos de admin
        DB->>UI: Retornar datos
        UI->>U: Mostrar panel de administración
    else Contraseña incorrecta
        Auth->>UI: Error de autenticación
        UI->>U: Mostrar mensaje de error
        UI->>U: Cerrar modal
    end
```

## Diagrama de Clases - Modelo de Datos (Conceptual)

```mermaid
classDiagram
    class Comedor {
        +String id
        +String name
        +Boolean requirePin
        +DateTime createdAt
        +DateTime updatedAt
        +addEmployee()
        +removeEmployee()
        +getActiveEmployees()
    }
    
    class Empleado {
        +String internalId
        +String comedorId
        +String name
        +String number
        +String type
        +String pin
        +DateTime lastActiveDate
        +createPin()
        +validatePin()
        +resetPin()
        +isInactive()
    }
    
    class ConsumptionLog {
        +Int id
        +String employeeId
        +String comedorId
        +String dayName
        +Int consumptionCount
        +String weekId
        +Date consumptionDate
        +register()
        +getWeekTotal()
    }
    
    class ConsumptionHistory {
        +Int id
        +String comedorId
        +String weekId
        +DateTime saveDate
        +save()
        +export()
        +delete()
    }
    
    class TabletConfig {
        +String tabletId
        +String activeComedorId
        +String nickname
        +assignComedor()
        +updateNickname()
    }
    
    Comedor "1" --> "*" Empleado : tiene
    Comedor "1" --> "*" ConsumptionLog : registra
    Comedor "1" --> "*" ConsumptionHistory : guarda
    Comedor "1" --> "*" TabletConfig : asigna
    Empleado "1" --> "*" ConsumptionLog : consume
```

---

## Cómo Visualizar estos Diagramas

### Opción 1: GitHub/GitLab
Simplemente sube este archivo `.md` a tu repositorio y GitHub/GitLab renderizará automáticamente los diagramas Mermaid.

### Opción 2: Mermaid Live Editor
1. Visita: https://mermaid.live/
2. Copia y pega el código de cualquier diagrama
3. Visualiza y exporta como PNG/SVG

### Opción 3: VS Code
1. Instala la extensión "Markdown Preview Mermaid Support"
2. Abre este archivo en VS Code
3. Presiona `Ctrl+Shift+V` para ver la vista previa

### Opción 4: Herramientas de Documentación
- **Notion**: Soporta bloques de código Mermaid
- **Confluence**: Con plugins de Mermaid
- **Obsidian**: Soporta Mermaid nativamente

---

## Exportar Diagramas

Para exportar estos diagramas como imágenes:

1. **Usando Mermaid CLI:**
```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i database_diagram_mermaid.md -o diagrams/
```

2. **Usando Mermaid Live Editor:**
- Copia el código del diagrama
- Pega en https://mermaid.live/
- Click en "Actions" → "Export PNG" o "Export SVG"

---

## Notas

- Los diagramas Mermaid son texto plano, fáciles de versionar en Git
- Se actualizan automáticamente si cambias el código
- Son responsive y se adaptan al tamaño de la pantalla
- Puedes personalizar colores y estilos con temas de Mermaid
