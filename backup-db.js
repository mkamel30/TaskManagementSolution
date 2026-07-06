import https from 'https';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SUPABASE_URL = "https://wxhinjdceqneufvanfqe.supabase.co";

const tables = [
  'tasks',
  'task_history',
  'comments',
  'bakery_quotas',
  'bakery_quota_history'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

function fetchTableData(table, serviceRoleKey, from, to) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    const options = {
      method: 'GET',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Range': `${from}-${to}`
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Failed to parse JSON response: " + data));
          }
        } else {
          reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function runBackup() {
  console.log("==========================================");
  console.log("   Supabase Database Backup (Zero-Deps)   ");
  console.log("==========================================");
  
  // 1. Get Service Role Key
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.log("Service Role Key not found in environment variables.");
    console.log("Please retrieve it from: Supabase Dashboard -> Settings -> API -> service_role key.");
    serviceRoleKey = await askQuestion("\nEnter your Supabase Service Role Key: ");
    serviceRoleKey = serviceRoleKey.trim();
  }

  if (!serviceRoleKey) {
    console.error("Error: Service Role Key is required to backup database!");
    rl.close();
    process.exit(1);
  }

  // 2. Create backup directory
  const backupDir = path.join(process.cwd(), 'supabase_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Backup files will be saved in: ${backupDir}\n`);

  // 3. Backup each table
  for (const table of tables) {
    console.log(`[+] Backing up table: ${table}...`);
    try {
      let allData = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const data = await fetchTableData(table, serviceRoleKey, from, to);
        if (data.length === 0) {
          hasMore = false;
        } else {
          allData = allData.concat(data);
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        }
      }

      const filePath = path.join(backupDir, `${table}_backup.json`);
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf-8');
      console.log(`    Successfully saved ${allData.length} records to ${table}_backup.json`);
    } catch (err) {
      console.error(`    [-] Error backing up table ${table}:`, err.message);
    }
  }

  console.log("\n==========================================");
  console.log("   Backup process completed successfully! ");
  console.log("==========================================");
  rl.close();
}

runBackup().catch(err => {
  console.error("Backup failed:", err);
  rl.close();
});
