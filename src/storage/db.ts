import { v4 as uuid } from "uuid";
import { logger } from "../utils";
import type {
  Settings,
  Website,
  Burrow,
  Rabbithole,
  User,
} from "../utils/types";

const version = 8;

export class WebsiteStore {
  factory: IDBFactory;
  db: IDBDatabase = null;

  constructor(factory: IDBFactory) {
    this.factory = factory;
  }

  private async getDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (this.db !== null) {
        resolve(this.db);
        return;
      }
      let request = this.factory.open("rabbithole", version);
      request.onsuccess = () => {
        const db = request.result;
        db.onerror = (event) => {
          logger.error("Database error", (event.target as any).error);
        };
        this.db = db;
        resolve(db);
      };
      request.onerror = (event) => {
        const err = (event.target as any).error;
        logger.error("Failed to open database", err);
        reject(new Error(err));
      };
    });
  }

  static async init(factory: IDBFactory): Promise<void> {
    await new Promise((resolve, reject) => {
      if (factory === undefined) {
        logger.error("indexedDB not supported");
        reject(new Error("indexedDB not supported"));
      } else {
        let request = factory.open("rabbithole", version);
        request.onerror = (e) => {
          logger.error("IndexedDB init error", (e.target as any).error);
          reject(new Error("Insufficient permissions"));
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (event.oldVersion < 1) {
            const objectStore = db.createObjectStore("savedWebsites", {
              keyPath: "url",
            });
            objectStore.createIndex("name", "name", { unique: false });
            objectStore.createIndex("url", "url", { unique: true });
            objectStore.transaction.oncomplete = () => {};
          }
          if (event.oldVersion < 2) {
            db.createObjectStore("user", { keyPath: "id" });
          }
          if (event.oldVersion < 3) {
            const objectStore = db.createObjectStore("projects", {
              keyPath: "id",
            });
            objectStore.createIndex("name", "name", { unique: true });
          }

          if (event.oldVersion < 6) {
            const txn = (event.target as IDBOpenDBRequest).transaction;

            if (txn.objectStoreNames.contains("projects")) {
              const store = txn.objectStore("projects");
              store.name = "burrows";
              const cursorRequest = store.openCursor();

              cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result;
                if (!cursor) {
                  return;
                }

                const value = cursor.value;
                if (
                  value &&
                  "savedWebsites" in value &&
                  !("websites" in value)
                ) {
                  value.websites = value.savedWebsites;
                  delete value.savedWebsites;
                  cursor.update(value);
                }

                cursor.continue();
              };
            }

            if (txn.objectStoreNames.contains("savedWebsites")) {
              const store = txn.objectStore("savedWebsites");
              store.name = "websites";
            }

            db.createObjectStore("rabbitholes", { keyPath: "id" });
          }

          if (event.oldVersion < 7) {
            const txn = (event.target as IDBOpenDBRequest).transaction;

            if (txn.objectStoreNames.contains("rabbitholes")) {
              const rhStore = txn.objectStore("rabbitholes");
              if (!rhStore.indexNames.contains("burrows")) {
                rhStore.createIndex("burrows", "burrows", {
                  unique: false,
                  multiEntry: true,
                });
              }
            }
          }

          if (event.oldVersion < 8) {
            const txn = (event.target as IDBOpenDBRequest).transaction;
            if (txn.objectStoreNames.contains("burrows")) {
              const store = txn.objectStore("burrows");
              if (store.indexNames.contains("name")) {
                store.deleteIndex("name");
                store.createIndex("name", "name", { unique: false });
              }
            }
          }

          resolve(db);
        };

        request.onsuccess = async () => {
          const db = request.result;

          const store = new WebsiteStore(factory);
          let user = await store.getUser();

          if (user === undefined) {
            const newUser: User = {
              id: uuid(),
              settings: {
                show: true,
                alignment: "right",
                darkMode: false,
                hasSeenOnboarding: false,
              },
              currentBurrow: null,
              currentRabbithole: null,
            };
            const userRequest = db
              .transaction(["user"], "readwrite")
              .objectStore("user")
              .add(newUser);
            userRequest.onsuccess = async () => {
              const rabbithole =
                await store.createNewActiveRabbithole("Homebase");
              const burrow =
                await store.createNewBurrowInActiveRabbithole("Bookmarks");
              await store.createNewBurrowInActiveRabbithole("Reminders");
              await store.changeActiveRabbithole(rabbithole.id);
              await store.changeActiveBurrow(burrow.id);
            };
            return;
          }

          if (
            !("currentRabbithole" in user) ||
            user.currentRabbithole === null ||
            user.currentRabbithole === undefined
          ) {
            const rabbithole =
              await store.createNewActiveRabbithole("Homebase");
            await store.changeActiveRabbithole(rabbithole.id);
          }

          if (
            !("currentBurrow" in user) ||
            user.currentBurrow === null ||
            user.currentBurrow === undefined
          ) {
            await store.createNewBurrowInActiveRabbithole("Bookmarks");
            await store.createNewBurrowInActiveRabbithole("Reminders");
          }
        };
      }
    });
  }

  async fetchRabbitholesForBurrow(burrowId: string): Promise<Rabbithole[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["rabbitholes"], "readonly");
      const store = tx.objectStore("rabbitholes");

      if (!store.indexNames.contains("burrows")) {
        reject(new Error("Missing index: rabbitholes.burrows"));
        return;
      }

      const idx = store.index("burrows");
      const req = idx.getAll(burrowId);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () =>
        reject(new Error("Failed to fetch rabbitholes for burrow"));
    });
  }

  async deleteBurrowFromRabbithole(
    rabbitholeId: string,
    burrowId: string,
  ): Promise<Rabbithole> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["rabbitholes"], "readwrite");
      const store = tx.objectStore("rabbitholes");
      const getRequest = store.get(rabbitholeId);

      getRequest.onsuccess = () => {
        const rabbithole = getRequest.result as Rabbithole;
        if (!rabbithole) {
          reject(new Error("Rabbithole not found"));
          return;
        }

        rabbithole.burrows = (rabbithole.burrows || []).filter(
          (id) => id !== burrowId,
        );

        const putRequest = store.put(rabbithole);
        putRequest.onsuccess = () => resolve(rabbithole);
        putRequest.onerror = (event) =>
          reject(new Error((event.target as IDBRequest).error.message));
      };

      getRequest.onerror = (event) =>
        reject(new Error((event.target as IDBRequest).error.message));
    });
  }

  async getAllRabbitholes(): Promise<Rabbithole[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["rabbitholes"])
        .objectStore("rabbitholes")
        .getAll();

      request.onsuccess = (_) => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve rabbitholes"));
      };
    });
  }

  async getActiveRabbithole(): Promise<Rabbithole | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = (_) => {
        const [user] = userRequest.result;

        if (!user.currentRabbithole) {
          resolve(null);
          return;
        }

        const rabbitholeRequest = db
          .transaction(["rabbitholes"], "readwrite")
          .objectStore("rabbitholes")
          .get(user.currentRabbithole);

        rabbitholeRequest.onsuccess = () => {
          resolve(rabbitholeRequest.result);
        };

        rabbitholeRequest.onerror = (event) => {
          reject(new Error("Failed to retrieve rabbithole"));
        };
      };

      userRequest.onerror = (event) => {
        reject(new Error("Failed to retrieve user"));
      };
    });
  }

  async changeActiveRabbithole(rabbitholeId: string | null): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = async () => {
        const [user] = userRequest.result;
        user.currentRabbithole = rabbitholeId;

        const userPutRequest = db
          .transaction(["user"], "readwrite")
          .objectStore("user")
          .put(user);

        userPutRequest.onsuccess = () => {
          resolve();
        };

        userPutRequest.onerror = (event) => {
          reject(new Error("Failed to update user"));
        };
      };

      userRequest.onerror = (event) => {
        reject(new Error("Failed to retrieve user"));
      };
    });
  }

  async createNewActiveRabbithole(
    title: string,
    description?: string,
  ): Promise<Rabbithole> {
    const db = await this.getDb();
    const user = await this.getUser();

    const rabbithole: Rabbithole = {
      id: uuid(),
      createdAt: Date.now(),
      burrows: [],
      title,
      description,
      meta: [],
    };

    return new Promise((resolve, reject) => {
      const rabbitholeReq = db
        .transaction(["rabbitholes"], "readwrite")
        .objectStore("rabbitholes")
        .put(rabbithole);

      rabbitholeReq.onsuccess = () => {
        const userReq = db
          .transaction(["user"], "readwrite")
          .objectStore("user")
          .put({
            ...user,
            currentRabbithole: rabbithole.id,
          });

        userReq.onsuccess = () => {
          resolve(rabbithole);
        };

        userReq.onerror = (event) => {
          reject(new Error((event.target as IDBRequest).error.message));
        };
      };

      rabbitholeReq.onerror = (event) => {
        reject(new Error("Failed to create rabbithole"));
      };
    });
  }

  async updateRabbithole(
    rabbitholeId: string,
    title?: string,
    description?: string,
  ): Promise<Rabbithole> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["rabbitholes"], "readwrite");
      const store = tx.objectStore("rabbitholes");
      const getRequest = store.get(rabbitholeId);

      getRequest.onsuccess = () => {
        const rabbithole = getRequest.result;
        if (!rabbithole) {
          reject(new Error("Rabbithole not found"));
          return;
        }

        if (title !== undefined) {
          rabbithole.title = title;
        }
        if (description !== undefined) {
          rabbithole.description = description;
        }

        const putRequest = store.put(rabbithole);

        putRequest.onsuccess = () => {
          resolve(rabbithole);
        };

        putRequest.onerror = (event) => {
          reject(new Error((event.target as IDBRequest).error.message));
        };
      };

      getRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async deleteRabbithole(rabbitholeId: string): Promise<void> {
    const db = await this.getDb();
    const user = await this.getUser();

    return new Promise((resolve, reject) => {
      const rabbitholeTx = db.transaction(["rabbitholes"], "readwrite");
      const rabbitholeStore = rabbitholeTx.objectStore("rabbitholes");
      const getRequest = rabbitholeStore.get(rabbitholeId);

      getRequest.onsuccess = async () => {
        const rabbithole: Rabbithole = getRequest.result;
        if (!rabbithole) {
          resolve();
          return;
        }

        const burrowIds = rabbithole.burrows || [];
        const deleteBurrowsPromises = burrowIds.map(
          (id) =>
            new Promise<void>((res, rej) => {
              const req = db
                .transaction(["burrows"], "readwrite")
                .objectStore("burrows")
                .delete(id);
              req.onsuccess = () => res();
              req.onerror = (e) =>
                rej(new Error((e.target as IDBRequest).error.message));
            }),
        );

        await Promise.all(deleteBurrowsPromises);

        const deleteRabbitholeReq = db
          .transaction(["rabbitholes"], "readwrite")
          .objectStore("rabbitholes")
          .delete(rabbitholeId);

        deleteRabbitholeReq.onsuccess = async () => {
          if (user.currentRabbithole === rabbitholeId) {
            user.currentRabbithole = null;
            user.currentBurrow = null;
            await new Promise<void>((res, rej) => {
              const ureq = db
                .transaction(["user"], "readwrite")
                .objectStore("user")
                .put(user);
              ureq.onsuccess = () => res();
              ureq.onerror = (e) =>
                rej(new Error((e.target as IDBRequest).error.message));
            });
          }
          resolve();
        };

        deleteRabbitholeReq.onerror = (event) => {
          reject(new Error((event.target as IDBRequest).error.message));
        };
      };

      getRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async addBurrowsToRabbithole(
    rabbitholeId: string,
    burrowIds: string[],
  ): Promise<Rabbithole> {
    const db = await this.getDb();

    const existingBurrows = await Promise.all(
      burrowIds.map((id) => this.getBurrow(id).catch(() => null)),
    );

    const validBurrowIds = existingBurrows
      .filter(Boolean)
      .map((b: Burrow) => b.id);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["rabbitholes"], "readwrite");
      const store = tx.objectStore("rabbitholes");
      const getRequest = store.get(rabbitholeId);

      getRequest.onsuccess = () => {
        const rabbithole = getRequest.result;
        if (!rabbithole) {
          reject(new Error("Rabbithole not found"));
          return;
        }

        rabbithole.burrows = [
          ...new Set([...(rabbithole.burrows || []), ...validBurrowIds]),
        ];

        const putRequest = store.put(rabbithole);
        putRequest.onsuccess = () => resolve(rabbithole);
        putRequest.onerror = (event) =>
          reject(new Error((event.target as IDBRequest).error.message));
      };

      getRequest.onerror = (event) =>
        reject(new Error((event.target as IDBRequest).error.message));
    });
  }

  async createNewBurrowInActiveRabbithole(burrowName: string): Promise<Burrow> {
    const db = await this.getDb();
    const user = await this.getUser();

    const burrow: Burrow = {
      id: uuid(),
      createdAt: Date.now(),
      name: burrowName,
      websites: [],
      activeTabs: [],
    };

    return new Promise((resolve, reject) => {
      const burrowReq = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(burrow);

      burrowReq.onsuccess = async () => {
        const rabbithole = await this.getActiveRabbithole();
        await this.addBurrowsToRabbithole(rabbithole.id, [burrow.id]);

        const userReq = db
          .transaction(["user"], "readwrite")
          .objectStore("user")
          .put({
            ...user,
            currentBurrow: burrow.id,
          });

        userReq.onsuccess = () => resolve(burrow);
        userReq.onerror = (event) =>
          reject(new Error((event.target as IDBRequest).error.message));
      };

      burrowReq.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async addWebsitesToRabbitholeMeta(
    rabbitholeId: string,
    urls: string[],
  ): Promise<Rabbithole> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["rabbitholes"], "readwrite");
      const store = tx.objectStore("rabbitholes");
      const getRequest = store.get(rabbitholeId);

      getRequest.onsuccess = () => {
        const rabbithole = getRequest.result;
        if (!rabbithole) {
          reject(new Error("Rabbithole not found"));
          return;
        }

        rabbithole.meta = [...new Set([...(rabbithole.meta || []), ...urls])];

        const putRequest = store.put(rabbithole);
        putRequest.onsuccess = () => resolve(rabbithole);
        putRequest.onerror = (event) =>
          reject(new Error((event.target as IDBRequest).error.message));
      };

      getRequest.onerror = (event) =>
        reject(new Error((event.target as IDBRequest).error.message));
    });
  }

  async deleteWebsiteFromRabbitholeMeta(
    rabbitholeId: string,
    url: string,
  ): Promise<Rabbithole> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["rabbitholes"], "readwrite");
      const store = tx.objectStore("rabbitholes");
      const getRequest = store.get(rabbitholeId);

      getRequest.onsuccess = () => {
        const rabbithole = getRequest.result;
        if (!rabbithole) {
          reject(new Error("Rabbithole not found"));
          return;
        }

        rabbithole.meta = (rabbithole.meta || []).filter((u) => u !== url);

        const putRequest = store.put(rabbithole);
        putRequest.onsuccess = () => resolve(rabbithole);
        putRequest.onerror = (event) =>
          reject(new Error((event.target as IDBRequest).error.message));
      };

      getRequest.onerror = (event) =>
        reject(new Error((event.target as IDBRequest).error.message));
    });
  }

  // also adds website to savedWebsites if it isn't there already
  async saveWebsitesToBurrow(
    items: Website[],
  ): Promise<Website | { alreadySaved: boolean }[]> {
    const db = await this.getDb();

    let currentBurrow = await this.getActiveBurrow();
    for (let item of items) {
      if (!currentBurrow.websites.includes(item.url)) {
        currentBurrow.websites.push(item.url);
        item.alreadySaved = false;
      } else {
        item.alreadySaved = true;
      }
    }

    return new Promise((resolve, reject) => {
      const burrowRequest = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(currentBurrow);

      burrowRequest.onsuccess = (event) => {
        const tx = db.transaction(["websites"], "readwrite");
        const store = tx.objectStore("websites");

        items.forEach((item) => {
          // Use add instead of put to avoid overwriting existing websites
          // This preserves original savedAt, title, description etc.
          const req = store.add(item);
          req.onerror = (e) => {
            // Ignore ConstraintError (duplicate key) to prevent transaction abort
            // This means the website already exists, which is what we want
            e.preventDefault();
            e.stopPropagation();
          };
        });

        tx.oncomplete = async () => {
          resolve(items);
        };

        tx.onerror = (event) => {
          const err = (event.target as IDBRequest).error;
          logger.error("saveWebsitesToBurrow transaction failed", err);
          reject(new Error(err.message));
        };
      };

      burrowRequest.onerror = (event) => {
        const err = (event.target as IDBRequest).error;
        logger.error("saveWebsitesToBurrow failed", err);
        reject(new Error(err.message));
      };
    });
  }

  async saveWebsites(items: Website[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["websites"], "readwrite");
      const store = tx.objectStore("websites");

      items.forEach((item) => {
        // Use put to upsert (overwrite if exists)
        store.put(item);
      });

      tx.oncomplete = () => {
        resolve();
      };

      tx.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async updateWebsite(
    url: string,
    name?: string,
    description?: string,
  ): Promise<Website> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["websites"], "readwrite");
      const store = tx.objectStore("websites");
      const getRequest = store.get(url);

      getRequest.onsuccess = () => {
        const website = getRequest.result;
        if (!website) {
          reject(new Error("Website not found"));
          return;
        }

        if (name !== undefined) website.name = name;
        if (description !== undefined) website.description = description;

        const putRequest = store.put(website);
        putRequest.onsuccess = () => resolve(website);
        putRequest.onerror = (event) =>
          reject(new Error((event.target as IDBRequest).error.message));
      };

      getRequest.onerror = (event) =>
        reject(new Error((event.target as IDBRequest).error.message));
    });
  }

  async deleteWebsiteFromBurrow(burrowId: string, url: string): Promise<void> {
    const db = await this.getDb();

    let burrow = await this.getBurrow(burrowId);

    burrow.websites = burrow.websites.filter((w) => {
      return w !== url;
    });

    return new Promise((resolve, reject) => {
      const burrowRequest = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(burrow);

      burrowRequest.onsuccess = (event) => {
        resolve();
      };

      burrowRequest.onerror = (event) => {
        if (!(event.target as IDBRequest).error.message.indexOf("exists")) {
          reject(new Error((event.target as IDBRequest).error.message));
        }
      };
    });
  }

  async getWebsite(url: string): Promise<Website> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["websites"])
        .objectStore("websites")
        .get(url);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async getAllWebsites(): Promise<Website[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["websites"])
        .objectStore("websites")
        .getAll();

      request.onsuccess = (_) => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async renameBurrow(burrowId: string, newName: string): Promise<Burrow> {
    const db = await this.getDb();

    let burrow = await this.getBurrow(burrowId);
    burrow.name = newName;

    return new Promise((resolve, reject) => {
      const burrowRequest = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(burrow);

      burrowRequest.onsuccess = (event) => {
        resolve(burrow);
      };

      burrowRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async deleteBurrow(burrowId: string): Promise<Burrow> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const burrowRequest = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .delete(burrowId);

      burrowRequest.onsuccess = async () => {
        const burrows = await this.getAllBurrows();
        await this.changeActiveBurrow(burrows[0].id);
        resolve(burrows[0]);
      };

      burrowRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    const db = await this.getDb();
    let user = await this.getUser();
    user.settings = settings;

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["user"], "readwrite")
        .objectStore("user")
        .put(user);

      request.onsuccess = (event) => {
        resolve(settings);
      };

      request.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async getSettings(): Promise<Settings> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(["user"]).objectStore("user").getAll();

      request.onsuccess = (_) => {
        const [user] = request.result;
        resolve(user.settings);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  async getUser(): Promise<User> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(["user"]).objectStore("user").getAll();

      request.onsuccess = (_) => {
        const [user] = request.result;
        resolve(user);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve user"));
      };
    });
  }

  async getActiveBurrow(): Promise<Burrow | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = (_) => {
        const [user] = userRequest.result;

        if (!user.currentBurrow) {
          resolve(null);
          return;
        }

        const burrowRequest = db
          .transaction(["burrows"], "readwrite")
          .objectStore("burrows")
          .get(user.currentBurrow);

        burrowRequest.onsuccess = () => {
          const burrow = burrowRequest.result;
          resolve(burrow);
        };

        burrowRequest.onerror = (event) => {
          reject(new Error("Failed to retrieve settings"));
        };
      };

      userRequest.onerror = (event) => {
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  async getAllBurrows(): Promise<Burrow[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["burrows"])
        .objectStore("burrows")
        .getAll();

      request.onsuccess = (_) => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async getBurrow(burrowId: string): Promise<Burrow> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["burrows"])
        .objectStore("burrows")
        .get(burrowId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async getAllWebsitesForBurrow(burrowId: string): Promise<Website[]> {
    return new Promise(async (resolve, reject) => {
      try {
        let websites: Website[] = [];
        const burrow = await this.getBurrow(burrowId);
        for (const url of burrow.websites) {
          const website = await this.getWebsite(url);
          websites.push(website);
        }
        resolve(websites);
      } catch (err) {
        reject(err);
      }
    });
  }

  async changeActiveBurrow(burrowId: string | null): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = async () => {
        const [user] = userRequest.result;
        user.currentBurrow = burrowId;

        const userPutRequest = db
          .transaction(["user"], "readwrite")
          .objectStore("user")
          .put(user);

        userPutRequest.onsuccess = () => {
          resolve();
        };

        userPutRequest.onerror = (event) => {
          reject(new Error("Failed to retrieve settings"));
        };
      };

      userRequest.onerror = (event) => {
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  async createNewActiveBurrow(
    burrowName: string,
    websites?: string[],
  ): Promise<Burrow> {
    const db = await this.getDb();
    const user = await this.getUser();
    const burrow: Burrow = {
      id: uuid(),
      createdAt: Date.now(),
      name: burrowName,
      websites: [...new Set(websites)],
      activeTabs: [],
    };

    return new Promise((resolve, reject) => {
      // FIXME: when rabbithole is installed, the first time a session is saved
      // the website list is duplicated, so dedup here for now
      // Also see how else this can be repro'd
      const burrowReq = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(burrow);

      burrowReq.onsuccess = () => {
        const userReq = db
          .transaction(["user"], "readwrite")
          .objectStore("user")
          .put({
            ...user,
            currentBurrow: burrow.id,
          });

        userReq.onsuccess = () => {
          resolve(burrow);
        };

        userReq.onerror = (event) => {
          reject(new Error((event.target as IDBRequest).error.message));
        };
      };

      burrowReq.onerror = (event) => {
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async updateBurrowSembleInfo(
    burrowId: string,
    uri: string,
    syncTime: number,
  ): Promise<void> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(["burrows"], "readwrite");
      const store = tx.objectStore("burrows");
      const getRequest = store.get(burrowId);

      getRequest.onsuccess = () => {
        const burrow = getRequest.result;
        if (!burrow) {
          reject(new Error(`Burrow not found: ${burrowId}`));
          return;
        }

        burrow.sembleCollectionUri = uri;
        burrow.lastSembleSync = syncTime;

        const putRequest = store.put(burrow);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = (event) => {
          reject(new Error((event.target as IDBRequest).error.message));
        };
      };

      getRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async updateBurrowActiveTabs(
    burrowId: string,
    urls: string[],
  ): Promise<void> {
    const db = await this.getDb();
    const burrow = await this.getBurrow(burrowId);
    burrow.activeTabs = urls;

    return new Promise((resolve, reject) => {
      const burrowRequest = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(burrow);

      burrowRequest.onsuccess = (event) => {
        resolve();
      };

      burrowRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async removeWebsiteFromActiveTabs(
    burrowId: string,
    url: string,
  ): Promise<void> {
    const db = await this.getDb();
    const burrow = await this.getBurrow(burrowId);

    if (!burrow.activeTabs) {
      burrow.activeTabs = [];
    }

    burrow.activeTabs = burrow.activeTabs.filter((u) => u !== url);

    return new Promise((resolve, reject) => {
      const burrowRequest = db
        .transaction(["burrows"], "readwrite")
        .objectStore("burrows")
        .put(burrow);

      burrowRequest.onsuccess = (event) => {
        resolve();
      };

      burrowRequest.onerror = (event) => {
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }
}
