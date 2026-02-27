import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectDetailPanel } from "@/components/project-detail-panel";
import { getProspectById, getPipelineEntryByProspectId } from "@/lib/db";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prospect = await getProspectById(id);
  if (!prospect) notFound();

  const pipelineEntry = await getPipelineEntryByProspectId(id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="mb-4 inline-block text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Back to prospects
      </Link>
      <ProjectDetailPanel prospect={prospect} pipelineEntry={pipelineEntry} />
    </main>
  );
}
