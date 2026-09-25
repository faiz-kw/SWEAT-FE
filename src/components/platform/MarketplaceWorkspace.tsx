import * as React from "react";
import { Store, Check, ExternalLink, Sparkles, Shield, Key, Zap, Lock, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageBody } from "@/components/enterprise/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  fetchMarketplaceAppsApi, 
  toggleMarketplaceAppInstallationApi, 
  type MarketplaceAppRow 
} from "@/api/endpoints/api-platform";

export function MarketplaceWorkspace() {
  const [apps, setApps] = React.useState<MarketplaceAppRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [search, setSearch] = React.useState("");
  const [actionInProgress, setActionInProgress] = React.useState<string | null>(null);

  const loadApps = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMarketplaceAppsApi(activeCategory !== "all" ? activeCategory : undefined);
      setApps(data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load marketplace apps from database");
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  React.useEffect(() => {
    loadApps();
  }, [loadApps]);

  const handleToggleInstall = async (app: MarketplaceAppRow) => {
    setActionInProgress(app.id);
    try {
      const res = await toggleMarketplaceAppInstallationApi(app.id);
      toast.success(res.message);
      setApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, is_installed: res.is_installed } : a))
      );
    } catch (err: any) {
      toast.error(err?.message || `Failed to update ${app.name}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredApps = apps.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.developer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="Integration Marketplace & App Store"
        subtitle="Ecosystem of verified third-party connectors, telephony voice AI engines, payment gateways, and IoT hardware adapters."
        actions={
          <Button variant="outline" size="sm" onClick={loadApps} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <PageBody>
        {/* Category Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-border/50">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(["all", "AI & Voice", "Payments", "Messaging", "Access Control", "Accounting"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat === "all" ? "All Connectors" : cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps or providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/80"
            />
          </div>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Fetching live integration ecosystem apps from database...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground border border-border/60 rounded-xl bg-card">
            No marketplace integrations found matching "{search}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm border border-primary/20 overflow-hidden">
                        {app.logo_url || (app.logo_storage_key && app.logo_storage_key.startsWith('http')) ? (
                          <img
                            src={app.logo_url || app.logo_storage_key || ''}
                            alt={app.name}
                            className="h-full w-full object-contain p-1"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{app.icon_text}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm leading-snug">{app.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">by {app.developer}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-md border border-border/40 text-muted-foreground">
                      {app.category}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed min-h-[48px] mt-2">
                    {app.description}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {Number(app.price_monthly) === 0 ? "Included in Plan" : `₹${Number(app.price_monthly).toLocaleString()}/mo`}
                    </span>
                    <span>•</span>
                    <span>Min Tier: {app.required_tier}</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    {app.is_installed ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <Check className="h-3.5 w-3.5" /> Active Integration
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not Connected</span>
                    )}
                  </span>

                  <Button
                    size="sm"
                    variant={app.is_installed ? "outline" : "default"}
                    className="text-xs h-8"
                    disabled={actionInProgress === app.id}
                    onClick={() => handleToggleInstall(app)}
                  >
                    {actionInProgress === app.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : null}
                    {app.is_installed ? "Disconnect" : "Install Connector"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageBody>
    </div>
  );
}
