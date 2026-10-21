import { OrchestronConfig } from '../../types/index.js';

export function renderBackendRule(config: OrchestronConfig): string {
  const b = config.stack.backend;
  const fw = b?.framework || 'Backend';
  const lang = b?.language || 'TypeScript / Java / Python';

  let globs = ['**/*.ts', '**/*.js', '**/package.json'];
  if (lang.includes('Python')) {
    globs = ['**/*.py', '**/pyproject.toml', '**/requirements.txt'];
  } else if (lang.includes('Java')) {
    globs = ['**/*.java', '**/pom.xml', '**/build.gradle'];
  } else if (lang.includes('Go')) {
    globs = ['**/*.go', '**/go.mod'];
  }

  if (b?.directory) {
    globs.unshift(`${b.directory}/**`);
  }

  const globsStr = globs.join(', ');
  const description = `Convenciones de arquitectura Backend para ${fw} (${lang}): patron de capas Controller-Service-Repository, contratos DTO y validaciones.`;

  return `---
trigger: glob
globs: "${globsStr}"
description: "${description}"
---

# Directiva de Backend: ${fw} (${lang})

## Convenciones de Arquitectura
1. **Patron de Capas:** Mantener separacion estricta: \`Controller -> Service -> Repository / Data Access\`.
2. **Contratos DTO:** No exponer entidades de persistencia directamente en las respuestas HTTP; utilizar Data Transfer Objects (DTOs).
3. **Manejo de Errores:** Centralizar excepciones y devolver respuestas estructuradas (\`{ error: string, code: number, details?: any }\`).
4. **Validaciones:** Validar payloads en la entrada antes de procesar logica de negocio.

## Restricciones
- Cero consultas SQL dinamicas o vulnerables a inyeccion; usar query builders parametrizados o repositorios tipados.
- Funciones modulares y cohesivas (< 50 lineas por metodo idealmente).
`;
}

export function renderFrontendRule(config: OrchestronConfig): string {
  const f = config.stack.frontend;
  const fw = f?.framework || 'Frontend';

  let globs = ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.html', '**/*.css', '**/*.scss'];
  if (fw === 'Angular') {
    globs = ['**/*.ts', '**/*.html', '**/*.css', '**/*.scss'];
  } else if (fw === 'Vue.js') {
    globs = ['**/*.vue', '**/*.ts', '**/*.js', '**/*.css'];
  } else if (fw === 'React' || fw === 'Next.js') {
    globs = ['**/*.tsx', '**/*.jsx', '**/*.ts', '**/*.js', '**/*.css', '**/*.scss'];
  }

  if (f?.directory) {
    globs.unshift(`${f.directory}/**`);
  }

  const globsStr = globs.join(', ');
  const description = `Convenciones de arquitectura Frontend para ${fw}: diseno responsive, desacoplamiento de componentes y gestion de estados.`;

  return `---
trigger: glob
globs: "${globsStr}"
description: "${description}"
---

# Directiva de Frontend: ${fw}

## Convenciones de UI y Componentes
1. **Desacoplamiento:** Componentes de presentacion limpios; extraer logica pesada a servicios o hooks/composables.
2. **Gestion de Estados:**
   - Todo componente asincrono debe contemplar: Estado de Carga (Skeleton/Spinner), Estado de Datos, Estado Vacio (Empty State) y Estado de Error.
3. **Diseno:** Responsive por defecto (movil y escritorio).
${f?.uiLibrary ? `4. **Estilos:** Utilizar ${f.uiLibrary} de forma consistente sin introducir CSS redundante.\n` : ''}
## Restricciones
- No incrustar URLs o endpoints en componentes; centralizar en servicios HTTP o clientes API.
- Mantener tipado estricto en todas las props e interfaces de datos.
`;
}

