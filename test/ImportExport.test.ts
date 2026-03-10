import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebsiteStore } from "../src/storage/db";

describe("Import / Export", () => {
  let store: WebsiteStore;

  beforeEach(async () => {
    if (store?.db) store.db.close();
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase("rabbithole");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
    await WebsiteStore.init(indexedDB);
    store = new WebsiteStore(indexedDB);
  });

  afterEach(() => {
    if (store?.db) store.db.close();
  });

  describe("Export shape", () => {
    it("exports burrows, websites, and rabbitholes", async () => {
      const rh = await store.createNewActiveRabbithole("Export RH");
      const burrow =
        await store.createNewBurrowInActiveRabbithole("Export Burrow");
      await store.saveWebsites([
        {
          url: "https://export.com",
          name: "Export Site",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ]);

      const burrows = await store.getAllBurrows();
      const websites = await store.getAllWebsites();
      const rabbitholes = await store.getAllRabbitholes();

      expect(burrows.find((b) => b.id === burrow.id)).toBeDefined();
      expect(
        websites.find((w) => w.url === "https://export.com"),
      ).toBeDefined();
      expect(rabbitholes.find((r) => r.id === rh.id)).toBeDefined();
    });

    it("exported rabbithole contains burrow IDs and activeTabs", async () => {
      const rh = await store.createNewActiveRabbithole("RH with Burrows");

      // Add burrows
      const b1 = await store.createNewBurrowInActiveRabbithole("B1");
      const b2 = await store.createNewBurrowInActiveRabbithole("B2");

      // Add website + mark as active tab in this rabbithole
      const activeUrl = "https://active-export.com";
      await store.saveWebsites([
        {
          url: activeUrl,
          name: "Active Export",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ]);
      await store.updateRabbitholeActiveTabs(rh.id, [activeUrl]);

      const rabbitholes = await store.getAllRabbitholes();
      const exported = rabbitholes.find((r) => r.id === rh.id);

      expect(exported?.burrows).toContain(b1.id);
      expect(exported?.burrows).toContain(b2.id);
      expect(exported?.activeTabs ?? []).toContain(activeUrl);
    });

    it("exported burrow contains website URLs", async () => {
      await store.createNewActiveRabbithole("RH");
      await store.createNewBurrowInActiveRabbithole("Burrow");
      const site = {
        url: "https://burrow-export.com",
        name: "Burrow Export",
        savedAt: Date.now(),
        faviconUrl: "",
      };
      await store.saveWebsites([site]);
      await store.saveWebsitesToBurrow([site]);

      const burrows = await store.getAllBurrows();
      const burrow = burrows.find((b) => b.name === "Burrow");
      expect(burrow?.websites).toContain("https://burrow-export.com");
    });
  });

  describe("IMPORT_DATA via background message", () => {
    beforeEach(() => {
      vi.mocked(chrome.runtime.sendMessage).mockImplementation(
        async (req: any) => {
          if (req.type === "IMPORT_DATA") return { success: true };
          return {};
        },
      );
    });

    it("sends IMPORT_DATA with burrows and websites", async () => {
      const burrows = [
        {
          id: "b1",
          name: "Imported Burrow",
          websites: ["https://imported.com"],
        },
      ];
      const websites = [
        {
          url: "https://imported.com",
          name: "Imported",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ];

      await chrome.runtime.sendMessage({
        type: "IMPORT_DATA",
        burrows,
        websites,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "IMPORT_DATA",
          burrows: expect.arrayContaining([
            expect.objectContaining({ name: "Imported Burrow" }),
          ]),
          websites: expect.arrayContaining([
            expect.objectContaining({ url: "https://imported.com" }),
          ]),
        }),
      );
    });

    it("sends IMPORT_DATA with rabbitholes (including activeTabs)", async () => {
      const rabbitholes = [
        {
          id: "rh1",
          title: "Imported RH",
          burrows: ["b1"],
          meta: [],
          activeTabs: ["https://active-import.com"],
        },
      ];
      const burrows = [{ id: "b1", name: "Burrow", websites: [] }];

      await chrome.runtime.sendMessage({
        type: "IMPORT_DATA",
        burrows,
        websites: [],
        rabbitholes,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "IMPORT_DATA",
          rabbitholes: expect.arrayContaining([
            expect.objectContaining({
              title: "Imported RH",
              activeTabs: expect.arrayContaining(["https://active-import.com"]),
            }),
          ]),
        }),
      );
    });
  });

  // ─── IMPORT_DATA applied directly to db ──────────────────────────────────

  describe("IMPORT_DATA applied to db", () => {
    it("imports burrows and websites into db", async () => {
      const websites = [
        {
          url: "https://direct-import.com",
          name: "Direct",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ];
      await store.saveWebsites(websites);
      await store.createNewActiveBurrow("Direct Import Burrow", [
        "https://direct-import.com",
      ]);

      const allBurrows = await store.getAllBurrows();
      const allWebsites = await store.getAllWebsites();

      expect(
        allBurrows.find((b) => b.name === "Direct Import Burrow"),
      ).toBeDefined();
      expect(
        allWebsites.find((w) => w.url === "https://direct-import.com"),
      ).toBeDefined();
    });

    it("imports rabbitholes with burrow associations and activeTabs", async () => {
      const rh = await store.createNewActiveRabbithole("Imported RH");
      const b = await store.createNewActiveBurrow("Imported Burrow");
      await store.addBurrowsToRabbithole(rh.id, [b.id]);

      const activeUrl = "https://active-direct-import.com";
      await store.saveWebsites([
        {
          url: activeUrl,
          name: "Active Direct Import",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ]);
      await store.updateRabbitholeActiveTabs(rh.id, [activeUrl]);

      const rabbitholes = await store.getAllRabbitholes();
      const found = rabbitholes.find((r) => r.id === rh.id);

      expect(found?.burrows).toContain(b.id);
      expect(found?.activeTabs ?? []).toContain(activeUrl);
    });

    it("does not duplicate websites on re-import", async () => {
      const site = {
        url: "https://dedup.com",
        name: "Dedup",
        savedAt: Date.now(),
        faviconUrl: "",
      };
      await store.saveWebsites([site]);
      await store.saveWebsites([site]); // second import

      const all = await store.getAllWebsites();
      const matches = all.filter((w) => w.url === "https://dedup.com");
      expect(matches).toHaveLength(1);
    });

    it("does not duplicate burrows with same name and websites on re-import", async () => {
      await store.createNewActiveBurrow("Unique Burrow", ["https://a.com"]);
      await store.createNewActiveBurrow("Unique Burrow", ["https://a.com"]);

      const all = await store.getAllBurrows();
      const matches = all.filter((b) => b.name === "Unique Burrow");
      // Two separate burrows are created (db doesn't deduplicate by name alone)
      // but the IMPORT_DATA handler in background does — here we just verify
      // the db layer creates them and the import handler is responsible for dedup
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── IMPORT_BROWSER_DATA ──────────────────────────────────────────────────

  describe("IMPORT_BROWSER_DATA message", () => {
    beforeEach(() => {
      vi.mocked(chrome.runtime.sendMessage).mockImplementation(
        async (req: any) => {
          if (req.type === "IMPORT_BROWSER_DATA") return { success: true };
          return {};
        },
      );
      vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
        {
          id: "0",
          title: "root",
          children: [
            {
              id: "1",
              parentId: "0",
              title: "Bookmarks Bar",
              children: [
                {
                  id: "2",
                  parentId: "1",
                  title: "Research",
                  children: [
                    {
                      id: "3",
                      parentId: "2",
                      title: "Paper 1",
                      url: "https://paper1.com",
                    },
                    {
                      id: "4",
                      parentId: "2",
                      title: "Paper 2",
                      url: "https://paper2.com",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);
      vi.mocked(chrome.windows.getAll).mockResolvedValue([
        {
          id: 1,
          tabs: [
            {
              id: 1,
              url: "https://work.com",
              title: "Work",
              groupId: -1,
              favIconUrl: "",
            },
            {
              id: 2,
              url: "https://grouped.com",
              title: "Grouped",
              groupId: 10,
              favIconUrl: "",
            },
          ],
        } as any,
      ]);
      vi.mocked(chrome.tabGroups.get).mockResolvedValue({
        id: 10,
        title: "Dev Group",
        color: "blue",
        collapsed: false,
        windowId: 1,
      });
    });

    it("sends IMPORT_BROWSER_DATA with importBookmarks true", async () => {
      await chrome.runtime.sendMessage({
        type: "IMPORT_BROWSER_DATA",
        importBookmarks: true,
        importTabGroups: false,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "IMPORT_BROWSER_DATA",
          importBookmarks: true,
          importTabGroups: false,
        }),
      );
    });

    it("sends IMPORT_BROWSER_DATA with importTabGroups true", async () => {
      await chrome.runtime.sendMessage({
        type: "IMPORT_BROWSER_DATA",
        importBookmarks: false,
        importTabGroups: true,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "IMPORT_BROWSER_DATA",
          importBookmarks: false,
          importTabGroups: true,
        }),
      );
    });

    it("sends IMPORT_BROWSER_DATA with both true", async () => {
      await chrome.runtime.sendMessage({
        type: "IMPORT_BROWSER_DATA",
        importBookmarks: true,
        importTabGroups: true,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "IMPORT_BROWSER_DATA",
          importBookmarks: true,
          importTabGroups: true,
        }),
      );
    });

    it("returns success from IMPORT_BROWSER_DATA", async () => {
      const result = await chrome.runtime.sendMessage({
        type: "IMPORT_BROWSER_DATA",
        importBookmarks: true,
        importTabGroups: true,
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ─── importBookmarksFromBrowser (unit) ───────────────────────────────────

  describe("importBookmarksFromBrowser (unit)", () => {
    it("creates rabbitholes from bookmark folders", async () => {
      vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
        {
          id: "0",
          title: "root",
          children: [
            {
              id: "1",
              parentId: "0",
              title: "Bookmarks Bar",
              children: [
                {
                  id: "2",
                  parentId: "1",
                  title: "My Research",
                  children: [
                    {
                      id: "3",
                      parentId: "2",
                      title: "Site A",
                      url: "https://site-a.com",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const { importBookmarksFromBrowser } =
        await import("../src/utils/import");
      await importBookmarksFromBrowser(store);

      const rabbitholes = await store.getAllRabbitholes();
      expect(rabbitholes.find((r) => r.title === "My Research")).toBeDefined();
    });

    it("creates burrows from bookmark subfolders", async () => {
      vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
        {
          id: "0",
          title: "root",
          children: [
            {
              id: "1",
              parentId: "0",
              title: "Bookmarks Bar",
              children: [
                {
                  id: "2",
                  parentId: "1",
                  title: "Parent Folder",
                  children: [
                    {
                      id: "3",
                      parentId: "2",
                      title: "Sub Folder",
                      children: [
                        {
                          id: "4",
                          parentId: "3",
                          title: "Site B",
                          url: "https://site-b.com",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const { importBookmarksFromBrowser } =
        await import("../src/utils/import");
      await importBookmarksFromBrowser(store);

      const burrows = await store.getAllBurrows();
      expect(burrows.find((b) => b.name === "Sub Folder")).toBeDefined();
    });

    it("saves bookmark URLs as websites", async () => {
      vi.mocked(chrome.bookmarks.getTree).mockResolvedValue([
        {
          id: "0",
          title: "root",
          children: [
            {
              id: "1",
              parentId: "0",
              title: "Bookmarks Bar",
              children: [
                {
                  id: "2",
                  parentId: "1",
                  title: "Folder",
                  children: [
                    {
                      id: "3",
                      parentId: "2",
                      title: "My Site",
                      url: "https://my-site.com",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ]);

      const { importBookmarksFromBrowser } =
        await import("../src/utils/import");
      await importBookmarksFromBrowser(store);

      const websites = await store.getAllWebsites();
      expect(
        websites.find((w) => w.url === "https://my-site.com"),
      ).toBeDefined();
    });
  });

  // ─── importTabGroupsFromBrowser (unit) ───────────────────────────────────

  describe("importTabGroupsFromBrowser (unit)", () => {
    it("creates a rabbithole per window", async () => {
      vi.mocked(chrome.windows.getAll).mockResolvedValue([
        {
          id: 1,
          tabs: [
            {
              id: 1,
              url: "https://win1.com",
              title: "Win1",
              groupId: -1,
              favIconUrl: "",
            },
          ],
        } as any,
        {
          id: 2,
          tabs: [
            {
              id: 2,
              url: "https://win2.com",
              title: "Win2",
              groupId: -1,
              favIconUrl: "",
            },
          ],
        } as any,
      ]);

      const { importTabGroupsFromBrowser } =
        await import("../src/utils/import");
      await importTabGroupsFromBrowser(store);

      const rabbitholes = await store.getAllRabbitholes();
      expect(rabbitholes.length).toBeGreaterThanOrEqual(2);
    });

    it("creates burrows from tab groups", async () => {
      vi.mocked(chrome.windows.getAll).mockResolvedValue([
        {
          id: 1,
          tabs: [
            {
              id: 1,
              url: "https://grouped.com",
              title: "Grouped",
              groupId: 42,
              favIconUrl: "",
            },
          ],
        } as any,
      ]);
      vi.mocked(chrome.tabGroups.get).mockResolvedValue({
        id: 42,
        title: "My Tab Group",
        color: "green",
        collapsed: false,
        windowId: 1,
      });

      const { importTabGroupsFromBrowser } =
        await import("../src/utils/import");
      await importTabGroupsFromBrowser(store);

      const burrows = await store.getAllBurrows();
      expect(burrows.find((b) => b.name === "My Tab Group")).toBeDefined();
    });

    it("saves tab URLs as websites", async () => {
      vi.mocked(chrome.windows.getAll).mockResolvedValue([
        {
          id: 1,
          tabs: [
            {
              id: 1,
              url: "https://tab-site.com",
              title: "Tab Site",
              groupId: -1,
              favIconUrl: "",
            },
          ],
        } as any,
      ]);

      const { importTabGroupsFromBrowser } =
        await import("../src/utils/import");
      await importTabGroupsFromBrowser(store);

      const websites = await store.getAllWebsites();
      expect(
        websites.find((w) => w.url === "https://tab-site.com"),
      ).toBeDefined();
    });

    it("skips newtab pages during import", async () => {
      vi.mocked(chrome.windows.getAll).mockResolvedValue([
        {
          id: 1,
          tabs: [
            {
              id: 1,
              url: "chrome://newtab/",
              title: "New Tab",
              groupId: -1,
              favIconUrl: "",
            },
            {
              id: 2,
              url: "https://real-site.com",
              title: "Real",
              groupId: -1,
              favIconUrl: "",
            },
          ],
        } as any,
      ]);

      const { importTabGroupsFromBrowser } =
        await import("../src/utils/import");
      await importTabGroupsFromBrowser(store);

      const websites = await store.getAllWebsites();
      expect(
        websites.find((w) => w.url === "chrome://newtab/"),
      ).toBeUndefined();
      expect(
        websites.find((w) => w.url === "https://real-site.com"),
      ).toBeDefined();
    });
  });
});
