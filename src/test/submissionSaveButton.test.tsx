import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SubmissionSaveButton } from "@/components/dashboard/SubmissionSaveButton";

afterEach(cleanup);

describe("submission saving feedback", () => {
  it("announces the actual saving state and prevents duplicate saves until the parent finishes", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const view = render(<SubmissionSaveButton isSaving={false} isReadOnly={false} onSave={onSave} />);
    const status = screen.getByRole("status");
    const button = screen.getByRole("button", { name: "Save Submission" });
    expect(status).toBeEmptyDOMElement();

    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender(<SubmissionSaveButton isSaving isReadOnly={false} onSave={onSave} />);

    expect(screen.getByRole("button", { name: "Saving submission" })).toBe(button);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toBe(status);
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Saving your submission. Please wait.");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledTimes(1);

    view.rerender(<SubmissionSaveButton isSaving={false} isReadOnly={false} onSave={onSave} />);

    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).toHaveAccessibleName("Save Submission");
    expect(status).toBeEmptyDOMElement();
    fireEvent.click(button);
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("keeps a read-only submission locked without announcing a save", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SubmissionSaveButton isSaving={false} isReadOnly onSave={onSave} />);

    const button = screen.getByRole("button", { name: "Locked" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    fireEvent.click(button);
    expect(onSave).not.toHaveBeenCalled();
  });
});
