const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (e) {
  console.error("Error reading .env.local:", e.message);
  process.exit(1);
}

const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase config not found in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function exportCSV() {
  const { data, error } = await supabase.from('influencers').select('*').order('followers_count', { ascending: false });
  if (error) {
    console.error("Error fetching influencers:", error);
    process.exit(1);
  }

  const headers = ['Name', 'Handle', 'Niche', 'Followers', 'Engagement Rate', 'Location', 'Email', 'Status'];
  const rows = data.map(c => {
    const name = `"${(c.name || '').replace(/"/g, '""')}"`;
    const handle = `"${(c.handle || '').replace(/"/g, '""')}"`;
    const niche = `"${(c.niche || '').replace(/"/g, '""')}"`;
    const followers = c.followers_count;
    const engRate = `"${(c.engagement_rate_str || (c.engagement_rate ? `${c.engagement_rate}%` : 'N/A')).replace(/"/g, '""')}"`;
    const location = `"${(c.location || 'N/A').replace(/"/g, '""')}"`;
    const email = `"${(c.email || 'N/A').replace(/"/g, '""')}"`;
    const status = `"${(c.outreach_status || 'uncontacted').replace(/"/g, '""')}"`;
    return [name, handle, niche, followers, engRate, location, email, status].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(path.join(__dirname, '..', 'indian_influencers_list.csv'), csvContent, 'utf8');
  console.log(`Successfully exported ${data.length} influencers to indian_influencers_list.csv`);
}

exportCSV();
