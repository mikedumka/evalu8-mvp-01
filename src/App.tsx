import {
  type LucideIcon,
  BarChart3,
  ClipboardList,
  Sparkles,
  Users2,
} from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./components/Login";

const highlights: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Sparkles,
    title: "Google OAuth ready",
    description:
      "Authentication flow configured with Google OAuth provider for secure user access.",
  },
  {
    icon: Users2,
    title: "Multi-tenant ready",
    description:
      "Association-based user management with role-based permissions for administrators and evaluators.",
  },
  {
    icon: ClipboardList,
    title: "Season workflows next",
    description:
      "Season setup, cohort management, and player distribution screens are queued to follow the specs.",
  },
  {
    icon: BarChart3,
    title: "Database foundation",
    description:
      "Supabase client integrated with auth context, ready for database schema and RLS policies.",
  },
];

function App() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950">
        <div className="text-surface-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-950 via-surface-900 to-surface-950 px-4 py-12 text-surface-50">
      <main className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-surface-900/70 px-8 py-12 text-center shadow-glow backdrop-blur sm:px-12">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center justify-center rounded-full bg-brand-500/15 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-200">
            Evalu8 Platform
          </span>
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-surface-400 transition hover:text-surface-200"
          >
            Sign out
          </button>
        </div>

        <ClipboardList
          className="mx-auto mt-8 h-14 w-14 text-brand-300"
          aria-hidden="true"
        />
        <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-white xs:text-4xl md:text-5xl">
          Welcome, {user.user_metadata?.full_name || user.email}
        </h1>
        <p className="mt-4 text-pretty text-base text-surface-200 sm:text-lg">
          Google OAuth authentication successful. Ready to build the season
          management workflows and database schema.
        </p>

        <div className="mt-10 grid gap-4 xs:grid-cols-2">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-white/10 bg-surface-900/60 p-6 text-left shadow-[0_25px_45px_-30px_rgba(16,16,32,0.8)]"
            >
              <Icon className="h-8 w-8 text-brand-300" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
              <p className="mt-2 text-sm text-surface-200">{description}</p>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="mt-10 inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_-18px_rgba(134,72,255,0.65)] transition hover:bg-brand-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
        >
          Continue to Dashboard
        </button>
      </main>
    </div>
  );
}

export default App;
