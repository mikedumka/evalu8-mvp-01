declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.44.3" {
  export type User = {
    id: string;
    email: string | null;
    user_metadata?: Record<string, unknown> | null;
  };

  export type SupabaseClientOptions = {
    global?: {
      headers?: Record<string, string>;
    };
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
    };
  };

  type SingleResult = {
    data: Record<string, unknown> | null;
    error: Error | null;
  };

  type RpcResult = {
    data: Record<string, unknown> | null;
    error: Error | null;
  };

  export function createClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions
  ): {
    auth: {
      getUser(): Promise<{ data: { user: User | null }; error: Error | null }>;
      admin: {
        getUserByEmail(email: string): Promise<{ data: { user: User | null } }>;
        inviteUserByEmail(
          email: string,
          options?: {
            data?: Record<string, unknown>;
          }
        ): Promise<{ data: { user: User | null }; error: Error | null }>;
        updateUserById(
          uid: string,
          attributes: { user_metadata?: Record<string, unknown> }
        ): Promise<{ data: { user: User | null }; error: Error | null }>;
      };
    };
    from(table: string): {
      select(query: string): {
        eq(
          column: string,
          value: unknown
        ): {
          single(): Promise<SingleResult>;
          maybeSingle(): Promise<SingleResult>;
        };
      };
    };
    rpc(fn: string, args: Record<string, unknown>): Promise<RpcResult>;
  };
}

declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined;
    };
  };
}

export {};
