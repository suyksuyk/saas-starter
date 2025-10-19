import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { runMigrations } from '@/lib/db/migrate-payment-data';
import { seedDatabase } from '@/lib/db/seed';

export async function GET() {
  try {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      return NextResponse.json({ 
        error: 'Database URL not found',
        message: 'Please ensure POSTGRES_URL is set in environment variables'
      }, { status: 500 });
    }

    console.log('Starting database migration...');
    
    const client = postgres(connectionString, { 
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    });
    
    const db = drizzle(client);
    let seedingStatus = 'skipped';

    try {
      // 运行Drizzle迁移
      console.log('Running Drizzle migrations...');
      await migrate(db, { migrationsFolder: 'lib/db/migrations' });
      console.log('Drizzle migrations completed');
      
      // 运行支付数据迁移
      console.log('Running payment data migrations...');
      await runMigrations('migrate');
      console.log('Payment data migrations completed');
      
      // 种子数据（仅在开发环境或首次部署时）
      const isDevelopment = process.env.NODE_ENV === 'development';
      const shouldSeed = process.env.SHOULD_SEED === 'true';
      
      if (isDevelopment || shouldSeed) {
        console.log('Seeding database...');
        await seedDatabase();
        console.log('Database seeded successfully');
        seedingStatus = 'completed';
      }

    } finally {
      await client.end();
    }

    return NextResponse.json({ 
      message: 'Database setup completed successfully',
      details: {
        migrations: 'completed',
        seeding: seedingStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Database migration error:', error);
    
    return NextResponse.json({ 
      error: 'Migration failed',
      details: {
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        hint: 'Check database connection and migration files'
      }
    }, { status: 500 });
  }
}

// 支持POST请求以手动触发特定操作
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { operation } = body;

    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      return NextResponse.json({ error: 'Database URL not found' }, { status: 500 });
    }

    const client = postgres(connectionString);
    const db = drizzle(client);

    try {
      switch (operation) {
        case 'migrate':
          await migrate(db, { migrationsFolder: 'lib/db/migrations' });
          await runMigrations('migrate');
          return NextResponse.json({ message: 'Migrations completed successfully' });
          
        case 'seed':
          await seedDatabase();
          return NextResponse.json({ message: 'Database seeded successfully' });
          
        case 'validate':
          await runMigrations('validate');
          return NextResponse.json({ message: 'Data validation completed successfully' });
          
        case 'rollback':
          await runMigrations('rollback');
          return NextResponse.json({ message: 'Rollback completed successfully' });
          
        default:
          return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
      }
    } finally {
      await client.end();
    }

  } catch (error) {
    console.error('Operation error:', error);
    return NextResponse.json({ 
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
