"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, PackageCheck, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const alerts = [
  {
    id: 1,
    type: "reorder",
    icon: AlertTriangle,
    product: "Rice (Premium Basmati)",
    message: "Stock below reorder point",
    action: "Order 500kg now",
    priority: "high" as const,
    color: "destructive"
  },
  {
    id: 2,
    type: "dead",
    icon: TrendingDown,
    product: "Winter Jackets",
    message: "Dead stock detected - 45 units",
    action: "Clear at 30% discount",
    priority: "medium" as const,
    color: "warning"
  },
  {
    id: 3,
    type: "bundle",
    icon: Zap,
    product: "Tea + Sugar Bundle",
    message: "85% buy together",
    action: "Create combo offer",
    priority: "low" as const,
    color: "success"
  },
  {
    id: 4,
    type: "optimal",
    icon: PackageCheck,
    product: "Cooking Oil",
    message: "Optimal stock level",
    action: "Review in 14 days",
    priority: "low" as const,
    color: "success"
  }
];

const priorityColors = {
  high: "destructive",
  medium: "warning",
  low: "success"
} as const;

export const InventoryAlerts = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Intelligence</CardTitle>
        <CardDescription>AI-powered stock optimization and recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start space-x-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-${alert.color}/10`}>
                  <alert.icon className={`h-5 w-5 text-${alert.color}`} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{alert.product}</p>
                    <Badge variant={priorityColors[alert.priority]}>
                      {alert.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs font-medium text-primary">{alert.action}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
