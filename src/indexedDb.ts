// TODO: initialize db
interface IStorage {
    url: string;
    name: string;
    savedAt: number;
};

// FIXME: is this an acceptable pattern? Specifically, opening the db in 2 different
// functions seems a bit strange
export class WebsiteStore {
    private async getDb(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            let request = window.indexedDB.open('rabbithole', 1);
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
                alert("Please allow Rabbithole to use storage!");
                reject(new Error("Insufficient permissions"));
            }
        });
    }

    static async init(): Promise<void> {
        await new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                alert("This browser doesn't support Rabbithole! You should uninstall it :(");
                reject(new Error("indexedDB not supported"));
            } else {
                let request = window.indexedDB.open('rabbithole', 1);
                request.onerror = () => {
                    alert("Please allow Rabbithole to use storage!");
                    reject(new Error("Insufficient permissions"));
                }

                // This event is only implemented in recent browsers
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    const objectStore = db.createObjectStore("savedWebsites", { keyPath: "url" });
                    objectStore.createIndex("name", "name", { unique: false });
                    objectStore.createIndex("url", "url", { unique: true });

                    // Use transaction oncomplete to make sure the objectStore creation is
                    // finished before adding data into it.
                    objectStore.transaction.oncomplete = (event) => { };
                    resolve(db);
                };
            }
        });
    }

    async store(): Promise<IStorage> {
        let queryOptions = { active: true, lastFocusedWindow: true };
        console.log(chrome)
        // `tab` will either be a `tabs.Tab` instance or `undefined`.
        let [tab] = await chrome.tabs.query(queryOptions);
        console.log(tab)

        return new Promise(async (resolve, reject) => {
            const db = await this.getDb();
            const request = db.transaction(["savedWebsites"], "readwrite")
                .objectStore("savedWebsites")
                .add(item);

            request.onsuccess = (event) => {
                console.log(`store item success: ${event.target}`);
                resolve(item);
            };

            request.onerror = (event) => {
                console.error(`store item error: ${event.target}`);
                reject(new Error("Failed to store item"));
            };
        });
    }


    async getAll(): Promise<IStorage[]> {
        return new Promise(async (resolve, reject) => {
            const db = await this.getDb();
            const request = db.transaction(["savedWebsites"], "readonly")
                .objectStore("savedWebsites")
                .getAll();

            request.onsuccess = (event) => {
                console.log("getAll success");
                resolve(request.result);
            };

            request.onerror = (event) => {
                console.error(`getAll error: ${event.target}`);
                reject(new Error("Failed to retrieve items"));
            };
        });
    }
}
