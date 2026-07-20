import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { AuthForm } from "@/components/auth-form";
import { publicConfig } from "@/lib/config";

const CALLBACK_ERRORS: Record<string, string> = {
  "missing-code": "That sign-in link was incomplete. Request a new code below.",
  "link-expired": "That sign-in link has expired or was already used. Request a new code below.",
  "not-configured": "Supabase is not configured yet. See the setup checklist.",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);
  const { error } = await searchParams;
  const initialError = error ? CALLBACK_ERRORS[error] ?? null : null;
  return (
    <main className="min-h-screen bg-[#080a0e] px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-[1200px]">
        <Link href="/" className="quiet-button"><ArrowLeft size={17} /> Back to discovery</Link>
        <div className="grid min-h-[calc(100vh-100px)] items-center gap-14 py-16 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="eyebrow">Your private workspace</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-medium leading-[.94] tracking-[-.06em] md:text-7xl">Keep the shortlist. Review every message.</h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/50">Accounts unlock saved creators, CSV export, Gemini-assisted drafts and confirmed Gmail sending. Public searches are never attached to anonymous visitors.</p>
            <div className="mt-10 flex items-center gap-3 text-sm text-white/45"><ShieldCheck size={20} className="text-[#9d8cff]" /> User-owned rows protected by Supabase policies.</div>
          </div>
          <AuthForm configured={configured} initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
