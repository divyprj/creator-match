const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  try {
    const envPath = path.join(__dirname, '../../.env.local');
    if (!fs.existsSync(envPath)) return null;
    const content = fs.readFileSync(envPath, 'utf8');
    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)/);
    const keyMatch = content.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=\s*(.+)/);
    return {
      url: urlMatch ? urlMatch[1].trim() : null,
      key: keyMatch ? keyMatch[1].trim() : null,
    };
  } catch (e) {
    return null;
  }
}

async function runTest() {
  const env = loadEnv();
  if (!env || !env.url || !env.key || env.url.includes('placeholder')) {
    console.error('Environment variables not configured properly.');
    return;
  }

  const supabase = createClient(env.url, env.key);
  console.log(`Connecting to Supabase: ${env.url}\n`);

  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) {
      console.error('✘ Database error:', error.message || error);
      console.log('\nTip: Make sure you deployed schema.sql in your Supabase SQL Editor!');
    } else {
      console.log('✔ Connected successfully to Supabase!');
      console.log('Settings Table Rows:', data);
    }
  } catch (err) {
    console.error('✘ Connection request failed:', err.message || err);
  }
}

runTest();
