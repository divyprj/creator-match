import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookmarkSimple,
  ChartLineUp,
  EnvelopeSimple,
  MagnifyingGlass,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { OutreachStudio } from "@/components/outreach-studio";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

type SavedCreator = {
  id: string;
  name: string;
  handle: string;
  platform: string;
  profile_url: string;
  followers: number | null;
  engagement_rate: number | null;
  contact_email: string | null;
  niche: string;
  strict_eligible: boolean;
  created_at: string;
};

const compact = (value: number | null) =>
  value == null ? "Unverified" : Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) return <SetupRequired />;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) redirect("/auth");

  // Every table is protected by an owner RLS policy, so these read only the signed-in user's rows.
  const [savedResponse, runsResponse, contactedResponse] = await Promise.all([
    supabase
      .from("saved_creators")
      .select("id,name,handle,platform,profile_url,followers,engagement_rate,contact_email,niche,strict_eligible,created_at")
      .order("engagement_rate", { ascending: false, nullsFirst: false })
      .limit(100),
    supabase.from("discovery_runs").select("result_count"),
    supabase.from("outreach_events").select("id", { count: "exact", head: true }).eq("status", "sent"),
  ]);

  const creators = (savedResponse.data ?? []) as SavedCreator[];
  const discovered = (runsResponse.data ?? []).reduce(
    (total, run: { result_count: number | null }) => total + (run.result_count ?? 0),
    0,
  );
  const contacted = contactedResponse.count ?? 0;

  const measured = creators.filter((creator) => creator.engagement_rate != null);
  const meanEngagement = measured.length
    ? measured.reduce((total, creator) => total + Number(creator.engagement_rate), 0) / measured.length
    : null;
  const reachable = creators.filter((creator) => creator.contact_email).length;

  return (
    <main className="min-h-screen bg-[#080a0e] px-5 py-7 text-white md:px-10 md:py-9">
      <div className="mx-auto max-w-[1440px]">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="quiet-button"><ArrowLeft size={17} /> Live discovery</Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/35 sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </header>

        <section className="py-20 md:py-28">
          <p className="eyebrow">Campaign overview</p>
          <h1 className="mt-6 max-w-5xl text-5xl font-medium leading-[.92] tracking-[-.065em] md:text-8xl">A shortlist with a memory.</h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-white/48">Only creators you deliberately save appear here. Anonymous searches never create rows.</p>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<MagnifyingGlass size={20} />} label="Creators found" value={discovered.toLocaleString("en-IN")} caption="Across every live search you have run" />
          <Stat icon={<Users size={20} />} label="Saved to shortlist" value={creators.length.toLocaleString("en-IN")} caption={`${reachable} with a contact email`} />
          <Stat icon={<EnvelopeSimple size={20} />} label="Contacted" value={contacted.toLocaleString("en-IN")} caption="Emails confirmed and delivered" />
          <Stat
            icon={<ChartLineUp size={20} />}
            label="Mean engagement"
            value={meanEngagement == null ? "Unverified" : `${meanEngagement.toFixed(2)}%`}
            caption={measured.length ? `Measured across ${measured.length} saved creators` : "No saved creator has verified engagement yet"}
          />
        </section>

        <section className="mb-8 panel p-5 md:p-7">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="eyebrow">Saved creators</p>
              <h2 className="mt-3 text-2xl font-medium">{creators.length} in your workspace</h2>
              <p className="mt-2 text-sm text-white/35">Ranked by verified engagement rate, unverified last.</p>
            </div>
            <BookmarkSimple size={24} className="text-[#9d8cff]" />
          </div>
          {creators.length === 0 ? (
            <p className="rounded-2xl bg-white/[.035] p-8 text-center text-sm text-white/42">Run a live search and save a creator to build your shortlist.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {creators.map((creator) => (
                <article key={creator.id} className="rounded-2xl border border-white/8 bg-white/[.035] p-4">
                  <span className="text-[10px] uppercase tracking-[.15em] text-white/30">{creator.platform} · {creator.niche}</span>
                  <h3 className="mt-4 truncate text-lg font-medium">{creator.name}</h3>
                  <p className="mt-1 truncate text-sm text-white/35">@{creator.handle}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-white/45">
                    <span>{compact(creator.followers)} followers</span>
                    <span>{creator.engagement_rate == null ? "Engagement unverified" : `${Number(creator.engagement_rate).toFixed(2)}% engagement`}</span>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="truncate text-xs text-white/30">{creator.contact_email ?? "No contact email"}</span>
                    <a href={creator.profile_url} target="_blank" rel="noreferrer" className="quiet-button">Profile <ArrowUpRight size={15} /></a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <OutreachStudio />
        <footer className="py-10 text-center text-xs text-white/25">Creator Match · Evidence-led outreach for India</footer>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, caption }: { icon: React.ReactNode; label: string; value: string; caption: string }) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/[.035] p-5">
      <div className="flex items-center justify-between text-white/35">
        <span className="text-[10px] uppercase tracking-[.15em]">{label}</span>
        <span className="text-[#9d8cff]">{icon}</span>
      </div>
      <strong className="mt-5 block text-3xl font-medium tracking-[-.04em] text-white">{value}</strong>
      <p className="mt-2 text-xs leading-5 text-white/30">{caption}</p>
    </article>
  );
}

function SetupRequired() {
  return <main className="grid min-h-screen place-items-center bg-[#080a0e] px-5 text-white"><div className="panel max-w-xl p-8 text-center"><p className="eyebrow">Configuration required</p><h1 className="mt-5 text-4xl font-medium tracking-[-.04em]">Connect Supabase first.</h1><p className="mt-5 leading-7 text-white/45">Add the public project URL and anon key, apply the included migration, then restart the app.</p><Link href="/" className="secondary-button mt-7">Return home</Link></div></main>;
}
