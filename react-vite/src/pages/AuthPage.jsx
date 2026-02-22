import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AlertModal from '../components/AlertModal';

// ไอคอนพระอาทิตย์/พระจันทร์ (ใช้ SVG เพื่อความเบา)
const SunIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>);
const MoonIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>);

function AuthPage() {
  const navigate = useNavigate();

  // --- States ---
  const [isLoginMode, setIsLoginMode] = useState(true); // true=Login, false=Register
  const [formData, setFormData] = useState({ username: '', email: '', password: '' }); // รวม state ของฟอร์มไว้ที่เดียว
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false);
  
  // State สำหรับ Dark Mode (ตรวจสอบค่าเริ่มต้นจาก localStorage หรือ OS preference)
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // 👇 2. เปลี่ยน State message เดิม ให้เป็น State สำหรับคุม Modal
  const [modalConfig, setModalConfig] = useState({ 
    isOpen: false, 
    type: 'success', 
    title: '', 
    message: '',
    onConfirm: null // ฟังก์ชันที่จะให้ทำงานหลังกดปุ่มตกลงปิด Modal
  });


  // --- Effects ---
  // จัดการการเปลี่ยน Class 'dark' ที่ <html> tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);


  // --- Handlers ---
  // ฟังก์ชันเดียวจัดการการพิมพ์ในทุกช่อง Input
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ฟังก์ชันสลับโหมด Login/Register และเคลียร์ค่า
  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setMessage({ text: '', type: '' });
    setFormData({ username: '', email: '', password: '' });
  };

  // ฟังก์ชัน Submit Form (รองรับทั้ง Login และ Register)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: '', type: '' });

    // 1. กำหนด URL และ Data ตามโหมดปัจจุบัน
    const endpoint = isLoginMode ? '/login' : '/register';
    const url = `http://localhost:3000/api/auth${endpoint}`;
    
    const payload = isLoginMode 
        ? { username: formData.username, password: formData.password }
        : { username: formData.username, email: formData.email, password: formData.password };

    try {
      // 2. ยิง Request
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // 3. ตรวจสอบผลลัพธ์
      if (response.ok) {
        setMessage({ text: isLoginMode ? '✅ เข้าสู่ระบบสำเร็จ!' : '✅ สมัครสมาชิกสำเร็จ!', type: 'success' });
        
        if (isLoginMode) {
          // กรณี Login สำเร็จ
          console.log('🎉 Token:', data.token);
          localStorage.setItem('token', data.token);
          // (Optional) อาจจะ redirect ไปหน้า Dashboard หลังจากนี้สัก 1-2 วินาที
          // setTimeout(() => navigate('/dashboard'), 1500);
          setModalConfig({
            isOpen: true,
            type: 'success',
            title: 'เข้าสู่ระบบสำเร็จ!',
            message: 'ยินดีต้อนรับเข้าสู่ระบบจัดการฐานข้อมูล',
            onConfirm: () => {
                setModalConfig({ ...modalConfig, isOpen: false });
                navigate('/profile'); // นำทางไปหน้าโปรไฟล์หลังจากกดปุ่มใน Modal
                // navigate('/dashboard'); // ถ้ามีหน้า Dashboard เปิดบรรทัดนี้ได้เลย
            }
          });
        } else {
          // กรณี Register สำเร็จ -> สลับไปหน้า Login ให้ผู้ใช้
          // setTimeout(() => {
          //   toggleMode();
          //   setMessage({ text: '🎉 สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบ', type: 'success' });
          // }, 1500);
          // 🟢 โชว์ Modal Register สำเร็จ
          setModalConfig({
            isOpen: true,
            type: 'success',
            title: 'ลงทะเบียนสำเร็จ!',
            message: 'บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ',
            onConfirm: () => {
                setModalConfig({ ...modalConfig, isOpen: false });
                toggleMode(); // สลับกลับมาหน้า Login ให้อัตโนมัติ
            }
          });
        }
      } else {
        // กรณีมี Error จาก Backend
        throw new Error(data.message || 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่');
      }
    } catch (error) {
      // console.error('Error:', error);
      // setMessage({ text: `❌ ${error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'}`, type: 'error' });
      // 🔴 โชว์ Modal เมื่อเกิด Error
      setModalConfig({
        isOpen: true,
        type: 'error',
        title: 'เกิดข้อผิดพลาด!',
        message: error.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        onConfirm: () => setModalConfig({ ...modalConfig, isOpen: false })
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Class พื้นฐานสำหรับ Input (ใช้ซ้ำบ่อยๆ)
  const inputClasses = "w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200";

  return (
    // Container หลัก: รองรับ Dark Mode และมี Transition นุ่มๆ
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 transition-colors duration-300">
      
      {/* การ์ดฟอร์ม */}
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 relative transition-colors duration-300">
        
        {/* ส่วนหัว: ปุ่มกลับหน้าแรก และ ปุ่มสลับ Theme */}
        <div className="flex justify-between items-center mb-8">
            <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1">
            ← กลับหน้าแรก
            </Link>
            <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                aria-label="Toggle Dark Mode"
            >
                {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
        </div>


        {/* Toggle Tabs (Login / Register) */}
        <div className="flex p-1 bg-gray-200 dark:bg-gray-700 rounded-xl mb-8 transition-colors duration-300">
            <button
                type="button"
                onClick={() => !isLoginMode && toggleMode()}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    isLoginMode 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                เข้าสู่ระบบ
            </button>
            <button
                type="button"
                onClick={() => isLoginMode && toggleMode()}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    !isLoginMode 
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                สมัครสมาชิก
            </button>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6 transition-colors duration-300">
          {isLoginMode ? 'ยินดีต้อนรับกลับมา 👋' : 'สร้างบัญชีใหม่ 🚀'}
        </h2>
        
        {/* ฟอร์ม */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input 
              type="text" 
              name="username"
              placeholder="Username" 
              value={formData.username}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>
          
          {/* แสดงช่อง Email เฉพาะตอน Register */}
          <div className={`transition-all duration-300 overflow-hidden ${!isLoginMode ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
             <input 
                type="email" 
                name="email"
                placeholder="Email Address" 
                value={formData.email}
                onChange={handleChange}
                // ไม่ใส่ required ถ้าเป็นโหมด login
                required={!isLoginMode}
                className={inputClasses}
                disabled={isLoginMode} // ป้องกันการ tab เข้าไปตอนซ่อนอยู่
                />
          </div>

          <div>
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'กำลังประมวลผล...' : (isLoginMode ? 'เข้าสู่ระบบ' : 'ลงทะเบียน')}
          </button>
        </form>

        {/* แสดงข้อความแจ้งเตือน (Alert Box) */}
        {message.text && (
          <div className={`mt-6 p-4 rounded-lg text-sm text-center font-medium flex items-center justify-center gap-2 animate-fade-in-up ${
            message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* 👇 4. นำ AlertModal มาวางไว้ล่างสุดของหน้าจอ */}
       <AlertModal 
         isOpen={modalConfig.isOpen}
         type={modalConfig.type}
         title={modalConfig.title}
         message={modalConfig.message}
         onClose={modalConfig.onConfirm}
       />

      </div>
    </div>
  );
}

export default AuthPage;