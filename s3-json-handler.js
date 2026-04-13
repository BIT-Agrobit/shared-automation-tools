import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

/**
 * S3 JSON Handler - Shared Tool
 * Reads, modifies, and creates JSON files in S3
 * Uses AWS credentials from environment variables
 * Parses Allure test results and tracks report URLs
 *
 * This is a shared tool used across multiple projects:
 * - SMART
 * - AGRONEGOCIOS
 * - LOGISTICA
 */

// AWS Configuration from environment variables
const AWS_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
};

const BUCKET_NAME = process.env.BUCKET_NAME;
const PROJECT_NAME = process.env.PROJECT_NAME || 'UNKNOWN';
const ALLURE_RESULTS_PATH = process.env.ALLURE_RESULTS_PATH || './allure-results';
const REPOSITORY_URL = process.env.REPOSITORY_URL;

// GitHub Actions context variables
const GITHUB_CONTEXT = {
  prNumber: process.env.PR_NUMBER,
  prUrl: process.env.PR_URL,
  repository: process.env.REPOSITORY,
  branch: process.env.BRANCH,
  runNumber: process.env.RUN_NUMBER,
  runId: process.env.RUN_ID,
  allureReportUrl: process.env.ALLURE_REPORT_URL,
  reportPath: process.env.REPORT_PATH,
  prCreator: process.env.PR_CREATOR,
  workflowActor: process.env.WORKFLOW_ACTOR,
  prMergedBy: process.env.PR_MERGED_BY,
};

// Initialize S3 client
const s3Client = new S3Client(AWS_CONFIG);

/**
 * Check if a file exists in S3
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<boolean>}
 */
async function fileExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Read JSON file from S3
 * @param {string} key - S3 object key (file path)
 * @returns {Promise<object|null>} JSON data or null if file doesn't exist
 */
async function readJsonFromS3(key) {
  try {
    const exists = await fileExists(key);

    if (!exists) {
      console.log(`File ${key} does not exist in S3. Will create new file.`);
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    const jsonData = JSON.parse(bodyContents);

    console.log(`✅ Successfully read JSON from s3://${BUCKET_NAME}/${key}`);
    return jsonData;
  } catch (error) {
    console.error(`❌ Error reading JSON from S3: ${error.message}`);
    throw error;
  }
}

/**
 * Write JSON file to S3
 * @param {string} key - S3 object key (file path)
 * @param {object} data - JSON data to write
 * @returns {Promise<void>}
 */
async function writeJsonToS3(key, data) {
  try {
    const jsonString = JSON.stringify(data, null, 2);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: jsonString,
      ContentType: 'application/json',
    });

    await s3Client.send(command);
    console.log(`✅ Successfully wrote JSON to s3://${BUCKET_NAME}/${key}`);
  } catch (error) {
    console.error(`❌ Error writing JSON to S3: ${error.message}`);
    throw error;
  }
}

/**
 * Convert stream to string
 * @param {ReadableStream} stream
 * @returns {Promise<string>}
 */
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
  });
}

/**
 * Parse Allure test results from allure-results directory
 * @param {string} allureResultsPath - Path to allure-results directory
 * @returns {object} Test results summary
 */
function parseAllureResults(allureResultsPath) {
  try {
    if (!fs.existsSync(allureResultsPath)) {
      console.log(`⚠️  Allure results directory not found: ${allureResultsPath}`);
      return null;
    }

    const files = fs.readdirSync(allureResultsPath);
    const resultFiles = files.filter(file => file.endsWith('-result.json'));

    if (resultFiles.length === 0) {
      console.log('⚠️  No test result files found');
      return null;
    }

    const testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      broken: 0,
      skipped: 0,
      unknown: 0,
      tests: [],
    };

    resultFiles.forEach(file => {
      try {
        const filePath = path.join(allureResultsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = JSON.parse(content);

        testResults.total++;

        const testInfo = {
          uuid: result.uuid,
          name: result.name,
          status: result.status,
          fullName: result.fullName,
          duration: result.stop - result.start,
          labels: result.labels || [],
        };

        // Count by status
        switch (result.status) {
          case 'passed':
            testResults.passed++;
            break;
          case 'failed':
            testResults.failed++;
            testInfo.statusDetails = result.statusDetails;
            break;
          case 'broken':
            testResults.broken++;
            testInfo.statusDetails = result.statusDetails;
            break;
          case 'skipped':
            testResults.skipped++;
            break;
          default:
            testResults.unknown++;
        }

        testResults.tests.push(testInfo);
      } catch (error) {
        console.warn(`⚠️  Failed to parse ${file}: ${error.message}`);
      }
    });

    console.log(`✅ Parsed ${testResults.total} test results from Allure`);
    console.log(`   Passed: ${testResults.passed} | Failed: ${testResults.failed} | Broken: ${testResults.broken} | Skipped: ${testResults.skipped}`);

    return testResults;
  } catch (error) {
    console.error(`❌ Error parsing Allure results: ${error.message}`);
    return null;
  }
}

/**
 * Main function - Parses test results and uploads to S3
 */
