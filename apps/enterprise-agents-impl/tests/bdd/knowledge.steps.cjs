const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const {
  chunkText,
} = require('../../dist/modules/knowledge/domain/chunk-text.js');
let document_text = '',
  segments = [];
Given('a repeated document containing {int} words', (count) => {
  document_text = 'confidential '.repeat(count).trim();
});
Given('an empty text document', () => {
  document_text = '  ';
});
When(
  'the document is split into segments with a {int} character limit',
  (limit) => {
    segments = chunkText(document_text, limit, 60);
  },
);
Then('each segment contains at most {int} characters', (limit) => {
  assert.ok(segments.length > 1);
  assert.ok(segments.every((s) => s.length > 0 && s.length <= limit));
});
Then('the document is split deterministically', () =>
  assert.deepEqual(segments, chunkText(document_text, 450, 60)),
);
Then('no segments are produced', () => assert.deepEqual(segments, []));
