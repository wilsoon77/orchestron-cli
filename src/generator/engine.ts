import fs from 'fs';
import path from 'path';
import { OrchestronConfig } from '../types/index.js';
import { renderAgentsMd } from './templates/agentsTemplate.js';
import { renderContextMd } from './templates/contextTemplate.js';
import { renderOrchestronManifest } from './templates/manifestTemplate.js';
import { renderConstraintsMd } from './templates/constraintsTemplate.js';
import { renderInstinctsMd } from './templates/instinctsTemplate.js';
import {
  renderArchitectSubagent,
  renderBackendSubagent,
  renderFrontendSubagent,
  renderUiUxSubagent,
  renderReviewerSubagent,
  renderQaSubagent,
  renderSecuritySubagent
} from './templates/subagentsTemplate.js';
import {
  renderBackendRule,
  renderFrontendRule,
  renderDatabaseRule,
  renderSecurityRule
} from './templates/rulesTemplates.js';

export interface GenerationResult {
  agentsFolder: string;
  createdFiles: string[];
}

export function generateOrchestronFiles(
  targetDir: string,
  config: OrchestronConfig
): GenerationResult {
  const createdFiles: string[] = [];
  const baseFolder = path.join(targetDir, config.encapsulation.folder);
  const rulesFolder = path.join(baseFolder, 'rules');
  const stateFolder = path.join(baseFolder, 'state');
  const subagentsFolder = path.join(baseFolder, 'subagents');

  // Ensure directories exist
  fs.mkdirSync(baseFolder, { recursive: true });
  fs.mkdirSync(rulesFolder, { recursive: true });
  fs.mkdirSync(stateFolder, { recursive: true });
  fs.mkdirSync(subagentsFolder, { recursive: true });

  // 1. Generate Master AGENTS.md inside .agents/
  const masterAgentsPath = path.join(baseFolder, 'AGENTS.md');
  fs.writeFileSync(masterAgentsPath, renderAgentsMd(config), 'utf8');
  createdFiles.push(path.relative(targetDir, masterAgentsPath));

  // 2. Generate CONTEXT.md inside .agents/
  const contextPath = path.join(baseFolder, config.livingContext.fileName);
  fs.writeFileSync(contextPath, renderContextMd(config), 'utf8');
  createdFiles.push(path.relative(targetDir, contextPath));

  // 3. Generate Declarative Manifest orchestron.yaml (Google AX pattern)
  const manifestPath = path.join(baseFolder, 'orchestron.yaml');
  fs.writeFileSync(manifestPath, renderOrchestronManifest(config), 'utf8');
  createdFiles.push(path.relative(targetDir, manifestPath));

  // 3.1. Generate CONSTRAINTS.md (Anti-degradation contract)
  const constraintsPath = path.join(baseFolder, 'CONSTRAINTS.md');
  fs.writeFileSync(constraintsPath, renderConstraintsMd(config), 'utf8');
  createdFiles.push(path.relative(targetDir, constraintsPath));

  // 4. Generate Subagent Prompts and Contracts inside .agents/subagents/
  const subagentsDefinitions: { roleId: string; file: string; render: () => string }[] = [
    { roleId: 'lead-architect', file: 'architect.agent.md', render: () => renderArchitectSubagent(config) },
    { roleId: 'backend-dev', file: 'backend.agent.md', render: () => renderBackendSubagent(config) },
    { roleId: 'frontend-dev', file: 'frontend.agent.md', render: () => renderFrontendSubagent(config) },
    { roleId: 'ui-ux-specialist', file: 'ui-ux.agent.md', render: () => renderUiUxSubagent(config) },
    { roleId: 'code-reviewer', file: 'reviewer.agent.md', render: () => renderReviewerSubagent(config) },
    { roleId: 'qa-tester', file: 'qa.agent.md', render: () => renderQaSubagent(config) },
    { roleId: 'git-security', file: 'security.agent.md', render: () => renderSecuritySubagent(config) }
  ];

  for (const sub of subagentsDefinitions) {
    const subPath = path.join(subagentsFolder, sub.file);
    if (config.selectedRoles.includes(sub.roleId)) {
      // Role is selected: Generate prompt file
      fs.writeFileSync(subPath, sub.render(), 'utf8');
      createdFiles.push(path.relative(targetDir, subPath));
    } else {
      // Role was NOT selected: Ensure file does not exist or remove if stale
      if (fs.existsSync(subPath)) {
        fs.unlinkSync(subPath);
      }
    }
  }

  // 5. Generate Modular Rules (strictly if relevant role and stack are active)
  const shouldCreateBackendRule =
    Boolean(config.stack.backend) || config.selectedRoles.includes('backend-dev');
  const backendPath = path.join(rulesFolder, 'backend.md');
  if (shouldCreateBackendRule) {
    fs.writeFileSync(backendPath, renderBackendRule(config), 'utf8');
    createdFiles.push(path.relative(targetDir, backendPath));
  } else if (fs.existsSync(backendPath)) {
    fs.unlinkSync(backendPath);
  }

  const shouldCreateFrontendRule =
    Boolean(config.stack.frontend) && config.selectedRoles.includes('frontend-dev');
  const frontendPath = path.join(rulesFolder, 'frontend.md');
  if (shouldCreateFrontendRule) {
    fs.writeFileSync(frontendPath, renderFrontendRule(config), 'utf8');
    createdFiles.push(path.relative(targetDir, frontendPath));
  } else if (fs.existsSync(frontendPath)) {
    fs.unlinkSync(frontendPath);
  }

  const databasePath = path.join(rulesFolder, 'database.md');
  fs.writeFileSync(databasePath, renderDatabaseRule(config), 'utf8');
  createdFiles.push(path.relative(targetDir, databasePath));

  const securityPath = path.join(rulesFolder, 'security.md');
  fs.writeFileSync(securityPath, renderSecurityRule(config), 'utf8');
  createdFiles.push(path.relative(targetDir, securityPath));

  // 6. Generate State scratchpad.md and instincts.md
  const scratchpadPath = path.join(stateFolder, 'scratchpad.md');
  const scratchpadContent = `# Scratchpad de Tarea Activa (Memoria Efimera)

> Usa este espacio para desglosar subtareas, hipotesis de depuracion o notas temporales durante la ejecucion del ticket actual.

## Tarea en Curso:
- **Estado:** Inicializado
- **Hipotesis:** Ninguna
- **Subtareas Pendientes:**
  - [ ] Paso 1
`;
  fs.writeFileSync(scratchpadPath, scratchpadContent, 'utf8');
  createdFiles.push(path.relative(targetDir, scratchpadPath));

  const instinctsPath = path.join(stateFolder, 'instincts.md');
  if (!fs.existsSync(instinctsPath)) {
    fs.writeFileSync(instinctsPath, renderInstinctsMd(config), 'utf8');
    createdFiles.push(path.relative(targetDir, instinctsPath));
  }

  // 7. Root Entrypoint Pointer (Universal Compatibility for Antigravity, Claude Code, Cursor)
  if (config.encapsulation.generateRootPointer) {
    const rootAgentsPath = path.join(targetDir, 'AGENTS.md');
    const rootContent = `# AGENTS.MD — UNIVERSAL AGENT ENTRYPOINT

<!-- Redirige el contexto maestro a la arquitectura encapsulada en .agents/ -->
<!-- Compatible con Antigravity, Claude Code, Cursor, Windsurf y Copilot -->

@[AGENTS](.agents/AGENTS.md)
@[CONSTRAINTS](.agents/CONSTRAINTS.md)
@[CONTEXT](.agents/${config.livingContext.fileName})
@[MANIFEST](.agents/orchestron.yaml)

Consulta la configuracion detallada de roles, reglas y memoria viva en el directorio:
- \`.agents/AGENTS.md\`
- \`.agents/CONSTRAINTS.md\`
- \`.agents/orchestron.yaml\`
- \`.agents/${config.livingContext.fileName}\`
- \`.agents/state/instincts.md\`
- \`.agents/subagents/\`
- \`.agents/rules/\`
`;
    fs.writeFileSync(rootAgentsPath, rootContent, 'utf8');
    createdFiles.push('AGENTS.md (Root pointer)');
  }

  // 8. Optional Claude Code compatibility
  if (config.encapsulation.generateClaudeMdCompat) {
    const claudePath = path.join(targetDir, 'CLAUDE.md');
    const claudeContent = `# CLAUDE.md — Claude Code Instructions

Please refer to and follow the universal agent instructions in:
- \`.agents/AGENTS.md\`
- \`.agents/orchestron.yaml\`
- \`.agents/${config.livingContext.fileName}\`
- \`.agents/subagents/\`
`;
    fs.writeFileSync(claudePath, claudeContent, 'utf8');
    createdFiles.push('CLAUDE.md (Claude Code link)');
  }

  return {
    agentsFolder: baseFolder,
    createdFiles
  };
}
