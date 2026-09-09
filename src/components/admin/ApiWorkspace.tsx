import * as React from "react";
import { Key, Plus, Copy, Check, ShieldAlert, Globe, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApiKeysApi, createApiKeyApi, deleteApiKeyApi, type ApiKeyRow } from "@/services/api-admin";

export function ApiWorkspace() {
  const [keys, setKeys] = React.useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [keyName, setKeyName] = React.useState("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [createdSecret, setCreatedSecret] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const loadKeys = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApiKeysApi();
      setKeys(data);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName) return;
    try {
      const res = await createApiKeyApi(keyName, webhookUrl);
      setCreatedSecret(res.raw_key || "gym_live_" + Math.random().toString(36).substring(2, 15));
      setKeys((prev) => [res, ...prev]);
      toast.success("API Key generated successfully! Save your secret key now.");
    } catch {
      toast.error("Failed to generate API Key");
    }
  };

  const handleRevoke = async (key: ApiKeyRow) => {
    if (!confirm(`Are you sure you want to revoke API key "${key.name}"?`)) return;
    try {
      await deleteApiKeyApi(String(key.id));
      toast.success(`API key "${key.name}" revoked.`);
      setKeys((prev) => prev.filter((k) => k.id !== key.id));
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const handleCopy = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      toast.success("API Secret Key copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Developer API & Webhook Endpoints"
        subtitle="Manage secret API tokens for mobile client integrations, IoT turnstile access gates, and outbound webhook delivery."
        actions={
          <Button onClick={() => { setCreatedSecret(null); setKeyName(""); setWebhookUrl(""); setModalOpen(true); }} className="gap-2 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            Generate New API Key
          </Button>
        }
      />

      <PageBody>
        <div className="space-y-6">
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border/40 font-semibold text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4 text-primary" /> Active API Keys & Tokens
              </span>
              <span className="text-xs text-muted-foreground">{keys.length} Active Key(s)</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading API keys...</div>
            ) : keys.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No active API keys found. Click 'Generate New API Key' above.</div>
            ) : (
              <div className="divide-y divide-border/40">
                {keys.map((k) => (
                  <div key={k.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div>
                      <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                        {k.name}
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-mono">
                          Active
                        </span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground mt-1 flex items-center gap-3">
                        <span>Prefix: {k.key_prefix}••••••••</span>
                        {k.webhook_url && (
                          <span className="flex items-center gap-1 text-primary">
                            <Globe className="h-3 w-3" /> {k.webhook_url}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground text-[11px]">Created {new Date(k.created_at || Date.now()).toLocaleDateString()}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                        onClick={() => handleRevoke(k)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Generate API Key
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  ✕
                </button>
              </div>

              {!createdSecret ? (
                <form onSubmit={handleCreate} className="space-y-4 text-xs sm:text-sm">
                  <div className="space-y-1.5">
                    <Label htmlFor="k_name">API Key Name / Integration *</Label>
                    <Input
                      id="k_name"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Turnstile IoT Sync Gate"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="webhook">Outbound Webhook URL (Optional)</Label>
                    <Input
                      id="webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://api.mygym.com/webhooks/checkin"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/40">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-primary text-primary-foreground">
                      Generate Secret Key
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs sm:text-sm">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                    ⚠️ <strong>Save this secret key now.</strong> For security purposes, this token will never be displayed again.
                  </div>

                  <div className="space-y-1.5">
                    <Label>Your Secret API Token</Label>
                    <div className="flex items-center gap-2">
                      <Input value={createdSecret} readOnly className="font-mono text-xs bg-muted/60" />
                      <Button onClick={handleCopy} size="sm" variant="secondary" className="gap-1 shrink-0">
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/40">
                    <Button onClick={() => setModalOpen(false)} className="bg-primary text-primary-foreground">
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PageBody>
    </div>
  );
}
