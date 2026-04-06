"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Download, Eye, LoaderCircle, PencilLine, PlusCircle, Save, X } from "lucide-react";
import { useCampaigns } from "@/components/campaigns/campaigns-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createQrRedirect,
  downloadQrRedirectInColor,
  fetchQrRedirects,
  updateQrRedirect,
} from "@/lib/qr-code-maker-client";
import { QR_COLOR_OPTIONS, normalizeQrColor } from "@/lib/qr-color-options";
import type { QrRedirectListItem } from "@/lib/qr-code-types";

const CENZER_LOGO_SRC = "/assets/cenzer_logo.png";

type EditDraft = {
  destinationUrl: string;
  campaign: string;
  utmUrl: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function QrCodeMakerWorkspace() {
  const { campaigns } = useCampaigns();
  const campaignOptions = useMemo(
    () => [...new Set(campaigns.map((campaign) => campaign.title))],
    [campaigns],
  );

  const [items, setItems] = useState<QrRedirectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [destinationUrl, setDestinationUrl] = useState("");
  const [selectedColor, setSelectedColor] = useState<(typeof QR_COLOR_OPTIONS)[number]["value"]>(
    "#2C00AB",
  );
  const [selectedCampaign, setSelectedCampaign] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    destinationUrl: "",
    campaign: "",
    utmUrl: "",
  });
  const [downloadColorById, setDownloadColorById] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const responseItems = await fetchQrRedirects();
        if (active) {
          setItems(responseItems);
          setDownloadColorById(
            Object.fromEntries(
              responseItems.map((item) => [item.id, normalizeQrColor(item.color)]),
            ),
          );
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load QR redirects.");
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
      const created = await createQrRedirect({
        destinationUrl: destinationUrl.trim(),
        color: selectedColor,
        campaign: selectedCampaign || null,
      });

      setItems((previous) => [created, ...previous]);
      setDownloadColorById((previous) => ({
        ...previous,
        [created.id]: normalizeQrColor(created.color),
      }));
      setDestinationUrl("");
      setSelectedCampaign("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate QR code.");
    } finally {
      setIsCreating(false);
    }
  };

  const viewQr = (item: QrRedirectListItem) => {
    window.open(item.qrCodeDataUrl, "_blank", "noopener,noreferrer");
  };

  const handleRedownload = async (item: QrRedirectListItem) => {
    const selected = downloadColorById[item.id] ?? "#2C00AB";
    setErrorMessage("");
    setDownloadingId(item.id);

    try {
      const blob = await downloadQrRedirectInColor(item.id, selected);
      downloadBlob(blob, `cenzer-qr-${item.slug}-${selected.slice(1).toLowerCase()}.png`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to download QR image.");
    } finally {
      setDownloadingId(null);
    }
  };

  const startEdit = (item: QrRedirectListItem) => {
    setEditingId(item.id);
    setEditDraft({
      destinationUrl: item.destination,
      campaign: item.campaign ?? "",
      utmUrl: item.utmUrl,
    });
    setErrorMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({ destinationUrl: "", campaign: "", utmUrl: "" });
  };

  const saveEdit = async (id: string) => {
    setErrorMessage("");
    setSavingId(id);

    try {
      const updated = await updateQrRedirect(id, {
        destinationUrl: editDraft.destinationUrl.trim(),
        campaign: editDraft.campaign.trim() || null,
        utmUrl: editDraft.utmUrl.trim() || undefined,
      });

      setItems((previous) => previous.map((item) => (item.id === id ? updated : item)));
      cancelEdit();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save QR changes.");
    } finally {
      setSavingId(null);
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
              <h2 className="text-2xl font-bold tracking-tight">Cenzer QR Code Maker</h2>
            </div>
            <p className="mt-2 text-sm text-muted">
              Generate a stable redirect QR. The QR points to Cenzer redirect URL so destination
              changes never require regenerating the image.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_170px_280px_auto]">
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Destination URL
            </span>
            <input
              type="url"
              value={destinationUrl}
              onChange={(event) => setDestinationUrl(event.target.value)}
              placeholder="https://example.com/landing-page"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Color
            </span>
            <select
              value={selectedColor}
              onChange={(event) => setSelectedColor(normalizeQrColor(event.target.value))}
              className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              {QR_COLOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.value})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Campaign (Optional)
            </span>
            <select
              value={selectedCampaign}
              onChange={(event) => setSelectedCampaign(event.target.value)}
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

          <div className="flex items-end">
            <Button
              variant="primary"
              onClick={handleCreate}
              disabled={isCreating}
              className="h-[42px] w-full gap-1.5 lg:w-auto"
            >
              {isCreating ? <LoaderCircle size={14} className="animate-spin" /> : <PlusCircle size={14} />}
              Generate QR
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
          <h3 className="text-lg font-bold tracking-tight">Generated Redirect QR Codes</h3>
          <p className="text-xs uppercase tracking-[0.08em] text-muted">{items.length} total</p>
        </div>

        {isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <LoaderCircle size={16} className="animate-spin" />
            Loading generated redirects...
          </div>
        ) : items.length < 1 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-muted">
            No QR redirects yet. Create one above to start tracking scans with editable
            destinations.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => {
              const isEditing = editingId === item.id;
              const isSaving = savingId === item.id;
              const selectedDownloadColor = downloadColorById[item.id] ?? normalizeQrColor(item.color);
              const isDownloading = downloadingId === item.id;

              return (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4 lg:grid-cols-[170px_1fr]"
                >
                  <div className="rounded-xl border border-[var(--color-border)] bg-white p-2">
                    <img
                      src={item.qrCodeDataUrl}
                      alt={`QR redirect ${item.slug}`}
                      className="h-full w-full rounded-lg object-contain"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="grid gap-2 text-sm lg:grid-cols-2">
                      <p>
                        <span className="font-semibold">Redirect URL:</span>{" "}
                        <a href={item.redirectUrl} className="text-[var(--color-accent)] underline" target="_blank" rel="noreferrer">
                          {item.redirectUrl}
                        </a>
                      </p>
                      <p>
                        <span className="font-semibold">Campaign:</span>{" "}
                        {item.campaign ?? "No campaign"}
                      </p>
                      <p>
                        <span className="font-semibold">Record Color:</span> {item.color}
                      </p>
                      <p>
                        <span className="font-semibold">Created:</span> {formatDate(item.createdAt)}
                      </p>
                      <p>
                        <span className="font-semibold">Scan Count:</span> {item.scans}
                      </p>
                      <p className="lg:col-span-2 break-all">
                        <span className="font-semibold">Current Destination URL:</span>{" "}
                        {item.destination}
                      </p>
                    </div>

                    {isEditing ? (
                      <div className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
                            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
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
                            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
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
                            UTM URL Override (Optional)
                          </span>
                          <input
                            type="url"
                            value={editDraft.utmUrl}
                            onChange={(event) =>
                              setEditDraft((previous) => ({
                                ...previous,
                                utmUrl: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                          />
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

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => viewQr(item)}
                        className="gap-1.5"
                      >
                        <Eye size={14} />
                        View QR
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => startEdit(item)}
                        className="gap-1.5"
                      >
                        <PencilLine size={14} />
                        Edit destination link
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => downloadDataUrl(item.qrCodeDataUrl, `cenzer-qr-${item.slug}.png`)}
                        className="gap-1.5"
                      >
                        <Download size={14} />
                        Download
                      </Button>
                    </div>

                    <div className="grid gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-[1fr_auto]">
                      <label className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                          Re-download Color
                        </span>
                        <select
                          value={selectedDownloadColor}
                          onChange={(event) =>
                            setDownloadColorById((previous) => ({
                              ...previous,
                              [item.id]: event.target.value,
                            }))
                          }
                          className="h-[42px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                        >
                          {QR_COLOR_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label} ({option.value})
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex items-end">
                        <Button
                          variant="secondary"
                          onClick={() => handleRedownload(item)}
                          disabled={isDownloading}
                          className="h-[42px] gap-1.5"
                        >
                          {isDownloading ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          Re-download
                        </Button>
                      </div>
                    </div>
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
