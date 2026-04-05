"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import {
  Cpu,
  FileBarChart,
  HeartPulse,
  Home,
  Layers,
  NotebookText,
  Radio,
  ScanLine,
  Target,
  Workflow
} from "lucide-react";

const links = [
  { href: "/", label: "Command", icon: Home },
  { href: "/task-board", label: "Task Board", icon: Workflow },
  { href: "/projects", label: "Projects", icon: Layers },
  { href: "/calendar", label: "Calendar", icon: FileBarChart },
  { href: "/knowledge", label: "Knowledge Vault", icon: NotebookText },
  { href: "/system-health", label: "System Health", icon: HeartPulse },
  { href: "/intel", label: "Intel Feed", icon: Radio },
  { href: "/agent-status", label: "Agent Status", icon: Target },
  { href: "/opportunities", label: "Opportunity Scanner", icon: ScanLine },
  { href: "/lead-pipeline", label: "Lead Pipeline", icon: FileBarChart },
  { href: "/research", label: "Research Hub", icon: NotebookText },
  { href: "/console", label: "Command Console", icon: Cpu }
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 bg-panel/80 backdrop-blur border-r border-white/5 flex flex-col h-full">
      <div className="p-6">
        <p className="text-xs uppercase tracking-widest text-white/50">Mission Control</p>
        <h1 className="text-xl font-semibold">Damascus Ops</h1>
      </div>
      <nav className="px-2 space-y-1">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
              pathname === item.href ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto p-4 text-xs text-white/40">
        Build → Optimize → Scale
      </div>
    </aside>
  );
}
