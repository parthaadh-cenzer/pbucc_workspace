"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, LoaderCircle, PencilLine, PlusCircle, Save, Trash2, X } from "lucide-react";
import { useCampaigns } from "@/components/campaigns/campaigns-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createShortLink,
  deleteShortLink,
  fetchShortLinks,
  updateShortLink,
} from "@/lib/url-shortener-client";
import { SHORT_DOMAIN_OPTIONS } from "@/lib/short-link-runtime";
import type { ShortDomain, ShortLinkListItem } from "@/lib/short-link-types";

const CENZER_LOGO_SRC = "/assets/cenzer_logo.png";

type EditDraft = {
  destinationUrl: string;
  campaign: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export function UrlShortenerWorkspace() {
  const isDev = process.env.NODE_ENV !== "production";
  const { campaigns } = useCampaigns();
  const campaignOptions = useMemo(
    () => [...new Set(campaigns.map((campaign) => campaign.title))],
    [campaigns],
  );

  const [items, setItems] = useState<ShortLinkListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [destinationUrl, setDestinationUrl] = useState("");
  const [domain, setDomain] = useState<ShortDomain>("PBUCC");
  const [campaign, setCampaign] = useState("");
  const [customSlug, setCustomSlug] = useState("");

  const [editDraft, setEditDraft] = useState<EditDraft>({
    destinationUrl: "",
    campaign: "",
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextItems = await fetchShortLinks();
        if (active) {
          setItems(nextItems);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load short links.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async () => {
    setErrorMessage("");

    if (!destinationUrl.trim()) {
      setErrorMessage("Destination URL is required.");
      return;
    }

    setIsCreating(true);

    try {
      const created = await createShortLink({
        destinationUrl: destinationUrl.trim(),
        domain,
        campaign: campaign || null,
        customSlug: customSlug || null,
      });

      setItems((previous) => [created, ...previous]);
      setDestinationUrl("");
      setCampaign("");
      setCustomSlug("");
      setDomain("PBUCC");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create short link.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = async (item: ShortLinkListItem) => {
    try {
      await navigator.clipboard.writeText(item.shortUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1200);
    } catch {
      setErrorMessage("Unable to copy short URL.");
    }
  };

  const handleOpen = (item: ShortLinkListItem) => {
    const url = isDev ? item.workingRedirectUrl : item.shortUrl;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const startEdit = (item: ShortLinkListItem) => {
    setEditingId(item.id);
    setEditDraft({
      destinationUrl: item.destination,
      campaign: item.campaign ?? "",
    });
    setErrorMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ destinationUrl: "", campaign: "" });
  };

  const saveEdit = async (id: string) => {
    setErrorMessage("");
    setSavingId(id);

    try {
      const updated = await updateShortLink(id, {
        destinationUrl: editDraft.destinationUrl.trim(),
        campaign: editDraft.campaign.trim() || null,
      });

      setItems((previous) => previous.map((item) => (item.id === id ? updated : item)));
      cancelEdit();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update short link.");
    } finally {
      setSavingId(null);
    }
  };

  const removeShortLink = async (id: string) => {
    setErrorMessage("");
    setDeletingId(id);

    try {
      await deleteShortLink(id);
      setItems((previous) => previous.filter((item) => item.id !== id));
      if (editingId === id) {
        cancelEdit();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete short link.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white ring-2 ring-white/90 shadow-sm">
                <Image src={CENZER_LOGO_SRC} alt="Cenzer" width={36} height={36} priority />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Cenzer URL Shortener</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              Create and manage branded short links with campaign context and click tracking.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_250px_280px_1fr_auto]">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Destination URL
            </span>
            <input
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder="https://example.com/landing-page"
              className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Domain
            </span>
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value as ShortDomain)}
              className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {SHORT_DOMAIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {`${option.label} (${option.host}/{slug})`}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Campaign (Optional)
            </span>
            <select
              value={campaign}
              onChange={(event) => setCampaign(event.target.value)}
              className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">No campaign</option>
              {campaignOptions.map((campaignTitle) => (
                <option key={campaignTitle} value={campaignTitle}>
                  {campaignTitle}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Custom Slug (Optional)
            </span>
            <input
              type="text"
              value={customSlug}
              onChange={(event) => setCustomSlug(event.target.value)}
              placeholder="my-campaign-link"
              className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
          </label>

          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isCreating}
              className="h-[42px] w-full gap-1.5 lg:w-auto"
            >
              {isCreating ? <LoaderCircle size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              Generate Short URL
            </Button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight">Generated Short Links</h3>
          <p className="text-xs uppercase tracking-[0.08em] text-muted">{items.length} total</p>
        </div>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <LoaderCircle size={16} className="animate-spin" />
            Loading short links...
          </div>
        ) : items.length < 1 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-muted">
            No short links yet. Create one above to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const isSaving = savingId === item.id;
              const isDeleting = deletingId === item.id;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                >
                  <div className="grid gap-2 text-sm lg:grid-cols-2">
                    <p className="break-all">
                      <span className="font-semibold">Short URL:</span>{" "}
                      <a
                        href={isDev ? item.workingRedirectUrl : item.shortUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-accent)] underline"
                      >
                        {item.shortUrl}
                      </a>
                    </p>
                    <p>
                      <span className="font-semibold">Selected Domain:</span> {item.domain}
                    </p>
                    <p className="break-all lg:col-span-2">
                      <span className="font-semibold">Destination URL:</span> {item.destination}
                    </p>
                    <p>
                      <span className="font-semibold">Campaign:</span> {item.campaign ?? "No campaign"}
                    </p>
                    <p>
                      <span className="font-semibold">Created:</span> {formatDate(item.createdAt)}
                    </p>
                    <p>
                      <span className="font-semibold">Click Count:</span> {item.clicks}
                    </p>
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Destination URL
                        </span>
                        <input
                          type="url"
                          value={editDraft.destinationUrl}
                          onChange={(event) =>
                            setEditDraft((previous) => ({
                              ...previous,
                              destinationUrl: event.target.value,
                            }))
                          }
                          className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                        />
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Campaign
                        </span>
                        <select
                          value={editDraft.campaign}
                          onChange={(event) =>
                            setEditDraft((previous) => ({
                              ...previous,
                              campaign: event.target.value,
                            }))
                          }
                          className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                        >
                          <option value="">No campaign</option>
                          {campaignOptions.map((campaignTitle) => (
                            <option key={campaignTitle} value={campaignTitle}>
                              {campaignTitle}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          onClick={() => saveEdit(item.id)}
                          disabled={isSaving}
                          className="gap-1.5"
                        >
                          {isSaving ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                          Save
                        </Button>
                        <Button variant="secondary" onClick={cancelEdit} className="gap-1.5">
                          <X size={14} />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => handleCopy(item)} className="gap-1.5">
                      <Copy size={14} />
                      {copiedId === item.id ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="secondary" onClick={() => handleOpen(item)} className="gap-1.5">
                      <ExternalLink size={14} />
                      Open
                    </Button>
                    <Button variant="secondary" onClick={() => startEdit(item)} className="gap-1.5">
                      <PencilLine size={14} />
                      Edit destination link
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => removeShortLink(item.id)}
                      disabled={isDeleting}
                      className="gap-1.5"
                    >
                      {isDeleting ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Delete short URL
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
