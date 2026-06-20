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

  // 1. Check if user exists in auth.users using a paginated loop
  let existingUser = null;
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) {
      console.error("[authHelpers] Error listing users:", listError.message);
      break;
    }
    if (!data?.users || data.users.length === 0) {
      break;
    }
    const found = data.users.find(u => u.email?.toLowerCase().trim() === emailLower);
    if (found) {
      existingUser = found;
      break;
    }
    if (data.users.length < perPage) {
      break;
    }
    page++;
  }
  
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
    // Generate user-friendly temporary password: Joeschool#XXXXXX
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars: I, O, 1, 0
    let randomPart = "";
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password = `Joeschool#${randomPart}`;
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
      let matched = null;
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data, error: refetchError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (refetchError || !data?.users || data.users.length === 0) break;
        const found = data.users.find(u => u.email?.toLowerCase().trim() === emailLower);
        if (found) {
          matched = found;
          break;
        }
        if (data.users.length < perPage) break;
        page++;
      }
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
