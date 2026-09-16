import { readFileSync } from 'node:fs';
import { connect, StorageType, StringCodec } from 'nats';
import { Pool } from 'pg';
import { databaseUrl } from './shared/config/database-credentials';

const MAX_ATTEMPTS = 10;
const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

async function main() {
  if (!process.env.NATS_URL) throw Error('NATS_URL required');
  const pool = new Pool({ connectionString: databaseUrl(), max: 2 });
  const token_file = process.env.NATS_TOKEN_FILE;
  if (!token_file) throw Error('NATS_TOKEN_FILE required');
  const token = readFileSync(token_file, 'utf8').trim();
  if (!token) throw Error('NATS token secret is empty');
  const natsConnection = await connect({
    servers: process.env.NATS_URL,
    token,
    maxReconnectAttempts: -1,
  });
  const jetStreamClient = natsConnection.jetstream();
  const manager = await natsConnection.jetstreamManager();
  try {
    await manager.streams.info('AGENT_EVENTS');
  } catch {
    await manager.streams.add({
      name: 'AGENT_EVENTS',
      subjects: ['run.>', 'workflow.>', 'approval.>'],
      storage: StorageType.File,
    });
  }
  const codec = StringCodec();
  let running = true;
  process.on('SIGTERM', () => {
    running = false;
  });
  process.on('SIGINT', () => {
    running = false;
  });
  try {
    while (running) {
      const client = await pool.connect();
      const failed_ids: string[] = [];
      try {
        await client.query('BEGIN');
        const rows = await client.query<{
          id: string;
          subject: string;
          payload: unknown;
        }>(
          `SELECT id,subject,payload FROM outbox_events
           WHERE published_at IS NULL AND attempts < $1
           ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 20`,
          [MAX_ATTEMPTS],
        );
        for (const event of rows.rows) {
          try {
            await jetStreamClient.publish(
              event.subject,
              codec.encode(JSON.stringify(event.payload)),
              { msgID: event.id },
            );
            await client.query(
              'UPDATE outbox_events SET published_at=now(),attempts=attempts+1 WHERE id=$1',
              [event.id],
            );
          } catch (publish_error) {
            failed_ids.push(event.id);
            console.error(
              'Outbox event publish failed:',
              event.id,
              publish_error instanceof Error
                ? publish_error.message
                : 'unknown',
            );
          }
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error(
          'Outbox batch error:',
          error instanceof Error ? error.message : 'unknown',
        );
      } finally {
        client.release();
      }
      for (const id of failed_ids) {
        await pool
          .query('UPDATE outbox_events SET attempts=attempts+1 WHERE id=$1', [
            id,
          ])
          .catch(() => {});
      }
      await pause(1200);
    }
  } finally {
    await natsConnection.drain();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    'Outbox fatal:',
    error instanceof Error ? error.message : 'unknown',
  );
  process.exitCode = 1;
});
