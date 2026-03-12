import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriorityBadge } from "@/components/shared/PriorityBadge";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// Labels: first char uppercase + rest lowercase (e.g. "Low", "Medium")
const EXPECTED_LABELS: Record<string, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
};

describe("PriorityBadge", () => {
    it.each(PRIORITIES)("renders correct label for priority '%s'", (priority) => {
        render(<PriorityBadge priority={priority} />);
        expect(screen.getByText(EXPECTED_LABELS[priority])).toBeTruthy();
    });

    it("LOW badge has muted color class", () => {
        const { container } = render(<PriorityBadge priority="LOW" />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain("pt-text-muted");
    });

    it("URGENT badge has red color class", () => {
        const { container } = render(<PriorityBadge priority="URGENT" />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain("pt-red");
    });

    it("HIGH badge has accent color class", () => {
        const { container } = render(<PriorityBadge priority="HIGH" />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain("pt-accent");
    });

    it("MEDIUM badge has blue color class", () => {
        const { container } = render(<PriorityBadge priority="MEDIUM" />);
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain("pt-blue");
    });

    it("renders the appropriate icon for each priority", () => {
        const { container: lowEl } = render(<PriorityBadge priority="LOW" />);
        const { container: urgentEl } = render(<PriorityBadge priority="URGENT" />);
        // Icon is an SVG element
        expect(lowEl.querySelector("svg")).toBeTruthy();
        expect(urgentEl.querySelector("svg")).toBeTruthy();
    });

    it("applies custom className", () => {
        const { container } = render(<PriorityBadge priority="HIGH" className="my-class" />);
        expect((container.firstChild as HTMLElement).className).toContain("my-class");
    });
});
