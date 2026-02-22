// src/store/miniRedux.js
import { useSyncExternalStore } from 'react';

// 1. ฟังก์ชันสร้าง Store (รับ Reducer และ InitialState มาเก็บไว้)
export function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = new Set(); // กลุ่มคนที่มารอรับข่าวสาร (Subscribers)

  const store = {
    // ฟังก์ชันดึงข้อมูลปัจจุบัน
    getState: () => state,
    
    // ฟังก์ชันรับคำสั่ง (Action) ไปให้ Reducer คำนวณ
    dispatch: (action) => {
      state = reducer(state, action); // เอา state เดิม + action ไปประมวลผลเป็น state ใหม่
      listeners.forEach(listener => listener()); // สะกิดบอกทุกคนว่า "ข้อมูลเปลี่ยนแล้วนะ อัปเดตหน้าจอได้!"
    },
    
    // ฟังก์ชันลงทะเบียนรับข่าวสาร
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener); // เลิกติดตามเมื่อ Component ถูกทำลาย
    }
  };

  return store;
}

// 2. Custom Hook สำหรับให้ Component ดึงข้อมูลไปใช้แบบไม่กระตุก (แทน useSelector ของ react-redux)
export function useStore(store) {
  // useSyncExternalStore จะช่วยดึงข้อมูลและดักจับการเปลี่ยนแปลงให้อัตโนมัติ
  return useSyncExternalStore(store.subscribe, store.getState);
}