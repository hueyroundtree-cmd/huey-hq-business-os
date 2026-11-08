import { describe, expect, it } from "vitest";
import { AGENTS, canTransitionTask, requiresOwnerApproval, routeTask, type DelegatedTask } from "@/lib/agentCoordination";

describe("agent coordination policy", () => {
  it("reuses existing agents instead of inventing new active agents", () => {
    expect(AGENTS.every((agent) => agent.status === "existing")).toBe(true);
    expect(new Set(AGENTS.map((agent) => agent.id)).size).toBe(AGENTS.length);
  });
  it("routes common work to existing specialists", () => {
    expect(routeTask("draft a follow-up for a client").agentId).toBe("sales");
    expect(routeTask("make a YouTube short").agentId).toBe("content");
    expect(routeTask("review Bitcoin brokerage risk").agentId).toBe("finance");
    expect(routeTask("update GitHub app integration").department).toBe("technology");
  });
  it("requires approval for external and financial actions", () => {
    expect(requiresOwnerApproval("trade")).toBe(true);
    expect(requiresOwnerApproval("client_contact")).toBe(true);
    expect(requiresOwnerApproval("publish")).toBe(true);
    expect(requiresOwnerApproval("research")).toBe(false);
  });
  it("does not permit unapproved or unverified completion", () => {
    const task: DelegatedTask = { id: "t1", source: "voice", title: "Contact client", department: "revenue", assignedAgentId: "sales", status: "assigned", action: "client_contact" };
    expect(canTransitionTask(task, "working")).toBe(false);
    expect(canTransitionTask(task, "verified_complete")).toBe(false);
    expect(canTransitionTask({ ...task, approvedByOwner: true }, "verified_complete")).toBe(false);
    expect(canTransitionTask({ ...task, approvedByOwner: true, evidenceUrl: "https://example.com/evidence" }, "verified_complete")).toBe(true);
  });
});
