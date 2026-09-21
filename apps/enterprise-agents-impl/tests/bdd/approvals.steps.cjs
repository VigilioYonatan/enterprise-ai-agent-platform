const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');
const {
  mayDecideApproval,
} = require('../../dist/modules/approvals/domain/approval-policy.js');
let requester;
let approver;
let role;
let deadline;
let decision;
Given('a pending approval requested by {string}', (value) => {
  requester = value;
  deadline = new Date('2099-01-01T00:00:00Z');
});
Given('an expired approval requested by {string}', (value) => {
  requester = value;
  deadline = new Date('2000-01-01T00:00:00Z');
});
Given('an approver {string} has role {string}', (a, r) => {
  approver = a;
  role = r;
});
When('the approval policy is evaluated', () => {
  decision = mayDecideApproval(role, approver, requester, deadline, 'pending');
});
Then('the approval decision is permitted', () => assert.equal(decision, true));
Then('the approval decision is forbidden', () => assert.equal(decision, false));
