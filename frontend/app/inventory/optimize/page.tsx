"use client";

import { useEffect, useState, Suspense } from "react";
import { InventoryAlerts } from "@/components/InventoryAlerts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, AlertTriangle, TrendingDown, PackageCheck, RefreshCw, Loader2, Store, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30">
      <header className="bg-gradient-to-r from-white via-white to-slate-50 border-b-2 border-slate-200/50 shadow-sm sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => router.push("/inventory")} className="hover:bg-slate-100">
                <ArrowLeft className="h-5 w-5 mr-2" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">AI Inventory Optimization</h1>
                  <p className="text-sm text-slate-600 font-medium">Intelligent stock recommendations</p>
                </div>
              </div>
            </div>

            {/* Business Selector */}
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-slate-600" />
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="px-4 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-[200px] shadow-sm"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>      <main className="container mx-auto px-4 py-8 space-y-6">
        {error && (
          <Card className="border-2 border-red-200/50 bg-gradient-to-br from-red-50 to-rose-50 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="pt-6">
              <p className="text-red-700 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {!selectedBusiness && (
          <Card className="border-2 border-slate-200/50 shadow-lg rounded-xl overflow-hidden">
            <CardContent className="pt-6">
              <p className="text-center text-slate-600">
                Please select a business to run AI optimization
              </p>
            </CardContent>
          </Card>
        )}

        {selectedBusiness && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-2 border-slate-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 shadow-md">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    ) : (
                      <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{stats?.total_items || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-amber-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Need Reorder</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-600 to-orange-600 shadow-md">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                    ) : (
                      <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">{stats?.need_reorder || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Dead Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-red-600 to-rose-600 shadow-md">
                      <TrendingDown className="h-5 w-5 text-white" />
                    </div>
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin text-red-600" />
                    ) : (
                      <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">{stats?.dead_stock || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-slate-600">Optimal Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 shadow-md">
                      <PackageCheck className="h-5 w-5 text-white" />
                    </div>
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    ) : (
                      <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{stats?.optimal_stock || 0}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2 border-slate-200/50 shadow-xl rounded-xl overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">AI-Powered Analysis</CardTitle>
                    <CardDescription className="text-slate-600 mt-1">Run comprehensive inventory optimization analysis</CardDescription>
                  </div>
                  <Button 
                    onClick={runOptimization} 
                    disabled={optimizing}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
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
                      <div className="p-6 rounded-xl border-2 border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
                        <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Optimization Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-4 rounded-lg bg-white/80 border border-purple-100 shadow-sm">
                            <p className="text-sm text-slate-600 mb-1">Capital Required</p>
                            <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">${optimization.summary.total_capital_required?.toFixed(2) || 0}</p>
                          </div>
                          <div className="p-4 rounded-lg bg-white/80 border border-purple-100 shadow-sm">
                            <p className="text-sm text-slate-600 mb-1">Expected ROI</p>
                            <p className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">{optimization.summary.expected_roi?.toFixed(1) || 0}%</p>
                          </div>
                          <div className="p-4 rounded-lg bg-white/80 border border-purple-100 shadow-sm">
                            <p className="text-sm text-slate-600 mb-1">Risk Level</p>
                            <p className="text-xl font-bold text-slate-800 capitalize">{optimization.summary.risk_level || 'N/A'}</p>
                          </div>
                        </div>
                        {optimization.summary.key_insights && optimization.summary.key_insights.length > 0 && (
                          <div className="p-4 rounded-lg bg-white/80 border border-purple-100 shadow-sm">
                            <p className="text-sm font-semibold text-slate-800 mb-3">Key Insights:</p>
                            <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
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
                        <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">Demand Forecast</h3>
                        <div className="space-y-3">
                          {optimization.forecast.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200/50 bg-white shadow-md hover:shadow-lg transition-all duration-300">
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 shadow-md">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800">{item.product_name}</p>
                                <div className="flex items-center gap-4 text-sm mt-2 text-slate-600">
                                  <span className="font-medium">Forecast: <span className="text-blue-600">{item.demand_forecast_units} units</span></span>
                                  <span className="font-medium">Confidence: <span className="text-cyan-600">{item.confidence_score?.toFixed(1)}%</span></span>
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
                        <h3 className="font-bold text-lg bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">Reorder Recommendations</h3>
                        <div className="space-y-3">
                          {optimization.reorder_plan.slice(0, 10).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border-2 border-amber-200/50 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md hover:shadow-lg transition-all duration-300">
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-600 to-orange-600 shadow-md">
                                <AlertTriangle className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800">{item.product_name}</p>
                                <p className="text-sm text-slate-600 mb-3 mt-1">{item.rationale}</p>
                                <div className="flex items-center gap-4 text-sm flex-wrap">
                                  <span className="text-slate-700 font-medium">Reorder Point: <span className="text-amber-700">{item.reorder_point} units</span></span>
                                  <span className="text-slate-700 font-medium">Quantity: <span className="text-amber-700">{item.reorder_quantity} units</span></span>
                                  <span className="text-slate-700 font-medium">Cost: <span className="text-amber-700">${item.estimated_cost?.toFixed(2)}</span></span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                                    item.priority === 'high' ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white' :
                                    item.priority === 'medium' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' :
                                    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
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
                        <h3 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">Recommended Bundles</h3>
                        <div className="space-y-3">
                          {optimization.bundles.map((bundle, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200/50 bg-white shadow-md hover:shadow-lg transition-all duration-300">
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800">{bundle.bundle_name}</p>
                                <p className="text-sm text-slate-600 mb-3 mt-1">{bundle.rationale}</p>
                                <div className="flex items-center gap-4 text-sm flex-wrap mb-3">
                                  <span className="text-slate-700 font-medium">Price: <span className="text-purple-600">${bundle.bundle_price?.toFixed(2)}</span></span>
                                  <span className="text-slate-700 font-medium">Margin: <span className="text-pink-600">{bundle.estimated_margin?.toFixed(1)}%</span></span>
                                  <span className="text-slate-700 font-medium">Co-purchase: <span className="text-purple-600">{bundle.copurchase_frequency?.toFixed(0)}%</span></span>
                                </div>
                                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md">Create Bundle</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dead Stock */}
                    {optimization.dead_stock && optimization.dead_stock.length > 0 && (
                      <div>
                        <h3 className="font-bold text-lg bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent mb-4">Dead Stock Clearance</h3>
                        <div className="space-y-3">
                          {optimization.dead_stock.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border-2 border-red-200/50 bg-gradient-to-br from-red-50 to-rose-50 shadow-md hover:shadow-lg transition-all duration-300">
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-600 to-rose-600 shadow-md">
                                <TrendingDown className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800">{item.product_name}</p>
                                <p className="text-sm text-slate-600 mb-3 mt-1">{item.action}</p>
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-slate-700 font-medium">Discount: <span className="text-red-600">{item.clearance_discount}%</span></span>
                                  <span className="text-slate-700 font-medium">Est. Loss: <span className="text-rose-600">${item.estimated_loss?.toFixed(2)}</span></span>
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
                        <h3 className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4">Seasonal Adjustments</h3>
                        <div className="space-y-3">
                          {optimization.seasonal_recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200/50 bg-white shadow-md hover:shadow-lg transition-all duration-300">
                              <div className="p-2.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 shadow-md">
                                <AlertTriangle className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800 capitalize">{rec.action} {rec.category}</p>
                                <p className="text-sm text-slate-600 mb-3 mt-1">{rec.rationale}</p>
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="text-slate-700 font-medium">Change: <span className="text-emerald-600 font-bold">{rec.percentage_change > 0 ? '+' : ''}{rec.percentage_change}%</span></span>
                                </div>
                                <Button size="sm" variant="outline" className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all duration-300">View Plan</Button>
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