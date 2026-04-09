import { createClient } from "@supabase/supabase-js";

// REVIEW: Non-null assertions (!) on env vars will silently produce an invalid client
// if the variables are missing. Add a runtime check with a descriptive error message,
// e.g. `if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL")`.

// REVIEW: There is no .env.example or .env.local file in the repo. Add a .env.example
// documenting the required variables so other developers can set up the project.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// REVIEW: This creates a single browser-side Supabase client shared across the entire app.
// In Next.js App Router, you should use `createBrowserClient` from `@supabase/ssr` for
// client components and `createServerClient` for server components / route handlers to
// properly handle cookie-based auth per request.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
