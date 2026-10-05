import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedExpression } from './check-npm-licenses.mjs';

test('accepts an approved SPDX license', () => {
  assert.equal(isAllowedExpression('MIT'), true);
});

test('accepts an OR expression with an approved option', () => {
  assert.equal(isAllowedExpression('MIT OR GPL-3.0-only'), true);
});

test('rejects an AND expression containing an unapproved license', () => {
  assert.equal(isAllowedExpression('MIT AND GPL-3.0-only'), false);
});

test('accepts an AND expression when every license is approved', () => {
  assert.equal(isAllowedExpression('MIT AND Apache-2.0'), true);
});

test('accepts the reviewed LLVM exception and rejects unknown expressions', () => {
  assert.equal(isAllowedExpression('Apache-2.0 WITH LLVM-exception'), true);
  assert.equal(isAllowedExpression('LicenseRef-Unknown'), false);
});