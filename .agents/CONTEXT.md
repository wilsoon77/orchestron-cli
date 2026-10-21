# ORCHESTRON — PROJECT CONTEXT & LIVING STATE

> Este archivo representa la memoria viva del proyecto. Contiene las reglas del dominio de negocio, el catalogo de entidades, decisiones arquitectonicas (ADRs) y el estado actualizado del sistema.
> **Para el Agente:** Este documento se actualiza de forma obligatoria en la Puerta de Calidad 3 (Gate 3) al finalizar cada requerimiento.

---

## 1. Proposito del Sistema y Dominio de Negocio

- **Nombre del Proyecto:** orchestron
- **Objetivo:** [Describir brevemente el proposito de negocio aqui]
- **Usuarios Principales:** [Roles de usuario, clientes, administradores]

---

## 2. Decisiones Arquitectonicas Registradas (ADRs)

| ID | Fecha | Decision | Justificacion | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | 2026-10-01 | Arquitectura Modular con Quality Gates | Estandarizacion de flujos y garantia de 0 errores en compilacion | Aprobado |
| **ADR-003** | 2026-10-01 | Backend con Node.js CLI Tool | Robustez, tipado estricto y escalabilidad | Aprobado |

---

## 3. Catalogo de Entidades y Modelos de Datos

*Define aqui las entidades centrales del negocio para que el agente comprenda el dominio sin tener que inferirlo:*

- **[EntidadEjemplo]:**
  - `id`: Identificador unico (UUID / Long).
  - `nombre`: Descripcion o titulo.
  - `estado`: `ACTIVO` | `INACTIVO` | `PENDIENTE`.

---

## 4. Catalogo de Endpoints y Servicios Clave

| Metodo | Endpoint | Descripcion | DTO Entrada | DTO Salida |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Chequeo de estado del sistema | Ninguno | `{ status: "ok" }` |

---

## 5. Bitacora de Estado Vivo (Living Changelog)

*Esta seccion es mantenida activamente por los agentes de IA al concluir tareas:*

### [2026-10-21] — Lanzamiento de Orchestron CLI v2.0 (Resolucion Integral de Auditoria Arquitectonica)
- **Autor / Rol:** Lead Architect, Backend Specialist & QA Specialist
- **Cambios Realizados:**
  - Compatibilidad nativa multi-motor: YAML frontmatter valido en `.agents/rules/*.md` (`trigger: glob | model_decision`), subagentes nativos en `.agents/agents/<id>.md` (Antigravity), `.claude/agents/<id>.md` (Claude Code) y `.cursor/rules/*.mdc` (Cursor IDE).
  - Gateway Router minimo: `AGENTS.md` raiz reestructurado (< 5 KB base, 7.4 KB expandido frente a 30.5 KB previos), erradicando el truncamiento del presupuesto de 24 KB.
  - Filtrado semantico MCP: Eliminacion del volcado de 11.5 KB de servidores globales irrelevantes; vinculacion contextual segun stack detectado.
  - Catálogo unificado: `UnifiedRoleDefinition` como fuente unica de verdad en `src/roles/unifiedCatalog.ts`, con sincronizacion atomica en `orchestron add-role`.
  - Persistencia en actualizacion: `orchestron update` lee `.agents/orchestron.yaml` sin sobreescribir roles personalizados ni `CONTEXT.md`, con soporte `--dry-run`.
  - Hooks deterministas: Soporte de `.claude/settings.json` y comando `orchestron hooks --install` para `.git/hooks/pre-commit`.
  - Artefacto fisico Gate 1 en `.agents/state/active-contract.md` para coordinacion de subagentes en contextos aislados.
  - Optimizacion en Doctor: Conteo de llaves balanceadas para analisis N+1, soporte de flags `--ci` y `--json`, y asignacion de `process.exitCode = 1` ante fallos.
  - Atajos de teclado instantaneos en `orchestron menu`.
  - Suite de pruebas automatizadas con Vitest: 8 archivos de pruebas (unitarias, limites, combinaciones, escenarios reales) con 87/87 pruebas pasando al 100%.
- **Proximos Pasos Recomendados:**
  - Ejecutar `orchestron update` en proyectos existentes para beneficiarse de la compatibilidad multi-motor y el ahorro de tokens.

### [2026-10-06] — Evolucion con ECC & Addy Osmani Agent Skills + Actualizacion No Destructiva
- **Autor / Rol:** Lead Architect & Developer
- **Cambios Realizados:**
  - Incorporacion de CONSTRAINTS.md (contrato mecanico de calidad y anti-degradacion).
  - Incorporacion de memoria persistente de instintos en .agents/state/instincts.md.
  - Creacion del nuevo subagente Revisor Desacoplado en 5 Ejes (reviewer.agent.md).
  - Creacion del comando "orchestron update" para actualizacion no destructiva de proyectos existentes.
  - Creacion del comando "orchestron learn" para registrar patrones de error y quirks aprendidos.
  - Actualizacion de "orchestron doctor" con escaneo de seguridad AgentShield Lite y Anti-Degradacion Watcher.
  - Actualizacion de autocompletado y consola interactiva (menu/palette).
- **Proximos Pasos Recomendados:**
  - Utilizar "orchestron update" en los otros proyectos del workspace que requieran las nuevas capacidades de gobernanza.

### [2026-10-01] — Inicializacion de Arquitectura de Agentes
- **Autor / Rol:** Orchestron CLI
- **Cambios Realizados:**
  - Creacion de protocolo de gobernanza en `.agents/`.
  - Configuracion de Puertas de Calidad (Quality Gates 1, 2 y 3).
  - Asignacion de roles de subagentes especializados.
- **Proximos Pasos Recomendados:**
  - Desarrollar el primer modulo de negocio segun especificacion.
