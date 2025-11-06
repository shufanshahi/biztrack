"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, AlertCircle, Star, Loader2, Mail } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Segment {
  rfm_segment: string;
  customer_count: number;
  total_segment_revenue: number;
  avg_customer_value: number;
  avg_purchase_frequency: number;
  avg_days_since_purchase: number;
  avg_churn_risk: number;
}

interface CustomerInsightsProps {
  businessId: string;
}

const getSegmentColor = (segment: string): string => {
  const segmentMap: { [key: string]: string } = {
    "Champions": "success",
    "Loyal Customers": "primary",
    "Potential Loyalists": "primary",
    "At Risk": "warning",
    "Cant Lose Them": "warning",
    "Hibernating": "warning",
    "Lost": "destructive",
    "New Customers": "default",
    "Promising": "default",
    "Need Attention": "warning"
  };
  return segmentMap[segment] || "default";
};

const getSegmentIcon = (segment: string) => {
  if (segment.includes("Champions")) return Star;
  if (segment.includes("At Risk") || segment.includes("Hibernating") || segment.includes("Cant Lose")) return AlertCircle;
  if (segment.includes("Loyal") || segment.includes("Potential")) return Users;
  return TrendingUp;
};

export const CustomerInsights = ({ businessId }: CustomerInsightsProps) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (businessId) {
      fetchSegments();
    }
  }, [businessId]);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customer-insights/segments/${businessId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch customer segments");

      const data = await response.json();
      setSegments(data.segments || []);
      setTotalRevenue(data.total_revenue || 0);
    } catch (err) {
      console.error("Error fetching customer segments:", err);
      setError("Failed to load customer insights");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Intelligence</CardTitle>
          <CardDescription>RFM segmentation with automated retention strategies</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle>Customer Intelligence</CardTitle>
          <CardDescription>RFM segmentation with automated retention strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-4">{error}</p>
          <Button onClick={fetchSegments} className="w-full">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Intelligence</CardTitle>
          <CardDescription>RFM segmentation with automated retention strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No customer data available. Add customer sales data to see insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Intelligence</CardTitle>
        <CardDescription>RFM segmentation with automated retention strategies</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {segments.map((segment, index) => {
            const Icon = getSegmentIcon(segment.rfm_segment);
            const percentage = totalRevenue > 0 
              ? (segment.total_segment_revenue / totalRevenue * 100) 
              : 0;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={getSegmentColor(segment.rfm_segment) as any}>
                      {segment.rfm_segment}
                    </Badge>
                    <span className="text-muted-foreground">
                      {segment.customer_count} customers
                    </span>
                  </div>
                  <span className="font-semibold">
                    ${segment.total_segment_revenue.toFixed(2)}
                  </span>
                </div>
                <Progress value={percentage} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Avg: ${segment.avg_customer_value.toFixed(2)}/customer</span>
                  <span>{segment.avg_purchase_frequency.toFixed(1)} orders</span>
                  <span>{Math.round(segment.avg_days_since_purchase)} days ago</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-primary/10">
            <div className="p-2 rounded-lg bg-primary/20">
              <Star className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Top Customers</p>
              <p className="text-xs text-muted-foreground">
                {segments.find(s => s.rfm_segment === "Champions")?.customer_count || 0} champions 
                generating ${segments.find(s => s.rfm_segment === "Champions")?.total_segment_revenue.toFixed(2) || 0}
              </p>
              <p className="text-xs font-medium text-primary">Keep them engaged with exclusive offers</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-warning/10">
            <div className="p-2 rounded-lg bg-warning/20">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Churn Risk</p>
              <p className="text-xs text-muted-foreground">
                {segments.filter(s => 
                  s.rfm_segment.includes("At Risk") || 
                  s.rfm_segment.includes("Cant Lose") ||
                  s.rfm_segment.includes("Hibernating")
                ).reduce((sum, s) => sum + s.customer_count, 0)} customers need attention
              </p>
              <p className="text-xs font-medium text-warning">Run AI analysis for personalized win-back strategies</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 rounded-lg bg-success/10">
            <div className="p-2 rounded-lg bg-success/20">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Growth Opportunity</p>
              <p className="text-xs text-muted-foreground">
                {segments.find(s => s.rfm_segment === "Potential Loyalists")?.customer_count || 0} potential 
                loyalists showing promise
              </p>
              <p className="text-xs font-medium text-success">Upsell and cross-sell opportunities available</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
