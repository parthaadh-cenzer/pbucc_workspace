import { NextResponse } from "next/server";
import {
  badRequest,
  getMarketingSessionUser,
  normalizeUserText,
  parseDueDate,
  requireStringField,
  sanitizeOptionalText,
  toSafeInt,
  unauthorized,
} from "@/lib/security";
import { getWorkspaceMemberById } from "@/lib/workspace-members";
import { createWorkspaceTask } from "@/lib/workspace-tasks";
import { workspaceTaskStatuses, type WorkspaceTaskStatusLabel } from "@/lib/workspace-task-types";

const ALLOWED_STATUSES = new Set<WorkspaceTaskStatusLabel>(workspaceTaskStatuses);

type CreateTaskPayload = {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  dueDate?: unknown;
  freshdeskTicket?: unknown;
};

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const params = await context.params;
  const memberId = toSafeInt(params.memberId);

  if (!memberId) {
    return badRequest("Invalid member id.");
  }

  const member = await getWorkspaceMemberById({
    memberId,
    teamId: user.teamId,
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  let body: CreateTaskPayload;

  try {
    body = (await request.json()) as CreateTaskPayload;
  } catch {
    return badRequest("Invalid JSON payload.");
  }

  const title = requireStringField(body.title, 140);
  const description = sanitizeOptionalText(body.description, 1200);
  const dueDate = parseDueDate(body.dueDate);

  if (!title) {
    return badRequest("Task title is required.");
  }

  if (!dueDate) {
    return badRequest("A valid due date is required.");
  }

  const statusRaw = requireStringField(body.status, 24);

  if (!statusRaw || !ALLOWED_STATUSES.has(statusRaw as WorkspaceTaskStatusLabel)) {
    return badRequest("Task status must be Ongoing or Upcoming.");
  }

  const freshdeskTicket = sanitizeOptionalText(body.freshdeskTicket, 64);
  const normalizedFreshdesk = freshdeskTicket
    ? normalizeUserText(freshdeskTicket.toUpperCase(), 64)
      .replace(/[^A-Z0-9-]/g, "")
    : null;

  const created = await createWorkspaceTask({
    teamId: user.teamId,
    assigneeId: member.id,
    createdById: user.id,
    title,
    description,
    status: statusRaw as WorkspaceTaskStatusLabel,
    dueDate: dueDate.date,
    freshdeskTicket: normalizedFreshdesk,
  });

  return NextResponse.json({ task: created }, { status: 201 });
}
