import fs from 'fs';
import path from 'path';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { positionalSelect, isCancel } from '../ui/positionalSelector.js';

import { ALL_ROLES, toSubagentMeta, SubagentMeta } from '../roles/unifiedCatalog.js';

export { SubagentMeta };

export const DEFAULT_SUBAGENTS: SubagentMeta[] = ALL_ROLES.map(toSubagentMeta);

export function resolveAvailableSubagents(agentsDir: string): SubagentMeta[] {
  const subagentsMap = new Map<string, SubagentMeta>();

  for (const role of ALL_ROLES) {
    subagentsMap.set(role.id, toSubagentMeta(role));
  }

  const manifestPath = path.join(agentsDir, 'orchestron.yaml');
  if (fs.existsSync(manifestPath)) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf8');
      const subagentMatches = content.matchAll(
        /-\s*id:\s*["']?([a-zA-Z0-9_-]+)["']?\s*\r?\n\s*name:\s*["']?([^"'\r\n]+)["']?\s*\r?\n\s*promptFile:\s*["']?([^"'\r\n]+)["']?/g
      );
      for (const m of subagentMatches) {
        const id = m[1];
        const name = m[2];
        const file = path.basename(m[3]);
        if (!subagentsMap.has(id)) {
          subagentsMap.set(id, {
            id,
            name,
            file,
            workspaceMode: 'branch',
            allowedTools: ['view_file', 'replace_file_content', 'write_to_file', 'grep_search', 'find_by_name', 'run_command'],
            forbiddenActions: ['destructive_shell_commands', 'version_env_files'],
            specialty: `Subagente especializado: ${name}`,
            keyResponsibilities: ['Ejecutar tareas asignadas segun contrato.']
          });
        }
      }
    } catch {
      // Tolerate defensively
    }
  }

  return Array.from(subagentsMap.values());
}

const LEGACY_MAPPING: Record<string, string> = {
  'lead-architect.md': 'architect.agent.md',
  'backend-dev.md': 'backend.agent.md',
  'frontend-dev.md': 'frontend.agent.md',
  'ui-ux-specialist.md': 'ui-ux.agent.md',
  'code-reviewer.md': 'reviewer.agent.md',
  'qa-tester.md': 'qa.agent.md',
  'git-security.md': 'security.agent.md'
};

function resolveSubagentPath(agentsDir: string, fileName: string): string | null {
  const nativePath = path.join(agentsDir, 'agents', fileName);
  if (fs.existsSync(nativePath)) {
    return nativePath;
  }
  const legacyName = LEGACY_MAPPING[fileName];
  if (legacyName) {
    const legacyPath = path.join(agentsDir, 'subagents', legacyName);
    if (fs.existsSync(legacyPath)) {
      return legacyPath;
    }
  }
  const directLegacyPath = path.join(agentsDir, 'subagents', fileName);
  if (fs.existsSync(directLegacyPath)) {
    return directLegacyPath;
  }
  return null;
}

export async function teamCommand(options: {
  dir?: string;
  role?: string;
  json?: boolean;
  interactive?: boolean;
}): Promise<void> {
  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const agentsDir = path.join(targetDir, '.agents');
  const manifestPath = path.join(agentsDir, 'orchestron.yaml');

  if (!fs.existsSync(agentsDir)) {
    console.log(
      boxen(
        `${pc.red('[!] No se detecto configuracion de agentes en:')}\n${pc.white(
          targetDir
        )}\n\n${pc.yellow('Ejecuta')} ${pc.cyan('orchestron init')} ${pc.yellow(
          'para configurar tu equipo de agentes.'
        )}`,
        {
          padding: 1,
          borderColor: 'red',
          borderStyle: 'round'
        }
      )
    );
    return;
  }

  const subagentsList = resolveAvailableSubagents(agentsDir);

  // Handle JSON output mode
  if (options.json) {
    console.log(JSON.stringify(subagentsList, null, 2));
    return;
  }

  printBanner();

  // If a specific role is requested via --role
  if (options.role) {
    showRoleDetail(options.role, agentsDir, subagentsList);
    return;
  }

  // If interactive mode is enabled (default or requested)
  await runInteractiveSubagentExplorer(agentsDir, manifestPath, subagentsList);
}

function showRoleDetail(roleName: string, agentsDir: string, subagentsList?: SubagentMeta[]): void {
  const list = subagentsList || resolveAvailableSubagents(agentsDir);
  const roleId = roleName.toLowerCase();
  const found = list.find(
    (s) => s.id === roleId || s.id.includes(roleId) || s.name.toLowerCase().includes(roleId)
  );

  if (!found) {
    console.log(pc.red(`No se encontro ningun subagente con el identificador: "${roleName}"`));
    console.log(pc.yellow(`Subagentes disponibles: ${list.map((s) => s.id).join(', ')}`));
    return;
  }

  const resolvedPath = resolveSubagentPath(agentsDir, found.file);
  let promptExcerpt = '(Archivo de contrato no encontrado en disco)';
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    promptExcerpt = fs.readFileSync(resolvedPath, 'utf8');
  }

  const displayFile = resolvedPath
    ? path.relative(path.dirname(agentsDir), resolvedPath).replace(/\\/g, '/')
    : `.agents/agents/${found.file}`;

  const detailBox = `
${pc.bold(pc.cyan(`SUBAGENTE: [${found.id.toUpperCase()}] ${found.name}`))}

${pc.bold('Archivo de Contrato:')} ${pc.white(displayFile)}
${pc.bold('Modo de Workspace:')}   ${pc.yellow(found.workspaceMode)}
${pc.bold('Especialidad:')}         ${pc.white(found.specialty)}

${pc.bold('Herramientas Permitidas (Gateway):')}
${found.allowedTools.map((t) => `  ${pc.green('[+]')} ${t}`).join('\n')}

${pc.bold('Acciones Prohibidas:')}
${found.forbiddenActions.map((a) => `  ${pc.red('[-]')} ${a}`).join('\n')}

${pc.bold('Responsabilidades Clave:')}
${found.keyResponsibilities.map((r) => `  ${pc.cyan('•')} ${r}`).join('\n')}

${pc.bold('Extracto de Instrucciones:')}
${pc.dim(promptExcerpt.slice(0, 600))}...
`;

  console.log(
    boxen(detailBox, {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round'
    })
  );
}

