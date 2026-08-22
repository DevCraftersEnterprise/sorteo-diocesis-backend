const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query('TRUNCATE TABLE participants RESTART IDENTITY');
    await pool.end();
    console.log('Test DB reset: participants truncated');
}

main().catch((error) => {
    console.error('Failed to reset test DB:', error);
    process.exit(1);
});