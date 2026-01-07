# Changelog

Todos los cambios notables a este proyecto serán documentados en este archivo.

## [1.0.0] - 2026-01-07

### Agregado
- Script inicial `s3-json-handler.js` para parsear resultados de Allure y subirlos a S3
- Soporte para múltiples proyectos: SMART, AGRONEGOCIOS, LOGISTICA
- Variables de configuración dinámicas:
  - `PROJECT_NAME` - Nombre del proyecto
  - `ALLURE_RESULTS_PATH` - Ruta personalizable para resultados de Allure
- Tracking completo de contexto de GitHub Actions:
  - Pull Request: número, URL, creador, usuario que hizo merge
  - Repository: nombre y rama
  - Workflow Run: número, ID único, actor que ejecutó
- Generación de dos tipos de archivos en S3:
  - Resultado completo con todos los tests en carpeta del reporte
  - Índice de ejecuciones con solo resúmenes por proyecto
- Documentación completa en README.md
- Ejemplos de uso para cada proyecto
- package.json con dependencias necesarias
- .gitignore configurado

### Características
- Compatible con ES modules
- Manejo robusto de errores
- Logs detallados del proceso
- Validación de variables de entorno requeridas
- Soporte para múltiples rutas de allure-results
- Índice separado por proyecto en S3
