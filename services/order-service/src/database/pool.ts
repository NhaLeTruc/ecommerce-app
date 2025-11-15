import { Pool, PoolClient } from 'pg';
import { config } from '../config';
import { logger } from '../middleware/logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: config.database.max,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', { error: err });
    });

    pool.on('connect', () => {
      logger.debug('Database pool connected');
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

export async function query(text: string, params?: any[]): Promise<any> {
  const pool = getPool();
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  logger.debug('Executed query', { text, duration, rows: res.rowCount });
  return res;
}

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
