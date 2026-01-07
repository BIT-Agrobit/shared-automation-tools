# Shared Automation Tools

Herramientas compartidas de automatización para los proyectos:
- SMART
- AGRONEGOCIOS
- LOGISTICA

## Contenido

- `s3-json-handler.js` - Script para parsear resultados de Allure y subirlos a S3 con registro de historial

## Uso en GitHub Actions

### 1. Agregar checkout del repositorio compartido

En tu workflow de GitHub Actions, agrega un paso para clonar este repositorio:

```yaml
- name: Checkout shared tools
  uses: actions/checkout@v4
  with:
    repository: tu-organizacion/shared-automation-tools  # Cambia esto por tu org/repo
    path: .shared-tools
    token: ${{ secrets.GITHUB_TOKEN }}  # O usa un PAT si es un repo privado
```

### 2. Instalar dependencias

```yaml
- name: Install shared tools dependencies
  run: npm install
  working-directory: .shared-tools
```

### 3. Variables de Entorno Requeridas

El script requiere las siguientes variables de entorno:

| Variable | Descripción | Valor en GitHub Actions |
|----------|-------------|------------------------|
| **Configuración del Proyecto** |
| `PROJECT_NAME` | Nombre del proyecto | `SMART`, `AGRONEGOCIOS`, o `LOGISTICA` |
| `ALLURE_RESULTS_PATH` | Ruta a los resultados de Allure | `./allure-results` o `./ProyectoBit/allure-results` |
| **AWS** |
| `BUCKET_NAME` | Nombre del bucket S3 | `${{ secrets.AWS_BUCKET }}` |
| `AWS_ACCESS_KEY_ID` | AWS Access Key | `${{ secrets.AWS_KEY_ID }}` |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key | `${{ secrets.AWS_SECRET_ACCESS_KEY }}` |
| `AWS_REGION` | Región de AWS | `us-east-1` |
| **GitHub Context - Pull Request** |
| `PR_NUMBER` | Número del PR | `${{ github.event.pull_request.number }}` |
| `PR_URL` | URL del PR | `${{ github.event.pull_request.html_url }}` |
| `PR_CREATOR` | Usuario que creó el PR | `${{ github.event.pull_request.user.login }}` |
| `PR_MERGED_BY` | Usuario que hizo merge del PR | `${{ github.event.pull_request.merged_by.login }}` |
| **GitHub Context - Repository** |
| `REPOSITORY` | Nombre del repositorio | `${{ github.repository }}` |
| `BRANCH` | Nombre de la rama | `${{ github.head_ref \|\| github.ref_name }}` |
| **GitHub Context - Workflow Run** |
| `RUN_NUMBER` | Número secuencial de ejecución | `${{ github.run_number }}` |
| `RUN_ID` | ID único del workflow run | `${{ github.run_id }}` |
| `WORKFLOW_ACTOR` | Usuario que ejecutó el workflow | `${{ github.actor }}` |
| **Allure Report** |
| `ALLURE_REPORT_URL` | URL del reporte en S3 | Generado en pasos previos |
| `REPORT_PATH` | Path del reporte en S3 | Generado en pasos previos |

## Ejemplos por Proyecto

### Para AGRONEGOCIOS

```yaml
- name: Update Test Results Registry in S3
  if: always()
  env:
    # Project Configuration
    PROJECT_NAME: AGRONEGOCIOS
    ALLURE_RESULTS_PATH: ./allure-results

    # AWS Configuration
    BUCKET_NAME: ${{ secrets.AWS_BUCKET }}

    # GitHub Context - Pull Request
    PR_NUMBER: ${{ github.event.pull_request.number }}
    PR_URL: ${{ github.event.pull_request.html_url }}
    PR_CREATOR: ${{ github.event.pull_request.user.login }}
    PR_MERGED_BY: ${{ github.event.pull_request.merged_by.login }}

    # GitHub Context - Repository
    REPOSITORY: ${{ github.repository }}
    BRANCH: ${{ github.head_ref || github.ref_name }}

    # GitHub Context - Workflow Run
    RUN_NUMBER: ${{ github.run_number }}
    RUN_ID: ${{ github.run_id }}
    WORKFLOW_ACTOR: ${{ github.actor }}
  run: node .shared-tools/s3-json-handler.js
```

### Para SMART

