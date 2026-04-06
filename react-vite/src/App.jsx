// src/App.jsx
import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AuthPage from './pages/AuthPage';
import Profile from './pages/Profile';
import KanbanPage from './pages/KanbanPage';
import TranslatePage from './pages/TranslatePage';
import AudioAnalyzer from './components/AudioAnalyzer';

function App() {
  
  // 🌟 เพิ่มจุดเช็ค Theme ศูนย์กลาง: ทำงานทุกครั้งที่มีการโหลด/รีเฟรชหน้าเว็บ
  useEffect(() => {
    // เช็คว่าใน LocalStorage เคยเซ็ตเป็น dark ไว้ไหม หรือระบบ OS เป็นโหมดมืดหรือเปล่า
    const isDark = localStorage.getItem('theme') === 'dark' || 
                   (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // สั่งแปะ/ถอดคลาส dark ที่ <html> tag ทันที
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []); // [] หมายถึงให้ทำงานแค่ครั้งเดียวตอนโหลดแอปครั้งแรก

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/kanban" element={<KanbanPage />} />
      <Route path="/translate" element={<TranslatePage />} />
      <Route path="/audio-analyzer" element={<AudioAnalyzer />} />
    </Routes>
  );
}

export default App;