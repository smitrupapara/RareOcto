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
            language: { code: "en", policy: "deterministic" },
            namespace: Deno.env.get("MSG91_TEMPLATE_NAMESPACE"),
            to_and_components: [{
              to: [user.phone],
              components: { body_1: { type: "text", value: sms.otp } },
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
