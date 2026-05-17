declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  namespace env {
    function get(key: string): string;
  }
}

declare module "https://esm.sh/standardwebhooks@1.0.0" {
  export class Webhook {
    constructor(secret: string);
    verify(payload: string, headers: Record<string, string>): unknown;
  }
}
