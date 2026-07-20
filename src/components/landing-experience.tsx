"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Database,
  EnvelopeSimple,
  MagnifyingGlass,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { CreatorSearch } from "@/components/creator-search";
import { NICHES } from "@/lib/types";

gsap.registerPlugin(ScrollTrigger);

export function LandingExperience({ isAuthenticated }: { isAuthenticated: boolean }) {
  const root = useRef<HTMLElement>(null);
  const process = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.from(".hero-reveal", { y: 48, opacity: 0, duration: 1.1, stagger: 0.1, ease: "power3.out" });
    const cards = gsap.utils.toArray<HTMLElement>(".stack-card");
    cards.forEach((card, index) => {
      gsap.to(card, {
        y: index * 18,
        scale: 1 - (cards.length - index - 1) * 0.035,
        scrollTrigger: {
          trigger: card,
          start: "top 62%",
          end: "bottom 25%",
          scrub: true,
        },
      });
    });
    if (process.current && window.matchMedia("(min-width: 1024px)").matches) {
      ScrollTrigger.create({
        trigger: process.current,
        start: "top top+=96",
        end: "bottom bottom-=120",
        pin: ".process-title",
        pinSpacing: false,
      });
    }
  }, { scope: root });

  return (
    <main ref={root} className="w-full max-w-full overflow-x-hidden bg-[#080a0e] text-white">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-8">
        <nav className="mx-auto flex max-w-[1400px] items-center justify-between rounded-full border border-white/10 bg-[#0c0f14]/80 px-4 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl md:px-5">
          <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[-0.02em] text-white">
            <span className="brand-mark"><span /></span> Creator Match
          </Link>
          <div className="hidden items-center gap-7 text-sm text-white/50 md:flex">
            <a href="#search" className="transition-colors hover:text-white">Discover</a>
            <a href="#evidence" className="transition-colors hover:text-white">Evidence</a>
            <a href="#workflow" className="transition-colors hover:text-white">Workflow</a>
          </div>
          <Link href={isAuthenticated ? "/dashboard" : "/auth"} className="nav-button">
            {isAuthenticated ? "Open workspace" : "Create account"}<ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <section className="relative min-h-screen px-5 pb-24 pt-40 md:px-10 md:pb-36 md:pt-48">
        <div className="hero-ambient" />
        <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-center text-center">
          <p className="hero-reveal eyebrow">Live Indian creator intelligence</p>
          <h1 className="hero-reveal mt-7 w-full max-w-6xl text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.88] tracking-[-0.072em] text-white">
            Find creators worth contacting, not rows worth collecting.
          </h1>
          <p className="hero-reveal mt-8 max-w-2xl text-base leading-7 text-white/55 md:text-lg md:leading-8">
            Search Instagram and YouTube live, verify every usable signal, and turn public evidence into considered outreach.
          </p>
          <div className="hero-reveal mt-10 flex flex-col gap-3 sm:flex-row">
            <a href="#search" className="primary-button">Start a live search <ArrowDown size={18} /></a>
            <a href="#evidence" className="secondary-button">See the evidence model <ArrowRight size={18} /></a>
          </div>
          <div className="hero-reveal relative mt-20 h-[44vw] max-h-[570px] min-h-[320px] w-full max-w-[1320px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#11151c] shadow-2xl shadow-black/50">
            <div className="hero-image" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,transparent_10%,rgba(8,10,14,.3)_55%,rgba(8,10,14,.95)_100%)]" />
            <div className="absolute inset-x-5 bottom-5 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 text-left md:inset-x-8 md:bottom-8 md:grid-cols-3">
              <HeroStrip icon={<MagnifyingGlass />} title="Discover" body="Live candidates from public sources" />
              <HeroStrip icon={<ShieldCheck />} title="Verify" body="Metrics, contact and India evidence" />
              <HeroStrip icon={<EnvelopeSimple />} title="Reach out" body="Human-reviewed email and DM drafts" />
            </div>
          </div>
        </div>
      </section>

      <div className="marquee-shell" aria-label="Supported niches">
        <div className="marquee-track">
          {[...NICHES, ...NICHES].map((niche, index) => <span key={`${niche}-${index}`}>{niche}<i /></span>)}
        </div>
      </div>

      <section id="evidence" className="px-5 py-32 md:px-10 md:py-48">
        <div className="mx-auto max-w-[1440px]">
          <p className="eyebrow">Evidence before outreach</p>
          <h2 className="mt-6 max-w-6xl text-5xl font-medium leading-[0.96] tracking-[-0.06em] md:text-8xl">
            A search result is only useful when the source survives
            <span className="mx-3 inline-block h-10 w-24 translate-y-1 rounded-full bg-[url('https://picsum.photos/seed/creator-proof/300/120')] bg-cover bg-center grayscale contrast-125 md:h-16 md:w-40" />
            inspection.
          </h2>

          <div className="mt-20 grid grid-flow-dense grid-cols-1 gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 md:grid-cols-12 md:grid-rows-2">
            <Bento className="md:col-span-8" icon={<MagnifyingGlass />} title="Candidate discovery" body="Tavily searches a live query matrix across niches, Indian location signals and supported platforms. It provides URLs and excerpts, never invented profile records." accent="violet" />
            <Bento className="md:col-span-4" icon={<Database />} title="Platform truth" body="Official YouTube metadata and authorized Instagram evidence replace estimates wherever access permits." accent="blue" />
            <Bento className="md:col-span-4" icon={<ShieldCheck />} title="Strict gate" body="Missing email, location, follower or engagement evidence is shown as a reason—not silently filled." accent="green" />
            <Bento className="md:col-span-8" icon={<Sparkle />} title="Personalized, not generated at random" body="Gemini receives the creator's public profile signals and writes copy that names them and references their actual work. Contact emails stay out of the prompt, and every draft is reviewed before it sends." accent="amber" />
          </div>

          <div className="mt-6 flex min-h-[430px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#10131a] max-lg:flex-col">
            {[
              ["Sources", "Every field keeps its originating URL, excerpt, capture time and confidence."],
              ["Calculations", "Engagement exposes its formula, recent sample size and timestamp."],
              ["Shortfalls", "If live evidence produces 49 valid creators, the system reports 49."],
            ].map(([title, body], index) => (
              <article key={title} className="accordion-panel group flex-1 border-white/10 p-7 transition-[flex] duration-700 ease-out hover:flex-[2.1] max-lg:border-b lg:border-r">
                <span className="text-xs uppercase tracking-[0.18em] text-white/30">Evidence layer</span>
                <h3 className="mt-8 text-3xl font-medium tracking-[-0.04em]">{title}</h3>
                <p className="mt-5 max-w-sm text-base leading-7 text-white/50 opacity-70 transition-opacity duration-500 group-hover:opacity-100">{body}</p>
                <div className={`mt-12 h-40 overflow-hidden rounded-2xl bg-[url('https://picsum.photos/seed/evidence-${index}/900/500')] bg-cover bg-center grayscale contrast-125 transition-transform duration-700 ease-out group-hover:scale-105`} />
              </article>
            ))}
          </div>
        </div>
      </section>

      <CreatorSearch isAuthenticated={isAuthenticated} />

      <section id="workflow" ref={process} className="px-5 py-32 md:px-10 md:py-48">
        <div className="mx-auto grid max-w-[1440px] gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="process-title h-fit">
            <p className="eyebrow">From query to considered contact</p>
            <h2 className="mt-6 max-w-xl text-5xl font-medium leading-[0.96] tracking-[-0.06em] md:text-7xl">A workflow that slows down at the right moments.</h2>
          </div>
          <div className="space-y-10">
            <StackCard label="Discover" title="Search broadly" body="Fan out by niche, platform and Indian location signals. Normalize and deduplicate every candidate URL." tone="bg-[#725cff]" />
            <StackCard label="Verify" title="Qualify narrowly" body="Collect platform metrics, creator-published contact evidence and transparent exclusion reasons." tone="bg-[#176dff]" />
            <StackCard label="Contact" title="Contact deliberately" body="Generate constrained drafts, review the recipient and copy, then send exactly once or open the creator profile manually." tone="bg-[#d8ff75] text-[#10130a]" />
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 pt-32 md:px-10 md:pt-48">
        <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[2.5rem] bg-[#f4f0e7] px-6 py-20 text-[#111318] md:px-16 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Build a defensible shortlist</p>
          <h2 className="mt-7 max-w-5xl text-5xl font-medium leading-[0.94] tracking-[-0.065em] md:text-8xl">Start with live evidence. Save only what earns a place.</h2>
          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <a href="#search" className="primary-button !bg-[#111318] !text-white">Search creators <ArrowRight size={18} /></a>
            <Link href={isAuthenticated ? "/dashboard" : "/auth"} className="secondary-button !border-black/15 !bg-black/5 !text-[#111318]">{isAuthenticated ? "Open workspace" : "Create account"}</Link>
          </div>
        </div>
      </section>

      <footer className="px-5 py-12 md:px-10">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 border-t border-white/10 pt-8 text-sm text-white/35 md:flex-row">
          <span>Creator Match · India</span>
          <span>Live discovery · Evidence-led outreach</span>
        </div>
      </footer>
    </main>
  );
}

