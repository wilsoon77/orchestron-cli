# Directiva de Seguridad y Gestión de Secretos

## Protección de Datos y Entornos
1. **Archivos Confidenciales:** Prohibido commitear archivos `.env`, certificados `.pem`, llaves privadas o credenciales de base de datos.
2. **Técnica skip-worktree:** Para archivos modificados localmente que contienen configuraciones privadas del desarrollador:
   ```bash
   git update-index --skip-worktree <ruta/al/archivo>
   ```
3. **Sanitización de Salidas:** Antes de reportar salidas al usuario, verificar que no contengan tokens JWT, contraseñas o datos personales sensibles.
