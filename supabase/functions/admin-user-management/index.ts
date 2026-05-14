import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente do usuário (para validar permissão)
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente admin
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Verifica se quem chama é super_admin ou ti
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "super_admin" || r.role === "ti");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, full_name, phone, role, empresa, vendedor_id } = body.userData;

      if (role === "vendedor" && !vendedor_id) {
        return new Response(JSON.stringify({ error: "vendedor_id obrigatório para função vendedor" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (cErr) throw cErr;

      const uid = created.user!.id;
      await admin.from("profiles").update({ full_name, phone, empresa }).eq("user_id", uid);
      await admin.from("user_roles").delete().eq("user_id", uid);
      await admin.from("user_roles").insert({
        user_id: uid,
        role,
        vendedor_id: role === "vendedor" ? vendedor_id : null,
      });

      return new Response(JSON.stringify({ ok: true, user: created.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { userId } = body;
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
      await admin.from("profiles").delete().eq("user_id", userId);
      await admin.from("user_roles").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset-password") {
      const { userId, password } = body;
      const { error } = await admin.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("admin-user-management error:", e);
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
