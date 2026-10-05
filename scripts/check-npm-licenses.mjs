import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const parseSpdx = require('spdx-expression-parse');

const ALLOWED_LICENSES = new Set([
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'CC0-1.0',
  'Unlicense',
  'Zlib',
  'Unicode-3.0',
  'BlueOak-1.0.0',
  'Python-2.0',
]);

function isAllowedExpression(expression) {
  try {
    return isAllowedNode(parseSpdx(expression));
  } catch {
    return false;
  }
}

function isAllowedNode(node) {
  if (node.conjunction === 'and') {
    return isAllowedNode(node.left) && isAllowedNode(node.right);
  }
  if (node.conjunction === 'or') {
    return isAllowedNode(node.left) || isAllowedNode(node.right);
  }

  if (node.exception) {
    return node.license === 'Apache-2.0' && node.exception === 'LLVM-exception';
  }
  return ALLOWED_LICENSES.has(node.license);
}

function checkReport(reportText) {
  const report = JSON.parse(reportText.replace(/^\uFEFF/, ''));
  const failures = [];

  for (const [packageName, details] of Object.entries(report)) {
    const reportedLicenses = details.licenses;
    const licenses = Array.isArray(reportedLicenses)
      ? reportedLicenses
      : reportedLicenses
        ? [reportedLicenses]
        : [];
    const approved = licenses.some((license) =>
      isAllowedExpression(String(license).replace(/\*+$/, '').trim())
    );

    if (!approved) {
      failures.push(`${packageName}: ${licenses.join(' OR ') || 'UNKNOWN'}`);
    }
  }

  if (failures.length > 0) {
    console.error('Dependency license policy failed. Review these packages:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    return false;
  }

  console.log(`License policy passed for ${Object.keys(report).length} npm dependencies.`);
  return true;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const reportPath = process.argv[2];
  if (!reportPath) {
    console.error('Usage: node check-npm-licenses.mjs <license-checker-report.json|->');
    process.exitCode = 2;
  } else if (!checkReport(reportPath === '-' ? readFileSync(0, 'utf8') : readFileSync(reportPath, 'utf8'))) {
    process.exitCode = 1;
  }
}

export { isAllowedExpression };