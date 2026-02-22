import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// ไอคอนพระอาทิตย์/พระจันทร์
const SunIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>);
const MoonIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>);

function Home() {
  // 1. State ดึงค่าเริ่มต้นจาก LocalStorage เพื่อให้จำโหมดข้ามหน้าเว็บได้
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // 2. Effect อัปเดตคลาส .dark ที่ <html> ทุกครั้งที่สลับโหมด
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    // เปลี่ยนพื้นหลังให้รองรับโหมด Dark (จากโทนสว่างเป็นโทนมืด)
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 transition-colors duration-300 relative">
      
      {/* ปุ่มสลับโหมด (มุมขวาบน) */}
      <button 
        onClick={() => setDarkMode(!darkMode)} 
        className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors z-10"
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* กล่องเนื้อหาตรงกลาง */}
      <div className="text-center max-w-2xl bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl transition-colors duration-300">
        <h1 className="text-5xl font-extrabold text-blue-900 dark:text-blue-400 mb-6 transition-colors duration-300">
          ยินดีต้อนรับสู่ MyProject 🚀
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed transition-colors duration-300">
          นี่คือระบบจำลอง Full-Stack Architecture ที่ประกอบไปด้วย React หน้าบ้าน, 
          Express API Gateway ตรงกลาง, และ Java Spring Boot 
          สำหรับจัดการฐานข้อมูลหลังบ้านอย่างปลอดภัย
        </p>
        
        {/* ปุ่มลิงก์ไปหน้า Login/Register */}
        <Link 
          to="/auth" 
          className="inline-block bg-blue-600 dark:bg-blue-500 text-white font-semibold text-lg px-8 py-4 rounded-full shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
        >
          เข้าสู่ระบบ / สมัครสมาชิก
        </Link>
      </div>
    </div>
  );
}

export default Home;