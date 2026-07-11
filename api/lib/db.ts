import { Pool, PoolClient } from 'pg';

let pool: Pool;

export async function getConnection(): Promise<PoolClient> {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.reemotedb_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool.connect();
}

export async function executeQuery(
  query: string,
  params?: any[]
): Promise<any> {
  const client = await getConnection();
  try {
    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function executeQuerySingle(
  query: string,
  params?: any[]
): Promise<any> {
  const rows = await executeQuery(query, params);
  return rows[0] || null;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
