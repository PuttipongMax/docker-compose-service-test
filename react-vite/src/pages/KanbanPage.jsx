import React from 'react';
import { Link } from 'react-router-dom';
import Column from '../components/kanban/Column';

// 👇 นำเข้า Store และ Hook ที่เราสร้างเอง
import { kanbanStore } from '../store/kanbanStore';
import { useStore } from '../store/miniRedux';

function KanbanPage() {
  // ดึง State ปัจจุบันออกมา (เหมือน useSelector)
  const state = useStore(kanbanStore);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors duration-300">
      <header className="bg-blue-600 dark:bg-gray-800 text-white p-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Link to="/profile" className="text-blue-200 hover:text-white transition-colors">← กลับ</Link>
          <h1 className="text-xl font-bold">{state.boardTitle}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex items-start gap-6 h-full">
          {state.columns.map((column) => (
            <Column key={column.id} column={column} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default KanbanPage;