import React, { useState } from 'react';

export default function App() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ฟังก์ชันยิง API ไปแปลภาษา
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      // 💡 ดึง Token ออกมา (ถ้าทำระบบ Login ด้วย Spring Boot เสร็จแล้ว)
      const token = localStorage.getItem('token');

      // ยิงไปที่ Express API Gateway (Port 3000)
      const response = await fetch('http://localhost:3000/api/language/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 👈 ปลดคอมเมนต์เมื่อมี Auth
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (response.status === 401) {
        throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน');
      }

      if (!response.ok) {
        throw new Error('เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
      }

      const data = await response.json();
      setResult(data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔊 ฟังก์ชันสั่งเบราว์เซอร์ให้อ่านออกเสียง
  const playAudio = (text, lang) => {
    if ('speechSynthesis' in window) {
      // สั่งเคลียร์คิวเสียงเก่าทิ้งก่อน เผื่อกดรัวๆ
      window.speechSynthesis.cancel(); 
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; // กำหนดภาษา (เช่น zh-CN, en-US, th-TH)
      utterance.rate = 0.9;  // ลดความเร็วลงนิดนึง (0.1 - 10) จะได้ฟังชัดๆ
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('ขออภัยครับ เบราว์เซอร์ของคุณไม่รองรับระบบเสียง');
    }
  };

  // ฟังก์ชันจำลองการบันทึกคำศัพท์ลง Supabase/PostgreSQL
  const handleSaveToDB = async () => {
    if (!result) return;
    
    try {
      // ตรงนี้จะยิงไปหา Express Gateway เพื่อให้ Gateway insert ลง DB
      console.log('ข้อมูลที่จะบันทึก:', result);
      alert('บันทึกคำศัพท์ลงฐานข้อมูลสำเร็จ! (จำลอง)');
      
      // ตัวอย่างการยิง API จริง:
      /*
      await fetch('http://localhost:3000/api/vocabularies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(result)
      });
      */
    } catch (err) {
      alert('บันทึกไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🇨🇳 ตัวช่วยฝึกภาษาจีนกลาง
          </h1>
          <p className="text-gray-600">
            พิมพ์ภาษาไทย, อังกฤษ, หรือจีน เพื่อดูคำแปลและพินอิน
          </p>
        </div>

        {/* Input Section */}
        <div className="mb-6">
          <textarea
            className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg"
            placeholder="พิมพ์คำศัพท์ที่ต้องการเรียนรู้..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTranslate();
              }
            }}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleTranslate}
          disabled={isLoading || !inputText.trim()}
          className={`w-full py-3 rounded-lg text-white font-semibold text-lg transition-colors
            ${isLoading || !inputText.trim() 
              ? 'bg-blue-300 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'}`}
        >
          {isLoading ? 'กำลังประมวลผล...' : 'แปลภาษา'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-center">
            {error}
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="mt-8 border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <span className="text-sm text-gray-500 font-medium">
                ตรวจพบภาษา: <span className="text-blue-600">{result.detected_lang}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ฝั่งซ้าย: จีน & พินอิน */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">ภาษาจีน (Hanzi)</label>
                  <p className="text-4xl font-medium text-gray-900 mt-1">{result.chinese_word}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">พินอิน (Pinyin)</label>
                  <p className="text-xl text-blue-600 font-medium mt-1">{result.pinyin}</p>
                  {/* เพิ่มคำอ่านพินอินตรงนี้ */}
                  {result.pinyin_reading && (
                    <p className="text-md text-gray-500 mt-1">คำอ่าน: {result.pinyin_reading}</p>
                  )}
                  {/* ปุ่มฟังเสียงจีน */}
                  <button 
                    onClick={() => playAudio(result.chinese_word, 'zh-CN')}
                    className="p-2 text-blue-500 hover:bg-blue-100 rounded-full transition-colors"
                    title="ฟังเสียงภาษาจีน"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ฝั่งขวา: ไทย & อังกฤษ */}
              <div className="space-y-4 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-200">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">ภาษาไทย</label>
                  <p className="text-lg text-gray-800 mt-1">{result.thai_meaning}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">English</label>
                  <p className="text-lg text-gray-800 mt-1">{result.english_meaning}</p>
                  {/* เพิ่มคำอ่านอังกฤษตรงนี้ */}
                  {result.english_reading && (
                    <p className="text-md text-gray-500 mt-1">คำอ่าน: {result.english_reading}</p>
                  )}
                  {/* ปุ่มฟังเสียงอังกฤษ */}
                  <button 
                    onClick={() => playAudio(result.english_meaning, 'en-US')}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                    title="ฟังเสียงภาษาอังกฤษ"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveToDB}
              className="mt-8 w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
              </svg>
              บันทึกคำศัพท์นี้
            </button>
          </div>
        )}

      </div>
    </div>
  );
}