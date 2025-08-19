import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
  console.log('🚀 Starting Supabase for E2E tests...');
  
  try {
    // Check if Supabase is already running
    console.log('📡 Checking if Supabase is already running...');
    try {
      await execAsync('cd backend && npx supabase status');
      console.log('✅ Supabase is already running');
      return;
    } catch (error) {
      console.log('⏳ Supabase not running, starting now...');
    }
    
    // Start Supabase from backend directory
    const { stdout, stderr } = await execAsync('cd backend && npx supabase start');
    
    if (stderr && !stderr.includes('Started supabase local development setup')) {
      console.warn('⚠️ Supabase startup warnings:', stderr);
    }
    
    console.log('✅ Supabase started successfully');
    console.log('📊 Supabase status:', stdout.split('\n').slice(-10).join('\n'));
    
    // Wait for services to be fully ready
    console.log('⏳ Waiting for services to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🎯 E2E test environment ready!');
    
  } catch (error) {
    console.error('❌ Failed to start Supabase for E2E tests:', error);
    console.error('💡 Try running "cd backend && npx supabase start" manually');
    throw error;
  }
}
