"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { MultiSelectDropdown } from "@/components/social-review/multi-select-dropdown";
import { Button } from "@/components/ui/button";
import type { CampaignRecord } from "@/lib/campaign-flow";
import {
  socialPlatforms,
  socialReviewTeamMembers,
  type NewSocialPostInput,
  type SocialPlatform,
} from "@/lib/mock-social-review";

const initialState = {
  date: "",
  caption: "",
  campaignSlugs: [] as string[],
  reviewerIds: [] as string[],
  platform: "Instagram" as SocialPlatform,
};

export function UploadSocialPostModal({
  open,
  onClose,
  campaigns,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  campaigns: CampaignRecord[];
  onUpload: (input: NewSocialPostInput) => void;
}) {
  const [form, setForm] = useState(initialState);
  const [imagePreview, setImagePreview] = useState("");
  const [error, setError] = useState("");

  const campaignOptions = useMemo(
    () => campaigns.map((campaign) => ({ slug: campaign.slug, name: campaign.title })),
    [campaigns],
  );

  const reviewerOptions = useMemo(
    () =>
      socialReviewTeamMembers.map((member) => ({
        value: member.id,
        label: member.name,
        description: member.role,
      })),
    [],
  );

  if (!open) {
    return null;
  }

  const resetAndClose = () => {
    setForm(initialState);
    setImagePreview("");
    setError("");
    onClose();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.includes("png") && !file.type.includes("jpeg") && !file.type.includes("jpg") && !file.type.startsWith("image/")) {
      setError("Please upload a PNG or JPG image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(String(reader.result));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!imagePreview) {
      setError("Image is required.");
      return;
    }

    if (!form.date) {
      setError("Date is required.");
      return;
    }

    if (!form.caption.trim()) {
      setError("Caption is required.");
      return;
    }

    if (!form.platform) {
      setError("Platform is required.");
      return;
    }

    if (form.campaignSlugs.length < 1) {
      setError("At least one linked campaign is required.");
      return;
    }

    if (form.reviewerIds.length < 1) {
      setError("At least one reviewer is required.");
      return;
    }

    onUpload({
      imageUrl: imagePreview,
      date: form.date,
      caption: form.caption.trim(),
      campaignSlugs: form.campaignSlugs,
      reviewerIds: form.reviewerIds,
      platform: form.platform,
    });

    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <form onSubmit={onSubmit}>
          <div className="flex items-start justify-between border-b border-[var(--color-border)] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                Social Review
              </p>
              <h3 className="mt-1 text-xl font-bold">Upload for Review</h3>
            </div>

            <button
              type="button"
              onClick={resetAndClose}
              className="rounded-lg border border-[var(--color-border)] p-2 transition hover:bg-[var(--color-surface-muted)]"
              aria-label="Close upload modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Image Upload *
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleFileChange}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted">
                Recommended size: 1080x1080. Portrait and story sizes are fully supported.
              </p>
            </label>

            {imagePreview ? (
              <div className="md:col-span-2">
                <img
                  src={imagePreview}
                  alt="Uploaded post preview"
                  className="h-56 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] object-contain"
                />
              </div>
            ) : null}

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Date *
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, date: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Platform *
              </span>
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    platform: event.target.value as SocialPlatform,
                  }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              >
                {socialPlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                Caption *
              </span>
              <textarea
                rows={3}
                value={form.caption}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, caption: event.target.value }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              />
            </label>

            <div className="md:col-span-2">
              <MultiSelectDropdown
                label="Linked Campaigns"
                required
                placeholder="Select one or more campaigns"
                selectedValues={form.campaignSlugs}
                options={campaignOptions.map((campaign) => ({
                  value: campaign.slug,
                  label: campaign.name,
                }))}
                onChange={(values) => setForm((previous) => ({ ...previous, campaignSlugs: values }))}
                searchPlaceholder="Search campaigns"
              />
            </div>

            <div className="md:col-span-2">
              <MultiSelectDropdown
                label="Send for Review"
                required
                placeholder="Select reviewers"
                selectedValues={form.reviewerIds}
                options={reviewerOptions}
                onChange={(values) => setForm((previous) => ({ ...previous, reviewerIds: values }))}
                searchPlaceholder="Search team members"
                helperText="Choose one or more reviewers to notify on upload."
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] p-5">
            <Button type="button" variant="ghost" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Upload for Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
