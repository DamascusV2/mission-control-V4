import { loadProjects } from "../../lib/data";
import type { Project, ProjectLink } from "../../types/mission-control";

export default function ProjectsPage() {
  const projects = loadProjects() as Project[];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Strategic Initiatives</p>
        <h2 className="text-2xl font-semibold">Projects</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {projects.map((project: Project) => (
          <div key={project.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{project.name}</p>
              <span className="text-xs text-[var(--color-slate)]">{Math.round(project.status * 100)}%</span>
            </div>
            <p className="text-sm text-white/70">{project.description}</p>
            <p className="text-xs text-[var(--color-slate)]">Owner: {project.owner}</p>
            <p className="text-xs text-[var(--color-slate)]">Updated: {new Date(project.lastUpdated).toLocaleString()}</p>
            <div className="text-xs text-white/60 space-y-1">
              {project.links?.map((link: ProjectLink) => (
                <div key={link.href}>• {link.label}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
