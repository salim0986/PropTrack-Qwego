import { describe, it, expect } from "vitest";
import { isAfterHours } from "@/lib/after-hours";

/**
 * Unit tests for isAfterHours()
 * Business hours: Mon-Fri, 08:00 - 17:59 (i.e. [8, 18))
 * Rule: currentHour < 8 || currentHour >= 18 → after hours
 */

function makeDate(day: number, hour: number, minute = 0) {
    // day: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const d = new Date("2025-01-06T00:00:00"); // Monday base
    d.setDate(d.getDate() + ((day - d.getDay() + 7) % 7));
    d.setHours(hour, minute, 0, 0);
    return d;
}

describe("isAfterHours()", () => {
    it("returns true for 2:00 AM on a weekday (early morning)", () => {
        expect(isAfterHours(makeDate(1, 2))).toBe(true);
    });

    it("returns true for 7:59 AM on a weekday (before business hours)", () => {
        expect(isAfterHours(makeDate(1, 7, 59))).toBe(true);
    });

    it("returns false for 8:00 AM on a weekday (business hours start)", () => {
        expect(isAfterHours(makeDate(1, 8, 0))).toBe(false);
    });

    it("returns false for noon on a weekday (middle of business hours)", () => {
        expect(isAfterHours(makeDate(2, 12))).toBe(false);
    });

    it("returns false for 17:59 on a weekday (last minute of business hours)", () => {
        expect(isAfterHours(makeDate(3, 17, 59))).toBe(false);
    });

    it("returns true for 18:00 on a weekday (after hours starts)", () => {
        // Spec: currentHour >= 18 is after hours
        expect(isAfterHours(makeDate(3, 18, 0))).toBe(true);
    });

    it("returns true for 23:00 on a weekday (late night)", () => {
        expect(isAfterHours(makeDate(4, 23))).toBe(true);
    });

    it("returns true for Saturday 10:00 AM (weekend regardless of time)", () => {
        expect(isAfterHours(makeDate(6, 10))).toBe(true);
    });

    it("returns true for Sunday 10:00 AM (weekend)", () => {
        expect(isAfterHours(makeDate(0, 10))).toBe(true);
    });

    it("returns true for Saturday midnight", () => {
        expect(isAfterHours(makeDate(6, 0))).toBe(true);
    });
});
