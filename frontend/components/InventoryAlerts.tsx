"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, PackageCheck, Zap, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InventoryAlert {
  product_id: string;
  product_name: string;
  type: "reorder" | "dead" | "forecast" | "optimal";
  message: string;
  action: string;
  priority: "high" | "medium" | "low";
  reorder_point?: number;
  reorder_quantity?: number;
  clearance_discount?: number;
  forecast_units?: number;
}

interface InventoryAlertsProps {
  businessId: string;
}

const priorityColors = {
  high: "destructive",
  medium: "warning",
  low: "default"
} as const;

const getAlertIcon = (type: string) => {
  switch (type) {
    case "reorder":
      return AlertTriangle;
    case "dead":
      return TrendingDown;
    case "forecast":
      return Zap;
    case "optimal":
      return PackageCheck;
    default:
      return PackageCheck;
  }
};

const getAlertColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive";
    case "medium":
      return "warning";
    default:
      return "success";
  }
};

export const InventoryAlerts = ({ businessId }: InventoryAlertsProps) => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (businessId) {
      fetchAlerts();
    }
  }, [businessId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/inventory/results/${businessId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch inventory alerts");

      const data = await response.json();
      
      // Transform the results into alerts
      const transformedAlerts: InventoryAlert[] = [];
      
      if (data.results && data.results.length > 0) {
        data.results.forEach((result: any) => {
          const product = result.product || {};
          const productName = product.product_name || "Unknown Product";
          
          // Check for reorder alerts
          if (result.reorder_point && result.reorder_quantity) {
            transformedAlerts.push({
              product_id: result.product_id,
              product_name: productName,
              type: "reorder",
              message: `Stock below reorder point`,
              action: `Order ${result.reorder_quantity} units`,
              priority: result.reorder_priority || "medium",
              reorder_point: result.reorder_point,
              reorder_quantity: result.reorder_quantity,
            });
          }
          
          // Check for dead stock
          if (result.clearance_discount && result.clearance_discount > 0) {
            transformedAlerts.push({
              product_id: result.product_id,
              product_name: productName,
              type: "dead",
              message: "Dead stock detected",
              action: `Clear at ${result.clearance_discount}% discount`,
              priority: "medium",
              clearance_discount: result.clearance_discount,
            });
          }
          
          // Check for forecast
          if (result.forecast_units) {
            transformedAlerts.push({
              product_id: result.product_id,
              product_name: productName,
              type: "forecast",
              message: `Forecasted demand: ${result.forecast_units} units`,
              action: `Plan for ${result.forecast_period_days || 30} days`,
              priority: "low",
              forecast_units: result.forecast_units,
            });
          }
        });
      }
      
      setAlerts(transformedAlerts);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setError("Failed to load inventory alerts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-slate-200/50 bg-gradient-to-br from-white via-white to-slate-50 shadow-xl rounded-xl overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">Inventory Intelligence</CardTitle>
            <CardDescription className="text-slate-600 font-medium">AI-powered stock optimization and recommendations</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8 text-slate-600 font-medium">
            No alerts available. Run optimization to generate insights.
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {alerts.map((alert, index) => {
                const Icon = getAlertIcon(alert.type);
                const color = getAlertColor(alert.priority);
                
                return (
                  <div
                    key={`${alert.product_id}-${index}`}
                    className="flex items-start space-x-4 p-5 rounded-xl border-2 border-slate-200/50 bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-all duration-300"
                  >
                    <div className={`p-3 rounded-lg shadow-md ${
                      alert.priority === 'high' ? 'bg-gradient-to-br from-red-600 to-rose-600' :
                      alert.priority === 'medium' ? 'bg-gradient-to-br from-amber-600 to-orange-600' :
                      'bg-gradient-to-br from-emerald-600 to-teal-600'
                    }`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-900">{alert.product_name}</p>
                        <Badge className={`${
                          alert.priority === 'high' ? 'bg-gradient-to-r from-red-600 to-rose-600' :
                          alert.priority === 'medium' ? 'bg-gradient-to-r from-amber-600 to-orange-600' :
                          'bg-gradient-to-r from-emerald-600 to-teal-600'
                        } text-white border-0 font-bold`}>
                          {alert.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{alert.message}</p>
                      <p className="text-xs font-semibold bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">{alert.action}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
