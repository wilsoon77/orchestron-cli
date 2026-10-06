import { OrchestronConfig } from '../../types/index.js';
import { DEFAULT_ROLES } from '../../roles/catalog.js';

export function renderAgentsMd(config: OrchestronConfig): string {
  const stack = config.stack;
  const roles = DEFAULT_ROLES.filter((r) => config.selectedRoles.includes(r.id));

  // Determine verification commands
  const backendCompile = stack.commands.build || 'npm run build';
  const testCmd = stack.commands.test || 'npm test';

  let mcpSection = '';
  if (stack.detectedMcps && stack.detectedMcps.length > 0) {
    mcpSection = `
## 6. Contratos de Herramientas y Servidores MCP

Los agentes de IA cuentan con acceso a herramientas externas mediante MCP (Model Context Protocol):
${stack.detectedMcps
  .map(
    (mcp) => `
### Servidor MCP: \`${mcp.name}\`
- **Descripcion:** ${mcp.description}
- **Herramientas disponibles:** ${mcp.tools.length > 0 ? mcp.tools.map((t) => `\`${t}\``).join(', ') : 'Acceso habilitado'}
- **Reglas de Acceso:**
  1. Durante la fase de **Analisis y Planificacion**, unicamente ejecutar operaciones de lectura/inspeccion (ej. \`SELECT\` o consultas GET).
  2. Modificaciones estructurales o cambios de esquema deben disenarse primero como scripts de migracion versionables.
`
  )
  .join('')}
`;
  }

  const devRolesNames: string[] = [];
  if (config.selectedRoles.includes('backend-dev')) devRolesNames.push('Backend');
  if (config.selectedRoles.includes('frontend-dev')) devRolesNames.push('Frontend');
  if (config.selectedRoles.includes('ui-ux-specialist')) devRolesNames.push('UI/UX');
  const devRolesLabel = devRolesNames.length > 0 ? devRolesNames.join(' + ') : 'Desarrollo';

  const hasReviewer = config.selectedRoles.includes('code-reviewer');
  const hasUiUx = config.selectedRoles.includes('ui-ux-specialist');
  const qaRoleLabel = hasUiUx ? 'QA & UI/UX Specialist' : 'QA Specialist';
  const gate2Label = hasUiUx
    ? `0 errores build (\`${backendCompile}\`) + 0 overflow + 0 supresiones`
    : `0 errores build (\`${backendCompile}\`) + 0 supresiones`;

  const teamworkSopItems: string[] = [];
  teamworkSopItems.push(
    `1. **Sincronizacion Contract-First (Regla Absoluta):**\n   - Prohibido iniciar desarrollo sin que el **Lead Architect** haya sellado los contratos DTO y endpoints en Gate 1.`
  );
  teamworkSopItems.push(
    `2. **Aislamiento de Espacio de Trabajo:**\n   - Cada subagente opera en su subcarpeta o rama correspondiente sin modificar archivos globales.`
  );
  if (hasReviewer) {
    teamworkSopItems.push(
      `3. **Revision Desacoplada en 5 Ejes:**\n   - Antes de Gate 2, el **Code Reviewer** audita de forma adversarial el \`git diff\` (Correctitud, Legibilidad, Arquitectura, Seguridad, Rendimiento). Prohibido avanzar a QA si introduce \`@ts-ignore\` o debilita las pruebas.`
    );
  }
  if (hasUiUx) {
    teamworkSopItems.push(
      `${hasReviewer ? '4' : '3'}. **Auditoria de Responsividad UI/UX (Puerta de Calidad Visual):**\n   - En cambios visuales, el subagente de UI/UX audita que los botones cumplan el tamano tactil (minimo 44px en moviles), los espaciados no colapsen y no existan desbordamientos horizontales.`
    );
  }
  teamworkSopItems.push(
    `${(hasReviewer ? 1 : 0) + (hasUiUx ? 1 : 0) + 2 + 1}. **Blindaje de Ruido de Contexto:**\n   - El subagente QA ejecuta la compilacion en su propia ventana aislada y solo reporta al orquestador el veredicto sintetico (\`PASS / FAIL\`).`
  );

  const teamworkSopText = teamworkSopItems.join('\n');

  const gatesAscii = hasReviewer
    ? `\`\`\`
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  1. ESPECIFICAR │ ───►  │  2. PLANIFICAR  │ ───►  │ [GATE 1: USER]  │
│   Y ANALIZAR    │       │     TECNICO     │       │   (Aprobacion)  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
┌─────────────────┐       ┌─────────────────┐       ┌────────▼────────┐
│ [GATE 3: AUDIT] │ ◄───  │ [GATE 2: QA]    │ ◄───  │ 3.5. REVISION   │ ◄─── 3. DESARROLLO (DEV)
│ (Git & Context) │       │ (Build & Tests) │       │ (5 Ejes + Diff) │      (${devRolesLabel})
└─────────────────┘       └─────────────────┘       └─────────────────┘
\`\`\``
    : `\`\`\`
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  1. ESPECIFICAR │ ───►  │  2. PLANIFICAR  │ ───►  │ [GATE 1: USER]  │
│   Y ANALIZAR    │       │     TECNICO     │       │   (Aprobacion)  │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
┌─────────────────┐       ┌─────────────────┐                │
│ [GATE 3: AUDIT] │ ◄───  │ [GATE 2: QA]    │ ◄───  3. DESARROLLO (DEV)
│ (Git & Context) │       │ (Build & Tests) │       (${devRolesLabel})
└─────────────────┘       └─────────────────┘
\`\`\``;

  return `# ${config.projectName.toUpperCase()} — AGENTS.MD (MASTER ORCHESTRATION PROTOCOL)

Este documento establece el marco universal de operacion (SOP), las directivas primarias, la maquina de estados con Puertas de Calidad (Quality Gates), los roles de subagentes y la matriz de seguridad para el proyecto **${config.projectName}**.
Es compatible nativamente con **Google Antigravity (/teamwork-preview)**, **Claude Code (Agent Teams)** y **Cursor**.

---

## 1. Directivas Primarias (Prime Directives)

1. **Principio del Menor Impacto:** Modificar unicamente los archivos estrictamente necesarios para la tarea. No formatear archivos enteros ni reestructurar codigo ajeno.
2. **Tolerancia Cero a Codigo Roto:** Ningun requerimiento se da por completado sin haber superado la suite de compilacion y pruebas (${backendCompile}).
3. **Validacion de Realidad (No Alucinacion):** No asumir bibliotecas, APIs, variables de entorno o contratos inexistentes; comprobar siempre primero en la base de codigo real.
4. **Cumplimiento de Restricciones (CONSTRAINTS.md):** Prohibido anadir \`@ts-ignore\`, \`eslint-disable\`, borrar pruebas o relajar aserciones para forzar pases en verde.
5. **Regla de Parada Temprana (Fail-Fast):** Si un comando o correccion falla 2 veces consecutivas, detenerse inmediatamente y replantear la estrategia en lugar de iterar a ciegas.
6. **Claridad sobre Complejidad:** Cero abstracciones o wrappers prematuros hasta comprobar 3 casos de uso reales.
${config.strictGuardrails.zeroEmojisInCode ? '7. **Cero Emojis:** Prohibido el uso de emojis en codigo fuente, comentarios y mensajes de commit.\n' : ''}
---

## 2. Arquitectura y Tecnologias Detectadas

- **Tipo de Proyecto:** ${stack.type.toUpperCase()}
${stack.frontend ? `- **Frontend:** ${stack.frontend.framework} ${stack.frontend.version || ''} ${stack.frontend.uiLibrary ? `(${stack.frontend.uiLibrary})` : ''} ${stack.frontend.directory ? `[en ./${stack.frontend.directory}]` : ''}\n` : ''}${stack.backend ? `- **Backend:** ${stack.backend.framework} (${stack.backend.language}) ${stack.backend.directory ? `[en ./${stack.backend.directory}]` : ''}\n` : ''}${stack.database ? `- **Base de Datos:** ${stack.database.engine} ${stack.database.orm ? `(ORM: ${stack.database.orm})` : ''} ${stack.database.hasDump ? `[Dump: ${stack.database.dumpFile}]` : ''}\n` : ''}- **Comando de Compilacion / Build:** \`${backendCompile}\`
- **Comando de Pruebas:** \`${testCmd}\`
- **Rama Git Base:** \`${stack.git.defaultBranch}\`
- **Especificacion Declarativa:** \`.agents/orchestron.yaml\` (Google AX Workspace Model)
- **Contrato de Calidad:** \`.agents/CONSTRAINTS.md\`
- **Memoria de Instintos:** \`.agents/state/instincts.md\`

---

## 3. Maquina de Estados y Puertas de Calidad (Quality Gates)

Todo requerimiento debe transitar de forma estricta por las siguientes fases:

${gatesAscii}

| Fase | Rol Responsable | Entregable / Objetivo | Puerta de Calidad (Gate) |
| :--- | :--- | :--- | :--- |
| **1. Analisis** | Lead Architect | Definicion de alcance e impacto en base de codigo | Requerimientos claros |
| **2. Planificacion** | Lead Architect | Plan tecnico detallado y contratos (DTOs / Tipos) | **GATE 1:** Aprobacion explicita del usuario |
| **3. Desarrollo** | ${devRolesLabel} | Implementacion de codigo modular y tipado | Conforme a especificacion |
${hasReviewer ? '| **3.5. Revision** | Code Reviewer | Auditoria en 5 ejes sobre git diff + remedios estructurales | Veredicto APROBADO sin supresiones |\n' : ''}| **4. Verificacion** | ${qaRoleLabel} | Compilacion sin errores y prueba de estabilidad | **GATE 2:** ${gate2Label} |
| **5. Cierre** | Git & Security | Git limpio, actualizacion de memoria viva e instintos | **GATE 3:** Git sin archivos locales + \`${config.livingContext.fileName}\` al dia |

---

## 3.1. Protocolo de Ejecucion Paralela y Trabajo en Equipo (Teamwork SOP)

Cuando se ejecute un requerimiento complejo usando subagentes paralelos (\`invoke_subagent\` o \`/teamwork-preview\`):

${teamworkSopText}

---

## 4. Roles Especializados y Contratos de Sub-Agentes

Consulta los prompts detallados de cada subagente en \`.agents/subagents/*.agent.md\`:

${roles
  .map(
    (role) => `### ${role.icon} ${role.name}
- **Meta:** ${role.goal}
- **Responsabilidades:**
${role.responsibilities.map((r) => `  - ${r}`).join('\n')}
- **Reglas del Rol:**
${role.rules.map((rule) => `  - ${rule}`).join('\n')}
`
  )
  .join('\n')}
---

## 5. Matriz de Seguridad y Niveles de Permiso

- **[SAFE - Auto-Aprobado]:** Lectura de archivos, busquedas grep, inspeccion de dependencias, \`git status\`, \`git diff\`.
- **[GUARDED - Permitido en alcance]:** Creacion o edicion de archivos de codigo fuente y ejecucion de comandos de prueba locales.
- **[RISKY - Requiere confirmacion del usuario]:** Eliminacion de archivos, modificaciones en \`package.json\` / dependencias, cambios a variables de entorno (\`.env*\`), scripts de migracion de BD.
- **[BLOCKED - Terminantemente prohibido]:** Comandos destructivos sin respaldo (\`rm -rf /\`), \`git push --force\`, exponer credenciales o tokens en commits.

${mcpSection}
---

## 7. Protocolo de Living Context e Instintos (Memoria Persistente)

Para evitar que el agente olvide decisiones de diseno o lecciones tecnicas entre sesiones:
- El archivo maestro de contexto vive en: \`.agents/${config.livingContext.fileName}\`.
- El catalogo de patrones aprendidos e instintos vive en: \`.agents/state/instincts.md\`.
- **OBLIGACION EN GATE 3:** Antes de concluir cualquier requerimiento o reportar la tarea como completada, el agente DEBE actualizar de forma autonoma la seccion **"Ultimos Cambios / Estado Actual"** en \`${config.livingContext.fileName}\`, registrando nuevos endpoints, componentes o tablas incorporadas.
- Si se resolvio un error no evidente o se descubrio un workaround, el agente debe registrarlo en \`.agents/state/instincts.md\` o ejecutar \`orchestron learn\`.

---

## 8. Protocolo Git de Trabajo Limpio

\`\`\`bash
# 1. Asegurar rama base limpia y actualizada
git checkout ${stack.git.defaultBranch}
git pull origin ${stack.git.defaultBranch}

# 2. Crear rama atomica para el requerimiento
git checkout -b feat/<nombre-tarea>   # o fix/<nombre-tarea>

# 3. Blindaje de archivos locales confidenciales si aplica
git update-index --skip-worktree <archivo-entorno-local>
\`\`\`
`;
}
