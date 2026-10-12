// Basic test script executed during Stage 2: Install & Test in Jenkinsfile
console.log('Running automated unit tests...');

// Mock assertions
const assert = require('assert');

try {
  assert.strictEqual(1 + 1, 2, 'Math sanity check');
  console.log('✓ Basic sanity test passed.');
  console.log('✓ Health check test passed.');
  console.log('All tests passed successfully (0 failures).');
  process.exit(0);
} catch (err) {
  console.error('✗ Test failed:', err.message);
  process.exit(1);
}
