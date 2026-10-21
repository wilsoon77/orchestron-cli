---
trigger: model_decision
globs: "**/.env*, **/secrets/**, **/*.pem, **/*.key, **/.gitignore"
description: "Directiva de seguridad: proteccion de secretos, variables de entorno (.env), llaves privadas y tecnica skip-worktree."
---

# Directiva de Seguridad y Gestion de Secretos

## Proteccion de Datos y Entornos
1. **Archivos Confidenciales:** Prohibido commitear archivos `.env`, certificados `.pem`, llaves privadas o credenciales de base de datos.
2. **Tecnica skip-worktree:** Para archivos modificados localmente que contienen configuraciones privadas del desarrollador:
   ```bash
   git update-index --skip-worktree <ruta/al/archivo>
   ```
3. **Sanitizacion de Salidas:** Antes de reportar salidas al usuario, verificar que no contengan tokens JWT, contrasenas o datos personales sensibles.
