import { v4 as uuid } from "uuid";

const version = 4;

export interface Settings {
  alignment: string;
  show: boolean;
  darkMode: boolean;
}

export interface Website {
  url: string; // key
  name: string;
  savedAt: number;
  faviconUrl: string;
  openGraphImageUrl?: string;
  description?: string;
}

export interface Project {
  id: string; // key
  createdAt: number;
  savedWebsites: string[]; // url/"foreign" key
  name: string;
  sembleCollectionUri?: string;
  lastSembleSync?: number;
}

export interface User {
  id: string; // key
  currentProject: string;
  settings: Settings;
}

// FIXME: is this an acceptable pattern? Specifically, opening the db in 2 different
// functions seems a bit strange
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

  // Creates db schema
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

        // This event is only implemented in recent browsers
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
              currentProject: null,
            };
            const userRequest = db
              .transaction(["user"], "readwrite")
              .objectStore("user")
              .add(newUser);
            userRequest.onsuccess = async () => {
              await store.createNewActiveProject("Default project");
            };
            return;
          }

          if (
            !("currentProject" in user) ||
            user.currentProject === null ||
            user.currentProject === undefined
          ) {
            await store.createNewActiveProject("Default project");
          }
        };
      }
    });
  }

  // also adds website to savedWebsites if it isn't there already
  async saveWebsiteToProject(
    items: Website[],
  ): Promise<Website | { alreadySaved: boolean }[]> {
    const db = await this.getDb();

    // update website list of active project
    let currentProject = await this.getActiveProject();
    for (let item of items) {
      if (!currentProject.savedWebsites.includes(item.url)) {
        currentProject.savedWebsites.push(item.url);
        item.alreadySaved = false;
      } else {
        item.alreadySaved = true;
      }
    }

    return new Promise((resolve, reject) => {
      const projectRequest = db
        .transaction(["projects"], "readwrite")
        .objectStore("projects")
        .put(currentProject);

      projectRequest.onsuccess = (event) => {
        const tx = db.transaction(["savedWebsites"], "readwrite");
        items.forEach((item) => tx.objectStore("savedWebsites").add(item));

        tx.oncomplete = async () => {
          console.log(`store item success`);
          resolve(items);
        };

        tx.onerror = (event) => {
          // ignore error if website is stored already
          if (!(event.target as IDBRequest).error.message.indexOf("exists")) {
            reject(new Error((event.target as IDBRequest).error.message));
          }
        };
      };

      projectRequest.onerror = (event) => {
        // ignore error if website is stored already
        if (!(event.target as IDBRequest).error.message.indexOf("exists")) {
          console.log(`store item error`);
          console.log(event.target);
          reject(new Error((event.target as IDBRequest).error.message));
        }
      };
    });
  }

  // Saves websites directly to the store without adding to the active project
  async saveWebsites(items: Website[]): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["savedWebsites"], "readwrite");
      const store = tx.objectStore("savedWebsites");

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

  async deleteWebsiteFromProject(
    projectId: string,
    url: string,
  ): Promise<void> {
    const db = await this.getDb();

    // update website list of active project
    let project = await this.getProject(projectId);

    project.savedWebsites = project.savedWebsites.filter((w) => {
      return w !== url;
    });

    return new Promise((resolve, reject) => {
      const projectRequest = db
        .transaction(["projects"], "readwrite")
        .objectStore("projects")
        .put(project);

      projectRequest.onsuccess = (event) => {
        console.log(`delete item success`);
        resolve();
      };

      projectRequest.onerror = (event) => {
        // ignore error if website is stored already
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
      const request = db
        .transaction(["savedWebsites"])
        .objectStore("savedWebsites")
        .get(url);

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
      const request = db
        .transaction(["savedWebsites"])
        .objectStore("savedWebsites")
        .getAll();

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

  async renameProject(projectId: string, newName: string): Promise<Project> {
    const db = await this.getDb();

    // update website list of active project
    let project = await this.getProject(projectId);
    project.name = newName;

    return new Promise((resolve, reject) => {
      const projectRequest = db
        .transaction(["projects"], "readwrite")
        .objectStore("projects")
        .put(project);

      projectRequest.onsuccess = (event) => {
        console.log(`rename project success`);
        resolve(project);
      };

      projectRequest.onerror = (event) => {
        console.log(`rename project error`);
        console.log(event.target);
        reject(new Error((event.target as IDBRequest).error.message));
      };
    });
  }

  // returns new active project
  async deleteProject(projectId: string): Promise<Project> {
    const db = await this.getDb();

    return new Promise((resolve, reject) => {
      const projectRequest = db
        .transaction(["projects"], "readwrite")
        .objectStore("projects")
        .delete(projectId);

      projectRequest.onsuccess = async () => {
        console.log(`delete project success`);
        // replace active project
        const projects = await this.getAllProjects();
        await this.changeActiveProject(projects[0].id);
        resolve(projects[0]);
      };

      projectRequest.onerror = (event) => {
        console.log(`rename project error`);
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

  async getActiveProject(): Promise<Project> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = (_) => {
        const [user] = userRequest.result;
        const projectRequest = db
          .transaction(["projects"], "readwrite")
          .objectStore("projects")
          .get(user.currentProject);

        projectRequest.onsuccess = () => {
          const project = projectRequest.result;
          console.log("getProject success");
          resolve(project);
        };

        projectRequest.onerror = (event) => {
          console.log(`getProject error: ${event.target}`);
          reject(new Error("Failed to retrieve settings"));
        };
      };

      userRequest.onerror = (event) => {
        console.log(`getProject error: ${event.target}`);
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  async getAllProjects(): Promise<Project[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["projects"])
        .objectStore("projects")
        .getAll();

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

  async getProject(projectId: string): Promise<Project> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const request = db
        .transaction(["projects"])
        .objectStore("projects")
        .get(projectId);

      request.onsuccess = () => {
        console.log("getProject success");
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.log(`getProject error: ${event.target}`);
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async getAllWebsitesForProject(projectId: string): Promise<Website[]> {
    // This method uses other async methods, so it's fine as is
    return new Promise(async (resolve, reject) => {
      try {
        let websites: Website[] = [];
        const project = await this.getProject(projectId);
        for (const url of project.savedWebsites) {
          const website = await this.getWebsite(url);
          websites.push(website);
        }
        console.log("getAllWebsitesForProject successful");
        resolve(websites);
      } catch (err) {
        reject(err);
      }
    });
  }

  async changeActiveProject(projectId: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const userRequest = db.transaction(["user"]).objectStore("user").getAll();

      userRequest.onsuccess = async () => {
        const [user] = userRequest.result;
        user.currentProject = projectId;

        const userPutRequest = db
          .transaction(["user"], "readwrite")
          .objectStore("user")
          .put(user);

        userPutRequest.onsuccess = () => {
          console.log("changeActiveProject success");
          resolve();
        };

        userPutRequest.onerror = (event) => {
          console.log(`changeActiveProject error: ${event.target}`);
          reject(new Error("Failed to retrieve settings"));
        };
      };

      userRequest.onerror = (event) => {
        console.log(`getProject error: ${event.target}`);
        reject(new Error("Failed to retrieve settings"));
      };
    });
  }

  // create new project and set it as user's active project
  async createNewActiveProject(
    projectName: string,
    savedWebsites?: string[],
  ): Promise<Project> {
    const db = await this.getDb();
    const user = await this.getUser();
    const project: Project = {
      id: uuid(),
      createdAt: Date.now(),
      name: projectName,
      savedWebsites: [...new Set(savedWebsites)],
    };

    return new Promise((resolve, reject) => {
      // FIXME: when rabbithole is installed, the first time a session is saved
      // the website list is duplicated, so dedup here for now
      // Also see how else this can be repro'd
      const projectReq = db
        .transaction(["projects"], "readwrite")
        .objectStore("projects")
        .put(project);

      projectReq.onsuccess = () => {
        // add default store to user.currentProject
        db.transaction(["user"], "readwrite")
          .objectStore("user")
          .put({
            ...user,
            currentProject: project.id,
          });

        resolve(project);
      };

      projectReq.onerror = (event) => {
        console.log(`getAll error: ${event.target}`);
        reject(new Error("Failed to retrieve items"));
      };
    });
  }

  async updateProjectSembleInfo(projectId: string, uri: string, syncTime: number): Promise<void> {
    const db = await this.getDb();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["projects"], "readwrite");
      const store = tx.objectStore("projects");
      const getRequest = store.get(projectId);

      getRequest.onsuccess = () => {
        const project = getRequest.result;
        if (!project) {
          reject(new Error(`Project not found: ${projectId}`));
          return;
        }

        project.sembleCollectionUri = uri;
        project.lastSembleSync = syncTime;

        const putRequest = store.put(project);
        
        putRequest.onsuccess = () => {
          console.log("updateProjectSembleInfo success");
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
}
