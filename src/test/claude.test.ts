import { describe, expect, it } from "vitest";
import { extractClaudeText } from "@/lib/claude";

describe("Claude Edge Function response", () => {
  it("extracts a verified text response", () => {
    expect(extractClaudeText({ text: "  Focus on the next verified action.  " }))
      .toBe("Focus on the next verified action.");
  });

  it("rejects missing or malformed response text", () => {
    expect(extractClaudeText({ error: "Needs setup" })).toBe("");
    expect(extractClaudeText(null)).toBe("");
  });
});
