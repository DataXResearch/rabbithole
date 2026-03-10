import { describe, it, expect } from "vitest";
import {
  extractOpenGraphData,
  isNewtabPage,
  extractFirstParagraph,
} from "../src/utils/browser";

describe("Browser Utilities", () => {
  describe("extractOpenGraphData", () => {
    it("extracts OG title, image, and description", () => {
      const html = `<html><head>
        <meta property="og:title" content="Test Title" />
        <meta property="og:image" content="https://example.com/image.png" />
        <meta property="og:description" content="Test Description" />
      </head></html>`;
      const result = extractOpenGraphData(html);
      expect(result.title).toBe("Test Title");
      expect(result.image).toBe("https://example.com/image.png");
      expect(result.description).toBe("Test Description");
    });

    it("falls back to standard meta description if OG is missing", () => {
      const html = `<html><head>
        <meta name="description" content="Standard Description" />
      </head></html>`;
      const result = extractOpenGraphData(html);
      expect(result.description).toBe("Standard Description");
    });

    it("returns null title and image when not present", () => {
      const html = `<html><head></head></html>`;
      const result = extractOpenGraphData(html);
      expect(result.title).toBeNull();
      expect(result.image).toBeNull();
    });

    it("falls back to generic placeholder when no description found", () => {
      const html = `<html><head></head><body></body></html>`;
      const result = extractOpenGraphData(html);
      expect(result.description).toBe("No description available");
    });

    it("uses title as description fallback when no description but title exists", () => {
      const html = `<html><head>
        <meta property="og:title" content="Only Title" />
      </head><body></body></html>`;
      const result = extractOpenGraphData(html);
      expect(result.description).toBe("Only Title");
    });
  });

  describe("extractFirstParagraph", () => {
    it("extracts text from first paragraph tag", () => {
      const html = `<html><body><p>Hello world paragraph</p></body></html>`;
      const result = extractFirstParagraph(html);
      expect(result).toBe("Hello world paragraph");
    });

    it("returns null for empty body", () => {
      const html = `<html><body></body></html>`;
      const result = extractFirstParagraph(html);
      expect(result).toBeNull();
    });

    it("truncates long paragraphs to 160 chars", () => {
      const longText = "a".repeat(200);
      const html = `<html><body><p>${longText}</p></body></html>`;
      const result = extractFirstParagraph(html);
      expect(result?.length).toBeLessThanOrEqual(160);
      expect(result).toMatch(/\.\.\.$/);
    });
  });

  describe("isNewtabPage", () => {
    it("identifies chrome new tab pages", () => {
      expect(isNewtabPage("chrome://newtab/")).toBe(true);
    });

    it("identifies edge new tab pages", () => {
      expect(isNewtabPage("edge://newtab/")).toBe(true);
    });

    it("identifies firefox about:newtab", () => {
      expect(isNewtabPage("about:newtab")).toBe(true);
    });

    it("identifies about:home", () => {
      expect(isNewtabPage("about:home")).toBe(true);
    });

    it("returns false for standard URLs", () => {
      expect(isNewtabPage("https://google.com")).toBe(false);
      expect(isNewtabPage("https://rabbithole.to")).toBe(false);
    });

    it("returns false for extension pages that are not newtab", () => {
      expect(isNewtabPage("chrome-extension://abc/popup.html")).toBe(false);
    });
  });
});
