import fs from 'fs';
import path from 'path';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { positionalSelect, isCancel } from '../ui/positionalSelector.js';

export interface SubagentMeta {
  id: string;
  name: string;
  file: string;
  workspaceMode: string;
  allowedTools: string[];
  forbiddenActions: string[];
  specialty: string;
  keyResponsibilities: string[];
}

export const DEFAULT_SUBAGENTS: SubagentMeta[] = [
  {
    id: 'lead-architect',
    name: 'Lead Architect & Coordinator',
    file: 'architect.agent.md',
    workspaceMode: 'inherit',
    allowedTools: ['read_file', 'view_file', 'search_web', 'read_url_content', 'mysql_query (read-only)'],
    forbiddenActions: ['Modificar codigo de aplicacion antes de Gate 1', 'Comandos destructivos'],
    specialty: 'Analisis tecnico, descomposicion de tickets, contratos DTO y planificacion',
    keyResponsibilities: [
      'Disenar contratos JSON/DTO inmutables antes de codificar.',
      'Definir arquitectura de componentes y estado.',
      'Emitir plan de ejecucion y someterlo a aprobacion (Gate 1).'
    ]
  },
  {
    id: 'backend-dev',
    name: 'Backend Specialist',
    file: 'backend.agent.md',
    workspaceMode: 'branch (aislado)',
    allowedTools: ['read_file', 'view_file', 'write_to_file', 'replace_file_content', 'run_command:dev'],
    forbiddenActions: ['Modificar vistas frontend directamente', 'Versionar credenciales o .env'],
    specialty: 'Logica de negocio, servicios, endpoints REST y persistencia',
    keyResponsibilities: [
      'Implementar controladores y servicios respetando los DTOs de Gate 1.',
      'Separacion estricta entre modelos de base de datos y contratos expuestos.',
      'Validaciones rigurosas y tipado fuerte.'
    ]
  },
  {
    id: 'frontend-dev',
    name: 'Frontend Specialist',
    file: 'frontend.agent.md',
    workspaceMode: 'branch (aislado)',
    allowedTools: ['read_file', 'view_file', 'write_to_file', 'replace_file_content', 'run_command:dev'],
    forbiddenActions: ['Modificar contratos o endpoints sin coordinar con Arquitecto'],
    specialty: 'Componentes reactivos, logica de estado cliente y consumo de APIs',
    keyResponsibilities: [
      'Consumir servicios HTTP tipados usando contratos del Arquitecto.',
      'Gestion de estados de carga, vacios y feedback visual de error.',
      'Desacoplar componentes de logica de negocio pesada.'
    ]
  },
  {
    id: 'ui-ux-specialist',
    name: 'UI/UX & Responsive Specialist',
    file: 'ui-ux.agent.md',
    workspaceMode: 'share (trabajo conjunto sobre vistas)',
    allowedTools: ['read_file', 'view_file', 'write_to_file', 'replace_file_content', 'figma_data', 'generative_ui'],
    forbiddenActions: ['Modificar logica de negocio o bases de datos', 'Colores arbitrarios fuera de tokens'],
    specialty: 'Ergonomia visual, botones accesibles, espaciados y responsividad multi-pantalla',
    keyResponsibilities: [
      'Auditar matriz de breakpoints: Movil (360-480px), Tablet (768-1024px), Desktop (1280px+).',
      'Garantizar areas tactiles en botones (minimo 44x44px) y evitar colisiones/solapes.',
      'Prevenir desbordamiento horizontal (overflow-x) y asegurar espaciado coherente.'
    ]
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer & Quality Auditor',
    file: 'reviewer.agent.md',
    workspaceMode: 'inherit',
    allowedTools: ['read_file', 'view_file', 'run_command:git diff', 'run_command:git status'],
    forbiddenActions: ['Modificar codigo de aplicacion directamente', 'Aprobar cambios con @ts-ignore'],
    specialty: 'Revision adversarial del git diff en 5 ejes con remedios estructurales',
    keyResponsibilities: [
      'Evaluar Correctitud, Legibilidad, Arquitectura, Seguridad y Rendimiento.',
      'Detectar fallos silenciosos y dependencias circulares en el diff.',
      'Proponer el remedio estructural o refactor exacto en lugar de senalamientos abstractos.'
    ]
  },
  {
    id: 'qa-tester',
    name: 'QA & Verification Specialist',
    file: 'qa.agent.md',
    workspaceMode: 'inherit',
    allowedTools: ['run_command:build', 'run_command:test', 'run_command:lint', 'read_file', 'view_file'],
    forbiddenActions: ['Modificar logica de negocio para forzar aprobacion de pruebas'],
    specialty: 'Verificacion estricta (Gate 2) y aislamiento de ruido de terminal (Noise Shielding)',
    keyResponsibilities: [
      'Ejecutar suites de compilacion y linters en ejecucion aislada.',
      'Sintetizar terminales con cientos de lineas identificando causa raiz precisa.',
      'Garantizar 0 errores de compilacion y tipos antes de aprobar el ticket.'
    ]
  },
  {
    id: 'git-security',
    name: 'Git & Security Auditor',
    file: 'security.agent.md',
    workspaceMode: 'inherit',
    allowedTools: ['run_command:git', 'read_file', 'view_file'],
    forbiddenActions: ['git push --force', 'Versionar archivos .env o credenciales'],
    specialty: 'Seguridad en commits (Gate 3), higiene Git y sincronizacion de Living Context',
    keyResponsibilities: [
      'Auditar que git status no contenga archivos sensibles o de credenciales.',
      'Verificar proteccion de variables locales mediante skip-worktree.',
      'Actualizar .agents/CONTEXT.md con los hitos completados antes del cierre.'
    ]
  }
];

