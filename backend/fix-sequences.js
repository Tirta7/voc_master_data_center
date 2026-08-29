const { Client } = require('pg'); 
const client = new Client({ user: 'postgres', host: '127.0.0.1', database: 'billiard_db', password: '1', port: 4538 }); 

client.connect()
  .then(async () => { 
    console.log('Fixing shifts sequence...');
    await client.query('SELECT setval(\'shifts_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM shifts));');
    
    console.log('Fixing sessions sequence...');
    await client.query('SELECT setval(\'sessions_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM sessions));');
    
    console.log('Fixing business_days sequence...');
    await client.query('SELECT setval(\'business_days_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM business_days));');
    
    console.log('Fixing transactions sequence...');
    await client.query('SELECT setval(\'transactions_id_seq\', (SELECT COALESCE(MAX(id), 1) FROM transactions));');

    const query = `
      DO $$
      DECLARE
          r record;
      BEGIN
          FOR r IN
              SELECT table_name, column_name
              FROM information_schema.columns
              WHERE column_default LIKE 'nextval%' AND table_schema = 'public'
          LOOP
              EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE(MAX(%I), 1) + 1, false) FROM %I',
                             r.table_name, r.column_name, r.column_name, r.table_name);
          END LOOP;
      END;
      $$;
    `;
    await client.query(query); 
    console.log('All Sequences synced successfully!'); 
  })
  .catch(console.error)
  .finally(() => client.end());