```yaml
- name: Update Test Results Registry in S3
  if: always()
  env:
    # Project Configuration
    PROJECT_NAME: SMART
    ALLURE_RESULTS_PATH: ./ProyectoBit/allure-results

    # AWS Configuration
    BUCKET_NAME: ${{ secrets.AWS_BUCKET }}

    # GitHub Context - Pull Request
    PR_NUMBER: ${{ github.event.pull_request.number }}
    PR_URL: ${{ github.event.pull_request.html_url }}
    PR_CREATOR: ${{ github.event.pull_request.user.login }}
    PR_MERGED_BY: ${{ github.event.pull_request.merged_by.login }}

    # GitHub Context - Repository
    REPOSITORY: ${{ github.repository }}
    BRANCH: ${{ github.head_ref || github.ref_name }}

    # GitHub Context - Workflow Run
    RUN_NUMBER: ${{ github.run_number }}
    RUN_ID: ${{ github.run_id }}
    WORKFLOW_ACTOR: ${{ github.actor }}
  run: node .shared-tools/s3-json-handler.js
```

### Para LOGISTICA

```yaml
- name: Update Test Results Registry in S3
  if: always()
  env:
    # Project Configuration
    PROJECT_NAME: LOGISTICA
    ALLURE_RESULTS_PATH: ./allure-results  # Ajusta según tu estructura

    # AWS Configuration
    BUCKET_NAME: ${{ secrets.AWS_BUCKET }}

    # GitHub Context - Pull Request
    PR_NUMBER: ${{ github.event.pull_request.number }}
    PR_URL: ${{ github.event.pull_request.html_url }}
    PR_CREATOR: ${{ github.event.pull_request.user.login }}
    PR_MERGED_BY: ${{ github.event.pull_request.merged_by.login }}

    # GitHub Context - Repository
    REPOSITORY: ${{ github.repository }}
    BRANCH: ${{ github.head_ref || github.ref_name }}

    # GitHub Context - Workflow Run
    RUN_NUMBER: ${{ github.run_number }}
    RUN_ID: ${{ github.run_id }}
    WORKFLOW_ACTOR: ${{ github.actor }}
  run: node .shared-tools/s3-json-handler.js
```

## Estructura de Archivos en S3

El script crea dos tipos de archivos en S3:

1. **Resultado completo** (con todos los tests): `reports/{timestamp}/automation-result.json`
2. **Índice de ejecuciones** (solo resumen): `data/{project-name}/test-results.json`

Cada proyecto tendrá su propio archivo de índice:
- `data/smart/test-results.json`
- `data/agronegocios/test-results.json`
- `data/logistica/test-results.json`

### Estructura del JSON de Índice

```json
{
  "created": "2024-01-15T10:30:00.000Z",
  "project": "AGRONEGOCIOS",
  "lastUpdated": "2024-01-15T14:30:00.000Z",
  "totalRuns": 42,
  "testRuns": [
    {
      "timestamp": "2024-01-15T14:30:00.000Z",
      "github": {
        "prNumber": "123",
        "prUrl": "https://github.com/org/repo/pull/123",
        "prCreator": "johndoe",
        "prMergedBy": null,
        "repository": "org/repo",
        "branch": "feature/new-feature",
        "runNumber": "42",
        "runId": "7654321098",
        "workflowActor": "johndoe"
      },
      "allureReport": {
        "url": "https://s3.us-east-1.amazonaws.com/bucket/reports/2024-01-15_14-30-00/index.html"
      },
      "testResults": {
        "summary": {
          "total": 25,
          "passed": 23,
          "failed": 2,
          "broken": 0,
          "skipped": 0
        }
      },
      "status": "failed"
    }
  ]
}
```

## Workflow Completo de Ejemplo

