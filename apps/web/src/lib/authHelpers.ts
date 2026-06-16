import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { persistSession: false },
  }
);

export async function getOrCreateUser(email: string, name: string, explicitPassword?: string) {
  const emailLower = email.toLowerCase().trim();

  // 1. Check if user exists in auth.users
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("[authHelpers] Error listing users:", listError.message);
  }
  
  const existingUser = users?.find(u => u.email?.toLowerCase().trim() === emailLower);
  
  if (existingUser) {
    return {
      userId: existingUser.id,
      email: existingUser.email || email,
      isNew: false
    };
  }
  
  // 2. Generate secure temporary password or use explicit password
  let password = explicitPassword;
  let isNewGenerated = false;
  if (!password) {
    isNewGenerated = true;
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    password = "YA-";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  
  // 3. Create the user
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: emailLower,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      name: name,
      clear_password: password
    }
  });
  
  if (createError) {
    console.error("[authHelpers] Failed to auto-create auth user:", createError.message);
    // If it fails with already in use but we missed it in listUsers, fallback
    if (createError.message.includes("already") || createError.status === 422) {
      const { data: { users: refetchedUsers } } = await supabaseAdmin.auth.admin.listUsers();
      const matched = refetchedUsers?.find(u => u.email?.toLowerCase().trim() === emailLower);
      if (matched) {
        return {
          userId: matched.id,
          email: matched.email || email,
          isNew: false
        };
      }
    }
    throw createError;
  }
  
  return {
    userId: authData.user!.id,
    email: email,
    password: password,
    isNew: true,
    isNewGenerated
  };
}
