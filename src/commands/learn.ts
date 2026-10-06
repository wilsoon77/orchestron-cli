import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { LearnOptions } from '../types/index.js';

export async function learnCommand(options: LearnOptions): Promise<void> {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const instinctsFile = path.join(targetDir, '.agents', 'state', 'instincts.md');

  if (!fs.existsSync(instinctsFile)) {
    console.log(
      boxen(
        `${pc.red('[!] No se encontro el archivo de instintos (.agents/state/instincts.md).')}\n\n${pc.yellow(
          'Ejecuta primero:'
        )} ${pc.cyan('orchestron init')} o ${pc.cyan('orchestron update')}`,
        {
          padding: 1,
          borderColor: 'red',
          borderStyle: 'round'
        }
      )
    );
    return;
  }

  let type = options.type;
  let pattern = options.pattern;
  let rule = options.rule;

  if (!pattern || !rule) {
    p.intro(pc.bgCyan(pc.black(' REGISTRO DE INSTINTOS Y APRENDIZAJE CONTINUO ')));

    if (!type) {
      const typeChoice = await p.select({
        message: 'Tipo de leccion aprendida:',
        options: [
          { value: 'error', label: '[Error] Resolucion de un bug o error no trivial' },
          { value: 'convention', label: '[Convencion] Regla o convencion descubierta en el proyecto' },
          { value: 'workaround', label: '[Workaround] Solucion a quirk de libreria o caso borde' }
        ],
        initialValue: 'error'
      });
      if (p.isCancel(typeChoice)) return;
      type = typeChoice as string;
    }

    if (!pattern) {
      const patternInput = await p.text({
        message:
          type === 'error'
            ? 'Titulo del error o problema resuelto:'
            : 'Nombre de la convencion o quirk:',
        validate: (v) => (!v.trim() ? 'El titulo no puede estar vacio' : undefined)
      });
      if (p.isCancel(patternInput)) return;
      pattern = patternInput as string;
    }

    if (!rule) {
      const ruleInput = await p.text({
        message:
          type === 'error'
            ? 'Causa raiz y solucion / regla aprendida:'
            : 'Detalle de la regla o workaround a seguir:',
        validate: (v) => (!v.trim() ? 'La descripcion no puede estar vacia' : undefined)
      });
      if (p.isCancel(ruleInput)) return;
      rule = ruleInput as string;
    }
  }

  type = type || 'error';
  const today = new Date().toISOString().split('T')[0];

  let newEntry = '';
  let targetSectionHeader = '';

  if (type === 'convention') {
    targetSectionHeader = '## 2. Convenciones Operativas y Peculiaridades del Proyecto (Project Quirks)';
    newEntry = `\n- **[${today}] ${pattern}:** ${rule}\n`;
  } else if (type === 'workaround') {
    targetSectionHeader = '## 3. Workarounds y Soluciones a Casos Borde (Workarounds)';
    newEntry = `\n- **[${today}] ${pattern}:** ${rule}\n`;
  } else {
    // Default error pattern
    targetSectionHeader = '## 1. Patrones de Resolucion de Errores (Error Resolution Patterns)';
    newEntry = `
### [${today}] — ${pattern}
- **Disparador / Error:** ${pattern}
- **Regla Aprendida / Solucion:** ${rule}
`;
  }

  let content = fs.readFileSync(instinctsFile, 'utf8');

  if (content.includes(targetSectionHeader)) {
    content = content.replace(targetSectionHeader, `${targetSectionHeader}\n${newEntry}`);
  } else {
    content += `\n\n${targetSectionHeader}\n${newEntry}`;
  }

  fs.writeFileSync(instinctsFile, content, 'utf8');

  console.log(
    boxen(
      `${pc.bold(pc.green('INSTINTO REGISTRADO CORRECTAMENTE'))}\n\n` +
        `${pc.bold('Archivo:')} ${pc.cyan('.agents/state/instincts.md')}\n` +
        `${pc.bold('Tipo:')} ${pc.yellow(type.toUpperCase())}\n` +
        `${pc.bold('Patron:')} ${pc.white(pattern)}\n` +
        `${pc.bold('Regla:')} ${pc.dim(rule)}`,
      {
        padding: 1,
        borderColor: 'cyan',
        borderStyle: 'round'
      }
    )
  );

  p.outro(pc.bold(pc.cyan('Memoria persistente actualizada. Los agentes respetaran este patron.')));
}
