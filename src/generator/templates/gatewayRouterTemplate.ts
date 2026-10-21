import { OrchestronConfig } from '../../types/index.js';

export function renderGatewayRouter(config: OrchestronConfig): string {
  const stack = config.stack;
  const backendCompile = stack.commands?.build || 'npm run build';

  const devRolesNames: string[] = [];
  if (config.selectedRoles.includes('backend-dev')) devRolesNames.push('Backend');
  if (config.selectedRoles.includes('frontend-dev')) devRolesNames.push('Frontend');
  if (config.selectedRoles.includes('ui-ux-specialist')) devRolesNames.push('UI/UX');
  const devRolesLabel = devRolesNames.length > 0 ? devRolesNames.join(' + ') : 'Desarrollo';

  const hasReviewer = config.selectedRoles.includes('code-reviewer');
  const hasUiUx = config.selectedRoles.includes('ui-ux-specialist');
  const qaRoleLabel = hasUiUx ? 'QA & UI/UX Specialist' : 'QA Specialist';
  const gate2Label = hasUiUx
    ? `0 errores build (\`${backendCompile}\`) + 0 supresiones + 0 overflow`
    : `0 errores build (\`${backendCompile}\`) + 0 supresiones`;

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

  return `# AGENTS.MD — UNIVERSAL AGENT ENTRYPOINT & GATEWAY ROUTER

<!-- Compatible nativamente con Google Antigravity, Claude Code y Cursor -->
<!-- Directivas primarias y Quality Gates siempre en contexto base -->

## 1. Directivas Primarias (Prime Directives)

1. **Principio del Menor Impacto:** Modificar unicamente los archivos estrictamente necesarios para la tarea. No formatear archivos enteros ni reestructurar codigo ajeno.
2. **Tolerancia Cero a Codigo Roto:** Ningun requerimiento se da por completado sin haber superado la suite de compilacion y pruebas (${backendCompile}).
3. **Validacion de Realidad (No Alucinacion):** No asumir bibliotecas, APIs, variables de entorno o contratos inexistentes; comprobar siempre primero en la base de codigo real.
4. **Cumplimiento de Restricciones (CONSTRAINTS.md):** Prohibido anadir \`@ts-ignore\`, \`eslint-disable\`, borrar pruebas o relajar aserciones para forzar pases en verde.
5. **Regla de Parada Temprana (Fail-Fast):** Si un comando o correccion falla 2 veces consecutivas, detenerse inmediatamente y replantear la estrategia en lugar de iterar a ciegas.
6. **Claridad sobre Complejidad:** Cero abstracciones o wrappers prematuros hasta comprobar 3 casos de uso reales.
${config.strictGuardrails?.zeroEmojisInCode ? '7. **Cero Emojis:** Prohibido el uso de emojis en codigo fuente, comentarios y mensajes de commit.\n' : ''}
---

## 2. Maquina de Estados y Puertas de Calidad (Quality Gates)

Todo requerimiento debe transitar de forma estricta por las siguientes fases:

${gatesAscii}

| Fase | Rol Responsable | Entregable / Objetivo | Puerta de Calidad (Gate) |
| :--- | :--- | :--- | :--- |
| **1. Analisis** | Lead Architect | Definicion de alcance e impacto en base de codigo | Requerimientos claros |
| **2. Planificacion** | Lead Architect | Plan tecnico detallado y contratos (DTOs / Tipos) | **GATE 1:** Aprobacion explicita del usuario |
| **3. Desarrollo** | ${devRolesLabel} | Implementacion de codigo modular y tipado | Conforme a especificacion |
${hasReviewer ? `| **3.5. Revision** | Code Reviewer | Auditoria en 5 ejes sobre git diff + remedios estructurales | Veredicto APROBADO sin supresiones |\n` : ''}| **4. Verificacion** | ${qaRoleLabel} | Compilacion sin errores y prueba de estabilidad | **GATE 2:** ${gate2Label} |
| **5. Cierre** | Git & Security | Git limpio, actualizacion de memoria viva e instintos | **GATE 3:** Git sin archivos locales + \`${config.livingContext?.fileName || 'CONTEXT.md'}\` al dia |

---

## 3. Contrato Mecanico de Calidad Inviolable

@[CONSTRAINTS](.agents/CONSTRAINTS.md)

---

## 4. Arquitectura de Gobernanza y Navegacion (.agents/)

Consulta las especificaciones detalladas en los siguientes modulos:
- **Protocolo Maestro y Roles:** \`.agents/AGENTS.md\`
- **Manifiesto Declarativo Workspace:** \`.agents/orchestron.yaml\`
- **Memoria Viva y Bitacora (Gate 3):** \`.agents/${config.livingContext?.fileName || 'CONTEXT.md'}\`
- **Memoria de Instintos y Aprendizaje:** \`.agents/state/instincts.md\`
- **Contratos de Subagentes Especializados:** \`.agents/agents/\`
- **Directivas y Reglas Modulares:** \`.agents/rules/\`
`;
}
