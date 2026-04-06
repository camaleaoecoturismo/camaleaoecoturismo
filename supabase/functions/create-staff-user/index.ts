import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateStaffUserRequest {
  email: string;
  password: string;
  name: string;
  cargo?: string;
  telefone?: string;
  avatar_url?: string;
  permissions: string[]; // section keys that are allowed
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client using caller's JWT to verify admin role
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: adminRole } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Acesso negado: somente administradores podem criar usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateStaffUserRequest = await req.json();
    const { email, password, name, cargo, telefone, avatar_url, permissions } = body;

    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: "Email, senha e nome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client to create the auth user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email confirmation
    });

    if (createError || !newUser.user) {
      console.error("Error creating auth user:", createError);
      return new Response(
        JSON.stringify({ error: createError?.message || "Erro ao criar usuário" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;

    // Remove the auto-inserted 'user' role (added by the on_auth_user_created trigger)
    // before inserting 'staff', to avoid duplicate role conflicts
    await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", newUserId)
      .eq("role", "user");

    // Insert staff role in user_roles
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: "staff" });

    if (roleError) {
      // Rollback: delete the created auth user
      await adminClient.auth.admin.deleteUser(newUserId);
      console.error("Error inserting role:", roleError);
      return new Response(
        JSON.stringify({ error: "Erro ao definir papel do usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert staff profile
    const { error: profileError } = await adminClient
      .from("staff_profiles")
      .insert({
        user_id: newUserId,
        name,
        cargo: cargo || null,
        telefone: telefone || null,
        avatar_url: avatar_url || null,
        is_active: true,
        created_by: caller.id,
      });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      console.error("Error inserting profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar perfil do usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert permissions — all known sections, true only for those in the permissions array
    const ALL_SECTIONS = [
      "gestao", "reservas", "catalogo", "financeiro", "clientes",
      "fidelidade", "chat_ia", "marketing", "configuracoes", "guias", "exportar",
    ];

    const permissionsToInsert = ALL_SECTIONS.map((section) => ({
      user_id: newUserId,
      section,
      can_access: permissions.includes(section),
      granted_by: caller.id,
    }));

    const { error: permError } = await adminClient
      .from("staff_permissions")
      .insert(permissionsToInsert);

    if (permError) {
      console.error("Error inserting permissions:", permError);
      // Non-fatal: user was created, permissions can be edited later
    }

    return new Response(
      JSON.stringify({ user_id: newUserId, email, name }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro inesperado. Tente novamente." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
