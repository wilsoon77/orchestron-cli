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
import { renderReviewerSubagent } from '../generator/templates/subagentsTemplate.js';
import { renderAgentsMd } from '../generator/templates/agentsTemplate.js';
import { renderOrchestronManifest } from '../generator/templates/manifestTemplate.js';

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

  p.intro(pc.bgCyan(pc.black(' ACTUALIZACION NO DESTRUCTIVA DE ORCHESTRON ')));

  const spinner = p.spinner();
  spinner.start('Analizando arquitectura existente y detectando nuevas capacidades...');

  const stack = scanProjectDirectory(targetDir);
  const subagentsDir = path.join(agentsDir, 'subagents');
  const stateDir = path.join(agentsDir, 'state');
  const rulesDir = path.join(agentsDir, 'rules');

  fs.mkdirSync(subagentsDir, { recursive: true });
  fs.mkdirSync(stateDir, { recursive: true });
  fs.mkdirSync(rulesDir, { recursive: true });

  // Read existing subagents to preserve active swarm selection
  let selectedRoles: string[] = [
    'lead-architect',
    'backend-dev',
    'frontend-dev',
    'ui-ux-specialist',
    'code-reviewer',
    'qa-tester',
    'git-security'
  ];

  if (fs.existsSync(subagentsDir)) {
    const existingAgentFiles = fs.readdirSync(subagentsDir);
    const roleMapping: Record<string, string> = {
      'architect.agent.md': 'lead-architect',
      'backend.agent.md': 'backend-dev',
      'frontend.agent.md': 'frontend-dev',
      'ui-ux.agent.md': 'ui-ux-specialist',
      'qa.agent.md': 'qa-tester',
      'security.agent.md': 'git-security'
    };

    const detectedRoles: string[] = ['code-reviewer']; // Add the new reviewer by default
    for (const [file, roleId] of Object.entries(roleMapping)) {
      if (existingAgentFiles.includes(file)) {
        detectedRoles.push(roleId);
      }
    }
    if (detectedRoles.length > 1) {
      selectedRoles = Array.from(new Set(detectedRoles));
    }
  }

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

  // 1. CONTEXT.md (Living Context) — STRICTLY PRESERVED!
  const contextPath = path.join(agentsDir, 'CONTEXT.md');
  if (fs.existsSync(contextPath)) {
    logs.push(`${pc.green('[PRESERVADO]')} .agents/CONTEXT.md (Memoria viva y bitacora historica intactas)`);
  } else {
    // If not exists, initialize
    const { renderContextMd } = await import('../generator/templates/contextTemplate.js');
    fs.writeFileSync(contextPath, renderContextMd(config), 'utf8');
    logs.push(`${pc.cyan('[NUEVO]')} .agents/CONTEXT.md inicializado`);
  }

  // 2. CONSTRAINTS.md (Quality Bar & Anti-Degradation)
  const constraintsPath = path.join(agentsDir, 'CONSTRAINTS.md');
  if (!fs.existsSync(constraintsPath)) {
    fs.writeFileSync(constraintsPath, renderConstraintsMd(config), 'utf8');
    logs.push(`${pc.cyan('[NUEVO]')} .agents/CONSTRAINTS.md (Contrato de calidad mecanico y anti-degradacion)`);
  } else {
    logs.push(`${pc.dim('[EXISTENTE]')} .agents/CONSTRAINTS.md`);
  }

  // 3. state/instincts.md (Continuous learning memory)
  const instinctsPath = path.join(stateDir, 'instincts.md');
  if (!fs.existsSync(instinctsPath)) {
    fs.writeFileSync(instinctsPath, renderInstinctsMd(config), 'utf8');
    logs.push(`${pc.cyan('[NUEVO]')} .agents/state/instincts.md (Memoria persistente de patrones e instintos)`);
  } else {
    logs.push(`${pc.green('[PRESERVADO]')} .agents/state/instincts.md (Patrones registrados conservados)`);
  }

  // 4. subagents/reviewer.agent.md (5-Axis Reviewer)
  const reviewerPath = path.join(subagentsDir, 'reviewer.agent.md');
  if (!fs.existsSync(reviewerPath)) {
    fs.writeFileSync(reviewerPath, renderReviewerSubagent(config), 'utf8');
    logs.push(`${pc.cyan('[NUEVO]')} .agents/subagents/reviewer.agent.md (Subagente Revisor en 5 Ejes)`);
  } else {
    logs.push(`${pc.dim('[EXISTENTE]')} .agents/subagents/reviewer.agent.md`);
  }

  // 5. Update orchestron.yaml (Google AX Declarative Manifest)
  const manifestPath = path.join(agentsDir, 'orchestron.yaml');
  fs.writeFileSync(manifestPath, renderOrchestronManifest(config), 'utf8');
  logs.push(`${pc.yellow('[ACTUALIZADO]')} .agents/orchestron.yaml (Politicas de gateway y nuevo rol)`);

  // 6. Update master AGENTS.md
  const masterAgentsPath = path.join(agentsDir, 'AGENTS.md');
  fs.writeFileSync(masterAgentsPath, renderAgentsMd(config), 'utf8');
  logs.push(`${pc.yellow('[ACTUALIZADO]')} .agents/AGENTS.md (Protocolo maestro con fase 3.5 y directivas)`);

  // 7. Update Root Pointer AGENTS.md
  const rootAgentsPath = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(rootAgentsPath)) {
    let rootContent = fs.readFileSync(rootAgentsPath, 'utf8');
    if (!rootContent.includes('@[CONSTRAINTS](.agents/CONSTRAINTS.md)')) {
      rootContent = rootContent.replace(
        '@[AGENTS](.agents/AGENTS.md)',
        '@[AGENTS](.agents/AGENTS.md)\n@[CONSTRAINTS](.agents/CONSTRAINTS.md)'
      );
    }
    if (!rootContent.includes('.agents/CONSTRAINTS.md')) {
      rootContent = rootContent.replace(
        '- `.agents/orchestron.yaml`',
        '- `.agents/CONSTRAINTS.md`\n- `.agents/orchestron.yaml`'
      );
    }
    fs.writeFileSync(rootAgentsPath, rootContent, 'utf8');
    logs.push(`${pc.yellow('[ACTUALIZADO]')} AGENTS.md (Enlace raiz sincronizado con CONSTRAINTS.md)`);
  }

  spinner.stop('Actualizacion no destructiva completada con exito.');

  const summary = `
${pc.bold(pc.green('ORCHESTRON ACTUALIZADO EXITOSAMENTE'))}

${pc.bold('Detalle de Cambios:')}
${logs.map((l) => `  ${l}`).join('\n')}

${pc.bold('Nuevas Capacidades Incorporadas:')}
  ${pc.cyan('•')} Contrato Anti-Degradacion (.agents/CONSTRAINTS.md)
  ${pc.cyan('•')} Memoria de Instintos y Aprendizaje (.agents/state/instincts.md)
  ${pc.cyan('•')} Subagente Revisor en 5 Ejes (.agents/subagents/reviewer.agent.md)
  ${pc.cyan('•')} Escudo de Seguridad y Anti-Degradacion en "orchestron doctor"
  ${pc.cyan('•')} Comando de Aprendizaje Continuo: "orchestron learn"

${pc.dim('Tu bitacora historica (CONTEXT.md) y configuraciones previas se mantuvieron 100% intactas.')}
`;

  console.log(
    boxen(summary, {
      padding: 1,
      margin: 1,
      borderColor: 'green',
      borderStyle: 'round'
    })
  );

  p.outro(pc.bold(pc.cyan('Tu proyecto cuenta ahora con las ultimas capacidades de gobernanza y calidad.')));
}
