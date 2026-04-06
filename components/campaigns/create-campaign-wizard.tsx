"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTemplateDefaults,
  normalizeCampaignName,
  type CampaignChannel,
  type CampaignRecord,
  type CampaignTemplate,
  type CreateCampaignInput,
} from "@/lib/campaign-flow";

const stepTitles = [
  "Basic Info",
  "Dates",
  "Channels",
  "Assets Setup",
  "Goals / KPIs",
  "Review & Create",
];

const templateOptions: CampaignTemplate[] = [
  "Blank Campaign",
  "Awareness Campaign",
  "Engagement Campaign",
  "Conversion Campaign",
  "Event Campaign",
];

const channelOptions: CampaignChannel[] = [
  "Social",
  "Email",
  "Website",
  "QR",
  "Print",
  "Events",
];

const statusOptions: CampaignRecord["status"][] = [
  "Draft",
  "On Track",
  "Monitoring",
  "Needs Attention",
];

type WizardFormState = {
  template: CampaignTemplate;
  campaignName: string;
  objective: string;
  description: string;
  teamName: string;
  ownerName: string;
  status: CampaignRecord["status"];
  startDate: string;
  endDate: string;
  reportingPeriod: string;
  milestoneDatesText: string;
  channels: CampaignChannel[];
  urlsText: string;
  qrCodesText: string;
  socialPlatformsText: string;
  landingPagesText: string;
  assetTagsText: string;
  targetImpressions: string;
  targetClicks: string;
  targetQrScans: string;
  targetEngagements: string;
  targetConversions: string;
};

const initialFormState: WizardFormState = {
  template: "Blank Campaign",
  campaignName: "",
  objective: "",
  description: "",
  teamName: "",
  ownerName: "",
  status: "Draft",
  startDate: "",
  endDate: "",
  reportingPeriod: "",
  milestoneDatesText: "",
  channels: [],
  urlsText: "",
  qrCodesText: "",
  socialPlatformsText: "Instagram\nFacebook\nLinkedIn\nEmail\nWebsite",
  landingPagesText: "",
  assetTagsText: "",
  targetImpressions: "0",
  targetClicks: "0",
  targetQrScans: "0",
  targetEngagements: "0",
  targetConversions: "",
};

