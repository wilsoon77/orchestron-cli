# ORCHESTRON CLI

> **Autonomous AI Agent Team, Quality Gates & Living Context Orchestrator for Antigravity, Claude Code & Cursor.**

```text
         ██████          
       ████  ████        O R C H E S T R O N
      ████    ████       Autonomous Multi-Agent Architecture
      ████ ██ ████       Quality Gates & Living Context System
      ████    ████       v1.0.0 · Antigravity / Claude Code / Cursor
       ████  ████        
         ██████          
  ──────────────────────────────────────────────────────────────────────────
```

---

## Que es Orchestron?

**Orchestron** es una herramienta CLI interactiva disenada para transformar tu asistente de IA (como **Google Antigravity**, **Claude Code** o **Cursor**) en un **equipo estructurado de ingenieria de software**, aplicando **Puertas de Calidad (Quality Gates)**, roles de subagentes especializados y un protocolo autonomo de **Living Context**.

### Caracteristicas Principales:
1. **Consola Interactiva con Comandos con Diagonal (`/`):** Al ejecutar `orchestron` sin argumentos, se abre el Command Palette con autocompletado y atajos de teclado rápidos (`/init`, `/status`, `/doctor`, etc.).
2. **Autocompletado nativo con `[TAB]` en PowerShell:** Escribe `orchestron in[TAB]` y tu terminal autocompleta los comandos al instante.
3. **Soporte para Proyectos Nuevos (Greenfield) y Existentes:**
   - Si tu proyecto ya tiene código, auto-detecta tu stack y servidores MCP.
   - Si la carpeta está vacía, el wizard interactivo te hace preguntas guiadas para definir la arquitectura desde cero.

---

## Inicio Rapido (Quickstart)

### Abrir la consola interactiva con comandos con diagonal (`/`):
```bash
orchestron
# o
orchestron menu
```

### Ejecutar comandos directamente:
```bash
orchestron init
orchestron status
orchestron doctor
orchestron add-role
orchestron sync
```

### Activar el autocompletado con `[TAB]` en PowerShell:
```bash
orchestron completion --install
```

---

## Paleta de Comandos con Diagonal y Atajos de Teclado

Cuando ejecutas `orchestron`, accedes a la consola rápida con comandos con diagonal y teclas directas:

| Comando con Diagonal | Atajo de Tecla | Descripcion |
| :--- | :---: | :--- |
| `/init` | `i` | Inicializar o reconfigurar la arquitectura en `.agents/` |
| `/status` | `s` | Ver el dashboard de estado de agentes y memoria viva |
| `/doctor` | `d` | Auditar salud, presupuesto de contexto (< 24 KB) y Git |
| `/add-role` | `a` | Sumar nuevos roles especializados (DevOps, Mobile, Custom) |
| `/sync` | `c` | Registrar rapidamente un hito o cambio en `CONTEXT.md` |
| `/completion` | `t` | Instalar autocompletado nativo con `[TAB]` en tu terminal |
| `/exit` | `q` | Salir de la consola de Orchestron |

---

## Arquitectura Generada (Encapsulamiento Limpio)

Todo el ecosistema de orquestacion queda ordenado dentro de `.agents/` para no ensuciar la raiz de tu proyecto:

```text
mi-proyecto/
├── .agents/                          # CARPETA CONTENEDORA DE GOBERNANZA
│   ├── AGENTS.md                     # Contrato Maestro Universal (Directivas, Roles, Gates, Permisos)
│   ├── CONTEXT.md                    # Living Context (Memoria viva del dominio y bitacora)
│   ├── rules/                        # Reglas modulares JIT (cargadas bajo demanda)
│   │   ├── backend.md                # Convenciones de API, DTOs, Controllers
│   │   ├── frontend.md               # Componentes, estilos y manejo de estados
│   │   ├── database.md               # Reglas de persistencia, scripts SQL y MCPs
│   │   └── security.md               # Blindaje de variables .env y skip-worktree
│   └── state/                        # Memoria efimera
│       └── scratchpad.md             # Notas volatiles de la tarea en curso
│
├── AGENTS.md                         # Puntero raiz liviano (Compatibilidad universal)
└── CLAUDE.md                         # Puntero para Claude Code (Opcional)
```

---

## Maquina de Estados y Puertas de Calidad (Quality Gates)

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  1. ESPECIFICAR │ ───►  │  2. PLANIFICAR  │ ───►  │ [GATE 1: USER]  │
│   Y ANALIZAR    │       │     TECNICO     │       │   (Aprobacion)  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
┌─────────────────┐       ┌─────────────────┐                │
│ [GATE 3: AUDIT] │ ◄───  │ [GATE 2: QA]    │ ◄───  3. DESARROLLO (DEV)
│ (Git & Context) │       │  (Compilacion)  │
└─────────────────┘       └─────────────────┘
```

1. **Gate 1 (Aprobacion del Usuario):** El `Lead Architect` disena el plan tecnico y contratos (DTOs). El agente no puede codificar sin aprobacion explicita.
2. **Gate 2 (Compilacion & QA):** El agente debe ejecutar el comando de build/test (`npm run build`, `mvn test-compile`, etc.) y garantizar **0 errores de compilacion**.
3. **Gate 3 (Auditoria Git & Living Context):** Git limpio sin archivos locales privados expuestos, y **actualizacion obligatoria de `CONTEXT.md`** registrando los nuevos componentes o endpoints.

---

## Licencia
MIT
