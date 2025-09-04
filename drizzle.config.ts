import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export default defineConfig({
	schema: './src/lib/server/database/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url:`postgresql://postgres:${process.env.PUBLIC_SUPABASE_HOST}@${process.env.SUPABASE_SERVICE_ROLE_KEY}/postgres`
	},
	verbose: true,
	strict: true,
	casing: 'camelCase'
});
