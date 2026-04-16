"use client";

const metrics = [
  { label: "Cycle Time", value: "3.2d avg" },
  { label: "Deploy Frequency", value: "12/week" },
  { label: "PR Merge Time", value: "4.1h avg" },
  { label: "Sprint Velocity", value: "42 pts" },
  { label: "Code Review Time", value: "2.3h avg" },
  { label: "Build Success Rate", value: "98.7%" },
  { label: "Incident Response", value: "< 15 min" },
  { label: "Test Coverage", value: "87%" },
  { label: "Tech Debt Ratio", value: "8.2%" },
  { label: "Team Happiness", value: "4.6/5" },
];

export function LandingTicker() {
  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-white/[0.02] py-4">
      <div className="flex animate-ticker whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-8 px-4">
            {metrics.map((m) => (
              <span
                key={`${copy}-${m.label}`}
                className="flex items-center gap-2 text-sm text-white/40"
              >
                <span className="size-1.5 rounded-full bg-cyan-400/60" />
                <span className="font-medium text-white/60">{m.label}</span>
                <span>{m.value}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
