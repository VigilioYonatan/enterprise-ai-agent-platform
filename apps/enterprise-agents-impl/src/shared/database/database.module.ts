import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../database/schema';
import { databaseUrl } from '../config/database-credentials';

export const DB = Symbol('DB');
export type AppDatabase = ReturnType<typeof createDb>;
function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}
@Injectable()
class PoolLifecycle implements OnApplicationShutdown {
  constructor(@Inject('PG_POOL') private readonly pool: Pool) {}
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
@Global()
@Module({
  providers: [
    {
      provide: 'PG_POOL',
      useFactory: () => {
        const pool = new Pool({ connectionString: databaseUrl(), max: 10 });
        pool.on('error', (err) => {
          // Log idle client errors without crashing the application process
          console.error('[PG_POOL] Idle client error:', err?.message || err);
        });
        return pool;
      },
    },
    {
      provide: DB,
      useFactory: (pool: Pool) => createDb(pool),
      inject: ['PG_POOL'],
    },
    PoolLifecycle,
  ],
  exports: [DB, 'PG_POOL'],
})
export class DatabaseModule {}
