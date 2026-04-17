"use client";

const terminalLines = [
  { id: "cmd-status", text: "$ eng status", type: "command" as const },
  { id: "blank-1", text: "", type: "blank" as const },
  { id: "out-jeric2o", text: "JERIC2O    ████████░░  82%  healthy", type: "output" as const },
  { id: "out-cbc2", text: "CBC2       ███████░░░  71%  review", type: "output" as const },
  { id: "out-conductor", text: "Conductor  █████████░  94%  healthy", type: "output" as const },
  { id: "out-maestro", text: "Maestro    █████░░░░░  58%  at-risk", type: "output" as const },
  { id: "blank-2", text: "", type: "blank" as const },
  { id: "info-count", text: "4 projects tracked | 12 team members", type: "info" as const },
  { id: "info-next", text: "Next 1:1: Tomorrow 2:00 PM with Alex", type: "info" as const },
  { id: "cursor", text: "$ _", type: "cursor" as const },
];

export function LandingTerminal() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0b12] font-mono text-sm shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="size-3 rounded-full bg-red-500/70" />
        <span className="size-3 rounded-full bg-yellow-500/70" />
        <span className="size-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-white/30">eng-hub &mdash; terminal</span>
      </div>
      {/* Body */}
      <div className="p-4 leading-relaxed">
        {terminalLines.map((line) => {
          if (line.type === "blank") return <div key={line.id} className="h-4" />;
          if (line.type === "command")
            return (
              <div key={line.id} className="text-emerald-400">
                {line.text}
              </div>
            );
          if (line.type === "cursor")
            return (
              <div key={line.id} className="text-emerald-400">
                <span>$ </span>
                <span className="inline-block h-4 w-2 animate-pulse bg-emerald-400" />
              </div>
            );
          if (line.type === "info")
            return (
              <div key={line.id} className="text-white/40">
                {line.text}
              </div>
            );
          return (
            <div key={line.id} className="text-white/60">
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
