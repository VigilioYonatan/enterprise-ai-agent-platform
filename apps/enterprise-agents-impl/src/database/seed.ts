import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AgentSeeder } from '@/agents/infrastructure/persistence/drizzle/seeders/agent.seeder';
import { ApprovalSeeder } from '@/approvals/infrastructure/persistence/drizzle/seeders/approval.seeder';
import { EvaluationSeeder } from '@/evaluations/infrastructure/persistence/drizzle/seeders/evaluation.seeder';
import { UserSeeder } from '@/identity/infrastructure/persistence/drizzle/seeders/identity.seeder';
import { KnowledgeSeeder } from '@/knowledge/infrastructure/persistence/drizzle/seeders/knowledge.seeder';
import { MembershipSeeder } from '@/memberships/infrastructure/persistence/drizzle/seeders/membership.seeder';
import { NotificationSeeder } from '@/notifications/infrastructure/persistence/drizzle/seeders/notification.seeder';
import { OrganizationSeeder } from '@/organizations/infrastructure/persistence/drizzle/seeders/organization.seeder';
import { RunSeeder } from '@/runs/infrastructure/persistence/drizzle/seeders/run.seeder';
import { UsageTelemetrySeeder } from '@/usage/infrastructure/persistence/drizzle/seeders/usage.seeder';
import { WorkflowSeeder } from '@/workflows/infrastructure/persistence/drizzle/seeders/workflow.seeder';
import * as schema from '~/database/schema';
import { databaseUrl } from '~/shared/config/database-credentials';

async function seed() {
  const connection_string = databaseUrl();
  const pool = new Pool({ connectionString: connection_string });
  const db = drizzle(pool, { schema });

  console.log(
    '--- Starting Enterprise Platform Database Seeding (Drizzle ORM) ---',
  );

  try {
    console.log('1. Seeding identity & tenancy...');
    await new UserSeeder(db).run();
    console.log('✓ Users seeded (3 enterprise actors)');

    await new OrganizationSeeder(db).run();
    console.log('✓ Organizations seeded (2 tenants)');

    await new MembershipSeeder(db).run();
    console.log(
      '✓ Memberships seeded (RBAC hierarchy: owner, admin, editor, viewer)',
    );

    console.log('2. Seeding AI agents & workflow pipelines...');
    await new AgentSeeder(db).run();
    console.log('✓ Agents and agent versions seeded');

    await new WorkflowSeeder(db).run();
    console.log('✓ Workflows and versions seeded (2 DAG pipelines)');

    console.log('3. Seeding workflow runs & four-eyes approvals...');
    await new RunSeeder(db).run();
    console.log('✓ Runs and run steps seeded');

    await new ApprovalSeeder(db).run();
    console.log('✓ Approvals seeded (1 pending four-eyes, 1 approved)');

    console.log('4. Seeding knowledge bases, documents, and ACL grants...');
    await new KnowledgeSeeder(db).run();
    console.log('✓ Knowledge bases, documents, and ACL grants seeded');

    console.log(
      '5. Seeding evaluation benchmarks, notifications & telemetry...',
    );
    await new EvaluationSeeder(db).run();
    console.log('✓ Evaluation suites and runs seeded');

    await new NotificationSeeder(db).run();
    console.log('✓ Notifications seeded');

    await new UsageTelemetrySeeder(db).run();
    console.log('✓ Usage records and audit compliance records seeded');

    console.log('=== Database Seeding Completed Successfully ===');
  } catch (error) {
    console.error('Seeding failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
