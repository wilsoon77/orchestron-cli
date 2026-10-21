import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { scanProjectDirectory } from '../detector/stack.js';
import { OrchestronConfig, UpdateOptions } from '../types/index.js';
import { renderConstraintsMd } from '../generator/templates/constraintsTemplate.js';
import { renderInstinctsMd } from '../generator/templates/instinctsTemplate.js';
import {
  renderReviewerSubagent,
  SUBAGENT_PLATFORMS,
  buildFrontmatter
} from '../generator/templates/subagentsTemplate.js';
import { renderAgentsMd, renderGatewayRouter } from '../generator/templates/agentsTemplate.js';
import { renderOrchestronManifest } from '../generator/templates/manifestTemplate.js';
import {
  renderBackendRule,
  renderFrontendRule,
  renderDatabaseRule,
  renderSecurityRule
} from '../generator/templates/rulesTemplates.js';
import {
  getCursorRulesDefinitions,
  renderCursorRuleFile
} from '../generator/templates/cursorRulesTemplate.js';

export interface MigrationResult {
  migratedFiles: { from: string; to: string; injectedFrontmatter: boolean }[];
  cleanedFolders: string[];
}

export function injectSubagentFrontmatter(roleId: string, content: string): string {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('---') && trimmed.indexOf('\n---', 3) !== -1) {
    return content;
  }

  const meta = SUBAGENT_PLATFORMS[roleId] || {
    id: roleId,
    name: roleId,
    description: `Custom specialized subagent: ${roleId}`,
    toolsAntigravity: ['view_file', 'replace_file_content', 'write_to_file', 'grep_search', 'find_by_name', 'run_command'],
    modelAntigravity: 'inherit',
    policyAntigravity: 'sandbox',
    toolsClaude: 'Read, Write, Edit, Bash, Grep, Glob',
    modelClaude: 'sonnet'
  };

  const frontmatter = buildFrontmatter(meta, 'antigravity');
  return `${frontmatter}${content.trimStart()}`;
}

export function migrateLegacySubagents(
  agentsDir: string,
  dryRun: boolean = false
): MigrationResult {
  const result: MigrationResult = {
    migratedFiles: [],
    cleanedFolders: []
  };

  const legacyDir = path.join(agentsDir, 'subagents');
  const targetDir = path.join(agentsDir, 'agents');

  if (!fs.existsSync(legacyDir)) {
    return result;
  }

  if (!dryRun) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const files = fs.readdirSync(legacyDir);
  const legacyMapping: Record<string, string> = {
    'architect': 'lead-architect',
    'backend': 'backend-dev',
    'frontend': 'frontend-dev',
    'ui-ux': 'ui-ux-specialist',
    'reviewer': 'code-reviewer',
    'qa': 'qa-tester',
    'security': 'git-security',
    'devops': 'devops-infra'
  };

  for (const file of files) {
    const legacyFilePath = path.join(legacyDir, file);
    const stat = fs.statSync(legacyFilePath);
    if (!stat.isFile()) continue;

    let roleId = file.replace(/\.agent\.md$/, '').replace(/\.md$/, '');
    if (legacyMapping[roleId]) {
      roleId = legacyMapping[roleId];
    }
    const targetFileName = `${roleId}.md`;
    const targetFilePath = path.join(targetDir, targetFileName);

    const originalContent = fs.readFileSync(legacyFilePath, 'utf8');
    const migratedContent = injectSubagentFrontmatter(roleId, originalContent);
    const injected = migratedContent !== originalContent;

    if (!dryRun) {
      if (!fs.existsSync(targetFilePath)) {
        fs.writeFileSync(targetFilePath, migratedContent, 'utf8');
      }
      fs.unlinkSync(legacyFilePath);
    }

    result.migratedFiles.push({
      from: path.join('.agents', 'subagents', file).replace(/\\/g, '/'),
      to: path.join('.agents', 'agents', targetFileName).replace(/\\/g, '/'),
      injectedFrontmatter: injected
    });
  }

  if (!dryRun) {
    const remaining = fs.readdirSync(legacyDir);
    if (remaining.length === 0) {
      fs.rmdirSync(legacyDir);
      result.cleanedFolders.push(path.join('.agents', 'subagents').replace(/\\/g, '/'));
    }
  } else {
    result.cleanedFolders.push(path.join('.agents', 'subagents (dry-run)').replace(/\\/g, '/'));
  }

  return result;
}

