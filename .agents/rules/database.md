---
trigger: glob
globs: ["**/*.sql","**/migrations/**","**/schema.prisma","**/db/**"]
description: "Directiva de base de datos (Relacional / SQL): integridad referencial, migraciones versionadas y politicas de consulta."
---

# Directiva de Base de Datos: Relacional / SQL

## Principios de Persistencia y Acceso a Datos
1. **Integridad Referencial:** Respetar relaciones foraneas y tipos de datos definidos en el esquema.
2. **Consultas en Fase de Analisis:** Durante el diseno y analisis tecnico, unicamente ejecutar consultas de lectura (`SELECT`).
3. **Cambios Estructurales:**
   - Prohibido alterar tablas en vivo de forma descontrolada.
   - Cualquier cambio debe formalizarse como un script de migracion SQL versionado (`V...__descripcion.sql` o similar).

