const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read connection string from environment variable to prevent security leaks
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  console.error('Please run: DATABASE_URL="your-connection-string" node scripts/deploy-db.js');
  process.exit(1);
}

async function main() {
  console.log('Connecting to Supabase Database via Connection Pooler (aws-1-ap-south-1)...');
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema to database (this may take a few seconds)...');
    await client.query(sql);
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

main();
