#!/usr/bin/env node

/**
 * Test Suite for Instagram Transcription Module
 * Validates script functionality and output format
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test tracking
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Test utilities
const test = {
  pass: (name) => {
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    passedTests++;
    testResults.push({ name, status: 'PASS' });
  },
  fail: (name, error) => {
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (error) console.log(`  ${colors.red}→${colors.reset} ${error}`);
    failedTests++;
    testResults.push({ name, status: 'FAIL', error });
  },
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  section: (title) => {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}  ${title}${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  },
};

/**
 * Test Suite 1: Environment Configuration
 */
function testEnvironmentSetup() {
  test.section('Environment Configuration Tests');

  // Test .env exists
  const envPath = '/Users/ericsantos/meu-aios/.env';
  if (fs.existsSync(envPath)) {
    test.pass('.env file exists');
  } else {
    test.fail('.env file exists', 'File not found at ' + envPath);
  }

  // Test Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  if (majorVersion >= 18) {
    test.pass(`Node.js version is compatible (${nodeVersion})`);
  } else {
    test.fail(`Node.js version is compatible`, `Found ${nodeVersion}, need v18+`);
  }

  // Test npm modules installed
  const packageJsonPath = '/Users/ericsantos/meu-aios/package.json';
  if (fs.existsSync(packageJsonPath)) {
    test.pass('package.json exists');
  } else {
    test.fail('package.json exists', 'File not found');
  }
}

/**
 * Test Suite 2: Script Files
 */
function testScriptFiles() {
  test.section('Script Files Validation');

  const scripts = [
    '/Users/ericsantos/meu-aios/scripts/instagram-scraper-advanced.js',
    '/Users/ericsantos/meu-aios/scripts/instagram-transcriber.js',
    '/Users/ericsantos/meu-aios/scripts/generate-sample-transcriptions.js',
    '/Users/ericsantos/meu-aios/scripts/run-instagram-transcription.sh',
  ];

  scripts.forEach((script) => {
    if (fs.existsSync(script)) {
      test.pass(`${path.basename(script)} exists`);

      // Check if file is readable
      try {
        fs.readFileSync(script, 'utf-8');
        test.pass(`${path.basename(script)} is readable`);
      } catch (error) {
        test.fail(`${path.basename(script)} is readable`, error.message);
      }
    } else {
      test.fail(`${path.basename(script)} exists`, 'File not found');
    }
  });
}

/**
 * Test Suite 3: Output File Format
 */
function testOutputFormat() {
  test.section('Output File Format Validation');

  const outputPath = '/Users/ericsantos/meu-aios/data/instagram-transcriptions.md';

  // Check if output file exists
  if (fs.existsSync(outputPath)) {
    test.pass('Output file exists');

    try {
      const content = fs.readFileSync(outputPath, 'utf-8');

      // Check markdown structure
      if (content.includes('# Transcrições - Instagram')) {
        test.pass('Has main heading');
      } else {
        test.fail('Has main heading', 'Main heading not found');
      }

      // Check sections
      if (content.includes('## ')) {
        test.pass('Has markdown sections');
      } else {
        test.fail('Has markdown sections', 'No sections found');
      }

      // Check for video entries
      const videoPattern = /## Vídeo \d+:/g;
      const videoCount = (content.match(videoPattern) || []).length;
      if (videoCount > 0) {
        test.pass(`Contains ${videoCount} video entries`);
      } else {
        test.info(`No video entries found (expected if scraping not configured)`);
      }

      // Check for metadata
      if (content.includes('URL:') || content.includes('URL')) {
        test.pass('Contains URL information');
      } else {
        test.info('No URL information (expected without scraping)');
      }

      // Check for transcriptions or status
      if (content.includes('Transcrição') || content.includes('Status')) {
        test.pass('Contains expected content structure');
      } else {
        test.fail('Contains expected content structure', 'Missing required fields');
      }

      // File size check
      const stats = fs.statSync(outputPath);
      if (stats.size > 500) {
        test.pass(`File size is reasonable (${stats.size} bytes)`);
      } else {
        test.fail(`File size is reasonable`, `File is too small (${stats.size} bytes)`);
      }

    } catch (error) {
      test.fail('Parse output file', error.message);
    }
  } else {
    test.fail('Output file exists', 'File not found at ' + outputPath);
  }
}

/**
 * Test Suite 4: Directory Structure
 */
function testDirectoryStructure() {
  test.section('Directory Structure Validation');

  const directories = [
    { path: '/Users/ericsantos/meu-aios', name: 'Project root' },
    { path: '/Users/ericsantos/meu-aios/scripts', name: 'Scripts directory' },
    { path: '/Users/ericsantos/meu-aios/data', name: 'Data directory' },
    { path: '/Users/ericsantos/meu-aios/docs', name: 'Documentation directory' },
  ];

  directories.forEach((dir) => {
    if (fs.existsSync(dir.path) && fs.statSync(dir.path).isDirectory()) {
      test.pass(`${dir.name} exists`);
    } else {
      test.fail(`${dir.name} exists`, `Directory not found: ${dir.path}`);
    }
  });
}

