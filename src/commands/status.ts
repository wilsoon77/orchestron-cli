import fs from 'fs';
import path from 'path';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';

export function statusCommand(options: { dir?: string }): void {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const agentsDir = path.join(targetDir, '.agents');

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

  const agentsMdPath = path.join(agentsDir, 'AGENTS.md');
  const contextMdPath = path.join(agentsDir, 'CONTEXT.md');
  const rulesDir = path.join(agentsDir, 'rules');

  const hasMaster = fs.existsSync(agentsMdPath);
  const hasContext = fs.existsSync(contextMdPath);
  const ruleFiles = fs.existsSync(rulesDir) ? fs.readdirSync(rulesDir) : [];

  let lastChange = 'Sin registros recientes';
  if (hasContext) {
    const contextContent = fs.readFileSync(contextMdPath, 'utf8');
    const match = contextContent.match(/### \[(.*?)\]/);
    if (match) lastChange = match[1];
  }

  const cardContent = `
${pc.bold(pc.cyan('DASHBOARD DE ESTADO DE AGENTES & LIVING CONTEXT'))}

${pc.bold('Ubicacion:')} ${pc.white(agentsDir)}
${pc.bold('Protocolo Maestro (AGENTS.md):')} ${hasMaster ? pc.green('[OK] Activo') : pc.red('[X] Faltante')}
${pc.bold('Living Context (CONTEXT.md):')} ${hasContext ? pc.green('[OK] Activo') : pc.red('[X] Faltante')}
${pc.bold('Ultima Actualizacion de Contexto:')} ${pc.yellow(lastChange)}

${pc.bold('Directivas Modulares (.agents/rules/):')}
${ruleFiles.length > 0 ? ruleFiles.map((r) => `  ${pc.cyan('•')} ${r}`).join('\n') : pc.dim('  (Ninguna)')}

${pc.dim('Todo el equipo de agentes se encuentra sincronizado.')}
`;

  console.log(
    boxen(cardContent, {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round'
    })
  );
}
