import React from 'react';

function Card({ card, columnId }) {
  // ฟังก์ชันเริ่มลากการ์ด
  const handleDragStart = (e) => {
    e.dataTransfer.setData('cardId', card.id);
    e.dataTransfer.setData('sourceColId', columnId);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-3"
    >
      <h4 className="font-semibold text-gray-800 dark:text-gray-100">{card.title}</h4>
      {card.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
      )}
    </div>
  );
}

export default Card;