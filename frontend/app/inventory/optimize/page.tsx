"use client";

import { useEffect, useState, Suspense } from "react";
import { InventoryAlerts } from "@/components/InventoryAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, AlertTriangle, TrendingDown, PackageCheck, RefreshCw, Loader2, Store } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Business {
  id: string;
  name: string;
  description: string | null;
}

interface InventoryStats {
  total_items: number;
  need_reorder: number;
  dead_stock: number;
  optimal_stock: number;
}

interface OptimizationResult {
  forecast?: Array<{
    product_id: string;
    product_name: string;
    demand_forecast_units: number;
    confidence_score: number;
  }>;
  reorder_plan?: Array<{
    product_id: string;
    product_name: string;
    current_status: string;
    reorder_point: number;
    reorder_quantity: number;
    estimated_cost: number;
    priority: string;
    rationale: string;
  }>;
  dead_stock?: Array<{
    product_id: string;
    product_name: string;
    last_sale_date: string;
    clearance_discount: number;
    estimated_loss: number;
    action: string;
  }>;
  bundles?: Array<{
    bundle_name: string;
    product_ids: string[];
    product_names: string[];
    bundle_price: number;
    estimated_margin: number;
    rationale: string;
    copurchase_frequency: number;
  }>;
  seasonal_recommendations?: Array<{
    action: string;
    category: string;
    percentage_change: number;
    rationale: string;
  }>;
  summary?: {
    total_capital_required: number;
    expected_roi: number;
    risk_level: string;
    key_insights: string[];
  };
}

const InventoryOptimizeContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBusinesses();
    }
  }, [user]);

  useEffect(() => {
    // Get business ID from URL params
    const businessId = searchParams.get('business');
    if (businessId) {
      setSelectedBusiness(businessId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedBusiness) {
      fetchStats();
    }
  }, [selectedBusiness]);

  const fetchBusinesses = async () => {
    try {
      setLoadingBusinesses(true);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/businesses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch businesses");

      const data = await response.json();
      setBusinesses(data.businesses || []);
    } catch (err) {
      console.error("Error fetching businesses:", err);
      setError("Failed to load businesses");
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedBusiness) return;

    try {
      setLoadingStats(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/inventory/stats/${selectedBusiness}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch inventory stats");

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Failed to load inventory statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const runOptimization = async () => {
    if (!selectedBusiness) return;

    try {
      setOptimizing(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/inventory/optimize/${selectedBusiness}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run optimization");
      }

      const data = await response.json();
      setOptimization(data.optimization);
      
      // Refresh stats after optimization
      fetchStats();
    } catch (err: any) {
      console.error("Error running optimization:", err);
      setError(err.message || "Failed to run AI optimization");
    } finally {
      setOptimizing(false);
    }
  };

  if (authLoading || loadingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/inventory")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Inventory Optimization</h1>
                <p className="text-sm text-muted-foreground">Smart stock optimization powered by AI</p>
              </div>
            </div>

            {/* Business Selector */}
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-muted-foreground" />
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="px-4 py-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[200px]"
              >
                <option value="">Select Business</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {!selectedBusiness && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please select a business to run AI optimization
              </p>
            </CardContent>
          </Card>
        )}

        {selectedBusiness && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold text-foreground">{stats?.total_items || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-warning/20 bg-warning/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Need Reorder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold text-foreground">{stats?.need_reorder || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Dead Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold text-foreground">{stats?.dead_stock || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-success/20 bg-success/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Optimal Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <PackageCheck className="h-5 w-5 text-success" />
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold text-foreground">{stats?.optimal_stock || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI-Powered Analysis</CardTitle>
                    <CardDescription>Run comprehensive inventory optimization analysis</CardDescription>
                  </div>
                  <Button onClick={runOptimization} disabled={optimizing}>
                    {optimizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run Optimization
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {optimization && (
                <CardContent>
                  <div className="space-y-6">
                    {/* Summary */}
                    {optimization.summary && (
                      <div className="p-4 rounded-lg border border-border bg-card/50">
                        <h3 className="font-semibold mb-2">Optimization Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Capital Required</p>
                            <p className="text-lg font-bold">${optimization.summary.total_capital_required?.toFixed(2) || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Expected ROI</p>
                            <p className="text-lg font-bold">{optimization.summary.expected_roi?.toFixed(1) || 0}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Risk Level</p>
                            <p className="text-lg font-bold capitalize">{optimization.summary.risk_level || 'N/A'}</p>
                          </div>
                        </div>
                        {optimization.summary.key_insights && optimization.summary.key_insights.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Key Insights:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {optimization.summary.key_insights.map((insight, idx) => (
                                <li key={idx}>{insight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Forecast */}
                    {optimization.forecast && optimization.forecast.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Demand Forecast</h3>
                        <div className="space-y-3">
                          {optimization.forecast.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                              <div className="p-2 rounded-lg bg-blue-100">
                                <Package className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{item.product_name}</p>
                                <div className="flex items-center gap-4 text-sm mt-2">
                                  <span>Forecast: {item.demand_forecast_units} units</span>
                                  <span>Confidence: {item.confidence_score?.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reorder Plan */}
                    {optimization.reorder_plan && optimization.reorder_plan.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Reorder Recommendations</h3>
                        <div className="space-y-3">
                          {optimization.reorder_plan.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-warning/20 bg-warning/5">
                              <div className="p-2 rounded-lg bg-warning/10">
                                <AlertTriangle className="h-5 w-5 text-warning" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground mb-2">{item.rationale}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span>Reorder Point: {item.reorder_point} units</span>
                                  <span>Quantity: {item.reorder_quantity} units</span>
                                  <span>Cost: ${item.estimated_cost?.toFixed(2)}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.priority === 'high' ? 'bg-red-100 text-red-800' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {item.priority} priority
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bundles */}
                    {optimization.bundles && optimization.bundles.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Recommended Bundles</h3>
                        <div className="space-y-3">
                          {optimization.bundles.map((bundle, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{bundle.bundle_name}</p>
                                <p className="text-sm text-muted-foreground mb-2">{bundle.rationale}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span>Price: ${bundle.bundle_price?.toFixed(2)}</span>
                                  <span>Margin: {bundle.estimated_margin?.toFixed(1)}%</span>
                                  <span>Co-purchase: {bundle.copurchase_frequency?.toFixed(0)}%</span>
                                </div>
                                <Button size="sm" className="mt-2">Create Bundle</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dead Stock */}
                    {optimization.dead_stock && optimization.dead_stock.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Dead Stock Clearance</h3>
                        <div className="space-y-3">
                          {optimization.dead_stock.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                              <div className="p-2 rounded-lg bg-destructive/10">
                                <TrendingDown className="h-5 w-5 text-destructive" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground">{item.product_name}</p>
                                <p className="text-sm text-muted-foreground mb-2">{item.action}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span>Discount: {item.clearance_discount}%</span>
                                  <span>Est. Loss: ${item.estimated_loss?.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Seasonal Recommendations */}
                    {optimization.seasonal_recommendations && optimization.seasonal_recommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3">Seasonal Adjustments</h3>
                        <div className="space-y-3">
                          {optimization.seasonal_recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                              <div className="p-2 rounded-lg bg-warning/10">
                                <AlertTriangle className="h-5 w-5 text-warning" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-foreground capitalize">{rec.action} {rec.category}</p>
                                <p className="text-sm text-muted-foreground mb-2">{rec.rationale}</p>
                                <div className="text-sm">
                                  <span>Change: {rec.percentage_change > 0 ? '+' : ''}{rec.percentage_change}%</span>
                                </div>
                                <Button size="sm" variant="outline" className="mt-2">View Plan</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <InventoryAlerts businessId={selectedBusiness} />
          </>
        )}
      </main>
    </div>
  );
};

const InventoryOptimizePage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InventoryOptimizeContent />
    </Suspense>
  );
};

export default InventoryOptimizePage;