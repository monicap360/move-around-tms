const fs=require("fs");const env={};for(const l of fs.readFileSync(".env.local","utf8").split(/\r?\n/)){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^"|"$/g,"");}
const url=env.DATABASE_URL||env.POSTGRES_URL;const {Client}=require("pg");
const sql=fs.readFileSync("supabase/migrations/20260629_oo_address_account_inspections.sql","utf8");
(async()=>{for(let i=1;i<=15;i++){try{const c=new Client({connectionString:url,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});await c.connect();await c.query(sql);
  const r=await c.query("select count(*) n from information_schema.columns where (table_name='ronyx_oo_drivers' and column_name='address') or (table_name='ronyx_owner_operators' and column_name='in_house_account_number')");
  const t=await c.query("select 1 from information_schema.tables where table_name='ronyx_oo_truck_inspections'");
  console.log("APPLIED ✓ on attempt",i,"| cols:",r.rows[0].n,"| inspections table:",t.rows.length?"YES":"NO");await c.end();process.exit(0);
}catch(e){console.log("attempt",i,"failed:",e.code||e.message);await new Promise(r=>setTimeout(r,60000));}}console.log("gave up after 15 attempts");process.exit(1);})();