function HeroStrip({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="flex items-center gap-4 bg-[#0b0e13]/85 p-4 backdrop-blur-xl md:p-5"><span className="text-[#9a88ff] [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><strong className="block text-sm text-white">{title}</strong><span className="mt-1 block text-xs text-white/40">{body}</span></div></div>;
}

function Bento({ className, icon, title, body, accent }: { className: string; icon: React.ReactNode; title: string; body: string; accent: string }) {
  return <article className={`group relative min-h-72 overflow-hidden bg-[#10131a] p-7 md:p-9 ${className}`}><div className={`bento-orb bento-${accent}`} /><span className="relative text-white/65 [&>svg]:h-6 [&>svg]:w-6">{icon}</span><div className="relative mt-24 max-w-2xl"><h3 className="text-2xl font-medium tracking-[-0.035em]">{title}</h3><p className="mt-4 text-base leading-7 text-white/48">{body}</p></div></article>;
}

function StackCard({ label, title, body, tone }: { label: string; title: string; body: string; tone: string }) {
  return <article className={`stack-card sticky top-28 min-h-[420px] rounded-[2rem] p-7 shadow-2xl shadow-black/40 md:p-10 ${tone}`}><div className="flex h-full min-h-[350px] flex-col justify-between"><div className="flex items-center justify-between"><span className="text-sm font-semibold tracking-[0.15em] opacity-55">{label}</span><Check size={24} /></div><div><h3 className="text-4xl font-medium tracking-[-0.05em] md:text-6xl">{title}</h3><p className="mt-6 max-w-lg text-base leading-7 opacity-65 md:text-lg">{body}</p></div></div></article>;
}
