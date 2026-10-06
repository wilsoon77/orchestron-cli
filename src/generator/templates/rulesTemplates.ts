import { OrchestronConfig } from '../../types/index.js';

export function renderBackendRule(config: OrchestronConfig): string {
  const b = config.stack.backend;
  const fw = b?.framework || 'Backend';
  const lang = b?.language || 'TypeScript / Java / Python';

  return `# Directiva de Backend: ${fw} (${lang})

## Convenciones de Arquitectura
1. **Patrón de Capas:** Mantener separación estricta: \`Controller -> Service -> Repository / Data Access\`.
2. **Contratos DTO:** No exponer entidades de persistencia directamente en las respuestas HTTP; utilizar Data Transfer Objects (DTOs).
3. **Manejo de Errores:** Centralizar excepciones y devolver respuestas estructuradas (\`{ error: string, code: number, details?: any }\`).
4. **Validaciones:** Validar payloads en la entrada antes de procesar lógica de negocio.

## Restricciones
- Cero consultas SQL dinámicas o vulnerables a inyección; usar query builders parametrizados o repositorios tipados.
- Funciones modulares y cohesivas (< 50 líneas por método idealmente).
`;
}

export function renderFrontendRule(config: OrchestronConfig): string {
  const f = config.stack.frontend;
  const fw = f?.framework || 'Frontend';

  return `# Directiva de Frontend: ${fw}

## Convenciones de UI y Componentes
1. **Desacoplamiento:** Componentes de presentación limpios; extraer lógica pesada a servicios o hooks/composables.
2. **Gestión de Estados:**
   - Todo componente asíncrono debe contemplar: Estado de Carga (Skeleton/Spinner), Estado de Datos, Estado Vacío (Empty State) y Estado de Error.
3. **Diseño:** Responsive por defecto (móvil y escritorio).
${f?.uiLibrary ? `4. **Estilos:** Utilizar ${f.uiLibrary} de forma consistente sin introducir CSS redundante.\n` : ''}

## Restricciones
- No incrustar URLs o endpoints en componentes; centralizar en servicios HTTP o clientes API.
- Mantener tipado estricto en todas las props e interfaces de datos.
`;
}

export function renderDatabaseRule(config: OrchestronConfig): string {
  const db = config.stack.database;
  const engine = db?.engine || 'Relacional / SQL';

  return `# Directiva de Base de Datos: ${engine}

## Principios de Persistencia y Acceso a Datos
1. **Integridad Referencial:** Respetar relaciones foráneas y tipos de datos definidos en el esquema.
2. **Consultas en Fase de Análisis:** Durante el diseño y análisis técnico, únicamente ejecutar consultas de lectura (\`SELECT\`).
3. **Cambios Estructurales:**
   - Prohibido alterar tablas en vivo de forma descontrolada.
   - Cualquier cambio debe formalizarse como un script de migración SQL versionado (\`V...__descripcion.sql\` o similar).
${db?.hasDump ? `4. **Dump de Referencia:** El archivo \`${db.dumpFile}\` sirve como fuente de verdad del esquema local.\n` : ''}
`;
}

export function renderSecurityRule(config: OrchestronConfig): string {
  return `# Directiva de Seguridad y Gestión de Secretos

## Protección de Datos y Entornos
1. **Archivos Confidenciales:** Prohibido commitear archivos \`.env\`, certificados \`.pem\`, llaves privadas o credenciales de base de datos.
2. **Técnica skip-worktree:** Para archivos modificados localmente que contienen configuraciones privadas del desarrollador:
   \`\`\`bash
   git update-index --skip-worktree <ruta/al/archivo>
   \`\`\`
3. **Sanitización de Salidas:** Antes de reportar salidas al usuario, verificar que no contengan tokens JWT, contraseñas o datos personales sensibles.
`;
}
