const { Client } = require('pg');
const fs = require('fs');

async function testConnection(url, name) {
    const client = new Client({ connectionString: url });
    try {
        await client.connect();
        fs.appendFileSync('out.json', JSON.stringify({ name, status: 'SUCCESS' }) + '\n');
        await client.end();
    } catch (err) {
        fs.appendFileSync('out.json', JSON.stringify({ name, status: 'ERROR', error: err.message }) + '\n');
    }
}

const url1 = "postgresql://postgres.xuqynbvzldxazemylpko:xGyLKr2ggHICUG1R@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const url2 = "postgresql://postgres:xGyLKr2ggHICUG1R@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const url3 = "postgresql://postgres:xGyLKr2ggHICUG1R@db.xuqynbvzldxazemylpko.supabase.co:5432/postgres";
const url4 = "postgresql://postgres.xuqynbvzldxazemylpko:xGyLKr2ggHICUG1R@db.xuqynbvzldxazemylpko.supabase.co:6543/postgres?pgbouncer=true";

async function run() {
    fs.writeFileSync('out.json', '');
    await testConnection(url1, "url1");
    await testConnection(url2, "url2");
    await testConnection(url3, "url3");
    await testConnection(url4, "url4");
}

run();
