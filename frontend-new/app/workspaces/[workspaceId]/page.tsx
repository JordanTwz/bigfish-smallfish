import { redirect } from "next/navigation";

export default async function WorkspaceIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  redirect(`/workspaces/${workspaceId}/brief`);
}
