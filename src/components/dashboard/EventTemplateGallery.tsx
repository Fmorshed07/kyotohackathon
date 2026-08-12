import { useMemo, useState, type CSSProperties } from "react";
import { Check, LayoutTemplate, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EVENT_FONT_PRESETS,
  EVENT_LAYOUT_STYLES,
  buildEventThemeStyle,
} from "@/lib/eventBranding";
import {
  EVENT_TEMPLATE_CATEGORIES,
  EVENT_TEMPLATES,
  type EventTemplate,
} from "@/lib/eventTemplates";
import { cn } from "@/lib/utils";

type EventTemplateGalleryProps = {
  onApply: (template: EventTemplate) => void;
  disabled?: boolean;
  activeTemplateId?: string | null;
};

export function EventTemplateGallery({
  onApply,
  disabled,
  activeTemplateId,
}: EventTemplateGalleryProps) {
  const [category, setCategory] = useState<(typeof EVENT_TEMPLATE_CATEGORIES)[number]>("All");
  const [selectedId, setSelectedId] = useState<string | null>(activeTemplateId ?? null);

  const templates = useMemo(
    () =>
      category === "All"
        ? EVENT_TEMPLATES
        : EVENT_TEMPLATES.filter((template) => template.category === category),
    [category],
  );

  const selected = EVENT_TEMPLATES.find((template) => template.id === selectedId) ?? null;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] via-black/20 to-black/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="dash-icon-chip dash-icon-chip--sunset mt-0.5" aria-hidden>
            <LayoutTemplate className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Ready-made templates
            </p>
            <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
              Start from a proven event shape
            </h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Each template sets story structure, programme, typography, accent, and page layout.
              Customize everything after you apply it.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-white/15 text-[10px] uppercase tracking-[0.14em]">
          {EVENT_TEMPLATES.length} templates
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {EVENT_TEMPLATE_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => setCategory(item)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 font-display text-xs font-semibold transition",
              category === item
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-white/10 bg-black/20 text-muted-foreground hover:border-white/25 hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          const fontLabel =
            EVENT_FONT_PRESETS.find((preset) => preset.id === template.fontPreset)?.label ??
            template.fontPreset;
          const layoutLabel =
            EVENT_LAYOUT_STYLES.find((layout) => layout.id === template.layoutStyle)?.label ??
            template.layoutStyle;
          const cardStyle = buildEventThemeStyle({
            accentHex: template.accentColor,
            fontPreset: template.fontPreset,
          }) as CSSProperties;

          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedId(template.id)}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-4 text-left transition",
                isSelected
                  ? "border-primary/60 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]"
                  : "border-white/10 bg-black/25 hover:border-white/25 hover:bg-black/35",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                  template.mood,
                )}
              />
              <div className="relative" style={cardStyle}>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="mt-1 h-3 w-3 rounded-full shadow-[0_0_12px_currentColor]"
                    style={{ backgroundColor: template.accentColor, color: template.accentColor }}
                  />
                  {isSelected ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-white/15 bg-black/30 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {template.category}
                    </Badge>
                  )}
                </div>
                <p
                  className="mt-3 text-base font-semibold text-foreground"
                  style={{ fontFamily: "var(--event-display)" }}
                >
                  {template.name}
                </p>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {template.blurb}
                </p>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                  {fontLabel} · {layoutLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <div
          className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between"
          style={
            buildEventThemeStyle({
              accentHex: selected.accentColor,
              fontPreset: selected.fontPreset,
            }) as CSSProperties
          }
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Selected template
            </p>
            <p
              className="mt-1 text-sm font-semibold text-foreground"
              style={{ fontFamily: "var(--event-display)" }}
            >
              {selected.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{selected.blurb}</p>
          </div>
          <Button
            type="button"
            disabled={disabled}
            className="gap-1.5 shrink-0"
            onClick={() => onApply(selected)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Apply template
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a template card, then apply it to your draft.
        </p>
      )}
    </div>
  );
}
