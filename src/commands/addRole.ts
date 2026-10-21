import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { positionalSelect } from '../ui/positionalSelector.js';
import {
  ALL_ROLES,
  getUnifiedRole,
  createCustomUnifiedRole
} from '../roles/unifiedCatalog.js';
import { UnifiedRoleDefinition } from '../types/index.js';

export interface AddRoleOptions {
  dir?: string;
  role?: string;
}

export function sanitizeRoleId(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const truncated = cleaned.slice(0, 50).replace(/-+$/, '');
  return truncated || 'custom-role';
}

export function injectRoleIntoOrchestronYaml(
  yamlContent: string,
  role: UnifiedRoleDefinition
): string {
  let updated = yamlContent;

  // 1. Inyectar politica de gateway si no existe
  if (!updated.includes(`- role: ${role.id}`)) {
    const policyYaml = `      - role: ${role.id}\n        allowedTools:\n${role.toolsAntigravity.map((t) => `          - ${t}`).join('\n')}\n        forbiddenActions:\n${(role.forbiddenActions || ['destructive_shell_commands', 'version_env_files']).map((a) => `          - ${a}`).join('\n')}`;

    if (updated.match(/policies:\s*\[\s*\]/)) {
      updated = updated.replace(/policies:\s*\[\s*\]/, `policies:\n${policyYaml}`);
    } else if (updated.match(/policies:\s*\r?\n/)) {
      updated = updated.replace(/(policies:\s*\r?\n)/, `$1${policyYaml}\n\n`);
    }
  }

  // 2. Inyectar subagente si no existe
  if (!updated.includes(`- id: ${role.id}`)) {
    const subagentYaml = `    - id: ${role.id}\n      name: "${role.name}"\n      promptFile: ".agents/agents/${role.agentFileName || `${role.id}.md`}"\n      workspaceMode: "${role.workspaceMode || 'branch'}"${role.canForkParallelTeam ? '\n      canForkParallelTeam: true' : ''}`;

    if (updated.match(/subagents:\s*\[\s*\]/)) {
      updated = updated.replace(/subagents:\s*\[\s*\]/, `subagents:\n${subagentYaml}`);
    } else if (updated.match(/subagents:\s*\r?\n/)) {
      updated = updated.replace(/(subagents:\s*\r?\n)/, `$1${subagentYaml}\n\n`);
    }
  }

  // 3. Si es rol personalizado, serializar en spec.customRoles
  if (role.isCustom && !updated.includes(`- id: ${role.id}`) && !updated.includes(`customRoles:`)) {
    const customRoleYaml = `  customRoles:\n    - id: ${role.id}\n      name: "${role.name}"\n      goal: "${(role.goal || '').replace(/"/g, '\\"')}"\n      responsibility: "${(role.responsibility || '').replace(/"/g, '\\"')}"\n      rule: "${((role.rules && role.rules[0]) || '').replace(/"/g, '\\"')}"\n`;
    if (updated.includes('spec:')) {
      updated = updated.replace(/(spec:\s*\r?\n)/, `$1${customRoleYaml}`);
    }
  }

  return updated;
}

