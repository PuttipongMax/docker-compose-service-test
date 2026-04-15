import Dexie from 'dexie';

export const db = new Dexie('JasmineDB');

// สร้าง Table สำหรับเก็บประวัติการสแกนออฟไลน์
db.version(1).stores({
  scans: '++id, stage, timestamp, is_synced'
});