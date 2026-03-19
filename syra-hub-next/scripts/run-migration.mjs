// Script to run SQL migrations against Supabase via connection pooler
// Uses the service_role JWT token for authentication (no password needed)
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Supabase connection pooler with JWT auth
// Format: postgresql://postgres.[ref]:[service-role-key]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
const PROJECT_REF = 'cbhykdpvpnbxvbtlnvpv'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiaHlrZHB2cG5ieHZidGxudnB2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ2MTc5NCwiZXhwIjoyMDg3MDM3Nzk0fQ.jmeZGGe_6dCTeQo_WyBNWTOWDdZUsj52-onMILY42uI'

const connectionString = `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`

async function runMigration() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('Connected!')

    // Read and execute migration files in order
    const migrationsDir = path.resolve(__dirname, '../supabase/migrations')
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()

    for (const file of files) {
      console.log(`\nRunning migration: ${file}`)
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

      // Split by semicolons to handle multiple statements
      // But be careful with functions that contain semicolons
      // Instead, let's run the whole file as one statement with multi-statement support
      try {
        await client.query(sql)
        console.log(`✓ ${file} completed successfully`)
      } catch (err) {
        console.error(`✗ Error in ${file}: ${err.message}`)
        // Continue with other migrations
      }
    }

    // Run seed
    const seedFile = path.resolve(__dirname, '../supabase/seed-clients.sql')
    if (fs.existsSync(seedFile)) {
      console.log('\nRunning seed: seed-clients.sql')
      const seedSql = fs.readFileSync(seedFile, 'utf8')
      try {
        await client.query(seedSql)
        console.log('✓ seed-clients.sql completed successfully')
      } catch (err) {
        console.error(`✗ Error in seed: ${err.message}`)
      }
    }

    // Verify tables exist
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    console.log('\nPublic tables:', rows.map(r => r.table_name).join(', '))

  } catch (err) {
    console.error('Connection failed:', err.message)
  } finally {
    await client.end()
  }
}

runMigration()
