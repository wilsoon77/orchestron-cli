import path from 'path';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { scanProjectDirectory } from '../detector/stack.js';
import { runInteractiveWizard } from '../wizard/interactive.js';
import { generateOrchestronFiles } from '../generator/engine.js';
import { printBanner } from '../ui/banner.js';

export async function initCommand(options: { yes?: boolean; dir?: string }): Promise<void> {
  try {
    printBanner();

    const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();

    const spinner = p.spinner();
    spinner.start('Escaneando base de codigo, stack y entorno Antigravity...');

    const detectedStack = scanProjectDirectory(targetDir);
    spinner.stop('Escaneo de tecnologias completado con exito.');

    const config = await runInteractiveWizard(detectedStack, options);
    if (!config) return;

    const genSpinner = p.spinner();
    genSpinner.start('Generando arquitectura de orquestacion en .agents/...');

    const result = generateOrchestronFiles(targetDir, config);
    genSpinner.stop('Arquitectura de agentes generada exitosamente.');

    // Render Clean Boxen summary
    const summaryContent = `
${pc.bold(pc.green('ECOSISTEMA DE AGENTES CONFIGURADO EXITOSAMENTE'))}

${pc.bold('Carpeta Base:')} ${pc.cyan(result.agentsFolder)}

${pc.bold('Archivos Generados:')}
${result.createdFiles.map((f) => `  ${pc.green('[+]')} ${f}`).join('\n')}

${pc.bold('Roles Activos en el Equipo:')}
${config.selectedRoles.map((r) => `  ${pc.cyan('•')} ${r}`).join('\n')}

${pc.bold('Puertas de Calidad:')} ${pc.yellow(config.qualityGatesLevel.toUpperCase())}
${pc.bold('Living Context:')} ${pc.cyan(config.livingContext.fileName)} (Actualizacion automatica en Gate 3)

${pc.dim('Antigravity y Claude Code leeran automaticamente las reglas y roles.')}
`;

    console.log(
      boxen(summaryContent, {
        padding: 1,
        margin: 1,
        borderColor: 'cyan',
        borderStyle: 'round'
      })
    );

    p.outro(pc.bold(pc.cyan('Equipo de agentes listo para operar con rigor tecnico.')));
  } catch (error) {
    p.cancel(`Error al inicializar: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(pc.dim(error.stack));
    }
  }
}
