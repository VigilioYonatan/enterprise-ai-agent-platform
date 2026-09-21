const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const {
  graphViolations,
} = require('../../dist/modules/workflows/domain/schemas/workflow.schema.js');
let graph;
let violations;
Given('an automation graph with one start and one output', () => {
  graph = {
    nodes: [
      { id: 'a', type: 'start', label: 'Start' },
      { id: 'b', type: 'output', label: 'End' },
    ],
    edges: [{ source: 'a', target: 'b' }],
  };
});
Given('a graph with a cycle', () => {
  graph = {
    nodes: [
      { id: 'a', type: 'start', label: 'Start' },
      { id: 'b', type: 'output', label: 'End' },
    ],
    edges: [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ],
  };
});
Given('a graph containing a disallowed tool', () => {
  graph = {
    nodes: [
      { id: 'a', type: 'start', label: 'Start' },
      {
        id: 't',
        type: 'tool',
        label: 'Unsafe',
        config: { tool_key: 'exec.shell' },
      },
      { id: 'b', type: 'output', label: 'End' },
    ],
    edges: [
      { source: 'a', target: 't' },
      { source: 't', target: 'b' },
    ],
  };
});
When('I validate the publication graph', () => {
  violations = graphViolations(graph, true);
});
Then('publication is allowed', () => assert.deepEqual(violations, []));
Then('publication is rejected for {string}', (message) =>
  assert.ok(violations.some((item) => item.includes(message))),
);
