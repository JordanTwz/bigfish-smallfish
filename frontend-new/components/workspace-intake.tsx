"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button, PagePanel, Field, TextField } from "@/components/ui";
import { useWorkspaceStore } from "@/components/workspace-provider";
import { buildResearchPayload } from "@/lib/workspace-builders";
import { initialIntake, type IntakeForm } from "@/lib/workspaces";

export function WorkspaceIntake() {
  const router = useRouter();
  const { createWorkspace, pendingAction } = useWorkspaceStore();
  const [form, setForm] = useState<IntakeForm>(initialIntake);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const workspaceId = await createWorkspace({
        title: form.title.trim() || form.candidateName.trim(),
        candidateName: form.candidateName.trim(),
        companyName: form.companyName.trim(),
        companyDomain: form.companyDomain.trim(),
        roleTitle: form.roleTitle.trim(),
        searchContext: form.searchContext.trim(),
        clientName: form.clientName.trim(),
        clientRole: form.clientRole.trim(),
        clientInterests: form.clientInterests.trim(),
        clientStrengths: form.clientStrengths.trim(),
        payload: buildResearchPayload(form),
      });
      router.push(`/workspaces/${workspaceId}/brief`);
    } catch {
      return;
    }
  }

  return (
    <PagePanel title="Create Target Workspace" kicker="New dossier">
      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Workspace title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
          <Field label="Target name" value={form.candidateName} onChange={(value) => setForm((current) => ({ ...current, candidateName: value }))} />
          <Field label="Company" value={form.companyName} onChange={(value) => setForm((current) => ({ ...current, companyName: value }))} />
          <Field label="Company domain" value={form.companyDomain} onChange={(value) => setForm((current) => ({ ...current, companyDomain: value }))} />
          <Field label="Role title" value={form.roleTitle} onChange={(value) => setForm((current) => ({ ...current, roleTitle: value }))} />
          <Field label="Client name" value={form.clientName} onChange={(value) => setForm((current) => ({ ...current, clientName: value }))} />
          <Field label="Client role" value={form.clientRole} onChange={(value) => setForm((current) => ({ ...current, clientRole: value }))} />
          <Field label="Client interests" value={form.clientInterests} onChange={(value) => setForm((current) => ({ ...current, clientInterests: value }))} />
          <Field label="Client strengths" value={form.clientStrengths} onChange={(value) => setForm((current) => ({ ...current, clientStrengths: value }))} />
        </div>
        <TextField label="Search context" rows={5} value={form.searchContext} onChange={(value) => setForm((current) => ({ ...current, searchContext: value }))} />
        <Button className="w-fit px-5 py-3" disabled={pendingAction === "create-workspace"} type="submit" variant="primary">
          {pendingAction === "create-workspace" ? "Launching research..." : "Create workspace"}
        </Button>
      </form>
    </PagePanel>
  );
}