export function renderDatabaseRule(config: OrchestronConfig): string {
  const db = config.stack.database;
  const engine = db?.engine || 'Relacional / SQL';

  let globs = ['**/*.sql', '**/migrations/**', '**/schema.prisma', '**/db/**'];
  if (db?.orm === 'Prisma') {
    globs = ['**/schema.prisma', '**/migrations/**', '**/*.sql'];
  } else if (db?.hasDump && db.dumpFile) {
    globs = ['**/*.sql', db.dumpFile, '**/migrations/**'];
  }

  const globsStr = globs.join(', ');
  const description = `Directiva de base de datos (${engine}): integridad referencial, migraciones versionadas y politicas de consulta.`;

  return `---
trigger: glob
globs: "${globsStr}"
description: "${description}"
---

# Directiva de Base de Datos: ${engine}

## Principios de Persistencia y Acceso a Datos
1. **Integridad Referencial:** Respetar relaciones foraneas y tipos de datos definidos en el esquema.
2. **Consultas en Fase de Analisis:** Durante el diseno y analisis tecnico, unicamente ejecutar consultas de lectura (\`SELECT\`).
3. **Cambios Estructurales:**
   - Prohibido alterar tablas en vivo de forma descontrolada.
   - Cualquier cambio debe formalizarse como un script de migracion SQL versionado (\`V...__descripcion.sql\` o similar).
${db?.hasDump ? `4. **Dump de Referencia:** El archivo \`${db.dumpFile}\` sirve como fuente de verdad del esquema local.\n` : ''}
`;
}

export function renderSecurityRule(_config: OrchestronConfig): string {
  const globs = ['**/.env*', '**/secrets/**', '**/*.pem', '**/*.key', '**/.gitignore'];
  const globsStr = globs.join(', ');
  const description = 'Directiva de seguridad: proteccion de secretos, variables de entorno (.env), llaves privadas y tecnica skip-worktree.';

  return `---
trigger: model_decision
globs: "${globsStr}"
description: "${description}"
---

# Directiva de Seguridad y Gestion de Secretos

## Proteccion de Datos y Entornos
1. **Archivos Confidenciales:** Prohibido commitear archivos \`.env\`, certificados \`.pem\`, llaves privadas o credenciales de base de datos.
2. **Tecnica skip-worktree:** Para archivos modificados localmente que contienen configuraciones privadas del desarrollador:
   \`\`\`bash
   git update-index --skip-worktree <ruta/al/archivo>
   \`\`\`
3. **Sanitizacion de Salidas:** Antes de reportar salidas al usuario, verificar que no contengan tokens JWT, contrasenas o datos personales sensibles.
`;
}

export function exportToCursorRule(ruleMarkdown: string, options?: { alwaysApply?: boolean }): string {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = ruleMarkdown.match(frontmatterRegex);

  if (!match) {
    return `---
description: "Directiva del proyecto"
globs: "*"
alwaysApply: ${options?.alwaysApply ?? false}
---

${ruleMarkdown.trim()}
`;
  }

  const [, frontmatter, body] = match;

  const descMatch = frontmatter.match(/description:\s*(?:"([^"]*)"|'([^']*)'|([^\r\n]+))/);
  const description = descMatch ? (descMatch[1] || descMatch[2] || descMatch[3]).trim() : 'Directiva del proyecto';

  let globsStr = '*';
  const globsArrayMatch = frontmatter.match(/globs:\s*\[([^\]]*)\]/);
  if (globsArrayMatch) {
    const rawItems = globsArrayMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    globsStr = rawItems.join(', ');
  } else {
    const globsLineMatch = frontmatter.match(/globs:\s*(?:"([^"]*)"|'([^']*)'|([^\r\n]+))/);
    if (globsLineMatch) {
      globsStr = (globsLineMatch[1] || globsLineMatch[2] || globsLineMatch[3]).trim();
    }
  }

  const alwaysApply = options?.alwaysApply ?? false;

  return `---
description: "${description}"
globs: "${globsStr}"
alwaysApply: ${alwaysApply}
---

${body.trim()}
`;
}
