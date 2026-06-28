// send-whatsapp-otp — Supabase "Send SMS Hook" → MSG91 WhatsApp delivery.
//
// REQUIRED WhatsApp template config (Meta WhatsApp Manager / MSG91 → Templates).
// Get this wrong and Meta REJECTS the template; sends then land in MSG91's
// failed log with reason "Template status is rejected" — no code change fixes it.
//
//   Name     : MSG91_TEMPLATE_NAME (e.g. rareocto_login_otp; lowercase + "_" only)
//   Category : Authentication      <-- NOT Marketing/Utility. This is the #1 cause
//                                       of rejection. OTP templates MUST be this.
//   Language : en               <-- must EXACTLY match `language.code` below
//   Body     : "{{1}} is your verification code."  (Meta-fixed, one variable)
//   Add-ons  : enable "security disclaimer" + "code expires in 10 minutes"
//   Button   : "Copy code" (OTP/URL button) — the OTP is sent in BOTH body_1
//              and button_1 below; omitting button_1 makes Meta reject the send.
//
// TTL must stay aligned in three places:
//   - Supabase → Auth → Providers → Phone → OTP Expiry = 600s, OTP Length = 6
//   - template "expires in" warning = 10 minutes
//
// After approval: `supabase functions deploy send-whatsapp-otp`. If the template
// name/namespace/language changes, update the MSG91_* secrets to match.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const error = (msg: string, status = 500) =>
  new Response(JSON.stringify({ error: { http_code: status, message: msg } }), {
    status,
    headers: { "content-type": "application/json" },
  });

Deno.serve(async (req) => {
  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const secret = Deno.env.get("SEND_SMS_HOOK_SECRET")!.replace("v1,whsec_", "");
  const wh = new Webhook(secret);

  let user: { phone: string };
  let sms: { otp: string };
  try {
    ({ user, sms } = wh.verify(payload, headers) as {
      user: { phone: string };
      sms: { otp: string };
    });
  } catch {
    return error("Invalid webhook signature", 401);
  }

  const res = await fetch(
    "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
    {
      method: "POST",
      headers: {
        authkey: Deno.env.get("MSG91_AUTH_KEY")!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        integrated_number: Deno.env.get("MSG91_WHATSAPP_NUMBER"),
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: Deno.env.get("MSG91_TEMPLATE_NAME"),
            // Must match the approved template's language exactly (en).
            language: { code: "en", policy: "deterministic" },
            namespace: Deno.env.get("MSG91_TEMPLATE_NAMESPACE"),
            to_and_components: [{
              to: [user.phone],
              // Authentication-category templates with a "Copy code" button need
              // the OTP in BOTH the body variable {{1}} and the button component.
              // Omitting button_1 makes Meta reject the send for a copy-code template.
              components: {
                body_1: { type: "text", value: sms.otp },
                button_1: { subtype: "url", type: "text", value: sms.otp },
              },
            }],
          },
        },
      }),
    }
  );

  const resBody = await res.text();
  console.log("MSG91 response status:", res.status);
  console.log("MSG91 response body:", resBody);

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: { http_code: 500, message: resBody } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
  return new Response("{}", { headers: { "content-type": "application/json" } });
});
