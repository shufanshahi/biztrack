"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

type Point = { month: string; actual?: number | null; forecast: number; confidence?: string | number };

export const ForecastChart = ({ data = [] as Point[] }: { data?: Point[] }) => {
  const last = data.length ? data[data.length - 1] : undefined;
  const nextUnits = last?.forecast ?? 0;
  const conf = last?.confidence;
  const confText = typeof conf === 'number' ? `${Math.round(conf * 100)}%` : (conf || '');
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Demand Forecast</CardTitle>
        <CardDescription>
          Predictions powered by historical data, weather, festivals, and market trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `${Math.round(value as number)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => [value.toLocaleString(), ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              name="Actual Sales"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--accent))", r: 4 }}
              name="AI Forecast"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 p-4 bg-accent/10 rounded-lg border border-accent/20">
          <p className="text-sm font-medium text-accent-foreground">
            📊 Next Period Prediction: {nextUnits.toLocaleString()} units{confText ? ` (${confText} confidence)` : ''}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Factors: Model considers trends and seasonality; external signals can be added later
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
