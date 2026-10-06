import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';

export async function syncCommand(options: {
  ticket?: string;
  desc?: string;
  role?: string;
  dir?: string;
}): Promise<void> {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const contextFile = path.join(targetDir, '.agents', 'CONTEXT.md');

  if (!fs.existsSync(contextFile)) {
    console.log(
      boxen(
        `${pc.red('[!] No se encontro el archivo de memoria viva (.agents/CONTEXT.md).')}\n\n${pc.yellow(
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

  let ticket = options.ticket;
  let desc = options.desc;
  let role = options.role;

  // If arguments not provided via flags, prompt interactively
  if (!ticket || !desc) {
    p.intro(pc.bgCyan(pc.black(' REGISTRO RAPIDO EN LIVING CONTEXT ')));

    if (!ticket) {
      const ticketInput = await p.text({
        message: 'Identificador del ticket o requerimiento (ej. "FEAT-102: Auth JWT"):',
        validate: (v) => (!v.trim() ? 'El ticket no puede estar vacio' : undefined)
      });
      if (p.isCancel(ticketInput)) return;
      ticket = ticketInput as string;
    }

    if (!desc) {
      const descInput = await p.text({
        message: 'Resumen de cambios, nuevos endpoints o componentes implementados:',
        validate: (v) => (!v.trim() ? 'La descripcion no puede estar vacia' : undefined)
      });
      if (p.isCancel(descInput)) return;
      desc = descInput as string;
    }

    if (!role) {
      const roleChoice = await p.select({
        message: 'Rol responsable de la entrega:',
        options: [
          { value: 'Backend Specialist', label: '[Backend] Backend Specialist' },
          { value: 'Frontend Specialist', label: '[Frontend] Frontend Specialist' },
          { value: 'Lead Architect', label: '[Architect] Lead Architect' },
          { value: 'QA Specialist', label: '[QA] QA Specialist' },
          { value: 'Developer', label: '[Dev] Desarrollador' }
        ],
        initialValue: 'Backend Specialist'
      });
      if (p.isCancel(roleChoice)) return;
      role = roleChoice as string;
    }
  }

  role = role || 'Developer';

  const today = new Date().toISOString().split('T')[0];
  const newEntry = `
### [${today}] — ${ticket}
- **Autor / Rol:** ${role}
- **Cambios Realizados:**
  - ${desc}
`;

  const contextContent = fs.readFileSync(contextFile, 'utf8');

  let updatedContent: string;
  if (contextContent.includes('## 5. Bitacora de Estado Vivo (Living Changelog)')) {
    updatedContent = contextContent.replace(
      '## 5. Bitacora de Estado Vivo (Living Changelog)\n',
      `## 5. Bitacora de Estado Vivo (Living Changelog)\n${newEntry}`
    );
  } else {
    updatedContent = contextContent + '\n' + newEntry;
  }

  fs.writeFileSync(contextFile, updatedContent, 'utf8');

  const cardContent = `
${pc.bold(pc.green('LIVING CONTEXT ACTUALIZADO EXITOSAMENTE'))}

${pc.bold('Hito Registrado:')} ${pc.cyan(ticket)}
${pc.bold('Rol:')} ${pc.white(role)}
${pc.bold('Fecha:')} ${pc.yellow(today)}
${pc.bold('Archivo:')} ${pc.white('.agents/CONTEXT.md')}
`;

  console.log(
    boxen(cardContent, {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round'
    })
  );

  p.outro(pc.bold(pc.cyan('Memoria del proyecto sincronizada. Tu agente de IA recordara estos cambios.')));
}
