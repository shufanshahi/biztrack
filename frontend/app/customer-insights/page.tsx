"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CustomerInsights } from "@/components/CustomerInsights";
import { CustomerDetailModal } from "@/components/CustomerDetailModal";
import { SegmentCustomersModal } from "@/components/SegmentCustomersModal";
import { AtRiskCustomersModal } from "@/components/AtRiskCustomersModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Users, Star, TrendingDown, Heart, Loader2, Store, RefreshCw, Mail, Eye, Edit } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface Business {
  id: string;
  name: string;
  description: string | null;
}

interface SegmentStats {
  rfm_segment: string;
  customer_count: number;
  total_segment_revenue: number;
  avg_customer_value: number;
}

interface AtRiskStats {
  total_at_risk: number;
  high_risk_count: number;
  total_revenue_at_risk: number;
  avg_churn_risk: number;
}

interface Campaign {
  campaign_id: number;
  campaign_name: string;
  campaign_type: string;
  target_segment: string;
  status: string;
  discount_percentage: number;
  target_customers: number[];
  created_at: string;
}

interface AIInsights {
  engagement_campaigns?: Array<{
    campaign_name: string;
    campaign_type: string;
    target_segment: string;
    target_customer_count: number;
    email_subject: string;
    email_body: string;
    discount_percentage: number;
    priority: string;
    rationale: string;
  }>;
  summary?: {
    total_customers_analyzed: number;
    high_priority_actions: number;
    estimated_revenue_at_risk: number;
    estimated_revenue_opportunity: number;
    key_insights: string[];
  };
}

const CustomerInsightsPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>("");
  const [segmentStats, setSegmentStats] = useState<SegmentStats[]>([]);
  const [atRiskStats, setAtRiskStats] = useState<AtRiskStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [isAtRiskModalOpen, setIsAtRiskModalOpen] = useState(false);

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
    if (selectedBusiness) {
      fetchStats();
      fetchCampaigns();
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
      
      // Auto-select first business if available
      if (data.businesses && data.businesses.length > 0) {
        setSelectedBusiness(data.businesses[0].id);
      }
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
      
      // Fetch segment statistics
      const segmentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customer-insights/segments/${selectedBusiness}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (segmentResponse.ok) {
        const segmentData = await segmentResponse.json();
        setSegmentStats(segmentData.segments || []);
      }

      // Fetch at-risk customer statistics
      const atRiskResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customer-insights/at-risk/${selectedBusiness}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (atRiskResponse.ok) {
        const atRiskData = await atRiskResponse.json();
        setAtRiskStats(atRiskData.statistics);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Failed to load customer statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedBusiness) return;

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customer-insights/campaigns/${selectedBusiness}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  };

  const runAIAnalysis = async () => {
    if (!selectedBusiness) return;

    try {
      setAnalyzing(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customer-insights/analyze/${selectedBusiness}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to run AI analysis");
      }

      const data = await response.json();
      setAiInsights(data.insights);
      
      // Refresh stats after analysis
      fetchStats();
      fetchCampaigns();
    } catch (err: any) {
      console.error("Error running AI analysis:", err);
      setError(err.message || "Failed to run AI analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewSegment = (segment: string) => {
    setSelectedSegment(segment);
    setIsSegmentModalOpen(true);
  };

  const handleViewCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsCustomerModalOpen(true);
  };

  if (authLoading || loadingBusinesses) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const championsCount = segmentStats.find(s => s.rfm_segment === "Champions")?.customer_count || 0;
  const loyalCount = segmentStats.find(s => s.rfm_segment === "Loyal Customers")?.customer_count || 0;
  const totalCustomers = segmentStats.reduce((sum, s) => sum + s.customer_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Customer Intelligence</h1>
                <p className="text-sm text-muted-foreground">RFM segmentation & insights</p>
              </div>
            </div>
            
            {/* Business Selector */}
            {businesses.length > 0 && (
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-muted-foreground" />
                <select
                  value={selectedBusiness}
                  onChange={(e) => setSelectedBusiness(e.target.value)}
                  className="px-4 py-2 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[200px]"
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                Please select a business to view customer insights
              </p>
            </CardContent>
          </Card>
        )}

        {selectedBusiness && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="border-success/20 bg-success/5 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleViewSegment("Champions")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Champions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-success" />
                      {loadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="text-2xl font-bold text-foreground">{championsCount}</div>
                      )}
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-success mt-1">Top customers</p>
                </CardContent>
              </Card>
              
              <Card className="border-primary/20 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => handleViewSegment("Loyal Customers")}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Loyal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      {loadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="text-2xl font-bold text-foreground">{loyalCount}</div>
                      )}
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-primary mt-1">Regular buyers</p>
                </CardContent>
              </Card>

              <Card className="border-warning/20 bg-warning/5 cursor-pointer hover:shadow-md transition-shadow" 
                    onClick={() => setIsAtRiskModalOpen(true)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">At Risk</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-warning" />
                      {loadingStats ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="text-2xl font-bold text-foreground">
                          {atRiskStats?.total_at_risk || 0}
                        </div>
                      )}
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-warning mt-1">Need attention</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    {loadingStats ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="text-2xl font-bold text-foreground">{totalCustomers}</div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Total customers</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Customer Analysis</CardTitle>
                    <CardDescription>Run AI-powered analysis for personalized retention strategies</CardDescription>
                  </div>
                  <Button onClick={runAIAnalysis} disabled={analyzing}>
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run AI Analysis
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {aiInsights?.summary && (
                <CardContent>
                  <div className="p-4 rounded-lg border border-border bg-card/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Customers Analyzed</p>
                        <p className="text-lg font-bold">{aiInsights.summary.total_customers_analyzed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">High Priority Actions</p>
                        <p className="text-lg font-bold">{aiInsights.summary.high_priority_actions}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue at Risk</p>
                        <p className="text-lg font-bold text-warning">
                          ${aiInsights.summary.estimated_revenue_at_risk?.toFixed(2) || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Revenue Opportunity</p>
                        <p className="text-lg font-bold text-success">
                          ${aiInsights.summary.estimated_revenue_opportunity?.toFixed(2) || 0}
                        </p>
                      </div>
                    </div>
                    {aiInsights.summary.key_insights && aiInsights.summary.key_insights.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2">Key Insights:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {aiInsights.summary.key_insights.map((insight, idx) => (
                            <li key={idx}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            <CustomerInsights businessId={selectedBusiness} onViewSegment={handleViewSegment} />
            
            <Card>
              <CardHeader>
                <CardTitle>Automated Engagement Campaigns</CardTitle>
                <CardDescription>
                  {campaigns.length > 0 
                    ? "Manage your customer retention campaigns"
                    : "AI-powered customer retention strategies - Run AI analysis to generate campaigns"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 && !aiInsights?.engagement_campaigns ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns yet. Run AI analysis to get personalized campaign recommendations.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Show AI-generated campaign recommendations */}
                    {aiInsights?.engagement_campaigns?.slice(0, 3).map((campaign, idx) => (
                      <div key={`ai-${idx}`} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                        <div className={`p-2 rounded-lg ${
                          campaign.campaign_type === 'winback' ? 'bg-warning/10' :
                          campaign.campaign_type === 'loyalty' ? 'bg-success/10' :
                          campaign.campaign_type === 'upsell' ? 'bg-primary/10' : 'bg-accent/10'
                        }`}>
                          {campaign.campaign_type === 'winback' ? <TrendingDown className="h-5 w-5 text-warning" /> :
                           campaign.campaign_type === 'loyalty' ? <Star className="h-5 w-5 text-success" /> :
                           <Heart className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-foreground">{campaign.campaign_name}</p>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              campaign.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                              campaign.priority === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-success/10 text-success'
                            }`}>
                              {campaign.priority.toUpperCase()} Priority
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Targeting {campaign.target_customer_count} {campaign.target_segment} customers
                            {campaign.discount_percentage > 0 && ` with ${campaign.discount_percentage}% discount`}
                          </p>
                          <p className="text-xs text-muted-foreground mb-3 italic">"{campaign.email_subject}"</p>
                          <div className="flex gap-2">
                            <Button size="sm">Create Campaign</Button>
                            <Button size="sm" variant="outline">View Details</Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Show existing campaigns */}
                    {campaigns.map((campaign) => (
                      <div key={campaign.campaign_id} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card">
                        <div className={`p-2 rounded-lg ${
                          campaign.campaign_type === 'winback' ? 'bg-warning/10' :
                          campaign.campaign_type === 'loyalty' ? 'bg-success/10' :
                          campaign.campaign_type === 'upsell' ? 'bg-primary/10' : 'bg-accent/10'
                        }`}>
                          {campaign.campaign_type === 'winback' ? <TrendingDown className="h-5 w-5 text-warning" /> :
                           campaign.campaign_type === 'loyalty' ? <Star className="h-5 w-5 text-success" /> :
                           <Heart className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-foreground">{campaign.campaign_name}</p>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              campaign.status === 'active' ? 'bg-success/10 text-success' :
                              campaign.status === 'scheduled' ? 'bg-warning/10 text-warning' :
                              campaign.status === 'completed' ? 'bg-muted text-muted-foreground' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Targeting {campaign.target_customers?.length || 0} {campaign.target_segment} customers
                            {campaign.discount_percentage > 0 && ` with ${campaign.discount_percentage}% discount`}
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm"><Eye className="h-4 w-4 mr-1" />View Details</Button>
                            <Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-1" />Edit Campaign</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Modals */}
      {selectedCustomerId && (
        <CustomerDetailModal
          businessId={selectedBusiness}
          customerId={selectedCustomerId}
          isOpen={isCustomerModalOpen}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setSelectedCustomerId(null);
          }}
        />
      )}

      {selectedSegment && (
        <SegmentCustomersModal
          businessId={selectedBusiness}
          segment={selectedSegment}
          isOpen={isSegmentModalOpen}
          onClose={() => {
            setIsSegmentModalOpen(false);
            setSelectedSegment(null);
          }}
          onViewCustomer={handleViewCustomer}
        />
      )}

      <AtRiskCustomersModal
        businessId={selectedBusiness}
        isOpen={isAtRiskModalOpen}
        onClose={() => setIsAtRiskModalOpen(false)}
        onViewCustomer={handleViewCustomer}
      />
    </div>
  );
};

export default CustomerInsightsPage;
