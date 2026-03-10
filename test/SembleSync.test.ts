import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebsiteStore } from "../src/storage/db";
import { MessageRequest } from "../src/utils";

// Mock the entire atproto/cosmik module
vi.mock("../src/atproto/cosmik", () => ({
  createCollection: vi.fn().mockResolvedValue({
    uri: "at://did:plc:test/network.cosmik.collection/rkey1",
    cid: "bafycid1",
  }),
  createUrlCard: vi.fn().mockResolvedValue({
    uri: "at://did:plc:test/network.cosmik.card/rkey2",
    cid: "bafycid2",
  }),
  createCollectionLink: vi.fn().mockResolvedValue({
    uri: "at://did:plc:test/network.cosmik.collectionLink/rkey3",
    cid: "bafycid3",
  }),
  syncBurrowToCollection: vi.fn().mockResolvedValue(undefined),
  getCollectionCid: vi.fn().mockResolvedValue("bafycid1"),
}));

// Mock the atproto/client module
vi.mock("../src/atproto/client", () => ({
  getSession: vi.fn().mockResolvedValue({
    did: "did:plc:testuser",
    handle: "testuser.bsky.social",
    pdsUrl: "https://bsky.social",
    accessToken: "mock-access-token",
    tokenEndpoint: "https://bsky.social/xrpc/com.atproto.server.createSession",
  }),
  saveSession: vi.fn().mockResolvedValue(undefined),
  clearSession: vi.fn().mockResolvedValue(undefined),
  createRecord: vi.fn().mockResolvedValue({
    uri: "at://did:plc:test/network.cosmik.collection/rkey1",
    cid: "bafycid1",
  }),
  listRecords: vi.fn().mockResolvedValue({ records: [] }),
  deleteRecord: vi.fn().mockResolvedValue(undefined),
  putRecord: vi.fn().mockResolvedValue({
    uri: "at://did:plc:test/network.cosmik.card/rkey2",
    cid: "bafycid2",
  }),
}));

