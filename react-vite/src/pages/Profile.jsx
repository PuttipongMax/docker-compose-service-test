import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // 👈 Import Link เพิ่มเข้ามา

// ไอคอนพระอาทิตย์/พระจันทร์
const SunIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>);
const MoonIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>);

function Profile() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300 relative">
      
      {/* ปุ่มสลับโหมด */}
      <button 
        onClick={() => setDarkMode(!darkMode)} 
        className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors z-10"
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center transition-colors duration-300">
        
        {/* ไอคอน User */}
        <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">หน้าโปรไฟล์</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          ยินดีต้อนรับ! เลือกเมนูด้านล่างเพื่อเริ่มต้นการทำงานของคุณ
        </p>

        {/* 🌟 พื้นที่จัดกลุ่มปุ่ม (ใช้ space-y-4 เพื่อเว้นระยะห่างแนวตั้ง) */}
        <div className="space-y-4">
          
          {/* ปุ่มไปหน้า Kanban (ใช้ Link เพื่อให้สลับหน้าแบบไม่โหลดใหม่) */}
          <Link 
            to="/kanban"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all w-full"
          >
            {/* ไอคอนกระดาน */}
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            เปิดกระดาน Kanban
          </Link>

          {/* ปุ่มไปหน้า Kanban (ใช้ Link เพื่อให้สลับหน้าแบบไม่โหลดใหม่) */}
          <Link 
            to="/translate"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all w-full"
          >
            {/* ไอคอนกระดาน */}
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            เปิดหน้า Traslate (CN:TH:EN)
          </Link>

          {/* ปุ่มไปหน้า audio (ใช้ Link เพื่อให้สลับหน้าแบบไม่โหลดใหม่) */}
          <Link 
            to="/audio-analyzer"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all w-full"
          >
            {/* ไอคอนกระดาน */}
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            เปิดหน้า Analyzer-Audio
          </Link>

          {/* ปุ่มออกจากระบบ (ปรับสีให้อ่อนลงนิดนึงเพื่อไม่ให้แย่งความเด่น) */}
          <button 
            onClick={handleLogout}
            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-bold py-3 px-8 rounded-lg border border-red-200 dark:border-red-800 transition-all w-full"
          >
            ออกจากระบบ
          </button>
          
        </div>

      </div>
    </div>
  );
}

export default Profile;