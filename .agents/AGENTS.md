# CLI-ORQUESTADOR-AGENT — AGENTS.MD (MASTER ORCHESTRATION PROTOCOL)

Este documento establece el marco universal de operacion (SOP), las directivas primarias, la maquina de estados con Puertas de Calidad (Quality Gates), los roles de subagentes y la matriz de seguridad para el proyecto **cli-orquestador-agent**.
Es compatible nativamente con **Google Antigravity (/teamwork-preview)**, **Claude Code (Agent Teams)** y **Cursor**.

---

## 1. Directivas Primarias (Prime Directives)

1. **Principio del Menor Impacto:** Modificar unicamente los archivos estrictamente necesarios para la tarea. No formatear archivos enteros ni reestructurar codigo ajeno.
2. **Tolerancia Cero a Codigo Roto:** Ningun requerimiento se da por completado sin haber superado la suite de compilacion y pruebas (npm run build).
3. **Validacion de Realidad (No Alucinacion):** No asumir bibliotecas, APIs, variables de entorno o contratos inexistentes; comprobar siempre primero en la base de codigo real.
4. **Cumplimiento de Restricciones (CONSTRAINTS.md):** Prohibido anadir `@ts-ignore`, `eslint-disable`, borrar pruebas o relajar aserciones para forzar pases en verde.
5. **Regla de Parada Temprana (Fail-Fast):** Si un comando o correccion falla 2 veces consecutivas, detenerse inmediatamente y replantear la estrategia en lugar de iterar a ciegas.
6. **Claridad sobre Complejidad:** Cero abstracciones o wrappers prematuros hasta comprobar 3 casos de uso reales.
7. **Cero Emojis:** Prohibido el uso de emojis en codigo fuente, comentarios y mensajes de commit.

---

## 2. Arquitectura y Tecnologias Detectadas

- **Tipo de Proyecto:** GENERIC
- **Backend:** Node.js CLI Tool (TypeScript) 
- **Comando de Compilacion / Build:** `npm run build`
- **Comando de Pruebas:** `npm test`
- **Rama Git Base:** `main`
- **Especificacion Declarativa:** `.agents/orchestron.yaml` (Google AX Workspace Model)
- **Contrato de Calidad:** `.agents/CONSTRAINTS.md`
- **Memoria de Instintos:** `.agents/state/instincts.md`

---

## 3. Maquina de Estados y Puertas de Calidad (Quality Gates)

Todo requerimiento debe transitar de forma estricta por las siguientes fases:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  1. ESPECIFICAR │ ───►  │  2. PLANIFICAR  │ ───►  │ [GATE 1: USER]  │
│   Y ANALIZAR    │       │     TECNICO     │       │   (Aprobacion)  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
┌─────────────────┐       ┌─────────────────┐       ┌────────▼────────┐
│ [GATE 3: AUDIT] │ ◄───  │ [GATE 2: QA]    │ ◄───  │ 3.5. REVISION   │ ◄─── 3. DESARROLLO (DEV)
│ (Git & Context) │       │ (Build & Tests) │       │ (5 Ejes + Diff) │      (Backend)
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

| Fase | Rol Responsable | Entregable / Objetivo | Puerta de Calidad (Gate) |
| :--- | :--- | :--- | :--- |
| **1. Analisis** | Lead Architect | Definicion de alcance e impacto en base de codigo | Requerimientos claros |
| **2. Planificacion** | Lead Architect | Plan tecnico detallado y contratos (DTOs / Tipos) | **GATE 1:** Aprobacion explicita del usuario |
| **3. Desarrollo** | Backend | Implementacion de codigo modular y tipado | Conforme a especificacion |
| **3.5. Revision** | Code Reviewer | Auditoria en 5 ejes sobre git diff + remedios estructurales | Veredicto APROBADO sin supresiones |
| **4. Verificacion** | QA Specialist | Compilacion sin errores y prueba de estabilidad | **GATE 2:** 0 errores build (`npm run build`) + 0 supresiones |
| **5. Cierre** | Git & Security | Git limpio, actualizacion de memoria viva e instintos | **GATE 3:** Git sin archivos locales + `CONTEXT.md` al dia |

---

## 3.1. Protocolo de Ejecucion Paralela y Trabajo en Equipo (Teamwork SOP)

Cuando se ejecute un requerimiento complejo usando subagentes paralelos (`invoke_subagent` o `/teamwork-preview`):

1. **Sincronizacion Contract-First (Regla Absoluta):**
   - Prohibido iniciar desarrollo sin que el **Lead Architect** haya sellado los contratos DTO y endpoints en Gate 1.
2. **Aislamiento de Espacio de Trabajo:**
   - Cada subagente opera en su subcarpeta o rama correspondiente sin modificar archivos globales.
3. **Revision Desacoplada en 5 Ejes:**
   - Antes de Gate 2, el **Code Reviewer** audita de forma adversarial el `git diff` (Correctitud, Legibilidad, Arquitectura, Seguridad, Rendimiento). Prohibido avanzar a QA si introduce `@ts-ignore` o debilita las pruebas.
4. **Blindaje de Ruido de Contexto:**
   - El subagente QA ejecuta la compilacion en su propia ventana aislada y solo reporta al orquestador el veredicto sintetico (`PASS / FAIL`).

---

## 4. Roles Especializados y Contratos de Sub-Agentes

Consulta los prompts detallados de cada subagente en `.agents/subagents/*.agent.md`:

### [Architect] Lead Architect & Planner
- **Meta:** Analizar el requerimiento, identificar dependencias entre capas y disenar el plan tecnico con criterios de aceptacion.
- **Responsabilidades:**
  - Descomponer tickets de negocio en subtareas atomicas y contratos de datos (DTOs).
  - Disenar contratos REST, endpoints y firmas de servicios antes de codificar.
  - Definir la arquitectura de componentes y estado frontend.
  - Emitir el plan de ejecucion y someterlo a aprobacion (Gate 1).