export function appendRoleToLivingContext(
  contextContent: string,
  role: UnifiedRoleDefinition
): string {
  const today = new Date().toISOString().split('T')[0];
  const logEntry = `\n### [${today}] — Incorporacion de Nuevo Rol: ${role.name}\n- **Autor / Rol:** Orchestron CLI (add-role)\n- **Cambios Realizados:**\n  - Se anadio el rol de agente **${role.name}** (\`${role.id}\`) al ecosistema.\n  - Creada directiva modular en \`.agents/rules/${role.ruleFileName || `${role.id}.md`}\`.\n  - Creado subagente nativo en \`.agents/agents/${role.agentFileName || `${role.id}.md`}\`.\n  - Sincronizado manifiesto \`.agents/orchestron.yaml\` y catalogo de equipo.\n`;

  const changelogHeaderRegex = /(##\s*(?:5\.\s*)?Bitacora de Estado Vivo[^\r\n]*\r?\n)/i;

  if (changelogHeaderRegex.test(contextContent)) {
    return contextContent.replace(changelogHeaderRegex, `$1${logEntry}`);
  }

  return contextContent + `\n\n## 5. Bitacora de Estado Vivo (Living Changelog)\n${logEntry}`;
}

export async function addRoleCommand(options: AddRoleOptions): Promise<void> {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const agentsDir = path.join(targetDir, '.agents');
  const agentsFile = path.join(agentsDir, 'AGENTS.md');
  const contextFile = path.join(agentsDir, 'CONTEXT.md');
  const manifestFile = path.join(agentsDir, 'orchestron.yaml');
  const rulesDir = path.join(agentsDir, 'rules');
  const agentsFolder = path.join(agentsDir, 'agents');

  if (!fs.existsSync(agentsFile) && !fs.existsSync(manifestFile)) {
    console.log(
      boxen(
        `${pc.red('[!] No existe configuracion de agentes en este directorio.')}\n\n${pc.yellow(
          'Ejecuta primero:'
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

  const agentsContent = fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, 'utf8') : '';
  const availableRoles = ALL_ROLES.filter((r) => !agentsContent.includes(r.name));

  let selectedRoleId: string | symbol | undefined = options.role || process.env.ORCHESTRON_TEST_ROLE;

  if (!selectedRoleId) {
    const roleChoices = [
      ...availableRoles.map((r) => ({
        value: r.id,
        label: `${(r.icon || `[${r.id}]`).padEnd(12)} ${r.name}`,
        hint: r.goal || r.description,
        details: [
          `Titulo: ${r.title || r.name}`,
          `Meta Principal: ${r.goal || r.description}`,
          `Responsabilidad: ${r.responsibility}`,
          `Herramientas: ${r.toolsAntigravity.slice(0, 4).join(', ')}...`
        ]
      })),
      {
        value: '__custom__',
        label: '[Custom]     Definir un Rol Personalizado...',
        hint: 'Crear un rol con tus propias responsabilidades y reglas',
        details: [
          'Te permitira definir nombre, meta, responsabilidades y reglas a medida.',
          'Se generaran atomicamente directiva con frontmatter, subagente, politica y bitacora.'
        ]
      }
    ];

    selectedRoleId = await positionalSelect({
      title: 'CATALOGO DE ROLES EXTENDIDOS',
      message: 'Selecciona el rol que deseas incorporar al equipo:',
      options: roleChoices
    });

    if (p.isCancel(selectedRoleId)) {
      p.cancel('Operacion cancelada');
      return;
    }
  }

  let roleToAdd: UnifiedRoleDefinition;

  if (selectedRoleId === '__custom__') {
    let customName = process.env.ORCHESTRON_CUSTOM_ROLE_NAME;
    let customGoal = 'Proveer automatizacion y analisis especializado.';
    let customResp = 'Ejecutar tareas especificas del dominio conforme al contrato acordado.';
    let customRule = 'No ejecutar cambios destructivos sin autorizacion explicita.';

    if (!customName) {
      const nameInput = await p.text({
        message: 'Nombre del rol (ej. "Cybersecurity Pentester"):',
        validate: (v) => (!v.trim() ? 'El nombre no puede estar vacio' : undefined)
      });
      if (p.isCancel(nameInput)) return;
      customName = nameInput as string;

      const goalInput = await p.text({
        message: 'Meta principal del rol (¿que valor aporta?):',
        validate: (v) => (!v.trim() ? 'La meta no puede estar vacia' : undefined)
      });
      if (p.isCancel(goalInput)) return;
      customGoal = goalInput as string;

      const respInput = await p.text({
        message: 'Responsabilidad clave (ej. "Auditar vulnerabilidades OWASP"):',
        validate: (v) => (!v.trim() ? 'Debe tener al menos una responsabilidad' : undefined)
      });
      if (p.isCancel(respInput)) return;
      customResp = respInput as string;

      const ruleInput = await p.text({
        message: 'Regla o prohibicion inviolable del rol:',
        defaultValue: customRule
      });
      if (p.isCancel(ruleInput)) return;
      customRule = ruleInput as string;
    }

    const cleanId = sanitizeRoleId(customName);
    roleToAdd = createCustomUnifiedRole({
      id: cleanId,
      name: customName,
      goal: customGoal,
      responsibility: customResp,
      rule: customRule,
      workspaceMode: 'branch'
    });
  } else {
    const found = getUnifiedRole(selectedRoleId as string);
    if (!found) {
      console.log(pc.red(`Rol no reconocido: ${String(selectedRoleId)}`));
      return;
    }
    roleToAdd = found;
  }

  // --- EJECUCION ATOMICA MULTI-OBJETIVO ---
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.mkdirSync(agentsFolder, { recursive: true });

  // 1. TARGET 1: .agents/rules/<ruleFileName> con YAML frontmatter
  const ruleFileName = roleToAdd.ruleFileName || `${roleToAdd.id}.md`;
  const ruleFilePath = path.join(rulesDir, ruleFileName);
  const ruleFileContent = roleToAdd.ruleTemplate({} as any);
  fs.writeFileSync(ruleFilePath, ruleFileContent, 'utf8');

  // 2. TARGET 2: .agents/agents/<agentFileName> con YAML frontmatter nativo Antigravity
  const agentFileName = roleToAdd.agentFileName || `${roleToAdd.id}.md`;
  const agentFilePath = path.join(agentsFolder, agentFileName);
  const agentFileContent = roleToAdd.subagentTemplateAntigravity({} as any);
  fs.writeFileSync(agentFilePath, agentFileContent, 'utf8');

  // 2b. Claude Code subagent si aplica
  const claudeAgentsFolder = path.join(targetDir, '.claude', 'agents');
  if (fs.existsSync(path.join(targetDir, '.claude')) && roleToAdd.subagentTemplateClaude) {
    fs.mkdirSync(claudeAgentsFolder, { recursive: true });
    const claudePath = path.join(claudeAgentsFolder, agentFileName);
    fs.writeFileSync(claudePath, roleToAdd.subagentTemplateClaude({} as any), 'utf8');
  }

  // 2c. Cursor Rule si aplica
  const cursorRulesFolder = path.join(targetDir, '.cursor', 'rules');
  if (fs.existsSync(cursorRulesFolder) && roleToAdd.cursorRuleTemplate) {
    const cursorRulePath = path.join(cursorRulesFolder, `${roleToAdd.id}.mdc`);
    fs.writeFileSync(cursorRulePath, roleToAdd.cursorRuleTemplate({} as any), 'utf8');
  }

  // 3. TARGET 3: .agents/orchestron.yaml
  if (fs.existsSync(manifestFile)) {
    const currentYaml = fs.readFileSync(manifestFile, 'utf8');
    const updatedYaml = injectRoleIntoOrchestronYaml(currentYaml, roleToAdd);
    fs.writeFileSync(manifestFile, updatedYaml, 'utf8');
  }

  // 4. TARGET 4: .agents/CONTEXT.md (Living Changelog)
  if (fs.existsSync(contextFile)) {
    const currentContext = fs.readFileSync(contextFile, 'utf8');
    const updatedContext = appendRoleToLivingContext(currentContext, roleToAdd);
    fs.writeFileSync(contextFile, updatedContext, 'utf8');
  }

  // 5. TARGET 5: .agents/AGENTS.md (Protocolo Maestro)
  if (fs.existsSync(agentsFile)) {
    const currentAgents = fs.readFileSync(agentsFile, 'utf8');
    const roleMarkdown = `\n### ${roleToAdd.icon || `[${roleToAdd.id}]`} ${roleToAdd.name}\n- **Meta:** ${roleToAdd.goal || roleToAdd.description}\n- **Responsabilidades:**\n${(roleToAdd.responsibilities || [roleToAdd.responsibility]).map((r) => `  - ${r}`).join('\n')}\n- **Reglas del Rol:**\n${(roleToAdd.rules || []).map((rule) => `  - ${rule}`).join('\n')}\n`;

    let updatedAgents: string;
    if (currentAgents.includes('## 5. Matriz de Seguridad')) {
      updatedAgents = currentAgents.replace(
        '## 5. Matriz de Seguridad',
        `${roleMarkdown.trim()}\n\n---\n\n## 5. Matriz de Seguridad`
      );
    } else {
      updatedAgents = currentAgents + '\n' + roleMarkdown;
    }
    fs.writeFileSync(agentsFile, updatedAgents, 'utf8');
  }

  const successCard = `
${pc.bold(pc.green('ROL INCORPORADO EXITOSAMENTE (SINCRONIZACION ATOMICA)'))}

${pc.bold('Rol:')}                 ${pc.cyan(roleToAdd.name)} (\`${roleToAdd.id}\`)
${pc.bold('Directiva Modular:')}    ${pc.white(path.relative(targetDir, ruleFilePath))} ${pc.dim('(YAML frontmatter)')}
${pc.bold('Subagente Nativo:')}     ${pc.white(path.relative(targetDir, agentFilePath))} ${pc.dim('(Antigravity YAML)')}
${pc.bold('Manifiesto:')}           ${pc.white('.agents/orchestron.yaml')} ${pc.dim('(Gateway & Subagents)')}
${pc.bold('Living Context:')}       ${pc.white('.agents/CONTEXT.md')} ${pc.dim('(Changelog actualizado)')}
${pc.bold('Protocolo Maestro:')}    ${pc.white('.agents/AGENTS.md')}
`;

  console.log(
    boxen(successCard, {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round'
    })
  );

  p.outro(pc.bold(pc.cyan(`El rol ${roleToAdd.name} ya esta activo y sincronizado en todo el ecosistema.`)));
}