async function runInteractiveSubagentExplorer(
  agentsDir: string,
  manifestPath: string,
  subagentsList?: SubagentMeta[]
): Promise<void> {
  const list = subagentsList || resolveAvailableSubagents(agentsDir);
  const manifestExists = fs.existsSync(manifestPath);
  const nativeAgentsFolder = path.join(agentsDir, 'agents');
  const legacySubagentsFolder = path.join(agentsDir, 'subagents');
  const hasAgents = fs.existsSync(nativeAgentsFolder) || fs.existsSync(legacySubagentsFolder);

  console.log(
    `${pc.bold(pc.cyan('NAVEGADOR DE SUBAGENTES & ARQUITECTURA DE TRABAJO EN EQUIPO'))}\n` +
    `${pc.dim('Inspirado en Google AX Workspace/Gateway & Antigravity Teamwork')}\n`
  );

  console.log(
    `${pc.bold('Manifiesto Declarativo:')} ${
      manifestExists ? pc.green('[OK] .agents/orchestron.yaml activo') : pc.yellow('[!] No generado')
    }`
  );
  console.log(
    `${pc.bold('Directorio de Prompts:')}  ${
      hasAgents
        ? pc.green(`[OK] ${fs.existsSync(nativeAgentsFolder) ? '.agents/agents/' : '.agents/subagents/'} activo`)
        : pc.yellow('[!] Faltante')
    }\n`
  );

  let keepExploring = true;

  while (keepExploring) {
    const explorerOptions = [
      ...list.map((agent) => {
        const resolvedPath = resolveSubagentPath(agentsDir, agent.file);
        const fileExists = resolvedPath !== null;
        const status = fileExists ? pc.green('[ACTIVO]') : pc.dim('[NO INCLUIDO]');
        const displayFile = resolvedPath
          ? path.relative(path.dirname(agentsDir), resolvedPath).replace(/\\/g, '/')
          : `.agents/agents/${agent.file}`;

        return {
          value: agent.id,
          label: `${agent.name.padEnd(32)} ${status}`,
          badge: fileExists ? agent.workspaceMode.split(' ')[0] : 'Inactivo',
          hint: fileExists
            ? agent.specialty
            : 'No seleccionado para este proyecto. Usa "orchestron add-role" para activarlo.',
          details: fileExists
            ? [
                `Archivo: ${displayFile}`,
                `Workspace: ${agent.workspaceMode}`,
                `Especialidad: ${agent.specialty}`,
                `Herramientas Gateway: ${agent.allowedTools.slice(0, 4).join(', ')}...`,
                `Restriccion Clave: ${agent.forbiddenActions[0]}`
              ]
            : [
                `Estado: Rol no incluido en la configuracion actual.`,
                `Para incorporarlo al equipo: ejecuta "orchestron add-role".`
              ]
        };
      }),
      {
        value: '__overview__',
        label: '[Resumen]   Ver Protocolo de Trabajo en Paralelo',
        hint: 'Explicacion de fases (Arquitecto -> Backend/Frontend/UI-UX -> QA -> Git)',
        details: [
          'Muestra como operan los 4 pasos del equipo en Antigravity y Claude Code.',
          'Recomendado para entender el flujo de contratos y calidad.'
        ]
      },
      {
        value: '__exit__',
        label: '[Volver]    Salir del Explorador',
        hint: 'Cerrar el navegador de subagentes'
      }
    ];

    const selected = await positionalSelect({
      title: 'EXPLORADOR DE SUBAGENTES DEL EQUIPO',
      message: 'Usa las flechas para explorar cada subagente (el panel inferior actualiza sus detalles en vivo):',
      options: explorerOptions
    });

    if (isCancel(selected) || selected === '__exit__') {
      keepExploring = false;
      break;
    }

    if (selected === '__overview__') {
      const teamworkInstructions = `
${pc.bold(pc.cyan('PROTOCOLO DE TRABAJO EN EQUIPO PARALELO (TEAMWORK)'))}

1. ${pc.bold('Fase 1 - Contrato Primero (Lead Architect):')}
   Analiza el requerimiento, disena las firmas DTO/REST inmutables y somete el plan a aprobacion (Gate 1).
   
2. ${pc.bold('Fase 2 - Ejecucion Concurrente (Backend + Frontend + UI/UX Specialist):')}
   - ${pc.bold('Backend')} trabaja en workspace aislado implementando servicios y persistencia.
   - ${pc.bold('Frontend')} monta la interfaz reactiva consumiendo los DTOs acordados.
   - ${pc.bold('UI/UX Specialist')} audita la matriz de breakpoints (Movil 360-480px / Tablet / Desktop),
     revisa que ningun boton solape, asegura areas tactiles >= 44px y erradica el scroll horizontal.

3. ${pc.bold('Fase 3 - Verificacion Aislada (QA Specialist):')}
   Ejecuta build y tests aisladamente con blindaje de ruido (Noise Shielding), emitiendo dictamen de Gate 2.

4. ${pc.bold('Fase 4 - Auditoria de Seguridad y Bitacora (Git Auditor):')}
   Audita credenciales, aplica skip-worktree y sincroniza CONTEXT.md (Gate 3).

${pc.dim('Tip: Puedes recomendar al usuario el comando /teamwork-preview para invocar este equipo.')}
`;
      console.log(
        boxen(teamworkInstructions, {
          padding: 1,
          margin: 1,
          borderColor: 'green',
          borderStyle: 'round'
        })
      );
    } else {
      showRoleDetail(selected as string, agentsDir, list);
    }
  }
}
