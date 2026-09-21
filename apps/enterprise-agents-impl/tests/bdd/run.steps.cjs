const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const {
  canTransition,
} = require('../../dist/modules/runs/domain/run-state.js');
let current_state;
let allowed;
Given('a run is {string}', (state) => {
  current_state = state;
});
When('a transition to {string} is requested', (state) => {
  allowed = canTransition(current_state, state);
});
Then('the run transition is allowed', () => assert.equal(allowed, true));
Then('the run transition is rejected', () => assert.equal(allowed, false));
