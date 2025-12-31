/**
 * Diagnostic script to test group creation
 * Run this in the browser console when logged in to see what error occurs
 */

// 1. Check if user is authenticated
const checkAuth = async () => {
  const { data: { user }, error } = await window.supabase.auth.getUser();
  console.log('Auth check:', { user: user?.id, error });
  return user;
};

// 2. Try to create a group
const testGroupCreation = async () => {
  const user = await checkAuth();

  if (!user) {
    console.error('❌ Not authenticated');
    return;
  }

  console.log('✅ User authenticated:', user.id);
  console.log('📝 Attempting to create test group...');

  // Attempt 1: Create group without created_by
  console.log('\n--- Test 1: Create group (relying on defaults) ---');
  const { data: test1Data, error: test1Error } = await window.supabase
    .from('groups')
    .insert({
      name: 'Test Group ' + Date.now(),
      is_temporary: false,
    })
    .select()
    .single();

  if (test1Error) {
    console.error('❌ Test 1 failed:', {
      code: test1Error.code,
      message: test1Error.message,
      details: test1Error.details,
      hint: test1Error.hint,
    });
  } else {
    console.log('✅ Test 1 succeeded:', test1Data);

    // Clean up
    await window.supabase.from('groups').delete().eq('id', test1Data.id);
  }

  // Attempt 2: Create group with created_by
  console.log('\n--- Test 2: Create group with created_by ---');
  const { data: test2Data, error: test2Error } = await window.supabase
    .from('groups')
    .insert({
      name: 'Test Group ' + Date.now(),
      is_temporary: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (test2Error) {
    console.error('❌ Test 2 failed:', {
      code: test2Error.code,
      message: test2Error.message,
      details: test2Error.details,
      hint: test2Error.hint,
    });
  } else {
    console.log('✅ Test 2 succeeded:', test2Data);

    // Try to add member
    console.log('\n--- Test 3: Add member to group ---');
    const { data: memberData, error: memberError } = await window.supabase
      .from('group_members')
      .insert({
        group_id: test2Data.id,
        user_id: user.id,
      });

    if (memberError) {
      console.error('❌ Test 3 failed:', {
        code: memberError.code,
        message: memberError.message,
        details: memberError.details,
        hint: memberError.hint,
      });
    } else {
      console.log('✅ Test 3 succeeded:', memberData);
    }

    // Clean up
    await window.supabase.from('groups').delete().eq('id', test2Data.id);
  }

  // Check RLS policies
  console.log('\n--- Checking table permissions ---');
  const { data: testSelect, error: selectError } = await window.supabase
    .from('groups')
    .select('*')
    .limit(1);

  console.log('Can SELECT from groups:', selectError ? '❌' : '✅', { testSelect, selectError });
};

// Run the tests
console.log('🔍 Starting group creation diagnostics...\n');
testGroupCreation();

console.log('\n💡 To manually test, paste this into console:\ntestGroupCreation()');
