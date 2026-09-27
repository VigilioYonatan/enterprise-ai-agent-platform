import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const backendRoot = path.join(repoRoot, 'apps', 'enterprise-agents-impl');
const backendSrc = path.join(backendRoot, 'src');
const contractsDist = path.join(backendRoot, 'packages', 'contracts', 'dist');
const contractsJs = path.join(contractsDist, 'contracts.js');
const contractsDts = path.join(contractsDist, 'contracts.d.ts');
const webRoot = path.join(repoRoot, 'apps', 'enterprise-agents-web');
const targetPath = path.join(
  webRoot,
  'src',
  'services',
  'contracts',
  'generated',
  'api-contracts.ts',
);

const CONTRACT_SOURCES = [
  'shared/http/dto/offset-pagination-query.dto.ts',
  'shared/http/dto/paginator.dto.ts',

  'modules/identity/constants/identity.constants.ts',
  'modules/memberships/constants/memberships.constants.ts',
  'modules/organizations/constants/organizations.constants.ts',
  'modules/agents/constants/agents.constants.ts',
  'modules/tools/constants/tools.constants.ts',
  'modules/workflows/constants/workflows.constants.ts',
  'modules/runs/constants/runs.constants.ts',
  'modules/approvals/constants/approvals.constants.ts',
  'modules/integrations/constants/integrations.constants.ts',
  'modules/knowledge/constants/knowledge.constants.ts',
  'modules/evaluations/constants/evaluations.constants.ts',
  'modules/usage/constants/usage.constants.ts',
  'modules/audit/constants/audit.constants.ts',
  'modules/notifications/constants/notifications.constants.ts',

  'modules/identity/domain/schemas/user.schema.ts',
  'modules/memberships/domain/schemas/membership.schema.ts',
  'modules/organizations/domain/schemas/organization.schema.ts',
  'modules/agents/domain/schemas/agent.schema.ts',
  'modules/tools/domain/schemas/tool.schema.ts',
  'modules/workflows/domain/schemas/workflow.schema.ts',
  'modules/runs/domain/schemas/run.schema.ts',
  'modules/approvals/domain/schemas/approval.schema.ts',
  'modules/integrations/domain/schemas/integration.schema.ts',
  'modules/knowledge/domain/schemas/knowledge.schema.ts',
  'modules/evaluations/domain/schemas/evaluation.schema.ts',
  'modules/usage/domain/schemas/usage.schema.ts',
  'modules/audit/domain/schemas/audit-event.schema.ts',
  'modules/notifications/domain/schemas/notification.schema.ts',

  'modules/identity/presentation/http/dto/me.dto.ts',
  'modules/memberships/presentation/http/dto/memberships.dto.ts',
  'modules/organizations/presentation/http/dto/create-organization.dto.ts',
  'modules/agents/presentation/http/dto/agent.dto.ts',
  'modules/agents/presentation/http/dto/agent-chat.dto.ts',
  'modules/tools/presentation/http/dto/tool.dto.ts',
  'modules/workflows/presentation/http/dto/workflow.dto.ts',
  'modules/runs/presentation/http/dto/run.dto.ts',
  'modules/approvals/presentation/http/dto/approval.dto.ts',
  'modules/integrations/presentation/http/dto/integration.dto.ts',
  'modules/knowledge/presentation/http/dto/knowledge.dto.ts',
  'modules/evaluations/presentation/http/dto/evaluation.dto.ts',
  'modules/usage/presentation/http/dto/usage.dto.ts',
  'modules/audit/presentation/http/dto/audit.dto.ts',
  'modules/notifications/presentation/http/dto/notification.dto.ts',
];

const FORBIDDEN_RUNTIME_IMPORT =
  /from\s+['"](?:@nestjs\/|drizzle-orm|node:|express|pg)/;

function verifyContractSources() {
  for (const relPath of CONTRACT_SOURCES) {
    const absPath = path.join(backendSrc, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Missing canonical contract file: ${relPath}`);
    }
    const raw = fs.readFileSync(absPath, 'utf8');
    if (FORBIDDEN_RUNTIME_IMPORT.test(raw)) {
      throw new Error(
        `Forbidden server/runtime import found in contract file: ${relPath}`,
      );
    }
  }
}

async function verifyContractsModule() {
  if (!fs.existsSync(contractsJs) || !fs.existsSync(contractsDts)) {
    throw new Error(
      'Contracts distribution files missing. Run `npm --prefix apps/enterprise-agents-impl run build:contracts`.',
    );
  }

  const moduleUrl = pathToFileURL(contractsJs).href;
  const mod = await import(moduleUrl);
  const keys = Object.keys(mod);

  if (keys.length < 50) {
    throw new Error(
      `Contracts module exports too few symbols: ${keys.length} found.`,
    );
  }

  const requiredSymbols = [
    'userSchema',
    'organizationSchema',
    'agentSchema',
    'createOrganizationDto',
    'AGENT_CONSTANTS',
    'APPROVAL_CONSTANTS',
  ];

  for (const sym of requiredSymbols) {
    if (!mod[sym]) {
      throw new Error(`Contracts module missing essential export: ${sym}`);
    }
  }

  return keys.length;
}

const BRIDGE_CONTENT = `/**
 * Canonical Contracts Re-export from @enterprise-agents/contracts
 *
 * All domain schemas, HTTP DTOs, constants, and types are exported from
 * the canonical \`@enterprise-agents/contracts\` package.
 */
export * from '@enterprise-agents/contracts';
`;

async function main() {
  verifyContractSources();

  const checkOnly = process.argv.includes('--check');

  if (checkOnly) {
    if (!fs.existsSync(targetPath)) {
      throw new Error('Bridge file api-contracts.ts is missing.');
    }
    const currentBridge = fs.readFileSync(targetPath, 'utf8').trim();
    if (!currentBridge.includes("@enterprise-agents/contracts")) {
      throw new Error(
        'Contract drift: api-contracts.ts must re-export from @enterprise-agents/contracts.',
      );
    }
    const exportCount = await verifyContractsModule();
    console.log(
      `WEB_CONTRACTS_CHECK_OK sources=${CONTRACT_SOURCES.length} exports=${exportCount} package=@enterprise-agents/contracts`,
    );
    process.exit(0);
  }

  // Sync mode: build contracts package and update bridge
  execSync('npm run build:contracts', {
    cwd: backendRoot,
    stdio: 'inherit',
  });

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, BRIDGE_CONTENT, 'utf8');

  const exportCount = await verifyContractsModule();
  console.log(
    `WEB_CONTRACTS_SYNC_OK sources=${CONTRACT_SOURCES.length} exports=${exportCount} package=@enterprise-agents/contracts`,
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
