"use client";

const projects = [
  { name: "JERIC2O", score: 82, color: "bg-cyan-400/80" },
  { name: "CBC2", score: 71, color: "bg-amber-400/80" },
  { name: "Conductor", score: 94, color: "bg-emerald-400/80" },
  { name: "Maestro", score: 58, color: "bg-rose-400/80" },
];

const stats = [
  { label: "Open PRs", value: "23" },
  { label: "1:1s this week", value: "8" },
  { label: "Commits 7d", value: "142" },
  { label: "At-risk items", value: "3" },
];

export function LandingHeroCard() {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm font-medium text-white/70">Project Health</span>
        <span className="text-xs text-white/40">Last 7 days</span>
      </div>

      {/* Health bars */}
      <div className="space-y-3">
        {projects.map((p) => (
          <div key={p.name} className="flex items-center gap-3">
            <span className="w-20 text-right text-xs font-medium text-white/60">{p.name}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className={`absolute inset-y-0 left-0 rounded-full ${p.color}`}
                style={{ width: `${p.score}%` }}
              />
            </div>
            <span className="w-8 text-right font-mono text-xs text-white/50">{p.score}%</span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-white/5" />

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <p className="text-xs text-white/40">{s.label}</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-white/80">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
