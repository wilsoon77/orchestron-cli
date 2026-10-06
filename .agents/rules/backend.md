# Directiva de Backend: Node.js CLI Tool (TypeScript)

## Convenciones de Arquitectura
1. **Patrón de Capas:** Mantener separación estricta: `Controller -> Service -> Repository / Data Access`.
2. **Contratos DTO:** No exponer entidades de persistencia directamente en las respuestas HTTP; utilizar Data Transfer Objects (DTOs).
3. **Manejo de Errores:** Centralizar excepciones y devolver respuestas estructuradas (`{ error: string, code: number, details?: any }`).
4. **Validaciones:** Validar payloads en la entrada antes de procesar lógica de negocio.

## Restricciones
- Cero consultas SQL dinámicas o vulnerables a inyección; usar query builders parametrizados o repositorios tipados.
- Funciones modulares y cohesivas (< 50 líneas por método idealmente).
