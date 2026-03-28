import { WorkspacePage } from "@/components/workspace-page";
import { workspaceSections, type WorkspaceSection } from "@/lib/workspaces";

export default async function WorkspaceSectionPage({
  params,
}: {
  params: Promise<{ workspaceId: string; section: string }>;
}) {
  const { workspaceId, section } = await params;
  const normalized = workspaceSections.includes(section as WorkspaceSection)
    ? (section as WorkspaceSection)
    : "brief";
  return <WorkspacePage section={normalized} workspaceId={workspaceId} />;
}
