# Informe de Auditoria Arquitectonica, Calidad de Codigo y Benchmarking Competitivo: Orchestron CLI

El presente documento expone una auditoria tecnica exhaustiva del proyecto **Orchestron CLI** (`v1.0.0` / `v1.1.0`), evaluando su arquitectura interna, la calidad y seguridad de su implementacion en TypeScript, la ergonomia de su interfaz de linea de comandos (TUI/CLI) y la compatibilidad real de los artefactos que genera frente a los motores de agentes lideres de la industria. Asimismo, se establece una comparativa estructural profunda frente a [Claude Code](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Foverview), [Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fsubagents%2F), [Everything Claude Code (ECC)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc), [Cursor Rules](https://www.google.com/search?q=https%3A%2F%2Fcursor.com%2Fdocs%2Frules), [GitHub Spec Kit](https://www.google.com/search?q=https%3A%2F%2Fgithub.github.com%2Fspec-kit%2F), [BMAD-Method](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbmad-code-org%2Fbmad-method) y el estandar abierto [AGENTS.md](https://www.google.com/search?q=https%3A%2F%2Fagents.md%2F).

---

## 1. Diagnostico Arquitectonico y Posicionamiento de Orchestron CLI

El analisis del codigo fuente revela que **Orchestron CLI** opera como un **meta-orquestador y generador de gobernanza declarativa** (Scaffolder & Governance Linter) para entornos de desarrollo asistidos por inteligencia artificial. A diferencia de un runtime de ejecucion directa que gestiona el bucle de inferencia del modelo (como el binario principal de Claude Code o Antigravity CLI), Orchestron actua en la capa de ingenieria de contexto (*Context Engineering*) y aseguramiento de calidad (*Quality Gates*). Su proposito central consiste en inspeccionar un repositorio local (o guiar la creacion de uno desde cero mediante un asistente interactivo) para inyectar un sistema estructurado de contratos, roles de subagentes, reglas modulares y memoria persistente dentro del directorio encapsulado `.agents/`.

La propuesta de valor arquitectonica de Orchestron destaca por sintetizar en una sola herramienta cuatro corrientes modernas del desarrollo asistido por agentes:

1. **Maquina de Estados con Puertas de Calidad (Quality Gates 1, 2, 3 y Fase 3.5):** Impone un flujo secuencial y auditable que separa la planificacion contractual (*Contract-First* en Gate 1), la implementacion paralela por capas, la revision adversarial en cinco ejes sobre el `git diff` (Fase 3.5), la compilacion con aislamiento de ruido (*Noise Shielding* en Gate 2) y la higiene del repositorio junto con la actualizacion de memoria viva (Gate 3).
2. **Constraint-Driven Development (`CONSTRAINTS.md`):** Incorpora un piso mecanico de calidad innegociable que prohibe explicitamente la degradacion silenciosa del codigo por parte de los LLMs (como insertar `@ts-ignore`, `@ts-nocheck`, `eslint-disable` o desactivar pruebas con `.skip()`), complementado con una politica de trinquete (*Ratchet Policy*) y presupuestos de rendimiento web (*WebPerf*).
3. **Memoria Persistente Dual (`CONTEXT.md` e `instincts.md`):** Desacopla el estado arquitectonico y de dominio del negocio (`CONTEXT.md`) del catalogo de patrones de depuracion y peculiaridades operativas aprendidas entre sesiones (`.agents/state/instincts.md`), inspirado directamente en el modelo de aprendizaje continuo de [Everything Claude Code (ECC)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc).
4. **Interfaz TUI Posicional de Alto Contraste (`positionalSelector.ts`):** Extiende las primitivas de `@clack/core` (`SelectPrompt` y `MultiSelectPrompt`) para renderizar un panel de inspeccion en vivo (*Live Inspector Panel*) que actualiza dinamicamente las metas, herramientas permitidas y restricciones de cada subagente a medida que el usuario navega con el cursor.

| Dimension Evaluada | Calificacion Actual | Estado Arquitectonico | Hallazgo Principal |
| :--- | :---: | :--- | :--- |
| **Diseno Conceptual y Gobernanza** | 9.0 / 10 | Solido / Vanguardista | Excelente combinacion de Quality Gates, revision adversarial en 5 ejes, `CONSTRAINTS.md` e `instincts.md`. |
| **Compatibilidad Real Multi-Agente** | 4.5 / 10 | Critico / Desalineado | Los archivos generados en `.agents/subagents/` y `.agents/rules/` carecen del YAML frontmatter obligatorio exigido por [Claude Code](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents), [Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Frules%2F) y [Cursor](https://www.google.com/search?q=https%3A%2F%2Fcursor.com%2Fdocs%2Frules), provocando que los motores los ignoren silenciosamente. |
| **Presupuesto de Contexto y Tokens** | 5.0 / 10 | Riesgo de Truncamiento | El archivo raiz `AGENTS.md` inyecta 31.3 KB mediante directivas `@[...]` (superando el limite de 24 KB de Antigravity) y vuelca cientos de herramientas MCP no filtradas en `.agents/AGENTS.md`. |
| **Calidad de Codigo y Mantenibilidad** | 6.5 / 10 | Deuda Tecnica Media | Duplicacion de catalogos de roles en 4 archivos, mutaciones destructivas de configuracion en `updateCommand`, acoplamiento por busqueda de strings en Markdown y ausencia de tests automatizados. |
| **Seguridad y Robustez Operativa** | 7.0 / 10 | Funcional con Brechas | `doctorCommand` incluye buenas heuristicas estaticas, pero no devuelve codigos de salida (`process.exitCode = 1`) para CI/CD y ejecuta `scanProjectDirectory` con efectos secundarios sobre el sistema de archivos. |
| **Experiencia de Usuario (CLI/TUI)** | 8.0 / 10 | Pulida pero con Fricciones | Excelente selector posicional con vista previa en vivo, aunque la paleta prometida con comandos diagonal (`/`) y atajos de teclado rapidos no captura teclas directas ni filtra por `/` en tiempo real. |

---

## 2. Auditoria de Compatibilidad Real con Motores de Agentes (Hallazgos Criticos P0)

El hallazgo de mayor impacto en la auditoria radica en la brecha entre la **intencion declarada** de compatibilidad universal (con Google Antigravity, Claude Code y Cursor) y las **especificaciones tecnicas estrictas** que estos tres ecosistemas exigen para descubrir y cargar subagentes, reglas modulares y presupuestos de contexto.

### 2.1. Descarte Silencioso de Reglas Modulares en `.agents/rules/*.md`

En `src/generator/templates/rulesTemplates.ts` y `src/commands/addRole.ts`, Orchestron genera archivos Markdown planos dentro de `.agents/rules/` (como `backend.md`, `frontend.md`, `database.md` y `security.md`) comenzando directamente con un encabezado `# Directiva de...` sin bloque YAML frontmatter.

De acuerdo con la documentacion oficial de [Rules en Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Frules%2F), cada archivo `.md` ubicado dentro de `.agents/rules/` **debe comenzar obligatoriamente con un bloque YAML frontmatter** que declare la propiedad `trigger` (`always_on`, `model_decision`, `glob` o `manual`). La especificacion oficial advierte explicitamente que si un archivo en `.agents/rules/*.md` omite el frontmatter o emplea un valor no reconocido, **Antigravity descarta la regla de forma completamente silenciosa**. En consecuencia, ninguna de las reglas modulares generadas actualmente por Orchestron se inyecta en el contexto del agente en Antigravity.

De igual forma, en el ecosistema de [Cursor Rules](https://www.google.com/search?q=https%3A%2F%2Fcursor.com%2Fdocs%2Frules), el antiguo archivo `.cursorrules` ha sido deprecado en favor de archivos `.mdc` dentro de `.cursor/rules/` con frontmatter YAML (`description`, `globs`, `alwaysApply`). Aunque `OrchestronConfig` define la bandera booleana `generateCursorRulesCompat: true` en `src/types/index.ts`, dicha propiedad nunca es leida ni implementada en `src/generator/engine.ts`.

### 2.2. Incompatibilidad de Ruta y Esquema en Subagentes (`.agents/subagents/` vs `.agents/agents/` y `.claude/agents/`)

Orchestron genera los contratos de subagentes en la ruta `.agents/subagents/<rol>.agent.md` (por ejemplo, `.agents/subagents/architect.agent.md`) utilizando unicamente texto Markdown plano sin frontmatter. Al contrastar este diseno con las especificaciones nativas de las plataformas objetivo se identifican dos incompatibilidades estructurales:

1. **En [Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fsubagents%2F):** El motor de descubrimiento automatico busca subagentes personalizados exclusivamente en `.agents/agents/<name>.md` o `.agents/agents/<name>/agent.md` (no en `.agents/subagents/`). Ademas, exige un bloque YAML frontmatter al inicio del archivo con los campos obligatorios `name` y `description`, junto con `tools` (lista de herramientas reales como `view_file`, `replace_file_content`, `grep_search`, `run_command`), `subagent: true`, `mainAgent`, `model` (`inherit`, `flash`, `pro`) y `commandExecutionPolicy` (`sandbox`, `auto`, `off`).
2. **En [Claude Code](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents):** El descubrimiento nativo de subagentes del proyecto escanea el directorio `.claude/agents/<name>.md` (o mediante el flag `--agents`). Asimismo, la especificacion de [Subagentes de Claude Code](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents) establece que cualquier archivo en el directorio de agentes que carezca de YAML frontmatter con los campos requeridos `name` y `description` **es omitido silenciosamente por Claude Code** y tratado como simple documentacion inerte. Ademas, las herramientas en Claude Code deben declararse con sus nombres canonicos en PascalCase (`Read, Grep, Glob, Bash, Edit, Write`).

| Plataforma Objetivo | Ruta Generada por Orchestron | Ruta Oficial Requerida | Frontmatter YAML Requerido | Estado Actual en Orchestron |
| :--- | :--- | :--- | :--- | :--- |
| **Google Antigravity (Subagentes)** | `.agents/subagents/*.agent.md` | `.agents/agents/<name>.md` | `name`, `description`, `tools`, `subagent: true`, `model`, `commandExecutionPolicy` | No descubierto automaticamente (ruta incorrecta y sin YAML). |
| **Google Antigravity (Reglas)** | `.agents/rules/*.md` | `.agents/rules/*.md` | `trigger: model_decision \| glob \| always_on \| manual`, `description`, `globs` | Descartado silenciosamente por carecer de YAML `trigger`. |
| **Claude Code (Subagentes)** | No genera en `.claude/` | `.claude/agents/<name>.md` | `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `isolation` | No soportado nativamente; solo existe texto descriptivo en `AGENTS.md`. |
| **Cursor IDE (Reglas JIT)** | `generateCursorRulesCompat: true` (no implementado) | `.cursor/rules/*.mdc` | `description`, `globs`, `alwaysApply` | Bandera declarada en tipos (`index.ts`) pero sin implementacion en `engine.ts`. |

### 2.3. Desbordamiento Silencioso del Presupuesto de 24 KB por Inlining (`@[...]`) e Inflacion de Tokens MCP

Orchestron incluye en `doctorCommand` una verificacion excelente que comprueba si `.agents/AGENTS.md` supera los 24,000 bytes (`24 KB`). En el propio repositorio de Orchestron, `.agents/AGENTS.md` mide `20,250 bytes` (`19.8 KB`), por lo que `orchestron doctor` reporta `[PASS] Tamano optimo: 19.8 KB / 24 KB`. Sin embargo, existen dos problemas ocultos de ingenieria de contexto:

1. **Expansion en Cascada del Puntero Raiz (`AGENTS.md`):** El archivo `AGENTS.md` en la raiz del proyecto utiliza la sintaxis de inclusion nativa de Antigravity:
   ```markdown
   @[AGENTS](.agents/AGENTS.md)
   @[CONSTRAINTS](.agents/CONSTRAINTS.md)
   @[CONTEXT](.agents/CONTEXT.md)
   @[MANIFEST](.agents/orchestron.yaml)
   ```
   Segun la especificacion de [File includes de Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Frules%2F), la directiva `@[label](path)` **incrusta (inlines) el contenido completo de los archivos referenciados dentro del archivo padre antes de aplicar el limite de truncamiento de 24,000 bytes**. Al sumar los tamanos reales en el proyecto subido (`598 B` de `AGENTS.md` + `20,250 B` de `.agents/AGENTS.md` + `3,368 B` de `CONSTRAINTS.md` + `3,107 B` de `CONTEXT.md` + `3,978 B` de `orchestron.yaml`), el archivo raiz expandido alcanza **31,301 bytes (30.5 KB)**. Esto provoca que Antigravity trunque abruptamente los ultimos `7.3 KB` del contexto (eliminando todo `orchestron.yaml`, todo `CONTEXT.md` y parte de `CONSTRAINTS.md`), además de duplicar el consumo de tokens si Antigravity carga tanto `AGENTS.md` como `.agents/AGENTS.md` al recorrer el arbol de directorios.
2. **Contaminacion del Contexto por Volcado Global de Herramientas MCP (`mcp.ts`):** La funcion `detectAntigravityEnvironment()` en `src/detector/mcp.ts` escanea `~/.gemini/antigravity/mcp` en la maquina del desarrollador e inyecta **todos los servidores MCP globales y cada uno de sus nombres de herramientas** dentro de `.agents/AGENTS.md` y `.agents/orchestron.yaml`. En el propio repositorio de Orchestron (que es una herramienta CLI en Node.js sin base de datos ni interfaz grafica), `.agents/AGENTS.md` contiene **11.5 KB de definiciones de herramientas MCP irrelevantes para el proyecto**, incluyendo mas de 90 herramientas de `mcp-server-neon`, 40 herramientas de `ClickUp`, 30 de `chrome_devtools`, `StitchMCP`, `figma-developer-mcp` y `supabase`, repitiendo ademas exactamente el mismo parrafo de reglas de acceso SQL (`SELECT` / scripts de migracion) diez veces seguidas (incluso para servidores como `chrome_devtools` o `Figma`).

---

## 3. Auditoria de Calidad de Codigo, Diseno Interno y Deuda Tecnica (TypeScript)

El analisis linea por linea de los 23 archivos en `src/` muestra una estructura limpia y legible, pero evidencia problemas de acoplamiento, violaciones al principio *DRY (Don't Repeat Yourself)* y fragilidades en el manejo de estados que deben corregirse para consolidar una arquitectura de grado industrial.

### 3.1. Violacion Severa de DRY: Cuadruple Fuente de Verdad para Roles y Subagentes

El dominio central de Orchestron son sus **Roles y Subagentes**, pero actualmente sus definiciones estan fragmentadas y codificadas de forma estatica (*hardcoded*) en **cuatro ubicaciones distintas**:

1. `src/roles/catalog.ts`: Define `DEFAULT_ROLES` y `EXTENDED_ROLES` (con `id`, `name`, `title`, `icon`, `goal`, `responsibilities`, `rules`).
2. `src/commands/team.ts`: Define `DEFAULT_SUBAGENTS` (con `id`, `name`, `file`, `workspaceMode`, `allowedTools`, `forbiddenActions`, `specialty`, `keyResponsibilities`).
3. `src/generator/templates/manifestTemplate.ts`: Define los diccionarios estaticos `gatewayPoliciesMap` y `subagentsDefMap` con bloques de texto YAML pre-formateados solo para los 7 roles base.
4. `src/generator/engine.ts` y `src/commands/update.ts`: Definen arreglos y mapas manuales (`subagentsDefinitions` y `roleMapping`) que vinculan cada `roleId` con su archivo `.agent.md` y su funcion de plantilla individual (`renderArchitectSubagent`, `renderBackendSubagent`, etc.).

**Impacto directo de este acoplamiento (Bug Funcional en `add-role`):** Cuando un usuario ejecuta `orchestron add-role` y selecciona un rol extendido del catalogo (como `devops-infra`, `mobile-dev` o `data-engineer`) o crea un rol personalizado (`__custom__`), `addRoleCommand` unicamente pega un bloque de texto en `.agents/AGENTS.md` y crea un archivo en `.agents/rules/<id>.md`. **No crea el contrato en `.agents/subagents/<id>.agent.md`, no actualiza `.agents/orchestron.yaml` con politicas de gateway, y el nuevo rol jamas aparece al ejecutar `orchestron team`** (porque `teamCommand` solo lee la constante estatica `DEFAULT_SUBAGENTS`). Asimismo, si posteriormente el usuario ejecuta `orchestron update`, `updateCommand` regenera `.agents/AGENTS.md` desde cero usando `renderAgentsMd(config)`, lo cual **borra permanentemente todos los roles extendidos o personalizados** que el usuario habia agregado mediante `add-role`.

### 3.2. Perdida Silenciosa de Configuracion en `orchestron update`

En `src/commands/update.ts` (lineas 74-96), el comando construye un objeto `OrchestronConfig` con valores fijos (*hardcoded*):
- Fuerza `qualityGatesLevel: 'strict'`, `zeroEmojisInCode: true`, `generateRootPointer: true`, `generateClaudeMdCompat: true` y `fileName: 'CONTEXT.md'`.
- En lugar de leer la configuracion previa del proyecto desde `.agents/orchestron.yaml`, intenta adivinar que roles estaban activos leyendo los nombres de archivos en `.agents/subagents/`, y si detecta mas de un archivo, sobreescribe `.agents/AGENTS.md` y `.agents/orchestron.yaml` con los valores por defecto. Si el usuario habia configurado puertas de calidad en modo `standard` o `autonomous` durante `orchestron init`, o habia desactivado la regla de cero emojis o la generacion de `CLAUDE.md`, `orchestron update` destruye silenciosamente esas preferencias.

### 3.3. Acoplamiento Fragil Basado en `String.includes()` y Mutacion de Texto Markdown

Varios comandos dependen de buscar encabezados literales exactos dentro de archivos Markdown editables por humanos o agentes:
- `src/commands/addRole.ts` (linea 35) filtra los roles disponibles con `!agentsContent.includes(r.name)` e inserta el nuevo rol buscando el string literal `'## 5. Matriz de Seguridad'`.
- `src/commands/sync.ts` (linea 90) y `src/commands/addRole.ts` (linea 149) insertan entradas en `CONTEXT.md` buscando exactamente `'## 5. Bitacora de Estado Vivo (Living Changelog)\n'`.
- `src/commands/learn.ts` (linea 95) inserta instintos buscando encabezados numerados exactos como `'## 1. Patrones de Resolucion de Errores (Error Resolution Patterns)'`.
- `src/commands/status.ts` (linea 43) extrae la ultima actualizacion con la expresion regular `/### \[(.*?)\]/`, lo cual captura cualquier subencabezado H3 con corchetes en cualquier parte del documento si el usuario agrega uno antes de la seccion 5.

### 3.4. Defectos Especificos de Implementacion y Ergonomia CLI

| Archivo y Lineas | Severidad | Descripcion Tecnica del Defecto | Remedio Estructural Recomendado |
| :--- | :---: | :--- | :--- |
| `src/index.ts` (L20) vs `src/ui/banner.ts` (L32) vs `package.json` (L3) | Media | **Desincronizacion de versiones:** `package.json` y `banner.ts` declaran `v1.0.0`, mientras que `src/index.ts` declara `.version('1.1.0')`. | Importar `version` dinamicamente desde `package.json` (o inyectarla en tiempo de compilacion con `tsup` `define`) en una constante unica. |
| `src/detector/stack.ts` (L7-9) | Alta | **Efecto secundario destructivo en lectura:** `scanProjectDirectory(cwd)` ejecuta `if (!fs.existsSync(cwd)) fs.mkdirSync(cwd, { recursive: true })`. Si un usuario pasa una ruta con un error tipografico en `orchestron update -d ./ruta-erronea`, crea carpetas fantasma en disco antes de fallar. |Separar la validacion de existencia del directorio; solo `initCommand` debe ofrecer crear el directorio si no existe. |
| `src/detector/stack.ts` (L68-74 y L157) | Media | **Sobreescritura de tipo de proyecto en Monorepos Node+Java:** En `analyzeNodePackage`, si el `package.json` raiz no tiene frontend ni Express, asigna `stack.type = 'library'`. Luego, en la linea 73, `else if (stack.backend) { stack.type = stack.type === 'generic' ? 'generic' : 'backend'; }`, convirtiendo cualquier libreria en `'backend'`, o ignorando subcarpetas adicionales si hay mas de un servicio backend/frontend. | Evaluar `stack.type` al final con reglas de precedencia claras sin mutarlo prematuramente dentro de `analyzeNodePackage`. |
| `src/commands/palette.ts` (L1, L23-128) | Media | **Incumplimiento de UX prometida en Command Palette:** Importa `readline` (linea 1) sin utilizarlo. Aunque el banner y el README prometen que el usuario puede escribir comandos con diagonal (`/init`, `/doctor`) o presionar atajos rapidos (`i`, `d`, `s`, `q`), `positionalSelect` solo escucha flechas arriba/abajo y Enter. Presionar `q` o escribir `/doctor` no ejecuta ninguna accion. | Extender `SelectPrompt` en `positionalSelector.ts` escuchando eventos `keypress` para filtrar en vivo al escribir `/` o disparar la opcion correspondiente al presionar su tecla de atajo (`badge`/`key`). |
| `src/commands/doctor.ts` (L202-227 y L295-307) | Media | **Falsos negativos en Regex N+1 y ausencia de Exit Code:** La regex `/\.(forEach\|map)\s*\(\s*(async\s*)?\([^)]*\)\s*=>\s*\{[^}]*await\s+/s` falla en cuanto el cuerpo del callback contiene cualquier llave `{}` (como un objeto literal o un `if`) antes del `await` debido a `[^}]*`. Ademas, cuando `hasFails` es `true`, `doctorCommand` no asigna `process.exitCode = 1`, impidiendo su uso como gate real en pipelines CI/CD o Git hooks. | Reemplazar el chequeo N+1 por un analisis por lineas/bloques balanceados o AST ligero, y asignar `if (hasFails) process.exitCode = 1;`. |
| `src/commands/completion.ts` (L128-140) | Baja | **Instalacion fragil de autocompletado en Zsh/macOS:** En Linux/macOS inserta `complete -F _orchestron_completions orchestron` (sintaxis exclusiva de Bash) directamente dentro de `~/.zshrc` sin inicializar `bashcompinit` (`autoload -U +X bashcompinit && bashcompinit`), lo que genera un error `command not found: complete` al abrir una terminal Zsh. | Proveer un script nativo `compdef _orchestron orchestron` para Zsh o incluir la carga condicional de `bashcompinit`. |
| `src/commands/update.ts` (L190-193) | Baja | **Opcion `dryRun` muerta:** La interfaz `UpdateOptions` en `src/types/index.ts` declara `dryRun?: boolean`, pero ni `src/index.ts` expone el flag `--dry-run` ni `updateCommand` lo respeta antes de escribir en disco. | Anadir `.option('--dry-run', ...)` en `index.ts` y condicionar las llamadas a `fs.writeFileSync` en `update.ts`. |
| `package.json` (Dependencias y Scripts) | Media | **Dependencias ociosas, versiones futuras e inexistencia de tests:** `figlet` y `@types/figlet` estan instaladas en `package.json` pero no se usan en ningun archivo. Asimismo, `@types/node: "^26.6.3"` y `typescript: "^7.0.2"` usan rangos no estables, y el proyecto carece de script `"test"` y `"lint"` a pesar de que su propio `.agents/CONSTRAINTS.md` exige `npm test` con 100% de pruebas pasando en Gate 2. | Eliminar `figlet`, configurar `vitest` con pruebas unitarias sobre el generador y detector, y anadir `"test": "vitest run"` en `package.json`. |

---

## 4. Benchmarking Estructural: Comparativa con Claude Code y Proyectos Similares

Para situar a Orchestron CLI en el panorama actual de herramientas de ingenieria asistida por agentes, es fundamental distinguir entre **dos categorias complementarias** de proyectos:

1. **Runtimes de Ejecucion de Agentes (Agent Harnesses / CLI Engines):** Herramientas como [Claude Code](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Foverview) y [Google Antigravity](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fsubagents%2F), que gestionan la sesion del LLM, la ejecucion de herramientas en sandbox, el aislamiento por `git worktree` y los hooks de ciclo de vida.
2. **Frameworks de Orquestacion, Especificacion y Gobernanza (Meta-Frameworks & Context Scaffolders):** Proyectos como [Everything Claude Code (ECC)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc), [GitHub Spec Kit](https://www.google.com/search?q=https%3A%2F%2Fgithub.github.com%2Fspec-kit%2F), [BMAD-Method](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbmad-code-org%2Fbmad-method) y el propio **Orchestron CLI**, los cuales estructuran las instrucciones, subagentes, reglas, hooks y flujos de trabajo para que los runtimes operen con disciplina de ingenieria.

### 4.1. Matriz Comparativa de Arquitectura y Capacidades

| Atributo Estructural | **Orchestron CLI** (Tu Proyecto) | **Claude Code** ([Anthropic](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Foverview)) | **Google Antigravity** ([Google](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fsubagents%2F)) | **Everything Claude Code (ECC)** ([affaan-m/ecc](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc)) | **GitHub Spec Kit** ([github/spec-kit](https://www.google.com/search?q=https%3A%2F%2Fgithub.github.com%2Fspec-kit%2F)) | **BMAD-Method** ([bmad-code-org](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbmad-code-org%2Fbmad-method)) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Naturaleza del Proyecto** | CLI Scaffolder, Governance Linter & Context Manager | Runtime Agéntico Nativo TUI/CLI + SDK | Runtime Agéntico Multihilo IDE + CLI + Sandbox | Harness de Rendimiento, Plugins, Hooks e Instintos | CLI y Plantillas para Spec-Driven Development | Framework Ágil Multi-Agente basado en Roles y Artefactos |
| **Directorio de Gobernanza** | `.agents/` + punteros `AGENTS.md` y `CLAUDE.md` | `.claude/` (`agents/`, `skills/`, `commands/`, `settings.json`) + `CLAUDE.md` | `.agents/` (`agents/`, `rules/`, `skills/`, `rules.json`) + `AGENTS.md` | `.claude/`, `.agents/`, `.cursor/` (Multi-harness plugin) | `.specify/` (`memory/constitution.md`, `specs/`, `templates/`, `scripts/`) | `.bmad-core/` (`agents/`, `tasks/`, `templates/`, `checklists/`, `workflows/`) |
| **Formato de Subagentes** | Markdown plano en `.agents/subagents/*.agent.md` *(Sin frontmatter)* | Markdown con YAML frontmatter en `.claude/agents/*.md` (`name`, `description`, `tools`, `model`, `isolation`) | Markdown con YAML frontmatter en `.agents/agents/*.md` (`name`, `description`, `tools`, `subagent: true`, `model`) | Markdown con YAML frontmatter en `.claude/agents/*.md` (~30 agentes especializados) | Basado en comandos slash (`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`) | Definiciones YAML/Markdown de roles (`Analyst`, `PM`, `Architect`, `Scrum Master`, `Dev`, `QA`) |
| **Aislamiento de Ejecucion Paralela** | Declarado conceptualmente (`workspaceMode: branch` en `orchestron.yaml`) | Nativo mediante `isolation: worktree` en frontmatter y [Agent Teams](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fagent-teams) | Nativo mediante `invoke_subagent` con modos `inherit`, `branch` (worktree) y `share` | Delegado a subagentes de Claude Code y scripts de orquestacion | Secuencial por ramas de feature (`specs/001-feature/`) | Secuencial por transferencia de artefactos (*Document Sharding*) entre agentes |
| **Enforcement de Calidad (Quality Gates)** | **Pasivo / Post-hoc:** Reglas en `AGENTS.md` + auditoria manual con `orchestron doctor` | **Determinista en Tiempo Real:** [Lifecycle Hooks](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fhooks) (`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`) en `settings.json` | **Determinista + Sandbox:** Políticas de ejecucion (`commandExecutionPolicy: sandbox`), Lifecycle Hooks y permisos | **Determinista Activo:** Hooks automaticos + `AgentShield` (102 reglas estaticas de seguridad) | **Basado en Fases:** `constitution.md` + checklists de validacion antes de implementar | **Basado en Checklists:** Plantillas estrictas de `story-dod-checklist` ejecutadas por el agente QA |
| **Sistema de Memoria y Aprendizaje** | **Manual / Asistido:** `CONTEXT.md` (`orchestron sync`) + `instincts.md` (`orchestron learn`) | `CLAUDE.md` + `memory: user \| project \| local` en subagentes + Auto-compaction | `AGENTS.md` + Reglas con `trigger: model_decision` (carga progresiva JIT) | **Automatizado con Scoring:** Extrae instintos de sesiones con puntajes de confianza (`/instinct-status`, `/evolve`) | `memory/constitution.md` + especificaciones versionadas por funcionalidad | Documentos fragmentados (`prd/`, `architecture/`, `stories/`) |
| **Control de Presupuesto de Contexto** | Alerta en `doctor` si `AGENTS.md > 24 KB`, pero carece de carga progresiva real | Alerta si descripciones de subagentes superan 15,000 tokens; `omitClaudeMd: true`; `autoCompactWindow` | Limite duro de `24 KB` por archivo y `20,000 tokens` globales; degradacion automatica a punteros con `model_decision` | Optimización de tokens mediante compresion de prompts y seleccion dinamica de modelos (`haiku`/`sonnet`/`opus`) | Fragmentacion por feature branch para no saturar la ventana de contexto | *Document Sharding* explícito para cargar solo la historia activa |

### 4.2. Analisis Comparativo Profundo por Proyecto Referente

#### A. Comparativa con [Claude Code](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents) y [Agent Teams](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fagent-teams)
Claude Code estructura su extensibilidad en cuatro capas claramente separadas: **Memoria base (`CLAUDE.md`)**, **Skills (`.claude/skills/`)**, **Subagentes (`.claude/agents/*.md`)** y **Hooks deterministas (`.claude/settings.json`)**:
- **Donde Orchestron acierta frente a Claude Code:** Claude Code entrega un lienzo en blanco donde el desarrollador debe disenar desde cero su metodologia de trabajo. Orchestron resuelve el problema del "lienzo en blanco" auto-detectando el stack tecnologico del repositorio y generando de inmediato una metodologia de ingenieria completa (Arquitecto -> Desarrollador -> Revisor en 5 Ejes -> QA -> Seguridad).
- **Lo que Orchestron debe adoptar de Claude Code:**
  1. **De Reglas de Texto a [Hooks Deterministas](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fhooks):** En Orchestron, prohibir `@ts-ignore` o proteger archivos `.env` depende de que el LLM obedezca el texto de `CONSTRAINTS.md` o de que el humano recuerde correr `orchestron doctor`. En Claude Code, esto se garantiza mediante un hook `PreToolUse` o `PostToolUse` en `.claude/settings.json` que ejecuta un comando shell cada vez que el agente invoca `Edit`, `Write` o `Bash`: si el script devuelve un codigo de salida `2`, **Claude Code bloquea fisicamente la accion del agente en tiempo real** y le inyecta el error para que lo corrija. Orchestron puede generar automaticamente `.claude/settings.json` conectando `orchestron doctor --ci` como hook de `PostToolUse` y `Stop`.
  2. **Enrutamiento de Modelos por Rol (`model` y `effort`) y Aislamiento (`isolation: worktree`):** En [Claude Code Subagents](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents), cada archivo `.claude/agents/<rol>.md` especifica en su frontmatter que modelo usar (`haiku` para exploracion rapida/QA, `sonnet` para desarrollo, `opus` para arquitectura), `permissionMode` (`plan`, `acceptEdits`, `default`) e `isolation: worktree`. Orchestron ya tiene este concepto en su manifiesto `orchestron.yaml` (`workspaceMode: "branch"`), pero al no traducirlo al frontmatter nativo de `.claude/agents/*.md` ni `.agents/agents/*.md`, los runtimes no lo ejecutan.

#### B. Comparativa con [Everything Claude Code (ECC)](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc)
El codigo de Orchestron menciona explicitamente haberse inspirado en ECC para `instincts.md` y `AgentShield Lite`. Al comparar ambos repositorios:
- **Similitudes:** Ambos implementan el concepto de memoria de instintos (`instincts.md`) para registrar patrones de error y workarounds, asi como un escaner de seguridad estatico (`doctor.ts` vs `AgentShield`).
- **Diferencias clave:** En [ECC](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc), los instintos no son solo texto estatico agregado manualmente: incluyen un **nivel de confianza numerico (confidence score)**, un alcance (proyecto vs global) y un ciclo de evolucion (`/instinct-status`, `/instinct-import`, `/evolve`) donde varios instintos relacionados se agrupan automaticamente para convertirse en una nueva regla o skill formal. En Orchestron, `orchestron learn` es actualmente un append manual de Markdown sin metadatos estructurados, sin deduplicacion y sin comando para listar, filtrar o promover instintos a `.agents/rules/`.

#### C. Comparativa con [GitHub Spec Kit](https://www.google.com/search?q=https%3A%2F%2Fgithub.github.com%2Fspec-kit%2F) y [BMAD-Method](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbmad-code-org%2Fbmad-method)
Tanto [GitHub Spec Kit](https://www.google.com/search?q=https%3A%2F%2Fgithub.github.com%2Fspec-kit%2F) como [BMAD-Method](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbmad-code-org%2Fbmad-method) atacan el mismo problema central que Orchestron: erradicar el *"vibe coding"* mediante ingenieria guiada por especificaciones (*Spec-Driven Development*):
- **Ventaja competitiva de Orchestron:** Tanto BMAD-Method como Spec Kit suelen generar estructuras de documentos muy pesadas y verbosas que requieren multiples comandos manuales para cada micro-tarea. Orchestron ofrece una experiencia mucho mas agil, con deteccion automatica del stack (Node, Spring Boot, Python, Go, Angular, React, Next.js, Vue), deteccion de dumps SQL y una interfaz TUI rapida.
- **Brecha frente a Spec Kit y BMAD:** Tanto Spec Kit (`.specify/specs/<id>-feature/spec.md`, `plan.md`, `tasks.md`) como BMAD (`.bmad-core/stories/`) **persisten los artefactos del Gate 1 (el plan tecnico y los contratos DTO) en archivos dedicados en disco** antes de pasar a la fase de desarrollo. En Orchestron, el Gate 1 exige que el `Lead Architect` disene los contratos DTO y el plan tecnico, pero **no define una ruta ni plantilla estandar en `.agents/plans/` o `.agents/specs/` donde guardar ese contrato**. Como resultado, cuando los subagentes de `Backend` y `Frontend` se ejecutan en ventanas de contexto aisladas (que por definicion en Antigravity y Claude Code no heredan el historial de chat de la conversacion principal), **no tienen un archivo fisico de contrato que leer**, rompiendo en la practica la promesa de sincronizacion *Contract-First* en ejecuciones paralelas.

---

## 5. Hoja de Ruta y Plan de Accion Priorizado (Puntos de Mejora Concretos)

A continuacion se detallan las mejoras arquitectonicas y de codigo recomendadas para llevar a **Orchestron CLI** a su version `2.0`, organizadas por prioridad de impacto.

### Prioridad P0: Compatibilidad Nativa Real con Antigravity, Claude Code y Cursor

1. **Inyectar YAML Frontmatter Valido en `.agents/rules/*.md` (Antigravity Rules):**
   Modificar `src/generator/templates/rulesTemplates.ts` y `src/commands/addRole.ts` para que toda regla generada incluya el frontmatter obligatorio de [Google Antigravity Rules](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Frules%2F) usando `trigger: glob` o `trigger: model_decision` para habilitar *Progressive Disclosure* (carga bajo demanda sin consumir el presupuesto base de 20,000 tokens):
   ```markdown
   ---
   trigger: glob
   globs: "**/*.ts, **/*.js, **/package.json"
   description: "Convenciones de arquitectura Backend, separacion de capas Controller-Service-Repository, contratos DTO y validacion de errores."
   ---
   # Directiva de Backend: Node.js CLI Tool (TypeScript)
   ...
   ```

2. **Generar Subagentes Nativos con Frontmatter en `.agents/agents/` y `.claude/agents/`:**
   Actualizar `src/generator/templates/subagentsTemplate.ts` y `src/generator/engine.ts` para emitir definiciones de subagentes con frontmatter YAML compatible con [Google Antigravity Custom Subagents](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fsubagents%2F) (en `.agents/agents/<id>.md`) y, cuando `generateClaudeMdCompat` este activo, generar sus equivalentes en `.claude/agents/<id>.md` siguiendo el esquema de [Claude Code Subagents](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents):
   ```markdown
   ---
   name: code-reviewer
   description: "Use this subagent before Gate 2 (QA) to perform an independent 5-axis adversarial review on git diff (Correctness, Readability, Architecture, Security, Performance)."
   tools:
     - view_file
     - grep_search
     - run_command
   subagent: true
   mainAgent: false
   model: pro
   commandExecutionPolicy: sandbox
   ---
   # Subagent Contract: Code Reviewer & Quality Auditor (5-Axis Review)
   ...
   ```

3. **Implementar la Generacion Real de `.cursor/rules/*.mdc`:**
   Conectar la propiedad existente `config.encapsulation.generateCursorRulesCompat` en `src/generator/engine.ts` para exportar las reglas modulares como archivos `.mdc` dentro de `.cursor/rules/` con frontmatter `description`, `globs` y `alwaysApply: false`.

4. **Corregir el Puntero Raiz `AGENTS.md` y Filtrar Servidores MCP por Proyecto:**
   - En el archivo raiz `AGENTS.md`, cambiar las directivas de inlining forzado `@[MANIFEST](.agents/orchestron.yaml)` y `@[CONTEXT](.agents/CONTEXT.md)` por referencias de ruta `@.agents/CONTEXT.md` o dejar que Antigravity cargue nativamente `.agents/AGENTS.md` sin duplicar su contenido en la raiz, garantizando que el archivo expandido nunca supere los `24,000 bytes`.
   - En `src/detector/mcp.ts` y `src/wizard/interactive.ts`, no volcar automaticamente todos los servidores MCP globales de `~/.gemini/antigravity/mcp` en cada proyecto. Filtrar por relevancia con el stack detectado (por ejemplo, incluir `mysql-local` solo si se detecta MySQL, `figma-developer-mcp` solo si hay Frontend) o permitir que el usuario seleccione en el wizard cuales MCPs desea vincular al proyecto actual. Ademas, adaptar las reglas de acceso de cada MCP a su dominio real (no aplicar reglas de `SELECT` SQL a `chrome_devtools` o `Figma`).

### Prioridad P1: Enforcement Determinista (Hooks) y Contratos Fisicos para Trabajo en Paralelo

5. **Generar Hooks Deterministas de Calidad (`.claude/settings.json` y Git Pre-Commit):**
   Incorporar en `orchestron init` la generacion opcional de hooks reales que conviertan a `CONSTRAINTS.md` en una barrera fisica automatica:
   - Para Claude Code (`.claude/settings.json`), configurar un hook `Stop` o `PostToolUse` que ejecute `npx orchestron doctor --ci`, bloqueando al agente si introdujo un `@ts-ignore` o expuso un archivo `.env`.
   - Añadir un subcomando `orchestron hooks --install` que instale un hook ligero en `.git/hooks/pre-commit` ejecutando el *Anti-Degradacion Watcher* y el *AgentShield Lite* de `doctorCommand`.

6. **Materializar el Artefacto de Gate 1 en `.agents/specs/` o `.agents/state/active-contract.md`:**
   Para que el protocolo de trabajo en paralelo (*Teamwork SOP*) funcione cuando `Backend`, `Frontend` y `UI/UX` corren en sesiones o worktrees aislados, el contrato de `architect.agent.md` debe exigir que el Arquitecto guarde el diseno aprobado en Gate 1 en `.agents/state/active-contract.md`, y los prompts de `backend.agent.md`, `frontend.agent.md` y `reviewer.agent.md` deben instruir explicitamente leer `.agents/state/active-contract.md` al iniciar su ejecucion.

### Prioridad P2: Refactorizacion Interna, Calidad de Codigo y Experiencia TUI

7. **Unificar el Registro Maestro de Roles y Subagentes (Single Source of Truth):**
   Consolidar `src/roles/catalog.ts`, `DEFAULT_SUBAGENTS` de `src/commands/team.ts`, `gatewayPoliciesMap` de `manifestTemplate.ts` y las plantillas de `subagentsTemplate.ts` en un unico catalogo tipado `UnifiedRoleDefinition`. De este modo, al ejecutar `orchestron add-role`, el nuevo rol creara automaticamente su archivo `.agent.md`, su regla en `.agents/rules/`, su politica de gateway en `orchestron.yaml` y sera visible en `orchestron team`.

8. **Persistir y Leer `OrchestronConfig` en `orchestron update`:**
   Almacenar la configuracion completa elegida en el wizard dentro de `.agents/orchestron.yaml` (incluyendo `qualityGatesLevel`, `strictGuardrails`, `selectedRoles` y `encapsulation`) y hacer que `updateCommand` parsee ese archivo antes de regenerar las plantillas, respetando los roles personalizados y las preferencias del usuario, e implementando el flag `--dry-run`.

9. **Habilitar Atajos de Teclado Reales y Filtrado con `/` en `positionalSelector.ts`:**
   Aprovechar el listener de teclado de `@clack/core` dentro de `SelectPrompt` para que, en la paleta interactiva (`orchestron menu`), presionar una tecla de atajo (`i`, `u`, `l`, `w`, `s`, `d`, `a`, `c`, `t`, `q`) seleccione o ejecute inmediatamente el comando asociado, cumpliendo lo anunciado en la interfaz y en el `README.md`.

10. **Suite de Pruebas Unitarias con Vitest y Salidas CI en `doctorCommand`:**
    - Configurar `vitest` en `package.json` con pruebas automatizadas para `scanProjectDirectory`, `generateOrchestronFiles`, `updateCommand` y `doctorCommand`.
    - En `src/commands/doctor.ts`, establecer `process.exitCode = 1` cuando existan chequeos en estado `'fail'` y soportar un flag `--json` o `--ci` para integracion con pipelines de integracion continua.

---

## 6. Referencias y Fuentes Consultadas

- [Claude Code — Overview \& Architecture Documentation](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Foverview)
- [Claude Code — Create Custom Subagents \& Frontmatter Specification](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fsub-agents)
- [Claude Code — Orchestrate Teams of Claude Code Sessions (Agent Teams)](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fagent-teams)
- [Claude Code — Automate Actions with Lifecycle Hooks (PreToolUse, PostToolUse, Stop)](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fhooks-guide)
- [Claude Code — Hooks Reference Schema](https://www.google.com/search?q=https%3A%2F%2Fcode.claude.com%2Fdocs%2Fen%2Fhooks)
- [Google Antigravity — Custom Subagents \& Teamwork Specification](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fsubagents%2F)
- [Google Antigravity — Rules, YAML Frontmatter Triggers \& 24 KB Context Budget](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Frules%2F)
- [Google Antigravity — Agent Skills Specification](https://www.google.com/search?q=https%3A%2F%2Fantigravity.google%2Fdocs%2Fskills%2F)
- [Everything Claude Code (ECC) — Agent Harness Performance System \& Instincts](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Faffaan-m%2Fecc)
- [AGENTS.md — Open Standard Specification for Guiding Coding Agents](https://www.google.com/search?q=https%3A%2F%2Fagents.md%2F)
- [Cursor Documentation — Project Rules (.cursor/rules/\*.mdc)](https://www.google.com/search?q=https%3A%2F%2Fcursor.com%2Fdocs%2Frules)
- [GitHub Spec Kit — Toolkit for Spec-Driven Development](https://www.google.com/search?q=https%3A%2F%2Fgithub.github.com%2Fspec-kit%2F)
- [BMAD-Method — Breakthrough Method for Agile AI-Driven Development](https://www.google.com/search?q=https%3A%2F%2Fgithub.com%2Fbmad-code-org%2Fbmad-method)
