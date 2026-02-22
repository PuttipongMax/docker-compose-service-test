// src/components/AlertModal.jsx
import React from 'react';

function AlertModal({ isOpen, type, title, message, onClose }) {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    // พื้นหลังสีดำโปร่งใส (Overlay)
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      
      {/* ตัวกล่อง Modal */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all animate-scale-up">
        
        {/* ไอคอน (เขียว/แดง ตามสถานะ) */}
        <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${
          isSuccess ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        }`}>
          {isSuccess ? (
            // ไอคอนเครื่องหมายถูก (Success)
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            // ไอคอนกากบาท (Error)
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* ข้อความ */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-300 mb-6">{message}</p>

        {/* ปุ่มกดปิด */}
        <button
          onClick={onClose}
          className={`w-full py-3 rounded-lg text-white font-bold transition-all shadow-md hover:shadow-lg ${
            isSuccess ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}

export default AlertModal;