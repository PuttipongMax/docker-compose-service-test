// src/store/kanbanStore.js
import { createStore } from './miniRedux';

const initialState = {
  boardTitle: "🚀 My Pure React Board",
  columns: [
    {
      id: "col-1",
      title: "📌 To Do",
      cards: [
        { id: "card-1", title: "ออกแบบ UI", description: "เขียน CSS เอง" },
        { id: "card-2", title: "เขียน Redux เอง", description: "ไม่ใช้ Library" },
      ],
    },
    { id: "col-2", title: "⏳ In Progress", cards: [] },
    { id: "col-3", title: "✅ Done", cards: [] },
  ],
};

// สมองกลประมวลผล (ห้ามแก้ state ตรงๆ ต้อง return ก้อนใหม่เสมอ)
function kanbanReducer(state, action) {
  switch (action.type) {
    case 'ADD_CARD': {
      const { columnId, card } = action.payload;
      return {
        ...state,
        columns: state.columns.map(col => 
          col.id === columnId 
            ? { ...col, cards: [...col.cards, card] } // คัดลอกการ์ดเดิม แล้วต่อท้ายด้วยการ์ดใหม่
            : col
        )
      };
    }
    
    case 'MOVE_CARD': {
      const { sourceColId, destColId, cardId } = action.payload;
      if (sourceColId === destColId) return state; // ลากวางที่เดิม ไม่ต้องทำอะไร

      // 1. คัดลอก Array ของ Columns และ Cards ทั้งหมดออกมาก่อน (Deep Copy ระดับนึง)
      const newColumns = state.columns.map(col => ({ ...col, cards: [...col.cards] }));
      
      // 2. หาคอลัมน์ต้นทางและปลายทางจากก้อนใหม่ที่เพิ่งคัดลอกมา
      const sCol = newColumns.find(c => c.id === sourceColId);
      const dCol = newColumns.find(c => c.id === destColId);
      
      // 3. ดึงการ์ดออกจากต้นทาง และยัดใส่ปลายทาง
      const cardIndex = sCol.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        const [movedCard] = sCol.cards.splice(cardIndex, 1);
        dCol.cards.push(movedCard);
      }

      // 4. ส่ง State ก้อนใหม่ออกไป
      return { ...state, columns: newColumns };
    }

    default:
      return state;
  }
}

// สร้าง Store ตัวจริงพร้อมใช้งาน!
export const kanbanStore = createStore(kanbanReducer, initialState);