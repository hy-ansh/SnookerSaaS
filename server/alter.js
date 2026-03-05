const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

(async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        await client.query('ALTER TABLE "Table" ADD COLUMN IF NOT EXISTS "customHourlyRate" DECIMAL(65,30);');
        console.log('ALTER success');
    } catch (e) {
        console.error('SQL Error', e);
    } finally {
        await client.end();
    }
})();