```yaml
name: CI

on:
  push:
    branches: [testing]
  pull_request:
    branches: [main, testing]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      # 1. Checkout del proyecto principal
      - name: Checkout
        uses: actions/checkout@v4

      # 2. Checkout de las herramientas compartidas
      - name: Checkout shared tools
        uses: actions/checkout@v4
        with:
          repository: tu-organizacion/shared-automation-tools
          path: .shared-tools
          token: ${{ secrets.GITHUB_TOKEN }}

      # 3. Setup de Node.js, Java, Chrome, etc.
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'

      - name: Setup Chrome Browser
        uses: browser-actions/setup-chrome@latest
        with:
          chrome-version: stable

      # 4. Instalar dependencias del proyecto
      - name: Install dependencies
        run: npm install

      # 5. Instalar dependencias de las herramientas compartidas
      - name: Install shared tools dependencies
        run: npm install
        working-directory: .shared-tools

      # 6. Ejecutar tests
      - name: Run Verification Test
        env:
          CI: true
          DISPLAY: :99
        run: npm run test:verify

      - name: Run All Tests
        env:
          CI: true
          DISPLAY: :99
        run: npm run test
        if: success()

      # 7. Generar reportes Allure
      - name: Generate Allure Reports
        run: npm run allure-generate
        if: always()

      # 8. Configurar AWS
      - name: Configure AWS Credentials
        if: always()
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      # 9. Subir reportes a S3
      - name: Upload Allure Report to S3
        if: always()
        env:
          BUCKET_NAME: ${{ secrets.AWS_BUCKET }}
        run: |
          TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
          REPORT_PATH="reports/${TIMESTAMP}"

          echo "📤 Uploading report to S3..."
          aws s3 sync ./allure-report s3://${BUCKET_NAME}/${REPORT_PATH}/ \
            --delete \
            --cache-control "max-age=3600"

          REPORT_URL="https://s3.us-east-1.amazonaws.com/${BUCKET_NAME}/${REPORT_PATH}/index.html"

          echo "ALLURE_REPORT_URL=${REPORT_URL}" >> $GITHUB_ENV
          echo "REPORT_PATH=${REPORT_PATH}" >> $GITHUB_ENV

      # 10. Usar la herramienta compartida para registrar los resultados
      - name: Update Test Results Registry in S3
        if: always()
        env:
          # Project Configuration
          PROJECT_NAME: AGRONEGOCIOS  # Cambia esto según el proyecto
          ALLURE_RESULTS_PATH: ./allure-results  # Ajusta según tu estructura

          # AWS Configuration
          BUCKET_NAME: ${{ secrets.AWS_BUCKET }}

          # GitHub Context - Pull Request
          PR_NUMBER: ${{ github.event.pull_request.number }}
          PR_URL: ${{ github.event.pull_request.html_url }}
          PR_CREATOR: ${{ github.event.pull_request.user.login }}
          PR_MERGED_BY: ${{ github.event.pull_request.merged_by.login }}

          # GitHub Context - Repository
          REPOSITORY: ${{ github.repository }}
          BRANCH: ${{ github.head_ref || github.ref_name }}

          # GitHub Context - Workflow Run
          RUN_NUMBER: ${{ github.run_number }}
          RUN_ID: ${{ github.run_id }}
          WORKFLOW_ACTOR: ${{ github.actor }}
        run: node .shared-tools/s3-json-handler.js
```

## Configuración Inicial

1. Crea este repositorio en tu organización de GitHub
2. Haz push de estos archivos:
   ```bash
   cd shared-automation-tools
   git add .
   git commit -m "Initial commit: Shared automation tools"
   git remote add origin https://github.com/tu-organizacion/shared-automation-tools.git
   git push -u origin main
   ```
3. Asegúrate de que tus otros repositorios tengan acceso a este (si es privado, necesitarás un PAT)
4. Actualiza tus workflows siguiendo los ejemplos anteriores

## Notas Importantes

- El script es compatible con ES modules (`type: "module"` en package.json)
- Cada proyecto mantiene su propio índice de ejecuciones en S3
- Los resultados completos (con todos los tests) se guardan en la carpeta del reporte
- El índice solo guarda el resumen (sin el array de tests) para mantenerlo ligero
- Las variables `PR_CREATOR` y `PR_MERGED_BY` pueden ser null si no aplican (ej. en push directo)
- El `RUN_ID` es único para cada ejecución del workflow y puede usarse para rastrear logs específicos
- El `WORKFLOW_ACTOR` indica quién disparó el workflow (puede ser diferente del PR creator)

## Información de GitHub Context

Puedes ver todas las variables disponibles de GitHub Actions en la [documentación oficial](https://docs.github.com/en/actions/learn-github-actions/contexts#github-context).

Las variables más útiles para rastreo son:
- `github.run_id` - ID único del workflow run
- `github.run_number` - Número secuencial de ejecución
- `github.actor` - Usuario que disparó el workflow
- `github.event.pull_request.user.login` - Creador del PR
- `github.event.pull_request.merged_by.login` - Usuario que hizo merge
