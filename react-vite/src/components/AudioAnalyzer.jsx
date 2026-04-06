import React, { useState, useRef } from 'react';

const AudioAnalyzer = () => {
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [result, setResult] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [error, setError] = useState('');

  // ใช้สำหรับเก็บ timer ID จะได้สั่งหยุดได้
  const pollingInterval = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.name.endsWith('.wav') || selectedFile.name.endsWith('.mp3'))) {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      setError('กรุณาเลือกไฟล์นามสกุล .wav หรือ .mp3 เท่านั้นครับ 🎵');
    }
  };

 // 🔄 ฟังก์ชันแวะมาถามสถานะคิว (Polling แบบชาญฉลาดและใจเย็นขึ้น)
  const startPolling = async (taskId, token) => {
    setLoadingText('กำลังให้ AI วิเคราะห์... (อาจใช้เวลา 1-3 นาที)');
    
    let attempts = 0;
    
    // สร้างฟังก์ชันถาม (Recursive timeout แทน interval เพื่อควบคุมเวลาได้ยืดหยุ่นกว่า)
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/audio/status/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();

        if (data.status === 'completed') {
          // 🎉 เสร็จแล้ว! โชว์ผลลัพธ์
          setIsLoading(false);
          setResult(data.result);
          if (data.result.source === 'YouTube' && data.result.video_title) {
            setVideoTitle(data.result.video_title);
          }
        } else if (data.status === 'error') {
          // 🔴 งานพัง! โชว์ Error
          setIsLoading(false);
          throw new Error(data.detail || 'เกิดข้อผิดพลาดในการวิเคราะห์เบื้องหลัง');
        } else {
          // ⏳ ยังเป็น 'processing' ให้ถามใหม่รอบหน้า
          attempts++;
          // 🚀 อัปเดตหน้าจอให้แสดงข้อความล่าสุดจาก Python
          if (data.message) {
            setLoadingText(data.message);
          }
          // ทริคสำคัญ: ถ้ายิ่งถามเยอะ ให้ยิ่งรอนานขึ้น (หนีการโดน Chrome บล็อก)
          // - 10 ครั้งแรก (30 วินาที): ถามทุกๆ 3 วินาที
          // - หลังจากนั้น: ถามทุกๆ 8 วินาที
          const nextWaitTime = attempts < 10 ? 3000 : 8000;
          
          // สั่งให้รอและเรียกตัวเองใหม่
          pollingInterval.current = setTimeout(poll, nextWaitTime);
        }
        
      } catch (err) {
        // ถ้าระหว่างถามเกิดหลุด ให้ลองถามใหม่ได้อีก อย่าเพิ่งยอมแพ้ (Retry)
        if (attempts < 50) { 
           attempts++;
           pollingInterval.current = setTimeout(poll, 5000); // รอ 5 วิแล้วลุยใหม่
        } else {
           setIsLoading(false);
           setError(err.message || 'เน็ตเวิร์คตัดการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
        }
      }
    };

    // เริ่มถามครั้งแรกทันที
    poll();
  };

  // ทำลาย Timeout ทิ้งถ้าผู้ใช้ออกจากหน้านี้ (กันบั๊กหน่วยความจำรั่ว)
  React.useEffect(() => {
    return () => {
      if (pollingInterval.current) clearTimeout(pollingInterval.current);
    };
  }, []);

  const handleAnalyze = async () => {
    if (inputMode === 'file' && !file) return;
    if (inputMode === 'youtube' && !youtubeUrl.trim()) return;

    setIsLoading(true);
    setResult(null);
    setVideoTitle('');
    setError('');
    setLoadingText('กำลังส่งข้อมูลให้เซิร์ฟเวอร์...');

    try {
      const token = localStorage.getItem('token'); 
      let response;

      if (inputMode === 'file') {
        const formData = new FormData();
        formData.append('file', file);
        
        response = await fetch('http://localhost:3000/api/audio/analyze', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });
      } else {
        response = await fetch('http://localhost:3000/api/audio/youtube', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: youtubeUrl }),
        });
      }

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || errData.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
      }

      const data = await response.json();
      
      // 🎫 ได้รับบัตรคิวมาแล้ว! เริ่มการ Polling
      if (data.status === 'accepted' && data.task_id) {
        startPolling(data.task_id, token);
      } else {
        throw new Error('ไม่สามารถรับหมายเลขคิวได้');
      }

    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setError(err.message || 'ไม่สามารถเชื่อมต่อระบบวิเคราะห์เสียงได้');
    }
  };

  // ทำลาย Interval ทิ้งถ้าผู้ใช้ออกจากหน้านี้ (กันบั๊ก)
  React.useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-xl shadow-2xl text-white mt-10">
      <h2 className="text-2xl font-bold mb-2 text-center text-blue-400">🎙️ AI Audio Analyzer</h2>
      <p className="text-gray-400 text-center mb-8 text-sm">แยกเสียงนักร้องและวิเคราะห์หา High Note สูงสุดของเพลง</p>

      <div className="flex justify-center mb-6 bg-gray-800 rounded-lg p-1 max-w-md mx-auto">
        <button onClick={() => setInputMode('file')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${inputMode === 'file' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>📂 อัปโหลดไฟล์เสียง</button>
        <button onClick={() => setInputMode('youtube')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${inputMode === 'youtube' ? 'bg-red-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>📺 ลิงก์ YouTube</button>
      </div>

      <div className="flex flex-col items-center gap-4 mb-8">
        {inputMode === 'file' ? (
          <label className="w-full max-w-md flex flex-col items-center px-4 py-6 bg-gray-800 text-blue-400 rounded-lg shadow-lg tracking-wide uppercase border border-blue-500 cursor-pointer hover:bg-blue-500 hover:text-white transition-colors duration-200">
            <span className="mt-2 text-base leading-normal text-center">{file ? file.name : 'เลือกไฟล์เสียง (.wav, .mp3)'}</span>
            <input type="file" accept=".wav,.mp3" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="w-full max-w-md">
            <input type="text" placeholder="วางลิงก์ YouTube ที่นี่..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full px-4 py-4 bg-gray-800 border border-red-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        )}

        <button 
          onClick={handleAnalyze} 
          disabled={(inputMode === 'file' && !file) || (inputMode === 'youtube' && !youtubeUrl) || isLoading}
          className={`w-full max-w-md py-3 rounded-lg font-bold text-white transition-all ${((inputMode === 'file' && !file) || (inputMode === 'youtube' && !youtubeUrl) || isLoading) ? 'bg-gray-600 cursor-not-allowed' : inputMode === 'youtube' ? 'bg-gradient-to-r from-red-500 to-orange-600 hover:scale-105' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-105'}`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {loadingText}
            </span>
          ) : '🚀 เริ่มวิเคราะห์ High Note!'}
        </button>
      </div>

      {error && <div className="bg-red-900 border-l-4 border-red-500 text-red-100 p-4 mb-6 rounded"><p>⚠️ {error}</p></div>}

      {result && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 animate-fade-in-up">
          <h3 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2 text-green-400">📊 ผลการวิเคราะห์เสียง</h3>
          {videoTitle && <p className="text-gray-300 text-sm mb-4 bg-gray-900 p-2 rounded truncate">📺 <span className="font-semibold text-white">{videoTitle}</span></p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 p-4 rounded-lg text-center shadow-inner">
              <p className="text-gray-400 text-sm mb-1">High Note ทรงพลังที่สุด</p>
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">{result.highest_note}</p>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg text-center shadow-inner">
              <p className="text-gray-400 text-sm mb-1">ความถี่ (Frequency)</p>
              <p className="text-3xl font-bold text-blue-300">{result.highest_frequency_hz} <span className="text-lg text-gray-500">Hz</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioAnalyzer;