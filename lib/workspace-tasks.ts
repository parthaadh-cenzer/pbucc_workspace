import { prisma } from "@/lib/prisma";
import type { WorkspaceTaskRecord, WorkspaceTaskStatusLabel } from "@/lib/workspace-task-types";

type CreateWorkspaceTaskInput = {
  teamId: number;
  assigneeId: number;
  createdById: number;
  title: string;
  description: string | null;
  status: WorkspaceTaskStatusLabel;
  dueDate: Date;
  freshdeskTicket: string | null;
};

type WorkspaceTaskWithUsers = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date;
  freshdeskTicket: string | null;
  createdAt: Date;
  updatedAt: Date;
  assignee: {
    id: number;
    username: string;
  };
  createdBy: {
    id: number;
    username: string;
  };
};

function getWorkspaceTaskDelegate() {
  const delegate = (prisma as unknown as {
    workspaceTask?: {
      findMany: (args: unknown) => Promise<WorkspaceTaskWithUsers[]>;
      create: (args: unknown) => Promise<WorkspaceTaskWithUsers>;
    };
  }).workspaceTask;

  if (!delegate || typeof delegate.findMany !== "function" || typeof delegate.create !== "function") {
    throw new Error(
      "[workspace-task-db-model-missing] Prisma client is missing workspaceTask. Run prisma migrate, prisma generate, and restart the server.",
    );
  }

  return delegate;
}

function toStatusLabel(status: string): WorkspaceTaskStatusLabel {
  return status === "Ongoing" ? "Ongoing" : "Upcoming";
}

export async function listWorkspaceTasksForMember(input: {
  teamId: number;
  memberId: number;
}) {
  const delegate = getWorkspaceTaskDelegate();

  const rows = await delegate.findMany({
    where: {
      teamId: input.teamId,
      assigneeId: input.memberId,
    },
    include: {
      assignee: {
        select: {
          id: true,
          username: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: toStatusLabel(row.status),
    dueDate: row.dueDate.toISOString(),
    freshdeskTicket: row.freshdeskTicket,
    assigneeId: row.assignee.id,
    assigneeName: row.assignee.username,
    createdById: row.createdBy.id,
    createdByName: row.createdBy.username,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })) satisfies WorkspaceTaskRecord[];
}

export async function createWorkspaceTask(input: CreateWorkspaceTaskInput) {
  const delegate = getWorkspaceTaskDelegate();

  const created = await delegate.create({
    data: {
      teamId: input.teamId,
      assigneeId: input.assigneeId,
      createdById: input.createdById,
      title: input.title,
      description: input.description,
      status: input.status,
      dueDate: input.dueDate,
      freshdeskTicket: input.freshdeskTicket,
    },
    include: {
      assignee: {
        select: {
          id: true,
          username: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description,
    status: toStatusLabel(created.status),
    dueDate: created.dueDate.toISOString(),
    freshdeskTicket: created.freshdeskTicket,
    assigneeId: created.assignee.id,
    assigneeName: created.assignee.username,
    createdById: created.createdBy.id,
    createdByName: created.createdBy.username,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  } satisfies WorkspaceTaskRecord;
}
