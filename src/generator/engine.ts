import fs from 'fs';
import path from 'path';
import { OrchestronConfig } from '../types/index.js';
import { renderAgentsMd } from './templates/agentsTemplate.js';
import { renderGatewayRouter } from './templates/gatewayRouterTemplate.js';
import { renderContextMd } from './templates/contextTemplate.js';
import { renderOrchestronManifest } from './templates/manifestTemplate.js';
import { renderConstraintsMd } from './templates/constraintsTemplate.js';
import { renderInstinctsMd } from './templates/instinctsTemplate.js';
import { getUnifiedRole, ALL_ROLES } from '../roles/unifiedCatalog.js';
import {
  renderArchitectSubagent,
  renderBackendSubagent,
  renderFrontendSubagent,
  renderUiUxSubagent,
  renderReviewerSubagent,
  renderQaSubagent,
  renderSecuritySubagent,
  renderDevopsSubagent
} from './templates/subagentsTemplate.js';
import {
  renderBackendRule,
  renderFrontendRule,
  renderDatabaseRule,
  renderSecurityRule
} from './templates/rulesTemplates.js';
import {
  getCursorRulesDefinitions,
  renderCursorRuleFile
} from './templates/cursorRulesTemplate.js';

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
  const agentsFolder = path.join(baseFolder, 'agents');

  // Ensure directories exist
  fs.mkdirSync(baseFolder, { recursive: true });
  fs.mkdirSync(rulesFolder, { recursive: true });
  fs.mkdirSync(stateFolder, { recursive: true });
  fs.mkdirSync(agentsFolder, { recursive: true });

  let claudeAgentsFolder: string | null = null;
  if (config.encapsulation.generateClaudeMdCompat) {
    claudeAgentsFolder = path.join(targetDir, '.claude', 'agents');
    fs.mkdirSync(claudeAgentsFolder, { recursive: true });
  }

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

  // 4. Generate Subagent Prompts and Contracts inside .agents/agents/ (and .claude/agents/ if enabled)
  for (const roleId of config.selectedRoles) {
    const role = getUnifiedRole(roleId);
    if (!role) continue;

    const fileName = role.agentFileName || `${role.id}.md`;
    const agentPath = path.join(agentsFolder, fileName);
    fs.writeFileSync(agentPath, role.subagentTemplateAntigravity(config), 'utf8');
    createdFiles.push(path.relative(targetDir, agentPath));

    if (claudeAgentsFolder && role.subagentTemplateClaude) {
      const claudeAgentPath = path.join(claudeAgentsFolder, fileName);
      fs.writeFileSync(claudeAgentPath, role.subagentTemplateClaude(config), 'utf8');
      createdFiles.push(path.relative(targetDir, claudeAgentPath));
    }
  }

  // Ensure unselected known roles do not leave stale files
  for (const role of ALL_ROLES) {
    if (!config.selectedRoles.includes(role.id)) {
      const fileName = role.agentFileName || `${role.id}.md`;
      const agentPath = path.join(agentsFolder, fileName);
      if (fs.existsSync(agentPath)) {
        fs.unlinkSync(agentPath);
      }
      if (claudeAgentsFolder) {
        const claudeAgentPath = path.join(claudeAgentsFolder, fileName);
        if (fs.existsSync(claudeAgentPath)) {
          fs.unlinkSync(claudeAgentPath);
        }
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

  for (const roleId of config.selectedRoles) {
    const role = getUnifiedRole(roleId);
    if (role && (role.category === 'extended' || role.category === 'custom') && role.ruleFileName) {
      const rulePath = path.join(rulesFolder, role.ruleFileName);
      fs.writeFileSync(rulePath, role.ruleTemplate(config), 'utf8');
      createdFiles.push(path.relative(targetDir, rulePath));
    }
  }

  // 6. Generate Cursor Rules (.cursor/rules/*.mdc) when enabled
  if (config.encapsulation.generateCursorRulesCompat) {
    const cursorRulesFolder = path.join(targetDir, '.cursor', 'rules');
    fs.mkdirSync(cursorRulesFolder, { recursive: true });

    const cursorRules = getCursorRulesDefinitions(config);
    for (const rule of cursorRules) {
      const rulePath = path.join(cursorRulesFolder, rule.fileName);
      if (rule.shouldGenerate(config)) {
        const fileContent = renderCursorRuleFile(
          rule.description,
          rule.globs,
          rule.alwaysApply,
          rule.renderContent(config)
        );
        fs.writeFileSync(rulePath, fileContent, 'utf8');
        createdFiles.push(path.relative(targetDir, rulePath));
      } else if (fs.existsSync(rulePath)) {
        fs.unlinkSync(rulePath);
      }
    }
  }

  // 7. Generate State scratchpad.md and instincts.md
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

  // 8. Root Entrypoint Pointer (Universal Gateway Router < 6 KB)
  if (config.encapsulation.generateRootPointer) {
    const rootAgentsPath = path.join(targetDir, 'AGENTS.md');
    fs.writeFileSync(rootAgentsPath, renderGatewayRouter(config), 'utf8');
    createdFiles.push('AGENTS.md (Gateway Router)');
  }

  // 9. Optional Claude Code compatibility
  if (config.encapsulation.generateClaudeMdCompat) {
    const claudePath = path.join(targetDir, 'CLAUDE.md');
    const claudeContent = `# CLAUDE.md — Claude Code Instructions

Please refer to and follow the universal agent instructions in:
- \`.agents/AGENTS.md\`
- \`.agents/orchestron.yaml\`
- \`.agents/${config.livingContext.fileName}\`
- \`.agents/agents/\`
- \`.claude/agents/\`
`;
    fs.writeFileSync(claudePath, claudeContent, 'utf8');
    createdFiles.push('CLAUDE.md (Claude Code link)');
  }

  return {
    agentsFolder: baseFolder,
    createdFiles
  };
}
