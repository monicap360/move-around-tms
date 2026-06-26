import fs from 'fs';
import pg from 'pg';
const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local','utf8') : '';
const m = env.match(/^SUPABASE_DB_URL=(.+)$/m);
const url = (process.env.SUPABASE_DB_URL || (m && m[1])||'').trim();
if(!url){ console.error('No SUPABASE_DB_URL'); process.exit(1); }
const arg = process.argv[2]||'';
const mode = process.argv[3]||''; // 'each' = per-statement continue-on-error
const sql = arg.endsWith('.sql') ? fs.readFileSync(arg,'utf8') : arg;
const c = new pg.Client({ connectionString:url, ssl:{rejectUnauthorized:false} });
await c.connect();
if(mode==='each'){
  // strip line comments, split on ; (safe for plain DDL — no fn bodies)
  const clean = sql.replace(/^\s*--.*$/mg,'');
  const stmts = clean.split(';').map(s=>s.trim()).filter(Boolean);
  let ok=0, fail=0;
  for(const s of stmts){
    try{ await c.query(s); ok++; const label=s.replace(/\s+/g,' ').slice(0,70); console.log('  ✓ '+label); }
    catch(e){ fail++; const label=s.replace(/\s+/g,' ').slice(0,55); console.log('  ✗ '+label+' -- '+e.message.slice(0,70)); }
  }
  console.log(`\n${ok} ok, ${fail} failed`);
} else {
  try{ const res=await c.query(sql); const arr=Array.isArray(res)?res:[res]; for(const r of arr){ if(r.rows&&r.rows.length) console.log(JSON.stringify(r.rows,null,2)); else if(r.command) console.log(`${r.command} ${r.rowCount??''}`.trim()); } }
  catch(e){ console.error('SQL ERROR:', e.message); await c.end().catch(()=>{}); process.exit(2); }
}
await c.end();
