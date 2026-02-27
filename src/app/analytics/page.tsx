import { AnalyticsCharts } from "@/components/analytics-charts";

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Analytics</h1>
      <AnalyticsCharts />
    </main>
  );
}