function toList(value: string) {
  return value
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function CreateCampaignWizard({
  open,
  onClose,
  onCreate,
  existingCampaignNames,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreateCampaignInput) => void;
  existingCampaignNames: string[];
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormState>(initialFormState);
  const [error, setError] = useState("");

  const milestones = useMemo(() => toList(form.milestoneDatesText), [form.milestoneDatesText]);
  const urls = useMemo(() => toList(form.urlsText), [form.urlsText]);
  const qrCodes = useMemo(() => toList(form.qrCodesText), [form.qrCodesText]);
  const socialPlatforms = useMemo(
    () => toList(form.socialPlatformsText),
    [form.socialPlatformsText],
  );
  const landingPages = useMemo(
    () => toList(form.landingPagesText),
    [form.landingPagesText],
  );
  const assetTags = useMemo(() => toList(form.assetTagsText), [form.assetTagsText]);
  const normalizedExistingNames = useMemo(
    () => existingCampaignNames.map((name) => normalizeCampaignName(name)),
    [existingCampaignNames],
  );

  if (!open) {
    return null;
  }

  const applyTemplate = (template: CampaignTemplate) => {
    const defaults = getTemplateDefaults(template);

    setForm((previous) => ({
      ...previous,
      template,
      objective: previous.objective || defaults.objective,
      channels: defaults.channels,
      targetImpressions: defaults.goals.targetImpressions.toString(),
      targetClicks: defaults.goals.targetClicks.toString(),
      targetQrScans: defaults.goals.targetQrScans.toString(),
      targetEngagements: defaults.goals.targetEngagements.toString(),
      targetConversions:
        defaults.goals.targetConversions === null
          ? ""
          : defaults.goals.targetConversions.toString(),
    }));
  };

  const toggleChannel = (channel: CampaignChannel) => {
    setForm((previous) => {
      const exists = previous.channels.includes(channel);
      return {
        ...previous,
        channels: exists
          ? previous.channels.filter((item) => item !== channel)
          : [...previous.channels, channel],
      };
    });
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 0) {
      const normalizedCampaignName = normalizeCampaignName(form.campaignName);

      if (!normalizedCampaignName) {
        return "Campaign name is required.";
      }
      if (!form.objective.trim()) {
        return "Campaign objective is required.";
      }
      if (!form.teamName.trim()) {
        return "Team is required.";
      }

      if (normalizedExistingNames.includes(normalizedCampaignName)) {
        return "Campaign name already exists. Please use a unique name.";
      }
    }

    if (currentStep === 1) {
      if (!form.startDate) {
        return "Start date is required.";
      }
      if (!form.endDate) {
        return "End date is required.";
      }
    }

    if (currentStep === 2 && form.channels.length < 1) {
      return "At least one channel must be selected.";
    }

    return "";
  };

  const onNext = () => {
    const validationError = validateStep(step);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep((previous) => Math.min(previous + 1, stepTitles.length - 1));
  };

  const onBack = () => {
    setError("");
    setStep((previous) => Math.max(previous - 1, 0));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const validationError = validateStep(0) || validateStep(1) || validateStep(2);
    if (validationError) {
      setError(validationError);
      setStep(0);
      return;
    }

    const payload: CreateCampaignInput = {
      template: form.template,
      campaignName: form.campaignName.trim(),
      objective: form.objective.trim(),
      description: form.description.trim(),
      teamName: form.teamName.trim(),
      ownerName: form.ownerName.trim() || "Campaign Owner",
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      reportingPeriod: form.reportingPeriod,
      milestoneDates: milestones,
      channels: form.channels,
      urls,
      qrCodes,
      socialPlatforms,
      landingPages,
      assetTags,
      goals: {
        targetImpressions: Number(form.targetImpressions || 0),
        targetClicks: Number(form.targetClicks || 0),
        targetQrScans: Number(form.targetQrScans || 0),
        targetEngagements: Number(form.targetEngagements || 0),
        targetConversions: form.targetConversions
          ? Number(form.targetConversions)
          : null,
      },
    };

    try {
      onCreate(payload);
      setForm(initialFormState);
      setStep(0);
      setError("");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create campaign.";
      setError(message);
      setStep(0);
    }
  };

  const summaryItems = [
    { label: "Name", value: form.campaignName || "-" },
    { label: "Objective", value: form.objective || "-" },
    { label: "Team", value: form.teamName || "-" },
    { label: "Owner", value: form.ownerName || "-" },
    { label: "Status", value: form.status },
    { label: "Date Range", value: `${form.startDate || "-"} to ${form.endDate || "-"}` },
    { label: "Reporting", value: form.reportingPeriod || "-" },
    { label: "Channels", value: form.channels.join(", ") || "-" },
    { label: "URLs", value: `${urls.length}` },
    { label: "QR Codes", value: `${qrCodes.length}` },
    { label: "Social Platforms", value: `${socialPlatforms.length}` },
    { label: "Landing Pages", value: `${landingPages.length}` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
        <form onSubmit={onSubmit}>
          <div className="flex items-start justify-between border-b border-[var(--color-border)] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                Create Campaign
              </p>
              <h3 className="mt-1 text-2xl font-bold">{stepTitles[step]}</h3>
              <p className="mt-1 text-xs text-muted">
                Step {step + 1} of {stepTitles.length}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setForm(initialFormState);
                setStep(0);
                setError("");
                onClose();
              }}
              className="rounded-lg border border-[var(--color-border)] p-2 transition hover:bg-[var(--color-surface-muted)]"
              aria-label="Close wizard"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-5">
            {step === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Campaign Template
                  </span>
                  <select
                    value={form.template}
                    onChange={(event) =>
                      applyTemplate(event.target.value as CampaignTemplate)
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  >
                    {templateOptions.map((template) => (
                      <option key={template} value={template}>
                        {template}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Campaign Name *
                  </span>
                  <input
                    value={form.campaignName}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        campaignName: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Status
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        status: event.target.value as CampaignRecord["status"],
                      }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Campaign Objective *
                  </span>
                  <textarea
                    value={form.objective}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, objective: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Short Description
                  </span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Team *
                  </span>
                  <input
                    value={form.teamName}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, teamName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Owner
                  </span>
                  <input
                    value={form.ownerName}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, ownerName: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs text-muted md:col-span-2">
                  Duplicate existing campaign support can be layered in later. Template
                  selection is enabled in this phase.
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Start Date *
                  </span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, startDate: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    End Date *
                  </span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((previous) => ({ ...previous, endDate: event.target.value }))
                    }
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Reporting Period / Quarter
                  </span>
                  <input
                    value={form.reportingPeriod}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        reportingPeriod: event.target.value,
                      }))
                    }
                    placeholder="Q2 2026"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                    Milestone Dates (optional, one per line)
                  </span>
                  <textarea
                    rows={4}
                    value={form.milestoneDatesText}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        milestoneDatesText: event.target.value,
                      }))
                    }
                    placeholder="2026-06-15: Mid-campaign review"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                  />
                </label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Select Channels *
                </p>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {channelOptions.map((channel) => {
                    const selected = form.channels.includes(channel);

                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleChannel(channel)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                          selected
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                            : "border-[var(--color-border)] bg-[var(--color-surface)]"
                        }`}
                      >
                        {channel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <InputTextarea
                  label="Campaign URLs"
                  value={form.urlsText}
                  onChange={(value) => setForm((previous) => ({ ...previous, urlsText: value }))}
                  placeholder="https://example.com/page"
                />
                <InputTextarea
                  label="QR Codes"
                  value={form.qrCodesText}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, qrCodesText: value }))
                  }
                  placeholder="Workshop Registration"
                />
                <InputTextarea
                  label="Social Platforms"
                  value={form.socialPlatformsText}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, socialPlatformsText: value }))
                  }
                  placeholder="Instagram"
                />
                <InputTextarea
                  label="Landing Pages"
                  value={form.landingPagesText}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, landingPagesText: value }))
                  }
                  placeholder="https://example.com/landing"
                />
                <InputTextarea
                  label="Asset Tags (optional)"
                  value={form.assetTagsText}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, assetTagsText: value }))
                  }
                  placeholder="spring,finance,community"
                  className="md:col-span-2"
                />
              </div>
            ) : null}

            {step === 4 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <NumberInput
                  label="Target Impressions"
                  value={form.targetImpressions}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, targetImpressions: value }))
                  }
                />
                <NumberInput
                  label="Target Clicks"
                  value={form.targetClicks}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, targetClicks: value }))
                  }
                />
                <NumberInput
                  label="Target QR Scans"
                  value={form.targetQrScans}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, targetQrScans: value }))
                  }
                />
                <NumberInput
                  label="Target Engagements"
                  value={form.targetEngagements}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, targetEngagements: value }))
                  }
                />
                <NumberInput
                  label="Optional Conversions Goal"
                  value={form.targetConversions}
                  onChange={(value) =>
                    setForm((previous) => ({ ...previous, targetConversions: value }))
                  }
                  className="md:col-span-2"
                />
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Review details before creating the campaign. You can go back to edit any
                  step.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {summaryItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-border)] p-5">
            <Button type="button" variant="ghost" onClick={onBack} disabled={step === 0}>
              Back
            </Button>

            {step < stepTitles.length - 1 ? (
              <Button type="button" variant="primary" onClick={onNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" variant="primary">
                Create Campaign
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function InputTextarea({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 ${className ?? ""}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`space-y-1.5 ${className ?? ""}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
      />
    </label>
  );
}
