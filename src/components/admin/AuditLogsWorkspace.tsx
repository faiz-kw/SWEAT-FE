import * as React from "react";
import { History, Search, ShieldAlert, Filter, RefreshCw, Eye, Code2 } from "lucide-react";
import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAuditLogsApi, type AuditLogRow } from "@/services/api-admin";

export function AuditLogsWorkspace() {
  const [logs, setLogs] = React.useState<AuditLogRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRow | null>(null);

  const loadAuditLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogsApi(actionFilter, moduleFilter);
      setLogs(data);
    } catch {
      // Fallback to empty if error
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, moduleFilter]);

  React.useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.user_email.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Immutable Audit Logs & Security Stream"
        subtitle="Cryptographically timestamped audit trail of all administrative actions, data exports, membership modifications, and logins."
      />

      <PageBody>
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by user, action description, or entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/80"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/40 text-xs overflow-x-auto">
            <span className="px-2 font-medium text-muted-foreground">Action:</span>
            {(["all", "CREATE", "UPDATE", "DELETE", "EXPORT", "LOGIN"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setActionFilter(a)}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  actionFilter === a
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Logs Table */}
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-muted/40 border-b border-border/60 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor / User</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Module / Entity</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono text-xs">
                {filteredLogs.map((log) => {
                  const isCreate = log.action === "CREATE";
                  const isDelete = log.action === "DELETE";
                  const isExport = log.action === "EXPORT";

                  return (
                    <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-sans font-medium text-foreground">
                        <div>{log.user_name || log.user_email}</div>
                        <div className="text-[11px] text-muted-foreground">{log.user_email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCreate
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : isDelete
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : isExport
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <span className="font-semibold text-foreground">{log.module}</span>
                        <span className="text-muted-foreground block text-[11px]">{log.entity_type} ({log.entity_id})</span>
                      </td>

                      <td className="py-3 px-4 font-sans text-muted-foreground max-w-xs truncate">
                        {log.description}
                      </td>

                      <td className="py-3 px-4 text-muted-foreground">
                        {log.ip_address || "127.0.0.1"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </PageBody>
    </div>
  );
}
