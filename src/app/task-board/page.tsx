import { loadTasks } from "../../lib/data";
import type { Task, TaskBoardData, TaskColumn } from "../../types/mission-control";

function relativeTime(value?: string | null) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return null;
  const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (minutes < 1) return "<1m ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m ago` : `${hours}h ago`;
}

export default function TaskBoardPage() {
  const data = loadTasks() as TaskBoardData;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-slate)]">Ops Kanban</p>
        <h2 className="text-2xl font-semibold">Mission Task Board</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {data.columns.map((column: TaskColumn) => (
          <div key={column.id} className="rounded-2xl border accent-border bg-[var(--color-panel)]/70 shadow-panel flex flex-col max-h-[70vh]">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-sm font-semibold text-white">{column.title}</p>
              <p className="text-xs text-[var(--color-slate)]">
                {column.tasks.length} tasks · Last touch {relativeTime(column.tasks[0]?.updatedAt ?? null) ?? "n/a"}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {column.tasks.map((task: Task) => (
                <div key={task.id} className="bg-white/5 rounded-xl p-3 text-sm space-y-2 border border-white/10">
                  <div className="flex justify-between text-xs text-[var(--color-slate)]">
                    <span>{task.owner}</span>
                    {task.priority && <span>{task.priority}</span>}
                  </div>
                  <p className="font-medium text-white">{task.title}</p>
                  <p className="text-white/60 text-xs">{task.description}</p>
                  <div className="text-[10px] text-[var(--color-slate)] flex flex-col gap-0.5">
                    {task.updatedAt && <span>Updated {relativeTime(task.updatedAt)}</span>}
                    {task.completedAt && <span>Completed {relativeTime(task.completedAt)}</span>}
                    {!task.completedAt && task.due && <span>Due {new Date(task.due).toLocaleDateString()}</span>}
                  </div>
                  {task.tags && (
                    <div className="flex flex-wrap gap-1 text-[10px] text-white/60">
                      {task.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-white/10">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {column.tasks.length === 0 && <p className="text-xs text-white/30">No tasks</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
