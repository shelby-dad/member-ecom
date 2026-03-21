declare module 'https://esm.sh/@supabase/supabase-js@2.49.8' {
  export const createClient: any
}

declare module 'npm:nodemailer@6.9.16' {
  const nodemailer: any
  export default nodemailer
}

declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
  serve: (handler: (req: Request) => Response | Promise<Response>) => unknown
}