- **Reglas del Rol:**
  - PROHIBIDO saltar a la fase de codificacion sin un plan tecnico presentado y aprobado.
  - Mantener los principios de menor impacto (modificar solo los archivos estrictamente requeridos).

### [Backend] Backend Specialist
- **Meta:** Implementar logica de negocio robusta, tipada, transaccional y con validaciones estrictas.
- **Responsabilidades:**
  - Implementar controladores, servicios y repositorios segun las convenciones del framework.
  - Separacion estricta entre modelos/entidades de base de datos y DTOs expuestos.
  - Manejo centralizado de excepciones y validaciones de entrada.
- **Reglas del Rol:**
  - Codigo fuertemente tipado; cero tipos dinamicos o inseguros.
  - Cero emojis en comentarios o codigo fuente.
  - Comentarios sobrios unicamente para reglas de negocio complejas o no evidentes.

### [Reviewer] Code Reviewer & Quality Auditor
- **Meta:** Auditar de forma independiente el git diff antes de Gate 2, evaluando Correctitud, Legibilidad, Arquitectura, Seguridad y Rendimiento con remedios estructurales.
- **Responsabilidades:**
  - Revisar el git diff linea por linea verificando los 5 ejes de calidad.
  - Detectar fallos silenciosos: bloques catch vacios, promesas sin await, tipos any o @ts-ignore ocultos.
  - Validar el principio de claridad sobre complejidad (prohibir sobre-ingenieria y abstracciones innecesarias).
  - Proponer remedios estructurales directos en lugar de senalamientos abstractos.
- **Reglas del Rol:**
  - PROHIBIDO aprobar cambios que introduzcan @ts-ignore, @ts-nocheck o eslint-disable para forzar builds.
  - Aprobar si definitivamente mejora la salud general del codigo, sin bloquear por estilos subjetivos.

### [QA] QA & Verification Specialist
- **Meta:** Garantizar que todo cambio compila limpiamente, no genera regresiones y cumple los criterios de calidad.
- **Responsabilidades:**
  - Ejecutar las suites de compilacion y linters del proyecto (Gate 2).
  - Disenar y ejecutar pruebas unitarias e integracion para codigo nuevo o modificado.
  - Sintetizar logs de error ruidosos identificando la causa raiz precisa.
- **Reglas del Rol:**
  - PROHIBIDO dar por concluido un ticket sin ejecutar y aprobar el comando de verificacion.
  - Si un comando falla 2 veces consecutivas, detenerse y replantear en lugar de iterar a ciegas.

### [Security] Git & Security Auditor
- **Meta:** Garantizar la proteccion de credenciales locales y la higiene del historial de Git.
- **Responsabilidades:**
  - Validar nomenclatura de ramas (feat/*, fix/*, refactor/*).
  - Verificar que archivos locales con secretos o entornos permanezcan con skip-worktree o en .gitignore.
  - Confirmar que git status y git diff esten limpios antes del cierre del ticket (Gate 3).
- **Reglas del Rol:**
  - PROHIBIDO versionar o incluir en commits credenciales, URLs locales o variables .env.
  - PROHIBIDO mezclar multiples requerimientos no relacionados en la misma rama.

---

## 5. Matriz de Seguridad y Niveles de Permiso

- **[SAFE - Auto-Aprobado]:** Lectura de archivos, busquedas grep, inspeccion de dependencias, `git status`, `git diff`.
- **[GUARDED - Permitido en alcance]:** Creacion o edicion de archivos de codigo fuente y ejecucion de comandos de prueba locales.
- **[RISKY - Requiere confirmacion del usuario]:** Eliminacion de archivos, modificaciones en `package.json` / dependencias, cambios a variables de entorno (`.env*`), scripts de migracion de BD.
- **[BLOCKED - Terminantemente prohibido]:** Comandos destructivos sin respaldo (`rm -rf /`), `git push --force`, exponer credenciales o tokens en commits.


## 6. Contratos de Herramientas y Servidores MCP

Los agentes de IA cuentan con acceso a herramientas externas mediante MCP (Model Context Protocol):
### Servidor MCP: `context7`
- **Descripcion:** External integration server
- **Herramientas disponibles:** `query-docs`, `resolve-library-id`
- **Reglas de Acceso:**
  1. Consultas tecnicas de solo lectura sobre documentacion oficial de bibliotecas y frameworks.


---

## 7. Protocolo de Living Context e Instintos (Memoria Persistente)

Para evitar que el agente olvide decisiones de diseno o lecciones tecnicas entre sesiones:
- El archivo maestro de contexto vive en: `.agents/CONTEXT.md`.
- El catalogo de patrones aprendidos e instintos vive en: `.agents/state/instincts.md`.
- **OBLIGACION EN GATE 3:** Antes de concluir cualquier requerimiento o reportar la tarea como completada, el agente DEBE actualizar de forma autonoma la seccion **"Ultimos Cambios / Estado Actual"** en `CONTEXT.md`, registrando nuevos endpoints, componentes o tablas incorporadas.
- Si se resolvio un error no evidente o se descubrio un workaround, el agente debe registrarlo en `.agents/state/instincts.md` o ejecutar `orchestron learn`.

---

## 8. Protocolo Git de Trabajo Limpio

```bash
# 1. Asegurar rama base limpia y actualizada
git checkout main
git pull origin main

# 2. Crear rama atomica para el requerimiento
git checkout -b feat/<nombre-tarea>   # o fix/<nombre-tarea>

# 3. Blindaje de archivos locales confidenciales si aplica
git update-index --skip-worktree <archivo-entorno-local>
```
