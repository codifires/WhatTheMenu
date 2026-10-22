/**
 * Master Test Runner for WhatTheMenu
 * Executes all automated test suites sequentially and reports consolidated results.
 */

const { execSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'CI Smoke & Model Sanity', file: 'test_smoke.js' },
  { name: 'Phase 5: End-to-End Functional Workflows', file: 'test_phase5_e2e_functional.js' },
  { name: 'Phase 7: Razorpay Payment & Security', file: 'test_phase7_razorpay_security.js' },
  { name: 'Phase 8: MongoDB & Data Integrity', file: 'test_phase8_data_integrity.js' },
  { name: 'Phase 9: Security, Secrets & Privacy', file: 'test_phase9_security_privacy.js' },
  { name: 'Phase 10: API Workflows & State Machines', file: 'test_phase10_workflow_statemachine.js' },
  { name: 'Phase 11: Error Handling & Observability', file: 'test_phase11_error_handling_observability.js' },
  { name: 'Phase 12: Automated Negative & Boundary Tests', file: 'test_phase12_automated_negative_tests.js' }
];

console.log('============================================================');
console.log('       WhatTheMenu — Master Automated Test Runner');
console.log('============================================================\n');

let totalSuites = suites.length;
let passedSuites = 0;
const results = [];

for (const suite of suites) {
  process.stdout.write(`⏳ Running [${suite.name}] (${suite.file})... `);
  const startTime = Date.now();
  try {
    execSync(`node "${path.join(__dirname, suite.file)}"`, {
      stdio: 'pipe',
      timeout: 120000
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ PASSED (${duration}s)`);
    passedSuites++;
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`❌ FAILED (${duration}s)`);
    results.push({
      name: suite.name,
      status: 'FAILED',
      duration: `${duration}s`,
      error: err.stdout ? err.stdout.toString() : err.message
    });
  }
}

console.log('\n============================================================');
console.log(`       Master Test Summary: ${passedSuites}/${totalSuites} Suites Passed`);
console.log('============================================================');
results.forEach((r, idx) => {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`  ${idx + 1}. ${icon} ${r.name.padEnd(48)}: ${r.status} (${r.duration})`);
});
console.log('============================================================\n');

if (passedSuites < totalSuites) {
  process.exit(1);
} else {
  process.exit(0);
}
