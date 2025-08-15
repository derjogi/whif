import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServiceRoleSupabaseClient } from '$lib/server/database/supabase/serviceRoleSupabase';

describe('Vote RLS Policy Tests', () => {
  let authenticatedClient: any;
  let serviceRoleClient: any;
  const testUserId = 'a80281e3-ad49-4c5c-9efd-d576c7244874';
  const testStatementId = 'fc6b6204-dc9e-4450-a3f2-dfe3a1de28db';
  const authorId = testUserId;

  beforeEach(async () => {
		// Use service role client for setup and validation
		serviceRoleClient = createServiceRoleSupabaseClient();

		// Create an authenticated client
		console.log('Setting up authenticated client for testing...');
  
    authenticatedClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await authenticatedClient.auth.signInWithPassword({
      email: 'test@fake-provider.com',
      password: 'testPassword'
    });
    // UUID = a5dbcdc9-3f25-486f-89be-a866bd5317db
    if (error || !data) {
      throw Error("Failed to sign in: ", error)
    }
    // And just for good measure, make sure we get the correct user from the db:
		const { data: authResult, error: authTestError } =
      await authenticatedClient.rpc('auth_uid_debug');
    if (authTestError || !authResult) {
      throw Error("Db didn't get the userId: ", authTestError)
    }
		console.log('auth.uid() result:', authResult);
	});

  afterEach(async () => {
    // Clean up any test data if needed
    if (authenticatedClient) {
      await authenticatedClient.auth.signOut();
    }
  });

  it('should verify test user exists in database', async () => {
    const { data: user, error } = await serviceRoleClient
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single();

    console.log('Test user in database:', user);
    console.log('User lookup error:', error);

    expect(user).toBeTruthy();
    expect(user.id).toBe(testUserId);
  });

  it('should verify statement and idea relationships exist', async () => {
    const { data, error } = await serviceRoleClient
      .from('statements')
      .select(`
        id,
        idea_id,
        ideas!inner(id, published, user_id)
      `)
      .eq('id', testStatementId);

    console.log('Statement relationship test result:', data);
    console.log('Statement relationship test error:', error);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data[0]?.ideas?.published).toBe(true);
    expect(data[0]?.ideas?.user_id).toBe(authorId);
  });

  it('should test auth.uid() function with service role', async () => {
    // This won't work with service role since it bypasses auth
    const { data, error } = await serviceRoleClient.rpc('auth_uid_debug');

    console.log('auth.uid() with service role result:', data);
    console.log('auth.uid() with service role error:', error);

    expect(error).toBeNull();
    // Service role should return null for auth.uid()
    expect(data).toBeNull();
  });

  it('should test RLS policy check function with service role', async () => {
    const { data, error } = await serviceRoleClient.rpc('test_vote_rls_policy', {
      p_statement_id: testStatementId,
      p_user_id: testUserId
    });

    console.log('RLS policy test with service role result:', data);
    console.log('RLS policy test error:', error);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    // With service role, auth.uid() will be null, so some checks will fail
    expect(data.statement_exists).toBe(true);
    expect(data.statement_accessible).toBe(true);
  });

  it('should allow vote operations with service role client', async () => {
    // First, clean up any existing vote
    await serviceRoleClient
      .from('votes')
      .delete()
      .eq('statement_id', testStatementId)
      .eq('user_id', testUserId);

    const voteData = {
      statement_id: testStatementId,
      user_id: testUserId,
      vote_type: 1,
      updated_at: new Date().toISOString()
    };

    // Test INSERT
    const { data: insertResult, error: insertError } = await serviceRoleClient
      .from('votes')
      .insert(voteData)
      .select()
      .single();

    console.log('Service role INSERT result:', insertResult);
    console.log('Service role INSERT error:', insertError);

    expect(insertError).toBeNull();
    expect(insertResult).toBeTruthy();

    // Test UPSERT (should update the existing vote)
    const { data: upsertResult, error: upsertError } = await serviceRoleClient
      .from('votes')
      .upsert({
        ...voteData,
        vote_type: -1, // Change to downvote
        updated_at: new Date().toISOString()
      }, { onConflict: 'statement_id, user_id' })
      .select()
      .single();

    console.log('Service role UPSERT result:', upsertResult);
    console.log('Service role UPSERT error:', upsertError);

    expect(upsertError).toBeNull();
    expect(upsertResult).toBeTruthy();
    expect(upsertResult.vote_type).toBe(-1);

    // Clean up
    await serviceRoleClient
      .from('votes')
      .delete()
      .eq('id', upsertResult.id);
  });

  it('should be allowed to vote on a statement from a published idea', async () => {
    // await authenticatedClient
  });

  // This test demonstrates the issue - regular client fails even though logic should work
  it('will fail with regular client (demonstrating the issue)', async () => {
		// First clean up any existing vote
		await serviceRoleClient
			.from('votes')
			.delete()
			.eq('statement_id', testStatementId)
			.eq('user_id', testUserId);

    // Now, test whether it can upsert a vote.
		const voteData = {
			statement_id: testStatementId,
			user_id: testUserId,
			vote_type: 1,
			updated_at: new Date().toISOString()
		};

		// This should pass if RLS policies aren't screwed up:
		const { data: insertResult, error: insertError } = await authenticatedClient
			.from('votes')
			.insert(voteData)
			.select()
			.single();

		console.log('Regular client INSERT result:', insertResult);
		console.log('Regular client INSERT error:', insertError);

		// This is expected to fail - demonstrating the authentication issue
		expect(insertError).toBeNull();
	});
});