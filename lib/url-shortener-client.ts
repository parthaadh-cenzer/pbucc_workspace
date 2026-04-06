import type {
  CreateShortLinkInput,
  ShortLinkListItem,
  UpdateShortLinkInput,
} from "@/lib/short-link-types";

async function parseError(response: Response) {
  let message = "Request failed.";

  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      message = payload.error;
    }
  } catch {
    message = "Request failed.";
  }

  throw new Error(message);
}

export async function fetchShortLinks() {
  const response = await fetch("/api/short-links", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as { items: ShortLinkListItem[] };
  return payload.items;
}

export async function createShortLink(input: CreateShortLinkInput) {
  const response = await fetch("/api/short-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as { item: ShortLinkListItem };
  return payload.item;
}

export async function updateShortLink(id: string, input: UpdateShortLinkInput) {
  const response = await fetch(`/api/short-links/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as { item: ShortLinkListItem };
  return payload.item;
}

export async function deleteShortLink(id: string) {
  const response = await fetch(`/api/short-links/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return true;
}
