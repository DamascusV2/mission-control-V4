import { loadTasks } from "../../lib/data";
import type { Task, TaskBoardData, TaskColumn } from "../../types/mission-control";

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
              <p className="text-xs text-[var(--color-slate)]">{column.tasks.length} tasks</p>
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
