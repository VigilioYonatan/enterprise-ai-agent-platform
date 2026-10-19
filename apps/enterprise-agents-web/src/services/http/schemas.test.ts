import {
  AGENT_CONSTANTS,
  createAgentDto,
  createOrganizationDto,
  graphSchema,
  nodeSchema,
  WORKFLOW_CONSTANTS,
} from '@enterprise-agents/contracts';
import { describe, expect, it } from 'vitest';
import {
  agentCreateSchema,
  documentCreateSchema,
  evaluationSuiteFormSchema,
  knowledgeBaseCreateSchema,
  memberInviteSchema,
  organizationFormSchema,
  runStartFormSchema,
  searchFormSchema,
  workflowCreateSchema,
} from './schemas';

describe('Frontend Form and Payload Zod Schemas', () => {
  it('validates organization, agent and workflow creation schemas', () => {
    expect(organizationFormSchema.safeParse({ name: 'Acme' }).success).toBe(
      true,
    );
    expect(organizationFormSchema.safeParse({ name: 'A' }).success).toBe(false);

    expect(agentCreateSchema.safeParse({ name: 'Support Bot' }).success).toBe(
      true,
    );
    expect(agentCreateSchema.safeParse({ name: '' }).success).toBe(false);

    expect(
      workflowCreateSchema.safeParse({ name: 'Triage Flow' }).success,
    ).toBe(true);
    expect(workflowCreateSchema.safeParse({ name: ' ' }).success).toBe(false);
  });

  it('inherits canonical constraints from generated backend DTO contracts', () => {
    expect(
      createOrganizationDto.safeParse({
        name: 'A'.repeat(121),
      }).success,
    ).toBe(false);
    expect(
      createAgentDto.safeParse({
        organization_id: '11111111-1111-4111-8111-111111111111',
        name: 'Enterprise Copilot',
      }).data?.instructions,
    ).toBe('');
    expect(AGENT_CONSTANTS.MAX_INSTRUCTIONS_LENGTH).toBe(5_000);
    expect(WORKFLOW_CONSTANTS.MAX_NODES).toBe(100);
    expect(
      graphSchema.safeParse({
        nodes: [{ id: 'start', type: 'start', label: 'Start' }],
        edges: [],
      }).success,
    ).toBe(true);
  });

  it('validates member invite schema with email format and role enum', () => {
    expect(
      memberInviteSchema.safeParse({
        user_id: 'usr-123',
        email: 'member@agentops.local',
        role: 'editor',
      }).success,
    ).toBe(true);

    expect(
      memberInviteSchema.safeParse({
        user_id: 'usr-123',
        email: 'invalid-email',
        role: 'editor',
      }).success,
    ).toBe(false);

    expect(
      memberInviteSchema.safeParse({
        user_id: 'usr-123',
        email: 'member@agentops.local',
        role: 'superadmin',
      }).success,
    ).toBe(false);
  });

  it('validates knowledge base and document creation schemas', () => {
    expect(
      knowledgeBaseCreateSchema.safeParse({ name: 'Docs KB' }).success,
    ).toBe(true);
    expect(knowledgeBaseCreateSchema.safeParse({ name: 'D' }).success).toBe(
      false,
    );

    expect(
      documentCreateSchema.safeParse({
        title: 'API Guide',
        content: 'This is sufficiently long documentation content.',
      }).success,
    ).toBe(true);

    expect(
      documentCreateSchema.safeParse({
        title: 'API Guide',
        content: 'short',
      }).success,
    ).toBe(false);
  });

  it('validates search form and run start JSON schemas', () => {
    expect(searchFormSchema.safeParse({ query: 'workflows' }).success).toBe(
      true,
    );
    expect(searchFormSchema.safeParse({ query: 'a' }).success).toBe(false);

    expect(
      runStartFormSchema.safeParse({
        workflow_id: 'wf-1',
        input_json: '{"text":"hello"}',
      }).success,
    ).toBe(true);

    expect(
      runStartFormSchema.safeParse({
        workflow_id: 'wf-1',
        input_json: 'not-json',
      }).success,
    ).toBe(false);

    expect(
      runStartFormSchema.safeParse({
        workflow_id: 'wf-1',
        input_json: '["array","not","object"]',
      }).success,
    ).toBe(false);
  });

  it('validates eval suite cases JSON array limits and workflow node schema', () => {
    expect(
      evaluationSuiteFormSchema.safeParse({
        name: 'Smoke Suite',
        agent_id: 'ag-1',
        cases_json: JSON.stringify([{ input: 'hi', expected: 'hi' }]),
      }).success,
    ).toBe(true);

    expect(
      evaluationSuiteFormSchema.safeParse({
        name: 'Smoke Suite',
        agent_id: 'ag-1',
        cases_json: '[]',
      }).success,
    ).toBe(false);

    expect(
      evaluationSuiteFormSchema.safeParse({
        name: 'Smoke Suite',
        agent_id: 'ag-1',
        cases_json: 'invalid-json',
      }).success,
    ).toBe(false);

    expect(
      nodeSchema.safeParse({
        id: 'node-1',
        type: 'agent',
        label: 'Agent Node',
        position: { x: 100, y: 200 },
      }).success,
    ).toBe(true);

    expect(
      nodeSchema.safeParse({
        id: 'node-1',
        type: 'invalid-type',
        label: 'Node',
      }).success,
    ).toBe(false);
  });
});
