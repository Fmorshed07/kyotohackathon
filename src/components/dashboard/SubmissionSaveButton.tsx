import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./submission-save.css";

type SubmissionSaveButtonProps = {
  isSaving: boolean;
  isReadOnly: boolean;
  onSave: () => Promise<void>;
};

export function SubmissionSaveButton({ isSaving, isReadOnly, onSave }: SubmissionSaveButtonProps) {
  return (
    <div className="submission-save w-full sm:w-auto">
      <Button
        type="button"
        onClick={onSave}
        disabled={isSaving || isReadOnly}
        aria-busy={isSaving}
        data-saving={isSaving}
        size="lg"
        className="submission-save__button w-full uppercase tracking-[0.12em]"
      >
        <span className="submission-save__glyph" aria-hidden="true">
          {isSaving ? (
            <svg viewBox="0 0 26 26" fill="none" focusable="false">
              <rect className="submission-save__back-sheet" x="4" y="7" width="14" height="15" rx="3" />
              <rect className="submission-save__front-sheet" x="8" y="3" width="14" height="16" rx="3" />
              <path className="submission-save__line" d="M12 8h6" />
              <path className="submission-save__line" d="M12 11.5h6" />
              <path className="submission-save__line" d="M12 15h4" />
            </svg>
          ) : <Rocket />}
        </span>
        <span className="submission-save__label">
          <span className="submission-save__measure" aria-hidden="true">Saving submission</span>
          <span>{isSaving ? "Saving submission" : isReadOnly ? "Locked" : "Save Submission"}</span>
        </span>
      </Button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isSaving ? "Saving your submission. Please wait." : ""}
      </span>
    </div>
  );
}
