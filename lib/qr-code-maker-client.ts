import type {
  CreateQrRedirectInput,
  QrRedirectListItem,
  UpdateQrRedirectInput,
} from "@/lib/qr-code-types";

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

export async function fetchQrRedirects() {
  const response = await fetch("/api/qr-codes", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as { items: QrRedirectListItem[] };
  return payload.items;
}

export async function createQrRedirect(input: CreateQrRedirectInput) {
  const response = await fetch("/api/qr-codes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as { item: QrRedirectListItem };
  return payload.item;
}

export async function updateQrRedirect(id: string, input: UpdateQrRedirectInput) {
  const response = await fetch(`/api/qr-codes/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as { item: QrRedirectListItem };
  return payload.item;
}

export async function downloadQrRedirectInColor(id: string, color: string) {
  const query = new URLSearchParams({ color });
  const response = await fetch(`/api/qr-codes/${id}/download?${query.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    await parseError(response);
  }

  return response.blob();
}