/**
 * Test Suite 5: Documentation
 */
function testDocumentation() {
  test.section('Documentation Validation');

  const docs = [
    { path: '/Users/ericsantos/meu-aios/docs/INSTAGRAM_TRANSCRIPTION_GUIDE.md', name: 'Complete guide' },
    { path: '/Users/ericsantos/meu-aios/scripts/README.md', name: 'Scripts README' },
  ];

  docs.forEach((doc) => {
    if (fs.existsSync(doc.path)) {
      test.pass(`${doc.name} exists`);

      try {
        const content = fs.readFileSync(doc.path, 'utf-8');
        if (content.length > 1000) {
          test.pass(`${doc.name} has substantial content`);
        } else {
          test.fail(`${doc.name} has substantial content`, 'File is too short');
        }
      } catch (error) {
        test.fail(`${doc.name} is readable`, error.message);
      }
    } else {
      test.fail(`${doc.name} exists`, 'File not found');
    }
  });
}

/**
 * Test Suite 6: Script Content Validation
 */
function testScriptContent() {
  test.section('Script Content Validation');

  const scriptsToCheck = {
    '/Users/ericsantos/meu-aios/scripts/instagram-scraper-advanced.js': [
      'GROQ_API_KEY',
      'Instagram',
      'function',
    ],
    '/Users/ericsantos/meu-aios/scripts/generate-sample-transcriptions.js': [
      'SAMPLE_VIDEOS',
      'generateMarkdown',
      'instagram-transcriptions.md',
    ],
    '/Users/ericsantos/meu-aios/scripts/run-instagram-transcription.sh': [
      'node',
      'scripts',
      'data',
    ],
  };

  Object.entries(scriptsToCheck).forEach(([scriptPath, patterns]) => {
    if (fs.existsSync(scriptPath)) {
      try {
        const content = fs.readFileSync(scriptPath, 'utf-8');
        const found = patterns.filter((p) => content.includes(p));

        if (found.length === patterns.length) {
          test.pass(`${path.basename(scriptPath)} contains all expected patterns`);
        } else {
          test.fail(
            `${path.basename(scriptPath)} contains all expected patterns`,
            `Missing: ${patterns.filter((p) => !found.includes(p)).join(', ')}`
          );
        }
      } catch (error) {
        test.fail(`${path.basename(scriptPath)} is readable`, error.message);
      }
    }
  });
}

/**
 * Test Suite 7: Configuration Validation
 */
function testConfiguration() {
  test.section('Configuration Validation');

  try {
    // Load .env
    const envPath = '/Users/ericsantos/meu-aios/.env';
    if (!fs.existsSync(envPath)) {
      test.fail('Load .env configuration', '.env file not found');
      return;
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const env = {};

    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#][^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });

    // Check for required keys
    if (env.GROQ_API_KEY) {
      if (env.GROQ_API_KEY.length > 10) {
        test.pass('GROQ_API_KEY is configured');
      } else {
        test.fail('GROQ_API_KEY is configured', 'Key appears to be invalid or empty');
      }
    } else {
      test.fail('GROQ_API_KEY is configured', 'Key not found in .env');
    }

    // Check for optional keys
    if (env.APIFY_API_TOKEN) {
      test.pass('APIFY_API_TOKEN is configured (optional)');
    } else {
      test.info('APIFY_API_TOKEN not configured (optional, but recommended)');
    }

  } catch (error) {
    test.fail('Load configuration', error.message);
  }
}

/**
 * Generate Test Report
 */
function generateReport() {
  console.log(`\n${colors.cyan}${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}  TEST EXECUTION SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Total:  ${passedTests + failedTests}\n`);

  if (failedTests === 0) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Some tests failed. Review above for details.${colors.reset}\n`);
  }

  // Failed tests summary
  const failed = testResults.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.log(`${colors.cyan}Failed Tests:${colors.reset}`);
    failed.forEach((test) => {
      console.log(`  - ${test.name}`);
      if (test.error) console.log(`    → ${test.error}`);
    });
    console.log('');
  }

  console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

/**
 * Main execution
 */
console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}  Instagram Transcription Module - Test Suite${colors.reset}`);
console.log(`${colors.cyan}════════════════════════════════════════════${colors.reset}\n`);

testEnvironmentSetup();
testScriptFiles();
testOutputFormat();
testDirectoryStructure();
testDocumentation();
testScriptContent();
testConfiguration();

generateReport();
