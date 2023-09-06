import { v4 as uuid } from 'uuid';

const version = 2;

export interface Settings {
  alignment: string;
  show: boolean;
}

export interface Website {
  url: string;
  name: string;
  savedAt: number;
  faviconUrl: string;
  openGraphImageUrl?: string;
  description?: string;
};

export interface Rabbithole {
  id: string;
  createdAt: number;
  savedWebsites: Website[];
  name: string;
}

export interface User {
  id: string;
  settings: Settings;
}

// FIXME: is this an acceptable pattern? Specifically, opening the db in 2 different
// functions seems a bit strange
export class WebsiteStore {
  factory: IDBFactory;

  constructor(factory: IDBFactory) {
    this.factory = factory;
  }

  private async getDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let request = this.factory.open('rabbithole', version);
      request.onsuccess = () => {
        const db = request.result;
        db.onerror = (event) => {
          // Generic error handler for all errors targeted at this database's
          // requests
          console.error(`Database error: ${event.target}`);
          reject(new Error("Database error"));
        };
        resolve(db);
      };
      request.onerror = () => {
        console.error("Please allow Rabbithole to use storage!");
        reject(new Error("Insufficient permissions"));
      }
    });
  }

  // Creates db schema
  static async init(factory: IDBFactory): Promise<void> {
    await new Promise((resolve, reject) => {
      if (factory === undefined) {
        console.error("This browser doesn't support Rabbithole! You should uninstall it :(");
        reject(new Error("indexedDB not supported"));
      } else {
        let request = factory.open('rabbithole', version);
        request.onerror = (e) => {
          console.error(e);
          console.error("Please allow Rabbithole to use storage!");
          reject(new Error("Insufficient permissions"));
        }

        // This event is only implemented in recent browsers
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (event.oldVersion < 1) {
            const objectStore = db.createObjectStore("savedWebsites", { keyPath: "url" });
            objectStore.createIndex("name", "name", { unique: false });
            objectStore.createIndex("url", "url", { unique: true });

            objectStore.transaction.oncomplete = (event) => { };

          }
          if (event.oldVersion < 2) {
            const userStore = db.createObjectStore("user", { keyPath: "id" });
            userStore.transaction.oncomplete = async (event) => {
              await db.transaction(["user"], "readwrite")
                .objectStore("user")
                .add({
                  id: uuid(),
                  settings: {
                    show: true,
                    alignment: "right"
                  }
                });
            }
          }

          resolve(db);
        };
      }
    });
  }

  async store(item: Website): Promise<Website> {
    return new Promise(async (resolve, reject) => {
      let db: IDBDatabase;
      try {
        db = await this.getDb();
      } catch (err) {
        reject(err)
      }
      const request = db.transaction(["savedWebsites"], "readwrite")
        .objectStore("savedWebsites")
        .add(item);

      request.onsuccess = (event) => {
        console.log(`store item success: ${event.target}`);
        db.close();
        resolve(item);
      };

      request.onerror = (event) => {
        console.log(`store item error`);
        console.log(event.target);
        db.close();
        reject(new Error("Failed to store item"));
      };
    });
  }

  async getAllWebsites(): Promise<Website[]> {
    return new Promise(async (resolve, reject) => {
      let db: IDBDatabase;
      try {
        db = await this.getDb();
      } catch (err) {
        reject(err)
      }
      const request = db.transaction(["savedWebsites"])
        .objectStore("savedWebsites")
        .getAll();

      request.onsuccess = (_) => {
        console.log("getAll success");
        db.close();
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.log(`getAll error: ${event.target}`);
        db.close();
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    return new Promise(async (resolve, reject) => {
      let db: IDBDatabase;
      try {
        db = await this.getDb();
      } catch (err) {
        reject(err)
      }

      let user = await this.getUser();
      user.settings = settings;

      const request = db.transaction(["user"], "readwrite")
        .objectStore("user")
        .put(user);

      request.onsuccess = (event) => {
        console.log(`update settings success: ${event.target}`);
        db.close();
        resolve(settings);
      };

      request.onerror = (event) => {
        console.log(`update settings error`);
        console.log(event.target);
        db.close();
        reject(new Error("Failed to update settings"));
      };
    });
  }

  async getSettings(): Promise<Settings> {
    return new Promise(async (resolve, reject) => {
      let db: IDBDatabase;
      try {
        db = await this.getDb();
      } catch (err) {
        reject(err)
      }
      const request = db.transaction(["user"])
        .objectStore("user")
        .getAll();

      request.onsuccess = (_) => {
        db.close();
        const [user] = request.result;
        console.log("getSettings success");
        resolve(user.settings);
      };

      request.onerror = (event) => {
        console.log(`getSettings error: ${event.target}`);
        db.close();
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  async getUser(): Promise<User> {
    return new Promise(async (resolve, reject) => {
      let db: IDBDatabase;
      try {
        db = await this.getDb();
      } catch (err) {
        reject(err)
      }
      const request = db.transaction(["user"])
        .objectStore("user")
        .getAll();

      request.onsuccess = (_) => {
        db.close();
        const [user] = request.result;
        console.log("getUser success");
        console.log(request.result);
        resolve(user);
      };

      request.onerror = (event) => {
        console.log(`getUser error: ${event.target}`);
        db.close();
        reject(new Error("Failed to retrieve user"));
      };
    });
  }
}
