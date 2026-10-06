# Directiva de Base de Datos: Relacional / SQL

## Principios de Persistencia y Acceso a Datos
1. **Integridad Referencial:** Respetar relaciones foráneas y tipos de datos definidos en el esquema.
2. **Consultas en Fase de Análisis:** Durante el diseño y análisis técnico, únicamente ejecutar consultas de lectura (`SELECT`).
3. **Cambios Estructurales:**
   - Prohibido alterar tablas en vivo de forma descontrolada.
   - Cualquier cambio debe formalizarse como un script de migración SQL versionado (`V...__descripcion.sql` o similar).

