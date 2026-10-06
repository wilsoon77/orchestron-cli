import { OrchestronConfig } from '../../types/index.js';

export function renderInstinctsMd(config: OrchestronConfig): string {
  const today = new Date().toISOString().split('T')[0];

  return `# INSTINCTS.MD — LEARNED BEHAVIORAL PATTERNS & PERSISTENT MEMORY

> Este archivo representa la memoria de instintos y patrones de depuracion aprendidos en el proyecto **${config.projectName}**.
> Inspirado en el sistema de Continuous Learning de Everything Claude Code (ECC).
> Los agentes consultan este catalogo antes de depurar o tomar decisiones tecnicas para evitar tropezar dos veces con la misma piedra.

---

## 1. Patrones de Resolucion de Errores (Error Resolution Patterns)

*Registra aqui soluciones a errores no evidentes de compilacion, librerias o configuracion:*

### [${today}] — Inicializacion de Memoria de Instintos
- **Disparador / Error:** Inicializacion del repositorio con Orchestron.
- **Causa Raiz:** Configuracion inicial de arquitectura de agentes.
- **Regla Aprendida:** Mantener siempre el protocolo de Quality Gates y validar con \`${config.stack.commands.build || 'npm run build'}\`.

---

## 2. Convenciones Operativas y Peculiaridades del Proyecto (Project Quirks)

*Registra particularidades descubiertas en la base de codigo:*

- **Stack Detectado:** ${config.stack.type.toUpperCase()}
- **Backend:** ${config.stack.backend ? `${config.stack.backend.framework} (${config.stack.backend.language})` : 'No aplica'}
- **Frontend:** ${config.stack.frontend ? config.stack.frontend.framework : 'No aplica'}
- **Regla Operativa:** Utilizar exclusivamente las herramientas declaradas en \`.agents/orchestron.yaml\`.

---

## 3. Workarounds y Soluciones a Casos Borde (Workarounds)

*Registra parches o configuraciones especificas necesarias para que herramientas externas convivan:*

- *Vacio actualmente. Puedes anadir registros usando \`orchestron learn\`.*

---

## 4. Como Registrar Nuevos Instintos

Cuando soluciones un problema no trivial, ejecuta el comando de CLI o solicita al agente:
\`\`\`bash
orchestron learn
\`\`\`
O describe el patron directamente al agente para que lo anexe a esta seccion.
`;
}
