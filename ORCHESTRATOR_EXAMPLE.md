# 🧭 CREDIGO - MULTI-AGENT ORCHESTRATION & DEVELOPMENT SPECIFICATION (AGENTS.md)

Este documento establece el marco de operación estándar (SOP - *Standard Operating Procedures*), la máquina de estados, los roles de agentes de IA y la matriz de verificación para el desarrollo del ecosistema **Credigo**.

---

## 1. 🏗️ Arquitectura del Sistema y Directorios

```text
credigo/                                 # Directorio Raíz del Workspace
├── AGENTS.md                            # Estándar universal de contexto para IA
├── ORCHESTRATOR.md                      # Referencia de orquestación y roles
├── PROJECT_CONTEXT.md                   # Diccionario y reglas de dominio del negocio
├── PROJECT_WORKFLOWS.md                 # Catálogo detallado de los 10 flujos operativos
├── dump-prod-202608251533.sql           # Base de datos MySQL / Dump de referencia
│
├── credigoapp-cobros/                   # [FRONTEND] Proyecto Angular 18
│   ├── src/app/                         # Componentes Standalone, servicios, rutas
│   ├── src/environments/                # Entorno protegido localmente (skip-worktree)
│   └── package.json                     # Dependencias (Tailwind CSS, Lucide, ApexCharts)
│
└── credigoapp-cobros-api/               # [BACKEND] Proyecto Spring Boot 3.5
    ├── src/main/java/com/codigogo/      # Controladores, Servicios, Entidades, DTOs
    ├── src/main/resources/              # application.properties / configs
    └── pom.xml                          # Dependencias Maven (Java 21, JPA, MySQL, OAuth2)
```

---

## 2. 🔄 Máquina de Estados y Puertas de Calidad (Quality Gates)

Todo requerimiento sigue un flujo riguroso por fases. **No se avanza a la siguiente fase sin superar la puerta de calidad (Gate):**

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. ESPECIFICAR  │ ───►  │  2. PLANIFICAR  │ ───►  │ [GATE 1: USER]  │ ───►  │    3. RAMAS     │
│   Y ANALIZAR    │       │     TÉCNICO     │       │   (Aprobación)  │       │ (Git Setup)     │
└─────────────────┘       └─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                                                       │
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐                │
│ [GATE 3: AUDIT] │ ◄───  │ [GATE 2: QA]    │ ◄───  │ 4. DESARROLLO   │ ◄──────────────┘
│  (Git Limpio)   │       │  (Compilación)  │       │ (Backend/Front) │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

| Fase | Rol Responsable | Entregable / Objetivo | Puerta de Calidad (Gate) |
| :--- | :--- | :--- | :--- |
| **1. Análisis** | Lead Architect | Definición del alcance e impacto en BD/Backend/Frontend | Claridad de requerimientos |
| **2. Planificación** | Lead Architect | Plan técnico detallado y contratos de datos (DTOs) | **GATE 1:** Aprobación explícita del usuario |
| **3. Setup Git** | Git Auditor | Rama local creada (`feat/...` o `fix/...`) | Rama limpia y aislada |
| **4. Desarrollo** | Backend / Frontend | Implementación de código modular y tipado | Código conforme a especificación |
| **5. Verificación** | QA & Tester | Compilación y validación de tipos / endpoints | **GATE 2:** 0 errores de compilación (`mvn` / `ng`) |
| **6. Cierre** | Git Auditor | `git status` y `git diff` limpios, sin archivos locales | **GATE 3:** 0 archivos privados versionados |

---

## 3. 🤖 Definición de Roles de Sub-Agentes y Contratos (SOP)

### 🎯 Rol 1: Lead Architect & Planner
- **Meta (*Goal*)**: Comprender el requerimiento de negocio, identificar dependencias entre capas y diseñar el plan técnico.
- **Entrada**: Solicitud del usuario + estado del código actual.
- **Salida (*Deliverables*)**:
  - Resumen del requerimiento.
  - Diseño de entidades/DTOs y endpoints REST.
  - Diseño de componentes y vistas frontend.
  - Plan de ejecución paso a paso con criterios de aceptación.