export async function teamCommand(options: {
  dir?: string;
  role?: string;
  json?: boolean;
  interactive?: boolean;
}): Promise<void> {
  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const agentsDir = path.join(targetDir, '.agents');
  const subagentsDir = path.join(agentsDir, 'subagents');
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

  // Handle JSON output mode
  if (options.json) {
    console.log(JSON.stringify(DEFAULT_SUBAGENTS, null, 2));
    return;
  }

  printBanner();

  // If a specific role is requested via --role
  if (options.role) {
    showRoleDetail(options.role, subagentsDir);
    return;
  }

  // If interactive mode is enabled (default or requested)
  await runInteractiveSubagentExplorer(subagentsDir, manifestPath);
}

function showRoleDetail(roleName: string, subagentsDir: string): void {
  const roleId = roleName.toLowerCase();
  const found = DEFAULT_SUBAGENTS.find(
    (s) => s.id === roleId || s.id.includes(roleId) || s.name.toLowerCase().includes(roleId)
  );

  if (!found) {
    console.log(pc.red(`No se encontro ningun subagente con el identificador: "${roleName}"`));
    console.log(pc.yellow(`Subagentes disponibles: ${DEFAULT_SUBAGENTS.map((s) => s.id).join(', ')}`));
    return;
  }

  const subagentFilePath = path.join(subagentsDir, found.file);
  let promptExcerpt = '(Archivo de contrato no encontrado en disco)';
  if (fs.existsSync(subagentFilePath)) {
    promptExcerpt = fs.readFileSync(subagentFilePath, 'utf8');
  }

  const detailBox = `
${pc.bold(pc.cyan(`SUBAGENTE: [${found.id.toUpperCase()}] ${found.name}`))}

${pc.bold('Archivo de Contrato:')} ${pc.white(`.agents/subagents/${found.file}`)}
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

async function runInteractiveSubagentExplorer(subagentsDir: string, manifestPath: string): Promise<void> {
  const manifestExists = fs.existsSync(manifestPath);

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
      fs.existsSync(subagentsDir) ? pc.green('[OK] .agents/subagents/ activo') : pc.yellow('[!] Faltante')
    }\n`
  );

  let keepExploring = true;

  while (keepExploring) {
    const explorerOptions = [
      ...DEFAULT_SUBAGENTS.map((agent) => {
        const fileExists = fs.existsSync(path.join(subagentsDir, agent.file));
        const status = fileExists ? pc.green('[ACTIVO]') : pc.dim('[NO INCLUIDO]');
        return {
          value: agent.id,
          label: `${agent.name.padEnd(32)} ${status}`,
          badge: fileExists ? agent.workspaceMode.split(' ')[0] : 'Inactivo',
          hint: fileExists
            ? agent.specialty
            : 'No seleccionado para este proyecto. Usa "orchestron add-role" para activarlo.',
          details: fileExists
            ? [
                `Archivo: .agents/subagents/${agent.file}`,
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
      showRoleDetail(selected as string, subagentsDir);
    }
  }
}
