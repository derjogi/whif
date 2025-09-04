import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create the connection
const client = postgres(process.env.DATABASE_URL!);

// Create the Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export the client for direct access if needed
export { client };