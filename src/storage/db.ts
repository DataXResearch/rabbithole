import { v4 as uuid } from "uuid";

const version = 6;

export interface Settings {
  alignment: string;
  show: boolean;
  darkMode: boolean;
}

export interface Website {
  url: string;
  name: string;
  savedAt: number;
  faviconUrl: string;
  openGraphImageUrl?: string;
  description?: string;
}

// DEPRECATED, use Burrow
export interface Project {
  id: string;
  createdAt: number;
  savedWebsites: string[]; // url
  name: string;
  sembleCollectionUri?: string;
  lastSembleSync?: number;
  activeTabs?: string[];
}

export interface Burrow {
  id: string;
  createdAt: number;
  websites: string[]; // urls
  name: string;
  sembleCollectionUri?: string;
  lastSembleSync?: number;
  activeTabs?: string[];
}

export interface Rabbithole {
  id: string;
  createdAt: number;
  burrows: string[]; // burrow IDs
  name: string;
  sembleCollectionUri?: string;
  lastSembleSync?: number;
  activeTabs?: string[];
}

export interface User {
  id: string;
  currentBurrow: string;
  settings: Settings;
}

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
          // Generic error handler for all errors targeted at this database's
          // requests
          // FIXME: is this reqd?
          // if (!("exists" in event.target.error)) {
          // reject(new Error("Database error ${event.target.error}"));
          // }
        };
        this.db = db;
        resolve(db);
      };
      request.onerror = () => {
        console.error("Please allow Rabbithole to use storage!");
        reject(new Error("Insufficient permissions"));
      };
    });
  }

  static async init(factory: IDBFactory): Promise<void> {
    await new Promise((resolve, reject) => {
      if (factory === undefined) {
        console.error(
          "This browser doesn't support Rabbithole! You should uninstall it :(",
        );
        reject(new Error("indexedDB not supported"));
      } else {
        let request = factory.open("rabbithole", version);
        request.onerror = (e) => {
          console.error(e);
          console.error("Please allow Rabbithole to use storage!");
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
            objectStore.transaction.oncomplete = () => { };
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
            }

            if (txn.objectStoreNames.contains("savedWebsites")) {
              const store = txn.objectStore("savedWebsites");
              store.name = "websites";
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
              },
              currentBurrow: null,
            };
            const userRequest = db
              .transaction(["user"], "readwrite")
              .objectStore("user")
              .add(newUser);
            userRequest.onsuccess = async () => {
              await store.createNewActiveBurrow("Default burrow");
            };
            return;
          }

          if (
            !("currentBurrow" in user) ||
            user.currentBurrow === null ||
            user.currentBurrow === undefined
          ) {
            await store.createNewActiveBurrow("Default burrow");
          }
        };
      }
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
        items.forEach((item) => tx.objectStore("websites").put(item));

        tx.oncomplete = async () => {
          console.log(`store item success`);
          resolve(items);
        };

        tx.onerror = (event) => {
          console.error(`store item error`);
          console.error(event.target);
          reject(new Error((event.target as IDBRequest).error.message));
        };
      };

      burrowRequest.onerror = (event) => {
        console.error(`store item error`);
        console.error(event.target);
        reject(new Error((event.target as IDBRequest).error.message));
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
        console.log(`saveWebsites success`);
        resolve();
      };

      tx.onerror = (event) => {
        console.log(`saveWebsites error`);
        reject(new Error((event.target as IDBRequest).error.message));
      };
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
        console.log(`delete item success`);
        resolve();
      };

      burrowRequest.onerror = (event) => {
        if (!(event.target as IDBRequest).error.message.indexOf("exists")) {
          console.log(`store item error`);
          console.log(event.target);
          reject(new Error((event.target as IDBRequest).error.message));
        }
      };
    });
  }

  async getWebsite(url: string): Promise<Website> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(["websites"]).objectStore("websites").get(url);

      request.onsuccess = () => {
        console.log("getWebsite success");
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.log(`getWebsite error: ${event.target}`);
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async getAllWebsites(): Promise<Website[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(["websites"]).objectStore("websites").getAll();

      request.onsuccess = (_) => {
        console.log("getAll success");
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.log(`getAll error:`, (event.target as IDBRequest).error);
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
        console.log(`rename burrow success`);
        resolve(burrow);
      };

      burrowRequest.onerror = (event) => {
        console.log(`rename burrow error`);
        console.log(event.target);
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
        console.log(`delete burrow success`);
        const burrows = await this.getAllBurrows();
        await this.changeActiveBurrow(burrows[0].id);
        resolve(burrows[0]);
      };

      burrowRequest.onerror = (event) => {
        console.log(`delete burrow error`);
        console.log(event.target);
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
        console.log(`update settings success: ${JSON.stringify(event.target)}`);
        resolve(settings);
      };

      request.onerror = (event) => {
        console.log(`update settings error`);
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
        console.log("getSettings success");
        resolve(user.settings);
      };

      request.onerror = (event) => {
        console.log(`getSettings error: ${event.target}`);
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
        console.log("getUser success");
        resolve(user);
      };

      request.onerror = (event) => {
        console.log(`getUser error: ${event.target}`);
        reject(new Error("Failed to retrieve user"));
      };
    });
  }

  async getActiveBurrow(): Promise<Burrow> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = (_) => {
        const [user] = userRequest.result;
        const burrowRequest = db
          .transaction(["burrows"], "readwrite")
          .objectStore("burrows")
          .get(user.currentBurrow);

        burrowRequest.onsuccess = () => {
          const burrow = burrowRequest.result;
          console.log("getBurrow success");
          resolve(burrow);
        };

        burrowRequest.onerror = (event) => {
          console.log(`getBurrow error: ${event.target}`);
          reject(new Error("Failed to retrieve settings"));
        };
      };

      userRequest.onerror = (event) => {
        console.log(`getBurrow error: ${event.target}`);
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  async getAllBurrows(): Promise<Burrow[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(["burrows"]).objectStore("burrows").getAll();

      request.onsuccess = (_) => {
        console.log("getAll success");
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.log(`getAll error: ${event.target}`);
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async getBurrow(burrowId: string): Promise<Burrow> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(["burrows"]).objectStore("burrows").get(burrowId);

      request.onsuccess = () => {
        console.log("getBurrow success");
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.log(`getBurrow error: ${event.target}`);
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
        console.log("getAllWebsitesForBurrow successful");
        resolve(websites);
      } catch (err) {
        reject(err);
      }
    });
  }

  async changeActiveBurrow(burrowId: string): Promise<void> {
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
          console.log("changeActiveBurrow success");
          resolve();
        };

        userPutRequest.onerror = (event) => {
          console.log(`changeActiveBurrow error: ${event.target}`);
          reject(new Error("Failed to retrieve settings"));
        };
      };

      userRequest.onerror = (event) => {
        console.log(`getBurrow error: ${event.target}`);
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
        console.log(`getAll error: ${event.target}`);
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
          console.log("updateBurrowSembleInfo success");
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

  async updateBurrowActiveTabs(burrowId: string, urls: string[]): Promise<void> {
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
        console.error(`update active tabs error`);
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  async removeWebsiteFromActiveTabs(burrowId: string, url: string): Promise<void> {
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
        console.log(`remove from active tabs success`);
        resolve();
      };

      burrowRequest.onerror = (event) => {
        console.error(`remove from active tabs error`);
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }
}
