import { SignedIn, SignedOut, SignInButton } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/button";
import {
  Activity,
  ArrowRight,
  Calendar,
  CheckCircle2,
  GitBranch,
  LayoutGrid,
  Terminal,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LandingHeroCard } from "@/components/landing/hero-card";
import { LandingTerminal } from "@/components/landing/terminal";
import { LandingTicker } from "@/components/landing/ticker";

export const metadata: Metadata = { title: "Home" };

const features = [
  {
    icon: Activity,
    title: "Health Tracking",
    description: "8-dimension project assessments with full history and trend analysis.",
    tag: "Core",
    tagColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    hoverGradient: "group-hover:from-cyan-500/10",
  },
  {
    icon: Calendar,
    title: "1:1 Notes",
    description: "Structured notes that survive manager handoffs with searchable history.",
    tag: "People",
    tagColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    hoverGradient: "group-hover:from-emerald-500/10",
  },
  {
    icon: LayoutGrid,
    title: "Team Arrangements",
    description: "Drag-and-drop team planning with draft proposals and approval workflows.",
    tag: "Planning",
    tagColor: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    hoverGradient: "group-hover:from-amber-500/10",
  },
  {
    icon: GitBranch,
    title: "Delivery Insights",
    description: "Automated GitLab analytics, deploy frequency, and cycle time tracking.",
    tag: "Analytics",
    tagColor: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    hoverGradient: "group-hover:from-violet-500/10",
  },
];

const capabilities = [
  "Track project health across 8 dimensions",
  "Keep 1:1 notes with infinite history",
  "Plan team arrangements with drag-and-drop",
  "Analyze delivery metrics automatically",
  "View org charts with manager history",
  "Manage quarterly goals and OKRs",
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06070c] text-white">
      {/* ---- Background effects ---- */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(6,182,212,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, black 0%, transparent 70%)",
        }}
      />
      <div className="pointer-events-none fixed -top-40 -left-40 size-[600px] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
      <div className="pointer-events-none fixed -right-40 -bottom-40 size-[600px] rounded-full bg-violet-500/[0.07] blur-[120px]" />
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* ---- Header ---- */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#06070c]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold">
              <span
                className="flex size-8 items-center justify-center rounded-lg text-sm font-black"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #a78bfa)",
                }}
              >
                E
              </span>
              Eng Hub
            </Link>
            <nav className="hidden items-center gap-5 md:flex">
              {[
                { href: "/", label: "Home" },
                { href: "/projects", label: "Projects" },
                { href: "/people", label: "People" },
                { href: "/org-chart", label: "Org Chart" },
                { href: "/settings", label: "Departments" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/50 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button
                  size="sm"
                  className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/projects">Dashboard</Link>
              </Button>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 sm:pt-28 sm:pb-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left column */}
            <div className="animate-fade-up">
              {/* Eyebrow badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1 text-xs text-emerald-400">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                all systems operational
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Engineering,
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #06b6d4, #a78bfa)",
                  }}
                >
                  organized.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/50">
                One place for projects, people, goals, and 1:1s. Less time in spreadsheets, Figma
                boards, and manual GitHub checks.
              </p>

              <div className="mt-8 flex items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-cyan-500 px-8 text-white hover:bg-cyan-400"
                >
                  <Link href="/projects">
                    Get Started
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="h-12 rounded-full px-8 text-white/60 hover:bg-white/5 hover:text-white"
                >
                  <Link href="/faq">Learn More</Link>
                </Button>
              </div>

              {/* Stats row */}
              <div className="mt-10 flex items-center gap-6 text-sm text-white/40">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white/80">8</span>
                  <span>health dimensions</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white/80">&infin;</span>
                  <span>1:1 history</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-white/80">GitLab</span>
                  <span>native analytics</span>
                </div>
              </div>
            </div>

            {/* Right column — dashboard card */}
            <div className="animate-fade-up [animation-delay:150ms]">
              <LandingHeroCard />
            </div>
          </div>
        </div>
      </section>

      {/* ---- Ticker ---- */}
      <LandingTicker />

      {/* ---- Features ---- */}
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-14 text-center">
            <p className="text-sm font-medium tracking-wider text-cyan-400 uppercase">
              Built for engineering leaders
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/50">
              Health tracking, 1:1 notes, team planning, and delivery stats — the tools engineering
              managers actually use.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] animate-fade-up`}
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                {/* Hover gradient */}
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${f.hoverGradient}`}
                />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <f.icon className="size-5 text-white/70" strokeWidth={1.5} />
                    </div>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${f.tagColor}`}
                    >
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Terminal section ---- */}
      <section className="relative border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="animate-fade-up [animation-delay:300ms]">
              <LandingTerminal />
            </div>

            <div className="animate-fade-up [animation-delay:400ms]">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-cyan-400">
                <Terminal className="size-4" />
                What you get
              </div>
              <h2 className="text-3xl font-bold tracking-tight">
                All your eng data,
                <br />
                one command away.
              </h2>
              <p className="mt-4 text-base text-white/50">
                Stop context-switching between five tools. Eng Hub brings everything into a single
                dashboard.
              </p>

              <ul className="mt-8 space-y-3">
                {capabilities.map((cap) => (
                  <li key={cap} className="flex items-center gap-3 text-sm text-white/60">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="relative border-t border-white/5">
        <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="animate-fade-up rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-14 backdrop-blur-sm">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Stop managing across
              <br />
              five different tools.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base text-white/50">
              Projects, people, goals, and 1:1s — without the spreadsheet.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-cyan-500 px-8 text-white hover:bg-cyan-400"
              >
                <Link href="/projects">
                  View Projects
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-12 rounded-full px-8 text-white/60 hover:bg-white/5 hover:text-white"
              >
                <Link href="/faq">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-white/30">
        <p>Eng Hub &mdash; Engineering, organized.</p>
      </footer>
    </div>
  );
}
