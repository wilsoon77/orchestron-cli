#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { doctorCommand } from './commands/doctor.js';
import { addRoleCommand } from './commands/addRole.js';
import { syncCommand } from './commands/sync.js';
import { completionCommand } from './commands/completion.js';
import { teamCommand } from './commands/team.js';
import { updateCommand } from './commands/update.js';
import { learnCommand } from './commands/learn.js';
import { hooksCommand } from './commands/hooks.js';
import { interactivePaletteCommand } from './commands/palette.js';

const program = new Command();

program
  .name('orchestron')
  .description(
    'ORCHESTRON CLI — Autonomous AI Agent Team, Quality Gates & Living Context Orchestrator'
  )
  .version('2.0.0');

program
  .command('init')
  .description('Inicializar o reconfigurar el ecosistema de agentes en .agents/')
  .option('-y, --yes', 'Omitir preguntas interactivas y usar la auto-deteccion recomendada')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto (por defecto: actual)')
  .action(async (options) => {
    await initCommand(options);
  });

program
  .command('update')
  .description('Actualizar el ecosistema de agentes con nuevas capacidades sin sobreescribir CONTEXT.md')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto (por defecto: actual)')
  .option('-n, --dry-run', 'Simular la actualizacion mostrando los cambios sin modificar el disco')
  .action(async (options) => {
    await updateCommand(options);
  });

program
  .command('learn')
  .description('Registrar un patron de depuracion, workaround o convencion en la memoria de instintos')
  .option('-t, --type <type>', 'Tipo de leccion: error, convention o workaround')
  .option('-p, --pattern <pattern>', 'Nombre o titulo del patron')
  .option('-r, --rule <rule>', 'Regla aprendida o solucion')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto')
  .action(async (options) => {
    await learnCommand(options);
  });

program
  .command('team')
  .description('Inspeccionar la formacion de subagentes paralelos y politicas de gateway')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto')
  .option('-r, --role <name>', 'Inspeccionar un subagente especifico (ej: ui-ux-specialist)')
  .option('--json', 'Emitir estructura en formato JSON')
  .action(async (options) => {
    await teamCommand(options);
  });

program
  .command('status')
  .description('Mostrar el dashboard de estado del equipo de agentes y memoria viva')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto')
  .action((options) => {
    statusCommand(options);
  });

program
  .command('doctor')
  .description('Auditar la salud de la configuracion, limites de contexto y seguridad Git')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto')
  .option('--ci', 'Modo integracion continua: salida silenciosa y codigo de salida 1 ante fallos')
  .option('--json', 'Salida estructurada en JSON')
  .action((options) => {
    doctorCommand(options);
  });

program
  .command('hooks')
  .description('Instalar o gestionar hooks deterministas de calidad en Git o Claude Code')
  .option('-i, --install', 'Instalar hook pre-commit en .git/hooks/')
  .option('-u, --uninstall', 'Desinstalar hook pre-commit')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto')
  .action((options) => {
    hooksCommand(options);
  });

program
  .command('add-role')
  .description('Incorporar un nuevo rol de agente (DevOps, Mobile, Custom) al equipo')
  .option('-d, --dir <path>', 'Directorio objetivo del proyecto')
  .option('-r, --role <id>', 'Identificador del rol a incorporar (ej: devops-infra)')
  .action(async (options) => {
    await addRoleCommand(options);
  });

program
  .command('sync')
  .description('Registrar un hito o cambio en la memoria viva (CONTEXT.md)')
  .option('-t, --ticket <name>', 'Identificador o titulo del ticket')
  .option('-d, --desc <text>', 'Descripcion del cambio realizado')
  .option('-r, --role <role>', 'Rol responsable')
  .option('--dir <path>', 'Directorio objetivo del proyecto')
  .action(async (options) => {
    await syncCommand(options);
  });

program
  .command('completion')
  .description('Instalar o mostrar el script de autocompletado con TAB para PowerShell o Bash')
  .option('-i, --install', 'Instalar automaticamente en el perfil de PowerShell')
  .action(async (options) => {
    await completionCommand(options);
  });

program
  .command('menu')
  .description('Abrir la consola interactiva con comandos con diagonal (/) y atajos')
  .action(async () => {
    await interactivePaletteCommand();
  });

// Default behavior if run with no args: Open interactive palette
if (process.argv.length <= 2) {
  interactivePaletteCommand();
} else {
  program.parse(process.argv);
}
