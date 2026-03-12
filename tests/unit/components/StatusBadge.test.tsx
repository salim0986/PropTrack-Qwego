import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/StatusBadge";

// All ticket status values from schema
const STATUSES = [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "BLOCKED",
    "DONE",
    "REOPENED",
    "CLOSED_DUPLICATE",
] as const;

// Human-readable labels produced by status.replace("_", " ")
// Note: replace is non-global so only the first underscore is replaced
const EXPECTED_LABELS: Record<string, string> = {
    OPEN: "OPEN",
    ASSIGNED: "ASSIGNED",
    IN_PROGRESS: "IN PROGRESS",
    BLOCKED: "BLOCKED",
    DONE: "DONE",
    REOPENED: "REOPENED",
    CLOSED_DUPLICATE: "CLOSED DUPLICATE",
};

describe("StatusBadge", () => {
    it.each(STATUSES)("renders correct label for status '%s'", (status) => {
        render(<StatusBadge status={status} />);
        expect(screen.getByText(EXPECTED_LABELS[status])).toBeTruthy();
    });

    it("renders the status dot by default", () => {
        const { container } = render(<StatusBadge status="OPEN" />);
        // dot is a <span> inside the badge div
        const dot = container.querySelector("span");
        expect(dot).toBeTruthy();
    });

    it("hides dot when showDot=false", () => {
        const { container } = render(<StatusBadge status="OPEN" showDot={false} />);
        const dot = container.querySelector("span");
        expect(dot).toBeNull();
    });

    it("applies custom className", () => {
        const { container } = render(
            <StatusBadge status="OPEN" className="custom-class" />
        );
        expect((container.firstChild as HTMLElement).className).toContain("custom-class");
    });

    it("OPEN badge has blue color class", () => {
        const { container } = render(<StatusBadge status="OPEN" />);
        expect((container.firstChild as HTMLElement).className).toContain("pt-blue");
    });

    it("BLOCKED badge has red color class", () => {
        const { container } = render(<StatusBadge status="BLOCKED" />);
        expect((container.firstChild as HTMLElement).className).toContain("pt-red");
    });

    it("DONE badge has green color class", () => {
        const { container } = render(<StatusBadge status="DONE" />);
        expect((container.firstChild as HTMLElement).className).toContain("pt-green");
    });
});
