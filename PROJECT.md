# Project: Orchestron CLI 2.0 Evolution

## Architecture
- **CLI Framework**: Node.js, TypeScript, Commander (`src/index.ts`, `src/commands/*`).
- **Templates & Generators**: Multi-engine template emission (`src/generator/templates/*`, `src/generator/engine.ts`).
- **Detection Layer**: Tech stack detector (`src/detector/tech.ts`), semantic MCP filtering (`src/detector/mcp.ts`).
- **Unified Role System**: Single typed source of truth `UnifiedRoleDefinition` (`src/types/index.ts`, `src/roles/unifiedCatalog.ts`).
- **Context Routing**: Root `AGENTS.md` as lightweight Gateway Router (< 6 KB) inlining exclusively `@[CONSTRAINTS](.agents/CONSTRAINTS.md)`.
- **Quality Gates & Hooks**: Deterministic enforcement (`orchestron hooks --install`, `.claude/settings.json`, `.git/hooks/pre-commit`, `orchestron doctor --ci`, `.agents/state/active-contract.md`).
- **TUI & Testing**: Interactive palette with instant shortcuts and live filtering (`src/ui/positionalSelector.ts`), test runner with Vitest (`vitest.config.ts`, `tests/*`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | YAML frontmatter in rules | Generar encabezado YAML en `.agents/rules/*.md` (`trigger`, `globs`, `description`) para Google Antigravity | M1 | R1 |
| 2 | Subagentes nativos Antigravity | Generar subagentes en `.agents/agents/<id>.md` con frontmatter nativo (`name`, `description`, `tools`, `model`, `commandExecutionPolicy`) | M1 | R1 |
| 3 | Subagentes nativos Claude Code | Generar subagentes en `.claude/agents/<id>.md` con PascalCase tools e `isolation: worktree` | M1 | R1 |
| 4 | Exportacion a Cursor Rules | Generar `.cursor/rules/<id>.mdc` cuando `generateCursorRulesCompat` esta activo | M1 | R1 |
| 5 | Migracion automatica en update | Migrar subagentes existentes de `.agents/subagents/` a `.agents/agents/` | M1 | R1 |
| 6 | Gateway Router minimo | Reestructurar `AGENTS.md` raiz < 6 KB inlining exclusivamente `@[CONSTRAINTS]` | M2 | R2 |
| 7 | Context budget < 24 KB | Garantizar que el tamano total expandido de `AGENTS.md` sea inferior a 24,000 bytes | M2 | R2 |
| 8 | Filtrado semantico MCP | Filtrar servidores MCP en `src/detector/mcp.ts` segun tecnologias detectadas (SQL solo backend/DB, UI/Figma solo frontend) | M2 | R2 |
| 9 | Medicion de tamano expandido en Doctor | `orchestron doctor` mide el tamano expandido del `AGENTS.md` raiz contra el presupuesto de 24,000 bytes | M2 | R2 |
| 10 | UnifiedRoleDefinition | Consolidar la definicion de roles en un contrato tipado unico en `src/types/index.ts` y catalogo unificado | M3 | R3 |
| 11 | Sincronizacion atomica en add-role | `orchestron add-role` genera simultaneamente regla, subagente, politica en `orchestron.yaml`, entrada en `CONTEXT.md` y soporte en `team` | M3 | R3 |
| 12 | Preservacion de roles en update | `orchestron update` lee `.agents/orchestron.yaml`, respeta roles custom y preferencias sin sobreescribir | M3 | R3 |
| 13 | Flag --dry-run en update | Soporte para `orchestron update --dry-run` para simular cambios sin modificar disco | M3 | R3 |
| 14 | Claude Code Stop Hook | Generar `.claude/settings.json` con hook `Stop` invocando `orchestron doctor --ci` | M4 | R4 |
| 15 | Git pre-commit Hook Installer | Comando `orchestron hooks --install` que instala `.git/hooks/pre-commit` | M4 | R4 |
| 16 | Artefacto fisico Gate 1 | Generar `.agents/state/active-contract.md` y actualizar protocolos de subagentes para sincronizacion DTO | M4 | R4 |
| 17 | Balanced block counting N+1 | Reemplazar regex `[^}]*await` en `doctor.ts` por contador de llaves balanceadas que ignore comentarios y strings | M4 | R5 |
| 18 | Doctor exit code = 1 y flag --ci | Asignar `process.exitCode = 1` en `doctorCommand` cuando existan fallos y registrar `--ci` en CLI | M4 | R5 |
| 19 | Atajos y filtro vivo en Menu TUI | Interceptar atajos de teclado (`d`, `s`, `q`) y soporte de busqueda/filtro en vivo en `positionalSelector.ts` | M4 | R5 |
| 20 | Suite de pruebas Vitest | Configurar Vitest con pruebas unitarias (detectores, generadores, balanced blocks) y prueba E2E de `doctor --ci` | M4 | R5 |
| 21 | Final 100% E2E Verification & Adversarial Hardening | Validar la suite completa de pruebas E2E (Tiers 1-4) y endurecimiento adversarial (Tier 5) | M5 | E2E Final |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Multi-Engine Compatibility & Routes | Features 1, 2, 3, 4, 5 (YAML frontmatter, .agents/agents/, .claude/agents/, .cursor/rules/, migration) | none | DONE |
| M2 | Context Budget & Selective MCP | Features 6, 7, 8, 9 (Gateway Router < 6 KB, expandido < 24 KB, mcp.ts filtering, doctor expanded check) | M1 | DONE |
| M3 | Unified Roles & Persistence | Features 10, 11, 12, 13 (UnifiedRoleDefinition, atomic add-role, update reading yaml, --dry-run) | M1 | PLANNED |
| M4 | Deterministic Hooks, Gate 1, Ergonomics & Tests | Features 14, 15, 16, 17, 18, 19, 20 (hooks, active-contract.md, balanced blocks, doctor exit code, menu TUI, Vitest setup) | M2, M3 | PLANNED |
| M5 | Final E2E Pass & Adversarial Hardening | Feature 21 (100% E2E test suite pass + Tier 5 coverage audit) | M4, TEST_READY | PLANNED |

## Interface Contracts
### `src/types/index.ts` ↔ All Modules
```typescript
export interface UnifiedRoleDefinition {
  id: string;
  name: string;
  category: 'core' | 'extended' | 'custom';
  description: string;
  responsibility: string;
  deliverable: string;
  skills: string[];
  toolsAntigravity: string[];
  toolsClaude: string[];
  isolationClaude?: 'worktree' | 'none';
  modelPreference?: string;
  commandExecutionPolicy?: 'orchestrator_only' | 'autonomous' | 'review_required';
  ruleTemplate: (config: OrchestronConfig) => string;
  subagentTemplateAntigravity: (config: OrchestronConfig) => string;
  subagentTemplateClaude?: (config: OrchestronConfig) => string;
  cursorRuleTemplate?: (config: OrchestronConfig) => string;
}
```

### `src/detector/mcp.ts` ↔ `src/generator/templates/agentsTemplate.ts`
```typescript
export interface FilteredMcpServer {
  name: string;
  description: string;
  eagerTools: string[];
  lazyTools: string[];
  rules: string[];
}
export function filterMcpServersForProject(
  servers: McpServerMeta[],
  techStack: TechStack
): FilteredMcpServer[];
```

### `src/commands/doctor.ts` ↔ Quality Gates
```typescript
export function computeExpandedAgentContextSize(projectRoot: string): {
  baseBytes: number;
  expandedBytes: number;
  inlinedFiles: string[];
};
export function detectNPlusOneAsyncLoops(code: string): string[];
export interface DoctorOptions {
  dir?: string;
  ci?: boolean;
  json?: boolean;
}
```

## Code Layout
- `src/index.ts`: CLI entrypoint (Commander registration for all commands, `--ci`, `--dry-run`, `hooks`).
- `src/types/index.ts`: Type contracts and interfaces (`UnifiedRoleDefinition`, options, stack).
- `src/roles/unifiedCatalog.ts`: Consolidated catalog of core and extended roles.
- `src/detector/mcp.ts`: MCP detection and project-specific semantic filtering.
- `src/detector/tech.ts`: Technology detection.
- `src/generator/engine.ts`: Orchestron generation engine.
- `src/generator/templates/`: Template renderers (rules, agents, manifest, context, gateway router).
- `src/commands/`: CLI command handlers (`addRole.ts`, `update.ts`, `doctor.ts`, `hooks.ts`, `palette.ts`, `team.ts`).
- `src/ui/positionalSelector.ts`: Interactive menu selector with shortcuts and search.
- `tests/`: Vitest test suites (unit tests for detectors/generators/doctor + E2E test).
