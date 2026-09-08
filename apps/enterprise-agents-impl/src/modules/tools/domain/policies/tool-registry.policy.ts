import { z } from 'zod';
import { TOOL_CONSTANTS } from '@/tools/constants/tools.constants';
import type { ToolSchema } from '@/tools/domain/schemas/tool.schema';

export const allowedTools: readonly ToolSchema[] = [
  {
    key: 'text.uppercase',
    name: 'Uppercase text',
    risk: 'low',
    description: 'Convert input text to uppercase without network access',
  },
  {
    key: 'text.lowercase',
    name: 'Lowercase text',
    risk: 'low',
    description: 'Convert input text to lowercase without network access',
  },
  {
    key: 'json.pick',
    name: 'Select JSON property',
    risk: 'low',
    description: 'Read one top-level field from the run input',
  },
  {
    key: 'knowledge.search',
    name: 'Authorized knowledge search',
    risk: 'medium',
    description:
      'Hybrid local retrieval constrained to the run initiator document ACL',
  },
  {
    key: 'connector.profile.read',
    name: 'Approved OAuth profile read',
    risk: 'medium',
    description:
      'Read a fixed operator-allowlisted profile endpoint with an authorized connection; human approval required',
  },
];

export const toolInputSchema = z.record(z.string(), z.unknown());

export function runAllowedTool(
  key: string,
  input: Record<string, unknown>,
  config: Record<string, unknown>,
): unknown {
  if (key === 'text.uppercase')
    return String(input.value ?? '')
      .slice(0, TOOL_CONSTANTS.MAX_TEXT_LENGTH)
      .toUpperCase();
  if (key === 'text.lowercase')
    return String(input.value ?? '')
      .slice(0, TOOL_CONSTANTS.MAX_TEXT_LENGTH)
      .toLowerCase();
  if (key === 'json.pick') {
    const field = config.field;
    if (
      typeof field !== 'string' ||
      field.length > TOOL_CONSTANTS.MAX_FIELD_KEY_LENGTH ||
      !Object.hasOwn(input, field)
    )
      throw Error('Tool field is missing');
    return input[field];
  }
  throw Error('Tool not in allowlist');
}
