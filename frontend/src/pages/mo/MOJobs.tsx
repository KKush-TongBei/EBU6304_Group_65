import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import type { Job } from "../../types";
import AppShell from "../../AppShell";
import { Badge, Card } from "../../ui";

export default function MOJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    api.mo.myJobs().then(setJobs).catch(() => setJobs([]));
  }, []);

  return (
    <AppShell title="我的岗位" role="mo">
      {jobs.length === 0 ? (
        <Card className="p-12 text-center text-ink-500">
          暂无岗位。{" "}
          <Link className="text-accent font-semibold" to="/mo/post">
            去发布
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} to={`/mo/jobs/${j.id}`}>
              <Card className="p-5 hover:shadow-md transition cursor-pointer">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-ink-950">{j.module_name}</h3>
                    <p className="text-xs text-ink-500 mt-1">
                      截止 {j.deadline || "—"} · {j.assigned_hours}h/人
                    </p>
                  </div>
                  {j.status === "open" ? <Badge tone="ok">开放</Badge> : <Badge tone="neutral">已关闭</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