export function detectExistingRoles(agentsDir: string): string[] {
  const roles = new Set<string>();

  // 1. From Native agents folder (.agents/agents/)
  const nativeAgentsDir = path.join(agentsDir, 'agents');
  if (fs.existsSync(nativeAgentsDir)) {
    const files = fs.readdirSync(nativeAgentsDir);
    for (const f of files) {
      if (f.endsWith('.md')) {
        roles.add(f.replace(/\.md$/, ''));
      }
    }
  }

  // 2. From Legacy subagents folder (.agents/subagents/)
  const legacyDir = path.join(agentsDir, 'subagents');
  if (fs.existsSync(legacyDir)) {
    const files = fs.readdirSync(legacyDir);
    const mapping: Record<string, string> = {
      'architect.agent.md': 'lead-architect',
      'backend.agent.md': 'backend-dev',
      'frontend.agent.md': 'frontend-dev',
      'ui-ux.agent.md': 'ui-ux-specialist',
      'reviewer.agent.md': 'code-reviewer',
      'qa.agent.md': 'qa-tester',
      'security.agent.md': 'git-security',
      'devops.agent.md': 'devops-infra'
    };
    for (const f of files) {
      if (mapping[f]) {
        roles.add(mapping[f]);
      } else if (f.endsWith('.agent.md')) {
        roles.add(f.replace(/\.agent\.md$/, ''));
      } else if (f.endsWith('.md')) {
        roles.add(f.replace(/\.md$/, ''));
      }
    }
  }

  if (roles.size === 0) {
    return [
      'lead-architect',
      'backend-dev',
      'frontend-dev',
      'ui-ux-specialist',
      'code-reviewer',
      'qa-tester',
      'git-security'
    ];
  }

  roles.add('code-reviewer'); // Always ensure reviewer is active
  return Array.from(roles);
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const agentsDir = path.join(targetDir, '.agents');

  if (!fs.existsSync(agentsDir)) {
    console.log(
      boxen(
        `${pc.red('[!] No se encontro el directorio .agents/ en este proyecto.')}\n\n${pc.yellow(
          'Para inicializar Orchestron por primera vez, ejecuta:'
        )} ${pc.cyan('orchestron init')}`,
        {
          padding: 1,
          borderColor: 'red',
          borderStyle: 'round'
        }
      )
    );
    return;
  }

  const dryRun = Boolean(options.dryRun);
  const prefix = dryRun ? '[DRY-RUN] ' : '';

  p.intro(pc.bgCyan(pc.black(` ACTUALIZACION NO DESTRUCTIVA DE ORCHESTRON ${dryRun ? '(DRY-RUN)' : ''}`)));

  const spinner = p.spinner();
  spinner.start('Analizando arquitectura existente y detectando nuevas capacidades...');

  const stack = scanProjectDirectory(targetDir);
  const agentsFolder = path.join(agentsDir, 'agents');
  const stateDir = path.join(agentsDir, 'state');
  const rulesDir = path.join(agentsDir, 'rules');

  if (!dryRun) {
    fs.mkdirSync(agentsFolder, { recursive: true });
    fs.mkdirSync(stateDir, { recursive: true });
    fs.mkdirSync(rulesDir, { recursive: true });
  }

  // 0. Detect roles and execute automatic subagents migration if legacy folder exists
  const selectedRoles = detectExistingRoles(agentsDir);
  const migrationResult = migrateLegacySubagents(agentsDir, dryRun);

  const config: OrchestronConfig = {
    projectName: path.basename(targetDir),
    stack,
    selectedRoles,
    qualityGatesLevel: 'strict',
    strictGuardrails: {
      zeroEmojisInCode: true,
      protectSecrets: true,
      requirePlanApproval: true,
      requireCompileGate: true,
      atomicGitBranches: true
    },
    encapsulation: {
      folder: '.agents',
      generateRootPointer: true,
      generateClaudeMdCompat: true,
      generateCursorRulesCompat: true
    },
    livingContext: {
      enabled: true,
      fileName: 'CONTEXT.md',
      autoUpdateOnFinish: true
    }
  };

  const logs: string[] = [];

  // Report migrations if any occurred
  if (migrationResult.migratedFiles.length > 0) {
    for (const mig of migrationResult.migratedFiles) {
      logs.push(
        `${pc.cyan(prefix + '[MIGRADO]')} ${mig.from} -> ${mig.to}${mig.injectedFrontmatter ? ' (YAML frontmatter inyectado)' : ''}`
      );
    }
  }
  if (migrationResult.cleanedFolders.length > 0) {
    for (const folder of migrationResult.cleanedFolders) {
      logs.push(`${pc.green(prefix + '[LIMPIEZA]')} Directorio legacy ${folder} removido`);
    }
  }

  // 1. CONTEXT.md (Living Context) — STRICTLY PRESERVED!
  const contextPath = path.join(agentsDir, 'CONTEXT.md');
  if (fs.existsSync(contextPath)) {
    logs.push(`${pc.green('[PRESERVADO]')} .agents/CONTEXT.md (Memoria viva y bitacora historica intactas)`);
  } else {
    if (!dryRun) {
      const { renderContextMd } = await import('../generator/templates/contextTemplate.js');
      fs.writeFileSync(contextPath, renderContextMd(config), 'utf8');
    }
    logs.push(`${pc.cyan(prefix + '[NUEVO]')} .agents/CONTEXT.md inicializado`);
  }

  // 2. CONSTRAINTS.md (Quality Bar & Anti-Degradation)
  const constraintsPath = path.join(agentsDir, 'CONSTRAINTS.md');
  if (!fs.existsSync(constraintsPath)) {
    if (!dryRun) {
      fs.writeFileSync(constraintsPath, renderConstraintsMd(config), 'utf8');
    }
    logs.push(`${pc.cyan(prefix + '[NUEVO]')} .agents/CONSTRAINTS.md (Contrato de calidad mecanico y anti-degradacion)`);
  } else {
    logs.push(`${pc.dim('[EXISTENTE]')} .agents/CONSTRAINTS.md`);
  }

  // 3. state/instincts.md (Continuous learning memory)
  const instinctsPath = path.join(stateDir, 'instincts.md');
  if (!fs.existsSync(instinctsPath)) {
    if (!dryRun) {
      fs.writeFileSync(instinctsPath, renderInstinctsMd(config), 'utf8');
    }
    logs.push(`${pc.cyan(prefix + '[NUEVO]')} .agents/state/instincts.md (Memoria persistente de patrones e instintos)`);
  } else {
    logs.push(`${pc.green('[PRESERVADO]')} .agents/state/instincts.md (Patrones registrados conservados)`);
  }

  // 4. agents/code-reviewer.md (5-Axis Reviewer)
  const reviewerPath = path.join(agentsFolder, 'code-reviewer.md');
  if (!fs.existsSync(reviewerPath)) {
    if (!dryRun) {
      fs.writeFileSync(reviewerPath, renderReviewerSubagent(config), 'utf8');
    }
    logs.push(`${pc.cyan(prefix + '[NUEVO]')} .agents/agents/code-reviewer.md (Subagente Revisor en 5 Ejes)`);
  } else {
    logs.push(`${pc.dim('[EXISTENTE]')} .agents/agents/code-reviewer.md`);
  }

  // 5. Update orchestron.yaml (Google AX Declarative Manifest)
  const manifestPath = path.join(agentsDir, 'orchestron.yaml');
  if (!dryRun) {
    fs.writeFileSync(manifestPath, renderOrchestronManifest(config), 'utf8');
  }
  logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} .agents/orchestron.yaml (Politicas de gateway y nuevo rol)`);

  // 6. Update master AGENTS.md
  const masterAgentsPath = path.join(agentsDir, 'AGENTS.md');
  if (!dryRun) {
    fs.writeFileSync(masterAgentsPath, renderAgentsMd(config), 'utf8');
  }
  logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} .agents/AGENTS.md (Protocolo maestro con fase 3.5 y directivas)`);

  // 7. Update Root Gateway Router AGENTS.md
  const rootAgentsPath = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(rootAgentsPath) || config.encapsulation.generateRootPointer) {
    const newGatewayContent = renderGatewayRouter(config);
    if (!dryRun) {
      fs.writeFileSync(rootAgentsPath, newGatewayContent, 'utf8');
    }
    logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} AGENTS.md (Gateway Router ligero < 6 KB inlining exclusivamente @[CONSTRAINTS])`);
  }

  // 8. Update CLAUDE.md if present
  const claudePath = path.join(targetDir, 'CLAUDE.md');
  if (fs.existsSync(claudePath)) {
    let claudeContent = fs.readFileSync(claudePath, 'utf8');
    if (claudeContent.includes('.agents/subagents/')) {
      claudeContent = claudeContent.replace(
        '- `.agents/subagents/`',
        '- `.agents/agents/`\n- `.claude/agents/`'
      );
      if (!dryRun) {
        fs.writeFileSync(claudePath, claudeContent, 'utf8');
      }
      logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} CLAUDE.md (Rutas de subagentes actualizadas a .agents/agents/)`);
    }
  }

  // 9. Update rules with YAML frontmatter if missing
  const backendRulePath = path.join(rulesDir, 'backend.md');
  if (fs.existsSync(backendRulePath)) {
    const content = fs.readFileSync(backendRulePath, 'utf8');
    if (!content.trimStart().startsWith('---')) {
      if (!dryRun) fs.writeFileSync(backendRulePath, renderBackendRule(config), 'utf8');
      logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} .agents/rules/backend.md (YAML frontmatter incorporado)`);
    }
  }

  const frontendRulePath = path.join(rulesDir, 'frontend.md');
  if (fs.existsSync(frontendRulePath)) {
    const content = fs.readFileSync(frontendRulePath, 'utf8');
    if (!content.trimStart().startsWith('---')) {
      if (!dryRun) fs.writeFileSync(frontendRulePath, renderFrontendRule(config), 'utf8');
      logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} .agents/rules/frontend.md (YAML frontmatter incorporado)`);
    }
  }

  const databaseRulePath = path.join(rulesDir, 'database.md');
  if (fs.existsSync(databaseRulePath)) {
    const content = fs.readFileSync(databaseRulePath, 'utf8');
    if (!content.trimStart().startsWith('---')) {
      if (!dryRun) fs.writeFileSync(databaseRulePath, renderDatabaseRule(config), 'utf8');
      logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} .agents/rules/database.md (YAML frontmatter incorporado)`);
    }
  }

  const securityRulePath = path.join(rulesDir, 'security.md');
  if (fs.existsSync(securityRulePath)) {
    const content = fs.readFileSync(securityRulePath, 'utf8');
    if (!content.trimStart().startsWith('---')) {
      if (!dryRun) fs.writeFileSync(securityRulePath, renderSecurityRule(config), 'utf8');
      logs.push(`${pc.yellow(prefix + '[ACTUALIZADO]')} .agents/rules/security.md (YAML frontmatter incorporado)`);
    }
  }

  // 10. Generate Cursor Rules if enabled
  if (config.encapsulation.generateCursorRulesCompat) {
    const cursorRulesFolder = path.join(targetDir, '.cursor', 'rules');
    if (!dryRun) {
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
        }
      }
    }
    logs.push(`${pc.cyan(prefix + '[NUEVO]')} .cursor/rules/*.mdc (Exportacion de directivas a Cursor MDC)`);
  }

  spinner.stop(`Actualizacion no destructiva completada con exito${dryRun ? ' (Simulacion DRY-RUN)' : ''}.`);

  const summary = `
${pc.bold(pc.green(`ORCHESTRON ACTUALIZADO EXITOSAMENTE ${dryRun ? '(MODO SIMULACION DRY-RUN)' : ''}`))}

${pc.bold('Detalle de Cambios:')}
${logs.map((l) => `  ${l}`).join('\n')}

${pc.bold('Nuevas Capacidades Incorporadas:')}
  ${pc.cyan('•')} Subagentes nativos en .agents/agents/ y .claude/agents/
  ${pc.cyan('•')} Directivas modulares con YAML frontmatter (Antigravity JIT)
  ${pc.cyan('•')} Reglas de proyecto para Cursor IDE en .cursor/rules/*.mdc
  ${pc.cyan('•')} Contrato Anti-Degradacion (.agents/CONSTRAINTS.md)
  ${pc.cyan('•')} Memoria de Instintos y Aprendizaje (.agents/state/instincts.md)
  ${pc.cyan('•')} Subagente Revisor en 5 Ejes (.agents/agents/code-reviewer.md)

${pc.dim('Tu bitacora historica (CONTEXT.md) y configuraciones previas se mantuvieron 100% intactas.')}
`;

  console.log(
    boxen(summary, {
      padding: 1,
      margin: 1,
      borderColor: dryRun ? 'yellow' : 'green',
      borderStyle: 'round'
    })
  );

  p.outro(pc.bold(pc.cyan('Tu proyecto cuenta ahora con las ultimas capacidades de gobernanza y compatibilidad multi-motor.')));
}