async function main() {
  try {
    // Validate environment variables
    if (!AWS_CONFIG.credentials.accessKeyId || !AWS_CONFIG.credentials.secretAccessKey) {
      throw new Error('AWS credentials not found in environment variables');
    }
    if (!BUCKET_NAME) {
      throw new Error('BUCKET_NAME not found in environment variables');
    }
    if (!PROJECT_NAME || PROJECT_NAME === 'UNKNOWN') {
      throw new Error('PROJECT_NAME not found in environment variables. Please set PROJECT_NAME to one of: SMART, AGRONEGOCIOS, LOGISTICA');
    }

    console.log('🔧 Configuration:');
    console.log(`   Project: ${PROJECT_NAME}`);
    console.log(`   Allure Results Path: ${ALLURE_RESULTS_PATH}`);
    console.log('');
    console.log('🔧 GitHub Context:');
    console.log(`   PR Number: ${GITHUB_CONTEXT.prNumber || 'N/A'}`);
    console.log(`   PR URL: ${GITHUB_CONTEXT.prUrl || 'N/A'}`);
    console.log(`   PR Creator: ${GITHUB_CONTEXT.prCreator || 'N/A'}`);
    console.log(`   PR Merged By: ${GITHUB_CONTEXT.prMergedBy || 'N/A'}`);
    console.log(`   Repository: ${GITHUB_CONTEXT.repository}`);
    console.log(`   Branch: ${GITHUB_CONTEXT.branch}`);
    console.log(`   Run Number: ${GITHUB_CONTEXT.runNumber}`);
    console.log(`   Run ID: ${GITHUB_CONTEXT.runId || 'N/A'}`);
    console.log(`   Workflow Actor: ${GITHUB_CONTEXT.workflowActor || 'N/A'}`);
    console.log(`   Allure Report: ${GITHUB_CONTEXT.allureReportUrl || 'Not set'}`);
    console.log(`   Report Path: ${GITHUB_CONTEXT.reportPath || 'Not set'}`);
    console.log('');

    // Parse Allure test results
    console.log('📊 Parsing Allure test results...');
    const testResults = parseAllureResults(ALLURE_RESULTS_PATH);

    // Prepare test run entry with complete information
    const newEntry = {
      timestamp: new Date().toISOString(),
      github: {
        prNumber: GITHUB_CONTEXT.prNumber,
        prUrl: GITHUB_CONTEXT.prUrl,
        prCreator: GITHUB_CONTEXT.prCreator,
        prMergedBy: GITHUB_CONTEXT.prMergedBy,
        repository: GITHUB_CONTEXT.repository,
        branch: GITHUB_CONTEXT.branch,
        runNumber: GITHUB_CONTEXT.runNumber,
        runId: GITHUB_CONTEXT.runId,
        workflowActor: GITHUB_CONTEXT.workflowActor,
      },
      allureReport: {
        url: GITHUB_CONTEXT.allureReportUrl,
      },
      testResults: testResults ? {
        summary: {
          total: testResults.total,
          passed: testResults.passed,
          failed: testResults.failed,
          broken: testResults.broken,
          skipped: testResults.skipped,
        },
        tests: testResults.tests,
      } : null,
      status: testResults ? (testResults.failed > 0 || testResults.broken > 0 ? 'failed' : 'success') : 'unknown',
    };

    // 1. Guardar el objeto completo (con tests) en la carpeta del reporte
    if (GITHUB_CONTEXT.reportPath) {
      const automationResultKey = `${GITHUB_CONTEXT.reportPath}/automation-result.json`;
      console.log('');
      console.log(`📝 Guardando resultado completo en: ${automationResultKey}`);
      await writeJsonToS3(automationResultKey, newEntry);
      console.log('✅ Archivo automation-result.json guardado exitosamente');
    } else {
      console.warn('⚠️  REPORT_PATH no está definido, no se guardará automation-result.json');
    }

    // 2. Crear copia del objeto sin el array de tests para el índice
    const newEntrySummary = {
      ...newEntry,
      testResults: newEntry.testResults ? {
        summary: newEntry.testResults.summary,
        // No incluir el array 'tests'
      } : null,
    };

    // Define your S3 file path para el índice (cada proyecto tiene su propio archivo)
    const s3Key = `data/test-results.json`;

    // Read existing JSON or get null if doesn't exist
    let jsonData = await readJsonFromS3(s3Key);

    // If file doesn't exist, create new structure
    if (!jsonData) {
      jsonData = {
        created: new Date().toISOString(),
        project: PROJECT_NAME,
        repositoryUrl: REPOSITORY_URL,
        testRuns: [],
      };
      console.log('');
      console.log(`📝 Creando nueva estructura JSON para índice de ${PROJECT_NAME}`);
    }

    // Add the summary entry to the array
    jsonData.testRuns = jsonData.testRuns || [];
    jsonData.testRuns.push(newEntrySummary);
    jsonData.repositoryUrl = REPOSITORY_URL;
    jsonData.lastUpdated = new Date().toISOString();
    jsonData.totalRuns = jsonData.testRuns.length;

    // Write the modified JSON back to S3
    console.log('');
    console.log(`📝 Actualizando índice en: ${s3Key}`);
    await writeJsonToS3(s3Key, jsonData);

    console.log('');
    console.log('🎉 Operation completed successfully!');
    console.log(`📊 Total test runs tracked for ${PROJECT_NAME}: ${jsonData.totalRuns}`);
    if (testResults) {
      console.log(`📈 This run: ${testResults.passed}/${testResults.total} tests passed`);
    }

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other modules
export {
  readJsonFromS3,
  writeJsonToS3,
  fileExists,
  parseAllureResults,
  GITHUB_CONTEXT,
};

// Run main function if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