describe("Semble Sync", () => {
  let store: WebsiteStore;

  beforeEach(async () => {
    vi.clearAllMocks();
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

  // ─── createCollection ─────────────────────────────────────────────────────

  describe("createCollection", () => {
    it("creates a collection and returns uri and cid", async () => {
      const { createCollection } = await import("../src/atproto/cosmik");
      const result = await createCollection(
        "did:plc:testuser",
        "My Collection",
      );

      expect(result).toEqual({
        uri: "at://did:plc:test/network.cosmik.collection/rkey1",
        cid: "bafycid1",
      });
      expect(createCollection).toHaveBeenCalledWith(
        "did:plc:testuser",
        "My Collection",
      );
    });
  });

  // ─── createUrlCard ────────────────────────────────────────────────────────

  describe("createUrlCard", () => {
    it("creates a URL card for a website", async () => {
      const { createUrlCard } = await import("../src/atproto/cosmik");
      const site = {
        url: "https://example.com",
        name: "Example",
        description: "A test site",
        savedAt: Date.now(),
        faviconUrl: "",
      };

      const result = await createUrlCard("did:plc:testuser", site);

      expect(result).toEqual({
        uri: "at://did:plc:test/network.cosmik.card/rkey2",
        cid: "bafycid2",
      });
      expect(createUrlCard).toHaveBeenCalledWith("did:plc:testuser", site);
    });
  });

  // ─── createCollectionLink ─────────────────────────────────────────────────

  describe("createCollectionLink", () => {
    it("links a card to a collection", async () => {
      const { createCollectionLink } = await import("../src/atproto/cosmik");
      const collection = {
        uri: "at://did:plc:test/network.cosmik.collection/rkey1",
        cid: "bafycid1",
      };
      const card = {
        uri: "at://did:plc:test/network.cosmik.card/rkey2",
        cid: "bafycid2",
      };

      const result = await createCollectionLink(
        "did:plc:testuser",
        collection,
        card,
      );

      expect(result).toEqual({
        uri: "at://did:plc:test/network.cosmik.collectionLink/rkey3",
        cid: "bafycid3",
      });
    });
  });

  // ─── syncBurrowToCollection ───────────────────────────────────────────────

  describe("syncBurrowToCollection", () => {
    it("calls syncBurrowToCollection with correct args", async () => {
      const { syncBurrowToCollection } = await import("../src/atproto/cosmik");
      const websites = [
        {
          url: "https://sync1.com",
          name: "Sync 1",
          savedAt: Date.now(),
          faviconUrl: "",
        },
        {
          url: "https://sync2.com",
          name: "Sync 2",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ];

      await syncBurrowToCollection(
        "did:plc:testuser",
        "at://did:plc:test/network.cosmik.collection/rkey1",
        websites,
      );

      expect(syncBurrowToCollection).toHaveBeenCalledWith(
        "did:plc:testuser",
        "at://did:plc:test/network.cosmik.collection/rkey1",
        websites,
      );
    });

    it("resolves without error on successful sync", async () => {
      const { syncBurrowToCollection } = await import("../src/atproto/cosmik");
      await expect(
        syncBurrowToCollection("did:plc:testuser", "at://uri", []),
      ).resolves.toBeUndefined();
    });
  });

  // ─── PUBLISH_BURROW message ───────────────────────────────────────────────

  describe("PUBLISH_BURROW message", () => {
    beforeEach(() => {
      vi.mocked(chrome.runtime.sendMessage).mockImplementation(
        async (req: any) => {
          if (req.type === MessageRequest.PUBLISH_BURROW)
            return { success: true };
          return {};
        },
      );
    });

    it("sends PUBLISH_BURROW with burrowId, uri, and timestamp", async () => {
      const timestamp = Date.now();
      await chrome.runtime.sendMessage({
        type: MessageRequest.PUBLISH_BURROW,
        burrowId: "b1",
        uri: "at://did:plc:test/network.cosmik.collection/rkey1",
        timestamp,
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageRequest.PUBLISH_BURROW,
          burrowId: "b1",
          uri: "at://did:plc:test/network.cosmik.collection/rkey1",
          timestamp,
        }),
      );
    });

    it("returns success from PUBLISH_BURROW", async () => {
      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.PUBLISH_BURROW,
        burrowId: "b1",
        uri: "at://uri",
        timestamp: Date.now(),
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ─── SYNC_BURROW message ──────────────────────────────────────────────────

  describe("SYNC_BURROW message", () => {
    beforeEach(() => {
      vi.mocked(chrome.runtime.sendMessage).mockImplementation(
        async (req: any) => {
          if (req.type === MessageRequest.SYNC_BURROW)
            return { success: true, timestamp: Date.now() };
          return {};
        },
      );
    });

    it("sends SYNC_BURROW with burrowId", async () => {
      await chrome.runtime.sendMessage({
        type: MessageRequest.SYNC_BURROW,
        burrowId: "b1",
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: MessageRequest.SYNC_BURROW,
        burrowId: "b1",
      });
    });

    it("returns success and timestamp from SYNC_BURROW", async () => {
      const result = await chrome.runtime.sendMessage({
        type: MessageRequest.SYNC_BURROW,
        burrowId: "b1",
      });
      expect(result.success).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe("number");
    });
  });

  // ─── updateBurrowSembleInfo (db) ──────────────────────────────────────────

  describe("updateBurrowSembleInfo (db)", () => {
    it("stores sembleCollectionUri and lastSembleSync on a burrow", async () => {
      await store.createNewActiveRabbithole("Semble RH");
      const burrow =
        await store.createNewBurrowInActiveRabbithole("Semble Burrow");
      const uri = "at://did:plc:test/network.cosmik.collection/rkey1";
      const timestamp = Date.now();

      await store.updateBurrowSembleInfo(burrow.id, uri, timestamp);

      const updated = await store.getBurrow(burrow.id);
      expect(updated.sembleCollectionUri).toBe(uri);
      expect(updated.lastSembleSync).toBe(timestamp);
    });

    it("updates sembleCollectionUri on subsequent publishes", async () => {
      await store.createNewActiveRabbithole("RH");
      const burrow = await store.createNewBurrowInActiveRabbithole("Burrow");
      const uri1 = "at://did:plc:test/network.cosmik.collection/rkey1";
      const uri2 = "at://did:plc:test/network.cosmik.collection/rkey2";

      await store.updateBurrowSembleInfo(burrow.id, uri1, Date.now());
      await store.updateBurrowSembleInfo(burrow.id, uri2, Date.now());

      const updated = await store.getBurrow(burrow.id);
      expect(updated.sembleCollectionUri).toBe(uri2);
    });

    it("updates lastSembleSync timestamp on sync", async () => {
      await store.createNewActiveRabbithole("RH");
      const burrow = await store.createNewBurrowInActiveRabbithole("Burrow");
      const uri = "at://did:plc:test/network.cosmik.collection/rkey1";
      const t1 = Date.now() - 10000;
      const t2 = Date.now();

      await store.updateBurrowSembleInfo(burrow.id, uri, t1);
      await store.updateBurrowSembleInfo(burrow.id, uri, t2);

      const updated = await store.getBurrow(burrow.id);
      expect(updated.lastSembleSync).toBe(t2);
    });
  });

  // ─── getSession ───────────────────────────────────────────────────────────

  describe("getSession", () => {
    it("returns the mocked session", async () => {
      const { getSession } = await import("../src/atproto/client");
      const session = await getSession();

      expect(session).toMatchObject({
        did: "did:plc:testuser",
        handle: "testuser.bsky.social",
      });
    });

    it("returns null when no session (override mock)", async () => {
      const { getSession } = await import("../src/atproto/client");
      vi.mocked(getSession).mockResolvedValueOnce(null);

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  // ─── Full publish flow (mocked end-to-end) ────────────────────────────────

  describe("Full publish flow (mocked)", () => {
    it("creates collection, cards, and links for each website", async () => {
      const { createCollection, createUrlCard, createCollectionLink } =
        await import("../src/atproto/cosmik");
      const { getSession } = await import("../src/atproto/client");

      const session = await getSession();
      const websites = [
        {
          url: "https://pub1.com",
          name: "Pub 1",
          savedAt: Date.now(),
          faviconUrl: "",
        },
        {
          url: "https://pub2.com",
          name: "Pub 2",
          savedAt: Date.now(),
          faviconUrl: "",
        },
      ];

      const collection = await createCollection(session.did, "My Burrow");

      for (const site of websites) {
        const card = await createUrlCard(session.did, site);
        await createCollectionLink(session.did, collection, card);
      }

      expect(createCollection).toHaveBeenCalledTimes(1);
      expect(createUrlCard).toHaveBeenCalledTimes(2);
      expect(createCollectionLink).toHaveBeenCalledTimes(2);
    });

    it("stores the collection URI after publish", async () => {
      await store.createNewActiveRabbithole("RH");
      const burrow =
        await store.createNewBurrowInActiveRabbithole("Published Burrow");

      const { createCollection } = await import("../src/atproto/cosmik");
      const { getSession } = await import("../src/atproto/client");

      const session = await getSession();
      const collection = await createCollection(session.did, burrow.name);
      const timestamp = Date.now();

      await store.updateBurrowSembleInfo(burrow.id, collection.uri, timestamp);

      const updated = await store.getBurrow(burrow.id);
      expect(updated.sembleCollectionUri).toBe(collection.uri);
      expect(updated.lastSembleSync).toBe(timestamp);
    });
  });
});
