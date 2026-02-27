import { ProspectTable } from "@/components/prospect-table";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Prospects</h1>
      <ProspectTable />
    </main>
  );
}
