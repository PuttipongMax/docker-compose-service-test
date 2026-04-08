import React, { useState, useRef, useEffect } from 'react';

// ==========================================
// 1. Component เครื่องเล่นเสียง (AudioPlayer)
// ==========================================
// function AudioPlayer({ filename }) {
//   const audioUrl = `http://localhost:3000/api/audio/download/${filename}`;

//   return (
//     <div className="p-4 mt-6 bg-gray-900 border border-gray-700 rounded-md shadow-inner">
//       <h3 className="mb-3 text-sm font-semibold text-gray-300">
//         🎵 เล่นไฟล์เสียง: <span className="text-white truncate">{filename}</span>
//       </h3>
//       <audio controls src={audioUrl} className="w-full outline-none rounded-md">
//         เบราว์เซอร์ของคุณไม่รองรับการเล่นไฟล์เสียง
//       </audio>
//     </div>
//   );
// }

// ==========================================
// 🛡️ Component เครื่องเล่นเสียงแบบแนบ Token (ปลอดภัย 100%)
// ==========================================
function SecureAudioPlayer({ filename, label }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    if (!filename) return;

    const fetchAudio = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // 1. ใช้ fetch() เพื่อให้สามารถแนบ Token ไปให้ Gateway (ยาม) ตรวจได้
        const response = await fetch(`http://localhost:3000/api/audio/download/${filename}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("โหลดไฟล์ไม่ได้");

        // 2. แปลงไฟล์ที่โหลดมาให้เป็นก้อนข้อมูล (Blob)
        const blob = await response.blob();
        
        // 3. สร้าง URL จำลอง (Object URL) จากก้อนข้อมูลนั้น เพื่อให้แท็ก <audio> รู้จัก
        const objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
        
      } catch (error) {
        console.error("Error:", error);
        setHasError(true);
      }
    };

    fetchAudio();
  }, [filename]);

  if (hasError) return <p className="mt-2 text-xs text-red-400">❌ โหลดไฟล์ไม่ได้ (ติด Token)</p>;
  if (!audioUrl) return <p className="mt-2 text-xs text-gray-400">⏳ กำลังโหลด {label}...</p>;

  return (
    <div>
      <p className="mb-1 text-xs text-gray-400">{label}</p>
      <audio controls src={audioUrl} className="w-full h-8 transition-opacity opacity-80 hover:opacity-100" />
    </div>
  );
}

// ==========================================
// 2. Component หลัก (AudioAnalyzer)
// ==========================================
const AudioAnalyzer = () => {
  const [inputMode, setInputMode] = useState('file');
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [result, setResult] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [error, setError] = useState('');

  // 🟢 State สำหรับเก็บรายการเพลงในระบบ
  const [songHistory, setSongHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const pollingInterval = useRef(null);

  // 🟢 useEffect ดึงข้อมูลคลังเพลงทันทีที่เปิดหน้าเว็บ
  useEffect(() => {
    fetchSongHistory();
  }, []);

  // 🟢 ฟังก์ชันไปดึงข้อมูลจาก Database (ผ่าน API)
  const fetchSongHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      // สมมติว่ามี API ดึงประวัติที่ /api/audio/history
      const response = await fetch('http://localhost:3000/api/audio/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSongHistory(data); // คาดหวังว่า data จะเป็น Array ของเพลง
      }
    } catch (err) {
      console.error('ไม่สามารถดึงข้อมูลคลังเพลงได้:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

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

  const startPolling = async (taskId, token) => {
    setLoadingText('กำลังให้ AI วิเคราะห์... (อาจใช้เวลา 1-3 นาที)');
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/audio/status/${taskId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();

        if (data.status === 'completed') {
          setIsLoading(false);
          setResult(data.result);
          if (data.result.source === 'YouTube' && data.result.video_title) {
            setVideoTitle(data.result.video_title);
          }
          // 🟢 อัปเดตรายการเพลงด้านบนใหม่ หลังจากวิเคราะห์เสร็จ!
          fetchSongHistory();
        } else if (data.status === 'error') {
          setIsLoading(false);
          throw new Error(data.detail || 'เกิดข้อผิดพลาดในการวิเคราะห์เบื้องหลัง');
        } else {
          attempts++;
          if (data.message) setLoadingText(data.message);
          
          const nextWaitTime = attempts < 10 ? 3000 : 8000;
          pollingInterval.current = setTimeout(poll, nextWaitTime);
        }
      } catch (err) {
        if (attempts < 50) { 
           attempts++;
           pollingInterval.current = setTimeout(poll, 5000); 
        } else {
           setIsLoading(false);
           setError(err.message || 'เน็ตเวิร์คตัดการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง');
        }
      }
    };

    poll();
  };

  useEffect(() => {
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

  return (
    <div className="max-w-2xl p-6 mx-auto mt-10 text-white bg-gray-900 shadow-2xl rounded-xl">
      <h2 className="mb-2 text-2xl font-bold text-center text-blue-400">🎙️ AI Audio Analyzer</h2>
      <p className="mb-6 text-sm text-center text-gray-400">แยกเสียงนักร้องและวิเคราะห์หา High Note สูงสุดของเพลง</p>

      {/* ========================================== */}
      {/* 🟢 ส่วนแสดงรายการเพลงในระบบ (Library) */}
      {/* ========================================== */}
      <div className="p-4 mb-8 border border-gray-700 bg-gray-800/50 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-green-400">📚 คลังเพลงในระบบ</h3>
          <button onClick={fetchSongHistory} className="text-xs text-gray-400 hover:text-white" title="รีเฟรชข้อมูล">
            🔄 รีเฟรช
          </button>
        </div>
        
        {isLoadingHistory ? (
          <p className="py-4 text-sm text-center text-gray-400">กำลังโหลดข้อมูล...</p>
        ) : songHistory.length === 0 ? (
          <p className="py-4 text-sm text-center text-gray-500">ยังไม่มีข้อมูลเพลงในระบบ</p>
        ) : (
          <div className="overflow-y-auto space-y-2 max-h-48 pr-1 custom-scrollbar">
            {songHistory.map((song, index) => (
              <div key={index} className="flex flex-col p-3 transition-colors border border-gray-800 rounded-lg bg-gray-900 hover:bg-gray-800 hover:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-2/3 pr-4 truncate">
                    <p className="text-sm font-medium text-white truncate" title={song.file_name || song.video_title}>
                      {song.file_name || song.video_title || "Unknown Audio"}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${song.source === 'YouTube' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                      {song.source || 'File'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                      {song.highest_note || "-"}
                    </span>
                    <p className="text-xs text-gray-500">{song.highest_frequency_hz || song.highest_hz || 0} Hz</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 mt-2 lg:grid-cols-2">
                  {/* 🟢 เครื่องเล่น: เพลงต้นฉบับ (Original) */}
                  {/* 🟢 เรียกใช้ SecureAudioPlayer: เพลงต้นฉบับ (Original) */}
                  {song.original_file && (
                     <SecureAudioPlayer 
                        filename={song.original_file} 
                        label="💿 ต้นฉบับ (Original)" 
                     />
                  )}

                  {/* 🎤 เรียกใช้ SecureAudioPlayer: เสียงร้อง (Vocals) */}
                  {song.play_file && (
                     <SecureAudioPlayer 
                        filename={song.play_file} 
                        label="🎤 เสียงร้อง (Vocals)" 
                     />
                  )}
                </div>
                
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="mb-6 border-gray-700" />

      {/* ========================================== */}
      {/* ส่วนเครื่องมือวิเคราะห์ (อัปโหลด / YouTube) */}
      {/* ========================================== */}
      <div className="flex justify-center max-w-md p-1 mx-auto mb-6 bg-gray-800 rounded-lg">
        <button onClick={() => setInputMode('file')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${inputMode === 'file' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>📂 อัปโหลดไฟล์เสียง</button>
        <button onClick={() => setInputMode('youtube')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors ${inputMode === 'youtube' ? 'bg-red-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}>📺 ลิงก์ YouTube</button>
      </div>

      <div className="flex flex-col items-center gap-4 mb-8">
        {inputMode === 'file' ? (
          <label className="flex flex-col items-center w-full max-w-md px-4 py-6 tracking-wide text-blue-400 uppercase transition-colors duration-200 border border-blue-500 rounded-lg shadow-lg cursor-pointer bg-gray-800 hover:bg-blue-500 hover:text-white">
            <span className="mt-2 text-base leading-normal text-center">{file ? file.name : 'เลือกไฟล์เสียง (.wav, .mp3)'}</span>
            <input type="file" accept=".wav,.mp3" className="hidden" onChange={handleFileChange} />
          </label>
        ) : (
          <div className="w-full max-w-md">
            <input type="text" placeholder="วางลิงก์ YouTube ที่นี่..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full px-4 py-4 text-white placeholder-gray-500 bg-gray-800 border border-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        )}

        <button 
          onClick={handleAnalyze} 
          disabled={(inputMode === 'file' && !file) || (inputMode === 'youtube' && !youtubeUrl) || isLoading}
          className={`w-full max-w-md py-3 rounded-lg font-bold text-white transition-all ${((inputMode === 'file' && !file) || (inputMode === 'youtube' && !youtubeUrl) || isLoading) ? 'bg-gray-600 cursor-not-allowed' : inputMode === 'youtube' ? 'bg-gradient-to-r from-red-500 to-orange-600 hover:scale-105' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-105'}`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {loadingText}
            </span>
          ) : '🚀 เริ่มวิเคราะห์ High Note!'}
        </button>
      </div>

      {error && <div className="p-4 mb-6 text-red-100 bg-red-900 border-l-4 border-red-500 rounded"><p>⚠️ {error}</p></div>}

      {/* ========================================== */}
      {/* ส่วนแสดงผลลัพธ์การวิเคราะห์ */}
      {/* ========================================== */}
      {result && (
        <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg animate-fade-in-up">
          <h3 className="pb-2 mb-4 text-xl font-bold border-b border-gray-700 text-green-400">📊 ผลการวิเคราะห์เสียงล่าสุด</h3>
          {videoTitle && <p className="p-2 mb-4 text-sm text-gray-300 truncate bg-gray-900 rounded">📺 <span className="font-semibold text-white">{videoTitle}</span></p>}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 text-center bg-gray-900 rounded-lg shadow-inner">
              <p className="mb-1 text-sm text-gray-400">High Note ทรงพลังที่สุด</p>
              <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">{result.highest_note}</p>
            </div>
            <div className="p-4 text-center bg-gray-900 rounded-lg shadow-inner">
              <p className="mb-1 text-sm text-gray-400">ความถี่ (Frequency)</p>
              <p className="text-3xl font-bold text-blue-300">{result.highest_frequency_hz} <span className="text-lg text-gray-500">Hz</span></p>
            </div>
          </div>

          {/* 🟢 เรียกใช้ AudioPlayer ตรงผลลัพธ์ล่าสุด */}
          {result.play_file && (
            <AudioPlayer play_file={result.play_file} />
          )}
        </div>
      )}
    </div>
  );
};

export default AudioAnalyzer;