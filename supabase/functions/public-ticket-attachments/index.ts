// Edge function: lists ONLY public attachments of a ticket identified by its
// public token, returning short-lived signed URLs. No login required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "ticket-attachments";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string" || token.length < 10) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: ticket } = await supabase
      .from("tickets")
      .select("id")
      .eq("public_token", token)
      .is("deleted_at", null)
      .maybeSingle();

    if (!ticket) {
      return new Response(JSON.stringify({ attachments: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: atts } = await supabase
      .from("ticket_attachments")
      .select("id,file_name,file_path,file_type,kind,visibility,created_at")
      .eq("ticket_id", ticket.id)
      .eq("visibility", "publica")
      .order("created_at", { ascending: true });

    const result = [];
    for (const a of atts ?? []) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(a.file_path, 900);
      result.push({
        id: a.id,
        file_name: a.file_name,
        file_type: a.file_type,
        kind: a.kind,
        created_at: a.created_at,
        url: signed?.signedUrl ?? null,
      });
    }

    return new Response(JSON.stringify({ attachments: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "bad request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