### ☕ Rol 2: Backend Specialist (Spring Boot 3.5 / Java 21)
- **Meta (*Goal*)**: Implementar la lógica de negocio robusta, transaccional y segura en la API.
- **Reglas Técnicas**:
  - Usar Java 21 moderno (records, pattern matching, streams limpios).
  - Seguir patrón Controller -> Service -> Repository.
  - Mantener separación estricta entre Entidades JPA y DTOs.
  - Manejo de excepciones centralizado y validaciones con Spring Validation.

### 🅰️ Rol 3: Frontend Specialist (Angular 18 / TypeScript)
- **Meta (*Goal*)**: Implementar interfaces reactivas, modernas y responsivas.
- **Reglas Técnicas**:
  - Componentes Standalone (Angular 18 moderno).
  - Estilos estructurados con utilidades de Tailwind CSS.
  - Servicios HTTP tipados con RxJS y signals cuando aplique.
  - Manejo de estados de carga (loaders), errores y feedback visual al usuario.

### 🧪 Rol 4: QA & Verification Specialist
- **Meta (*Goal*)**: Certificar que la solución compila, no introduce regresiones y cumple los criterios de aceptación.
- **Matriz de Comandos de Verificación**:
  - **Backend**:
    ```bash
    # En credigoapp-cobros-api
    mvn test-compile
    # o compilación completa:
    mvn clean compile -DskipTests
    ```
  - **Frontend**:
    ```bash
    # En credigoapp-cobros
    npx ng build --configuration development
    ```

### 🛡️ Rol 5: Git & Security Auditor
- **Meta (*Goal*)**: Garantizar la higiene del repositorio y la protección de datos locales.
- **Protocolo de Auditoría**:
  - Validar nombre de rama (`fix/<nombre>`, `feat/<nombre>`, `refactor/<nombre>`).
  - Verificar que `src/environments/environment.ts` permanezca con `skip-worktree`.
  - Confirmar que `git status` no contenga archivos no deseados (`.bat`, `.sql`, `.env`).

---

## 4. 🔒 Guardrails y Restricciones Estrictas (Límites Inviolables)

1. **PROHIBIDO** versionar o incluir en commits credenciales, URLs locales o el archivo `environment.ts`.
2. **PROHIBIDO** modificar la base de datos de producción directamente; cualquier cambio estructural debe documentarse como script de migración SQL.
3. **PROHIBIDO** saltar a la fase de codificación sin un plan técnico presentado y aprobado.
4. **PROHIBIDO** dar por concluido un ticket sin ejecutar la verificación de compilación en Backend y/o Frontend.
5. **PROHIBIDO** mezclar múltiples requerimientos en la misma rama de Git.
6. **ESTILO DE CÓDIGO Y COMENTARIOS**:
   - Comentarios mínimos y estrictamente necesarios; priorizar código limpio y autodocumentado.
   - **0 emojis** en comentarios, commits o código fuente.
   - Solo usar comentarios breves y sobrios para identificar secciones estructurales o reglas de negocio complejas no obvias. Evitar exceso de comentarios redundantes.

---

## 5. 🛠️ Comandos Rápidos de Git

```bash
# Caso A: Requerimiento Estándar desde master
git checkout master
git pull origin master
git checkout -b feat/<nombre-requerimiento>   # o fix/<nombre>

# Caso B: Requerimiento basado en rama de compañero (ej. Sam)
git fetch origin
git checkout -b feat/<nombre-requerimiento> origin/<rama-remota>

# Actualizar cambios del compañero posteriormente:
git fetch origin
git merge origin/<rama-remota>

# Blindaje de archivos locales:
git update-index --skip-worktree <archivo-modificado-local>
```

---

## 6. 🗄️ Acceso a Base de Datos y Servidor MCP MySQL

Los agentes de IA cuentan con herramientas directas para inspeccionar la base de datos:
1. **Servidor MCP MySQL (`mysql-local`)**:
   - Herramienta disponible: `mysql_query` (ejecución de consultas SQL directas en la base de datos local).
   - Uso: Consultar registros reales, comprobar IDs de créditos, validar estados de boletas o auditar payloads de facturas.
2. **Dump de Producción (`dump-prod-*.sql`)**:
   - Referencia estática disponible en la raíz para consultar estructuras DDL, llaves foráneas y datos semilla.
3. **Reglas de Acceso a BD**:
   - Solo ejecutar consultas de lectura (`SELECT`) durante el análisis y planificación.
   - Cualquier modificación estructural debe diseñarse como script de migración versionable.

