import React, { useState } from 'react';
import Card from './Card';
// 👇 นำเข้า Store ของเราเพื่อใช้ dispatch
import { kanbanStore } from '../../store/kanbanStore';

function Column({ column }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e) => {
    const cardId = e.dataTransfer.getData('cardId');
    const sourceColId = e.dataTransfer.getData('sourceColId');

    if (sourceColId !== column.id) {
      // 🚀 สั่ง Dispatch แบบทำเอง!
      kanbanStore.dispatch({
        type: 'MOVE_CARD',
        payload: { sourceColId, destColId: column.id, cardId }
      });
    }
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    kanbanStore.dispatch({
      type: 'ADD_CARD',
      payload: {
        columnId: column.id,
        card: { id: `card-${Date.now()}`, title: newTaskTitle, description: '' }
      }
    });
    setNewTaskTitle('');
  };

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop} className="bg-gray-100 dark:bg-gray-800 w-80 flex-shrink-0 rounded-xl p-4 flex flex-col max-h-full">
      <h3 className="font-bold text-lg text-gray-700 dark:text-gray-200 mb-4 px-1">
        {column.title} <span className="text-sm font-normal text-gray-400 ml-2">({column.cards.length})</span>
      </h3>
      
      <div className="flex-1 overflow-y-auto min-h-[150px]">
        {column.cards.map((card) => (
          <Card key={card.id} card={card} columnId={column.id} />
        ))}
      </div>

      <form onSubmit={handleAddCard} className="mt-3">
        <input
          type="text"
          placeholder="+ เพิ่มการ์ดใหม่..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-gray-700 border border-transparent focus:border-blue-500 outline-none transition-all dark:text-white"
        />
      </form>
    </div>
  );
}

export default Column;