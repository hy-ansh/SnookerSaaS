import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase backend environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function clearOldData() {
    console.log('Cleaning up old test data...');
    // Since cascading deletes are on, deleting stores and auth users usually cleans up most things.
    // But just to be sure, we delete from tables upwards in a specific order if needed, 
    // or we just rely on creating fresh data with specific emails so we know they exist.
}

async function createTestUser(email: string, fullName: string, role: string) {
    console.log(`Creating user: ${email} (${role})`);

    // Check if exists
    const { data: users, error: checkError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.users.find(u => u.email === email);

    if (existingUser) {
        console.log(`- User already exists, ensuring profile role is ${role}`);
        // Ensure profile has correct role
        await supabaseAdmin.from('profiles').update({ role, full_name: fullName }).eq('id', existingUser.id);
        return existingUser.id;
    }

    // Create new user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'password123',
        email_confirm: true,
        user_metadata: { full_name: fullName, role }
    });

    if (error) {
        console.error(`- Failed to create user ${email}:`, error.message);
        throw error;
    }

    return data.user.id;
}

async function seed() {
    try {
        console.log('🌱 Starting Database Seeding...\n');

        // 1. Create Users
        const adminId = await createTestUser('admin@cuemanager.com', 'Admin User', 'ADMIN');
        const ownerId = await createTestUser('owner@cuemanager.com', 'Alex Rivera', 'STORE_OWNER');
        const staffId = await createTestUser('staff@cuemanager.com', 'Jordan Vance', 'STAFF');
        const player1Id = await createTestUser('player1@test.com', 'Felix Henderson', 'PLAYER');
        const player2Id = await createTestUser('player2@test.com', 'Sarah OConnell', 'PLAYER');

        // 2. Clear any existing stores for this owner to start fresh (cascades)
        await supabaseAdmin.from('stores').delete().eq('owner_id', ownerId);

        // 3. Create Store
        console.log('\nCreating Store & Branch...');
        const { data: store, error: storeErr } = await supabaseAdmin
            .from('stores')
            .insert({ owner_id: ownerId, name: 'Emerald Club Downtown' })
            .select().single();
        if (storeErr) throw storeErr;

        // 4. Create Branch
        const { data: branch, error: branchErr } = await supabaseAdmin
            .from('branches')
            .insert({ store_id: store.id, name: 'Main Branch', address: '123 Downtown Ave' })
            .select().single();
        if (branchErr) throw branchErr;

        // 5. Create Tables
        console.log('Creating Tables...');
        const tablesToInsert = Array.from({ length: 15 }).map((_, i) => ({
            branch_id: branch.id,
            name_or_number: `Table ${i + 1}`,
            status: 'AVAILABLE'
        }));

        const { data: tables, error: tablesErr } = await supabaseAdmin
            .from('tables')
            .insert(tablesToInsert)
            .select();
        if (tablesErr) throw tablesErr;

        // 6. Create Pricing Rule
        console.log('Configuring Pricing Rules...');
        const { error: pricingErr } = await supabaseAdmin
            .from('pricing_rules')
            .insert({
                branch_id: branch.id,
                day_of_week: [0, 1, 2, 3, 4, 5, 6], // Every day
                start_time: '00:00:00',
                end_time: '23:59:59',
                hourly_rate: 15.00
            });
        if (pricingErr) throw pricingErr;

        // 7. Initialize some wallet balances for players
        console.log('Adding wallet balances...');
        await supabaseAdmin.from('wallet_transactions').insert([
            { player_id: player1Id, amount: 50.00, type: 'DEPOSIT' },
            { player_id: player2Id, amount: 25.00, type: 'DEPOSIT' }
        ]);

        console.log('\n✅ Seeding Complete!');
        console.log('\n--- Test Accounts Created ---');
        console.log('Admin Account: admin@cuemanager.com / password123');
        console.log('Owner Account: owner@cuemanager.com / password123');
        console.log('Staff Account: staff@cuemanager.com / password123');
        console.log('Player 1: player1@test.com / password123');
        console.log('Player 2: player2@test.com / password123');

    } catch (err) {
        console.error('\n❌ Seeding Failed:', err);
    }
}

seed();
