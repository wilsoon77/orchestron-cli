import fs from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import boxen from 'boxen';
import pc from 'picocolors';
import { printBanner } from '../ui/banner.js';
import { EXTENDED_ROLES } from '../roles/catalog.js';
import { RoleConfig } from '../types/index.js';
import { positionalSelect } from '../ui/positionalSelector.js';

export async function addRoleCommand(options: { dir?: string }): Promise<void> {
  printBanner();

  const targetDir = options.dir ? path.resolve(options.dir) : process.cwd();
  const agentsDir = path.join(targetDir, '.agents');
  const agentsFile = path.join(agentsDir, 'AGENTS.md');
  const contextFile = path.join(agentsDir, 'CONTEXT.md');
  const rulesDir = path.join(agentsDir, 'rules');

  if (!fs.existsSync(agentsFile)) {
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

  const agentsContent = fs.readFileSync(agentsFile, 'utf8');

  // Filter out roles that are already in AGENTS.md
  const availableCatalogRoles = EXTENDED_ROLES.filter((r) => !agentsContent.includes(r.name));

  const roleChoices = [
    ...availableCatalogRoles.map((r) => ({
      value: r.id,
      label: `${r.icon.padEnd(12)} ${r.name}`,
      hint: r.goal,
      details: [
        `Titulo: ${r.title}`,
        `Meta Principal: ${r.goal}`,
        `Responsabilidad: ${r.responsibilities[0]}`,
        `Regla Inviolable: ${r.rules[0]}`
      ]
    })),
    {
      value: '__custom__',
      label: '[Custom]     Definir un Rol Personalizado...',
      hint: 'Crear un rol con tus propias responsabilidades y reglas',
      details: [
        'Te permitira definir nombre, icono, meta, responsabilidades y reglas a medida.',
        'Se generara su directiva modular en .agents/rules/ y se sincronizara con el protocolo maestro.'
      ]
    }
  ];

  const selectedRoleId = await positionalSelect({
    title: 'CATALOGO DE ROLES EXTENDIDOS',
    message: 'Selecciona el rol que deseas incorporar al equipo:',
    options: roleChoices
  });

  if (p.isCancel(selectedRoleId)) {
    p.cancel('Operacion cancelada');
    return;
  }

  let roleToAdd: RoleConfig;

  if (selectedRoleId === '__custom__') {
    const customName = await p.text({
      message: 'Nombre del rol (ej. "Cybersecurity Pentester"):',
      validate: (v) => (!v.trim() ? 'El nombre no puede estar vacio' : undefined)
    });
    if (p.isCancel(customName)) return;

    const customGoal = await p.text({
      message: 'Meta principal del rol (¿que valor aporta?):',
      validate: (v) => (!v.trim() ? 'La meta no puede estar vacia' : undefined)
    });
    if (p.isCancel(customGoal)) return;

    const customResp = await p.text({
      message: 'Responsabilidad clave (ej. "Auditar vulnerabilidades OWASP"):',
      validate: (v) => (!v.trim() ? 'Debe tener al menos una responsabilidad' : undefined)
    });
    if (p.isCancel(customResp)) return;

    const customRule = await p.text({
      message: 'Regla o prohibicion inviolable del rol:',
      defaultValue: 'No ejecutar cambios destructivos sin autorizacion explicita.'
    });
    if (p.isCancel(customRule)) return;

    const cleanId = (customName as string).toLowerCase().replace(/[^a-z0-9]+/g, '-');

    roleToAdd = {
      id: cleanId,
      name: customName as string,
      title: customName as string,
      icon: `[${(customName as string).split(' ')[0]}]`,
      goal: customGoal as string,
      responsibilities: [customResp as string],
      rules: [customRule as string]
    };
  } else {
    roleToAdd = EXTENDED_ROLES.find((r) => r.id === selectedRoleId)!;
  }

  // 1. Append Role section to AGENTS.md
  const roleMarkdown = `
### ${roleToAdd.icon} ${roleToAdd.name}
- **Meta:** ${roleToAdd.goal}
- **Responsabilidades:**
${roleToAdd.responsibilities.map((r) => `  - ${r}`).join('\n')}
- **Reglas del Rol:**
${roleToAdd.rules.map((rule) => `  - ${rule}`).join('\n')}
`;

  // Insert before section 5 (Matriz de Seguridad) or append
  let updatedAgents: string;
  if (agentsContent.includes('## 5. Matriz de Seguridad')) {
    updatedAgents = agentsContent.replace(
      '## 5. Matriz de Seguridad',
      `${roleMarkdown.trim()}\n\n---\n\n## 5. Matriz de Seguridad`
    );
  } else {
    updatedAgents = agentsContent + '\n' + roleMarkdown;
  }
  fs.writeFileSync(agentsFile, updatedAgents, 'utf8');

  // 2. Generate modular rule in .agents/rules/<role-id>.md
  fs.mkdirSync(rulesDir, { recursive: true });
  const ruleFilePath = path.join(rulesDir, `${roleToAdd.id}.md`);
  const ruleFileContent = `# Directiva Especializada: ${roleToAdd.name}

## Proposito y Alcance
${roleToAdd.goal}

## Responsabilidades Operativas
${roleToAdd.responsibilities.map((r) => `- ${r}`).join('\n')}

## Restricciones y Reglas No Negociables
${roleToAdd.rules.map((r) => `- ${r}`).join('\n')}
`;
  fs.writeFileSync(ruleFilePath, ruleFileContent, 'utf8');

  // 3. Update Living Context CONTEXT.md
  if (fs.existsSync(contextFile)) {
    const today = new Date().toISOString().split('T')[0];
    const logEntry = `
### [${today}] — Incorporacion de Nuevo Rol: ${roleToAdd.name}
- **Autor / Rol:** Orchestron CLI (add-role)
- **Cambios Realizados:**
  - Se anadio el rol de agente **${roleToAdd.name}** al protocolo maestro.
  - Creada directiva modular en \`.agents/rules/${roleToAdd.id}.md\`.
`;
    const contextContent = fs.readFileSync(contextFile, 'utf8');
    if (contextContent.includes('## 5. Bitacora de Estado Vivo')) {
      const updatedContext = contextContent.replace(
        '## 5. Bitacora de Estado Vivo (Living Changelog)\n',
        `## 5. Bitacora de Estado Vivo (Living Changelog)\n${logEntry}`
      );
      fs.writeFileSync(contextFile, updatedContext, 'utf8');
    }
  }

  const successCard = `
${pc.bold(pc.green('ROL INCORPORADO EXITOSAMENTE'))}

${pc.bold('Rol:')} ${pc.cyan(roleToAdd.name)} (${roleToAdd.icon})
${pc.bold('Directiva Modular Creada:')} ${pc.white(`.agents/rules/${roleToAdd.id}.md`)}
${pc.bold('Protocolo Actualizado:')} ${pc.white('.agents/AGENTS.md')}
${pc.bold('Living Context:')} ${pc.white('.agents/CONTEXT.md sincronizado')}
`;

  console.log(
    boxen(successCard, {
      padding: 1,
      margin: 1,
      borderColor: 'cyan',
      borderStyle: 'round'
    })
  );

  p.outro(pc.bold(pc.cyan(`El rol ${roleToAdd.name} ya esta activo en tu equipo de agentes.`)));
}
