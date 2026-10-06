import { OrchestronConfig } from '../../types/index.js';

export function renderContextMd(config: OrchestronConfig): string {
  const stack = config.stack;

  return `# ${config.projectName.toUpperCase()} — PROJECT CONTEXT & LIVING STATE

> Este archivo representa la memoria viva del proyecto. Contiene las reglas del dominio de negocio, el catalogo de entidades, decisiones arquitectonicas (ADRs) y el estado actualizado del sistema.
> **Para el Agente:** Este documento se actualiza de forma obligatoria en la Puerta de Calidad 3 (Gate 3) al finalizar cada requerimiento.

---

## 1. Proposito del Sistema y Dominio de Negocio

- **Nombre del Proyecto:** ${config.projectName}
- **Objetivo:** [Describir brevemente el proposito de negocio aqui]
- **Usuarios Principales:** [Roles de usuario, clientes, administradores]

---

## 2. Decisiones Arquitectonicas Registradas (ADRs)

| ID | Fecha | Decision | Justificacion | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | ${new Date().toISOString().split('T')[0]} | Arquitectura Modular con Quality Gates | Estandarizacion de flujos y garantia de 0 errores en compilacion | Aprobado |
${stack.frontend ? `| **ADR-002** | ${new Date().toISOString().split('T')[0]} | Frontend con ${stack.frontend.framework} | Framework moderno reactivo y desacoplado | Aprobado |\n` : ''}${stack.backend ? `| **ADR-003** | ${new Date().toISOString().split('T')[0]} | Backend con ${stack.backend.framework} | Robustez, tipado estricto y escalabilidad | Aprobado |\n` : ''}
---

## 3. Catalogo de Entidades y Modelos de Datos

*Define aqui las entidades centrales del negocio para que el agente comprenda el dominio sin tener que inferirlo:*

- **[EntidadEjemplo]:**
  - \`id\`: Identificador unico (UUID / Long).
  - \`nombre\`: Descripcion o titulo.
  - \`estado\`: \`ACTIVO\` | \`INACTIVO\` | \`PENDIENTE\`.

---

## 4. Catalogo de Endpoints y Servicios Clave

| Metodo | Endpoint | Descripcion | DTO Entrada | DTO Salida |
| :--- | :--- | :--- | :--- | :--- |
| \`GET\` | \`/api/health\` | Chequeo de estado del sistema | Ninguno | \`{ status: "ok" }\` |

---

## 5. Bitacora de Estado Vivo (Living Changelog)

*Esta seccion es mantenida activamente por los agentes de IA al concluir tareas:*

### [${new Date().toISOString().split('T')[0]}] — Inicializacion de Arquitectura de Agentes
- **Autor / Rol:** Orchestron CLI
- **Cambios Realizados:**
  - Creacion de protocolo de gobernanza en \`.agents/\`.
  - Configuracion de Puertas de Calidad (Quality Gates 1, 2 y 3).
  - Asignacion de roles de subagentes especializados.
- **Proximos Pasos Recomendados:**
  - Desarrollar el primer modulo de negocio segun especificacion.
`;
}
