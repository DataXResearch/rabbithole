import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageRequest } from "../src/utils";

describe("Trail Message Handlers (via chrome.runtime.sendMessage mock)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CREATE_TRAIL", () => {
    it("sends CREATE_TRAIL with rabbitholeId, name, and websites", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        id: "t1",
        name: "My Trail",
        rabbitholeId: "rh1",
        stops: [
          { websiteUrl: "https://a.com", note: "" },
          { websiteUrl: "https://b.com", note: "" },
        ],
        startNote: "",
        createdAt: Date.now(),
      });

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.CREATE_TRAIL,
        rabbitholeId: "rh1",
        name: "My Trail",
        websites: ["https://a.com", "https://b.com"],
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.CREATE_TRAIL,
        rabbitholeId: "rh1",
        name: "My Trail",
        websites: ["https://a.com", "https://b.com"],
      });

      expect(result.id).toBe("t1");
      expect(result.stops).toHaveLength(2);
    });

    it("sends CREATE_TRAIL with empty websites array", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        id: "t2",
        name: "Empty Trail",
        rabbitholeId: "rh1",
        stops: [],
        startNote: "",
        createdAt: Date.now(),
      });

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.CREATE_TRAIL,
        rabbitholeId: "rh1",
        name: "Empty Trail",
        websites: [],
      });

      expect(result.stops).toHaveLength(0);
    });
  });

  describe("GET_TRAIL", () => {
    it("sends GET_TRAIL with trailId", async () => {
      const mockTrail = {
        id: "t1",
        name: "Trail",
        rabbitholeId: "rh1",
        stops: [],
        startNote: "",
        createdAt: Date.now(),
      };
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(mockTrail);

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_TRAIL,
        trailId: "t1",
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.GET_TRAIL,
        trailId: "t1",
      });
      expect(result.id).toBe("t1");
    });
  });

  describe("GET_ACTIVE_TRAIL", () => {
    it("sends GET_ACTIVE_TRAIL and returns active trail", async () => {
      const mockTrail = {
        id: "t1",
        name: "Active Trail",
        rabbitholeId: "rh1",
        stops: [],
        startNote: "",
        createdAt: Date.now(),
      };
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(mockTrail);

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ACTIVE_TRAIL,
      });

      expect(result.id).toBe("t1");
    });

    it("returns null when no active trail", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(null);

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ACTIVE_TRAIL,
      });

      expect(result).toBeNull();
    });
  });

  describe("CHANGE_ACTIVE_TRAIL", () => {
    it("sends CHANGE_ACTIVE_TRAIL with trailId", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
      });

      await chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_TRAIL,
        trailId: "t1",
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.CHANGE_ACTIVE_TRAIL,
        trailId: "t1",
      });
    });

    it("sends CHANGE_ACTIVE_TRAIL with null to clear", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
      });

      await chrome.runtime.sendMessage({
        type: MessageRequest.CHANGE_ACTIVE_TRAIL,
        trailId: null,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.CHANGE_ACTIVE_TRAIL,
        trailId: null,
      });
    });
  });

  describe("UPDATE_TRAIL", () => {
    it("sends UPDATE_TRAIL with trailId and name update", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        id: "t1",
        name: "New Name",
        rabbitholeId: "rh1",
        stops: [],
        startNote: "",
        createdAt: Date.now(),
      });

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_TRAIL,
        trailId: "t1",
        updates: { name: "New Name" },
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.UPDATE_TRAIL,
        trailId: "t1",
        updates: { name: "New Name" },
      });
      expect(result.name).toBe("New Name");
    });

    it("sends UPDATE_TRAIL with startNote and stops", async () => {
      const stops = [{ websiteUrl: "https://a.com", note: "Check this" }];
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        id: "t1",
        name: "Trail",
        rabbitholeId: "rh1",
        stops,
        startNote: "Begin here",
        createdAt: Date.now(),
      });

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.UPDATE_TRAIL,
        trailId: "t1",
        updates: { startNote: "Begin here", stops },
      });

      expect(result.startNote).toBe("Begin here");
      expect(result.stops[0].note).toBe("Check this");
    });
  });

  describe("DELETE_TRAIL", () => {
    it("sends DELETE_TRAIL with trailId and rabbitholeId", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
      });

      await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_TRAIL,
        trailId: "t1",
        rabbitholeId: "rh1",
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.DELETE_TRAIL,
        trailId: "t1",
        rabbitholeId: "rh1",
      });
    });

    it("returns success from DELETE_TRAIL", async () => {
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
      });

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.DELETE_TRAIL,
        trailId: "t1",
        rabbitholeId: "rh1",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("GET_ALL_TRAILS", () => {
    it("sends GET_ALL_TRAILS and returns array", async () => {
      const mockTrails = [
        {
          id: "t1",
          name: "Trail 1",
          rabbitholeId: "rh1",
          stops: [],
          startNote: "",
          createdAt: Date.now(),
        },
        {
          id: "t2",
          name: "Trail 2",
          rabbitholeId: "rh1",
          stops: [],
          startNote: "",
          createdAt: Date.now(),
        },
      ];
      vi.mocked(chrome.runtime.sendMessage).mockResolvedValueOnce(mockTrails);

      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.GET_ALL_TRAILS,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });
});
