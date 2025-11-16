import { openDB } from 'idb';

const DB_NAME = 'story-db';
const STORIES_STORE = 'stories';
const SYNC_STORE = 'sync-stories';
const BOOKMARKS_STORE = 'bookmarks';

const dbPromise = openDB(DB_NAME, 2, {
  upgrade(db) {
    // (Basic +2) Object store untuk menyimpan cerita
    if (!db.objectStoreNames.contains(STORIES_STORE)) {
      db.createObjectStore(STORIES_STORE, { keyPath: 'id' });
    }
    // (Advanced +4) Object store untuk sinkronisasi cerita baru saat offline
    if (!db.objectStoreNames.contains(SYNC_STORE)) {
      db.createObjectStore(SYNC_STORE, { autoIncrement: true, keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(BOOKMARKS_STORE)) {
      db.createObjectStore(BOOKMARKS_STORE, { keyPath: 'id' });
    }
  },
});

export const storyDb = {
  async get(id) {
    return (await dbPromise).get(STORIES_STORE, id);
  },
  async getAll() {
    return (await dbPromise).getAll(STORIES_STORE);
  },
  async put(story) {
    return (await dbPromise).put(STORIES_STORE, story);
  },
  async putAll(stories) {
    const tx = (await dbPromise).transaction(STORIES_STORE, 'readwrite');
    await Promise.all(stories.map(story => tx.store.put(story)));
    return tx.done;
  },
  async delete(id) {
    return (await dbPromise).delete(STORIES_STORE, id);
  },
};

export const syncDb = {
  async getAll() {
    return (await dbPromise).getAll(SYNC_STORE);
  },
  async put(story) {
    return (await dbPromise).put(SYNC_STORE, story);
  },
  async delete(id) {
    return (await dbPromise).delete(SYNC_STORE, id);
  },
};

// 3. TAMBAHKAN OBJEK BARU UNTUK MENGELOLA BOOKMARK
export const bookmarkDb = {
  async get(id) {
    return (await dbPromise).get(BOOKMARKS_STORE, id);
  },
  async getAll() {
    return (await dbPromise).getAll(BOOKMARKS_STORE);
  },
  async put(story) {
    return (await dbPromise).put(BOOKMARKS_STORE, story);
  },
  async delete(id) {
    return (await dbPromise).delete(BOOKMARKS_STORE, id);
  },
};