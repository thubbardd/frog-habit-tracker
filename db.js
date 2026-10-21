/**
 * db.js — IndexedDB wrapper for the Groyper Habit Tracker PWA.
 *
 * Database: GroyperTrackerDB v1
 * Stores:   habits, dailyLogs
 */

const DB_NAME = 'GroyperTrackerDB';
const DB_VERSION = 1;

/** @type {IDBDatabase|null} */
let db = null;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Wraps an IDBRequest in a Promise.
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wraps an IDBTransaction so we can await its completion.
 * @param {IDBTransaction} tx
 * @returns {Promise<void>}
 */
function promisifyTransaction(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted'));
  });
}

/**
 * Returns the cached database, opening it first if necessary.
 * @returns {Promise<IDBDatabase>}
 */
async function getDB() {
  if (!db) {
    db = await initDB();
  }
  return db;
}

/* ------------------------------------------------------------------ */
/*  initDB                                                            */
/* ------------------------------------------------------------------ */

/**
 * Opens (or creates) the GroyperTrackerDB database.
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  try {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        // -- habits store --
        if (!database.objectStoreNames.contains('habits')) {
          database.createObjectStore('habits', {
            keyPath: 'id',
            autoIncrement: true,
          });
        }

        // -- dailyLogs store --
        if (!database.objectStoreNames.contains('dailyLogs')) {
          const logsStore = database.createObjectStore('dailyLogs', {
            keyPath: 'id',
            autoIncrement: true,
          });
          logsStore.createIndex('date_habit', ['date', 'habitId'], {
            unique: true,
          });
        }
      };

      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[db] initDB failed:', error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Habits CRUD                                                       */
/* ------------------------------------------------------------------ */

/**
 * Adds a new habit and returns the created object (including its id).
 * @param {string} name
 * @param {number} weight
 * @returns {Promise<{id: number, name: string, weight: number, createdAt: string, isActive: boolean}>}
 */
export async function addHabit(name, weight) {
  try {
    const database = await getDB();
    const habit = {
      name,
      weight,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const tx = database.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');
    const id = await promisifyRequest(store.add(habit));
    await promisifyTransaction(tx);

    return { ...habit, id };
  } catch (error) {
    console.error('[db] addHabit failed:', error);
    throw error;
  }
}

/**
 * Returns all habits where isActive === true.
 * @returns {Promise<Array<{id: number, name: string, weight: number, createdAt: string, isActive: boolean}>>}
 */
export async function getHabits() {
  try {
    const database = await getDB();
    const tx = database.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    const all = await promisifyRequest(store.getAll());

    return all.filter((h) => h.isActive === true);
  } catch (error) {
    console.error('[db] getHabits failed:', error);
    throw error;
  }
}

/**
 * Merges `updates` into the habit identified by `id`.
 * @param {number} id
 * @param {Partial<{name: string, weight: number, isActive: boolean}>} updates
 * @returns {Promise<{id: number, name: string, weight: number, createdAt: string, isActive: boolean}>}
 */
export async function updateHabit(id, updates) {
  try {
    const database = await getDB();
    const tx = database.transaction('habits', 'readwrite');
    const store = tx.objectStore('habits');

    const existing = await promisifyRequest(store.get(id));
    if (!existing) {
      throw new Error(`Habit with id ${id} not found`);
    }

    const updated = { ...existing, ...updates };
    await promisifyRequest(store.put(updated));
    await promisifyTransaction(tx);

    return updated;
  } catch (error) {
    console.error('[db] updateHabit failed:', error);
    throw error;
  }
}

/**
 * Soft-deletes a habit by setting isActive to false.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteHabit(id) {
  try {
    await updateHabit(id, { isActive: false, deletedAt: new Date().toISOString() });
  } catch (error) {
    console.error('[db] deleteHabit failed:', error);
    throw error;
  }
}

/**
 * Returns all habits (both active and soft-deleted).
 * @returns {Promise<Array<{id: number, name: string, weight: number, createdAt: string, isActive: boolean, deletedAt?: string}>>}
 */
export async function getAllHabits() {
  try {
    const database = await getDB();
    const tx = database.transaction('habits', 'readonly');
    const store = tx.objectStore('habits');
    return await promisifyRequest(store.getAll());
  } catch (error) {
    console.error('[db] getAllHabits failed:', error);
    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Daily Logs                                                        */
/* ------------------------------------------------------------------ */

/**
 * Upserts a daily log entry.
 * If a log for (date, habitId) already exists its isCompleted flag is updated;
 * otherwise a new record is created.
 *
 * @param {string}  date        — 'YYYY-MM-DD'
 * @param {number}  habitId
 * @param {boolean} isCompleted
 * @param {string}  habitName
 * @param {number}  habitWeight
 * @returns {Promise<{id: number, date: string, habitId: number, habitName: string, habitWeight: number, isCompleted: boolean}>}
 */
export async function setLog(date, habitId, isCompleted, habitName, habitWeight) {
  try {
    const database = await getDB();
    const tx = database.transaction('dailyLogs', 'readwrite');
    const store = tx.objectStore('dailyLogs');
    const index = store.index('date_habit');

    const existing = await promisifyRequest(index.get([date, habitId]));

    let record;
    if (existing) {
      record = { ...existing, isCompleted, habitName, habitWeight };
      await promisifyRequest(store.put(record));
    } else {
      record = { date, habitId, habitName, habitWeight, isCompleted };
      const newId = await promisifyRequest(store.add(record));
      record.id = newId;
    }

    await promisifyTransaction(tx);
    return record;
  } catch (error) {
    console.error('[db] setLog failed:', error);
    throw error;
  }
}

/**
 * Returns every log entry for the given date.
 * @param {string} date — 'YYYY-MM-DD'
 * @returns {Promise<Array<{id: number, date: string, habitId: number, habitName: string, habitWeight: number, isCompleted: boolean}>>}
 */
export async function getLogsForDate(date) {
  try {
    const database = await getDB();
    const tx = database.transaction('dailyLogs', 'readonly');
    const store = tx.objectStore('dailyLogs');
    const index = store.index('date_habit');

    // IDBKeyRange for all keys where the first element (date) matches.
    const range = IDBKeyRange.bound([date], [date, []]);
    const results = await promisifyRequest(index.getAll(range));

    return results;
  } catch (error) {
    console.error('[db] getLogsForDate failed:', error);
    throw error;
  }
}

/**
 * Given a year-month string ('YYYY-MM'), returns an array of unique 'YYYY-MM-DD'
 * date strings that contain at least one log entry.
 * @param {string} yearMonth — 'YYYY-MM'
 * @returns {Promise<string[]>}
 */
export async function getDatesWithLogs(yearMonth) {
  try {
    const database = await getDB();
    const tx = database.transaction('dailyLogs', 'readonly');
    const store = tx.objectStore('dailyLogs');
    const index = store.index('date_habit');

    // Range covers 'YYYY-MM-01' through 'YYYY-MM-31' (lexicographic upper bound).
    const startDate = `${yearMonth}-01`;
    const endDate = `${yearMonth}-31`;
    const range = IDBKeyRange.bound([startDate], [endDate, []]);

    const dates = new Set();

    return await new Promise((resolve, reject) => {
      const cursorReq = index.openCursor(range);

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          dates.add(cursor.value.date);
          cursor.continue();
        } else {
          resolve([...dates].sort());
        }
      };

      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch (error) {
    console.error('[db] getDatesWithLogs failed:', error);
    throw error;
  }
}
