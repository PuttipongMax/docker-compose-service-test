<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { db } from './db.js';

  let videoElement;
  let canvasElement; // ใช้สำหรับดึงภาพส่งให้ Server
  let overlayCanvasElement; // ⭐ เพิ่มใหม่: ใช้สำหรับวาดกรอบสี่เหลี่ยมทับบนวิดีโอ
  let scansCount = 0;
  let stream;
  let errorMsg = '';
  
  // ⭐ ตั้งค่า URL สำหรับ Python WebSocket (พอร์ต 8003 ตามที่คุณกำหนด)
  // ใช้ window.location.hostname เพื่อให้รองรับเวลาเปิดผ่านมือถือในวง LAN เดียวกัน
  const WS_URL = `ws://${window.location.hostname}:8003/ws/scanner`; 
  let socket;
  
  // ตัวแปรเช็คสถานะ
  let isCheckingAuth = true;
  let hasMediaPermission = false; 
  let isPermissionDenied = false;
  let isVideoEnabled = true;
  let isAudioEnabled = true;

  // ⭐ ตัวแปรควบคุมการส่งภาพ (Ping-Pong)
  let isProcessing = false; 
  let streamingLoopId;

  const loadOfflineCount = async () => {
    scansCount = await db.scans.where('is_synced').equals(0).count();
  };

  onMount(async () => {
    const myToken = localStorage.getItem('token'); 
    if (!myToken) {
      alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
      window.location.href = '/auth'; 
      return; 
    }

    isCheckingAuth = false;

    // ⭐ 1. สร้างการเชื่อมต่อ Native WebSocket (ส่ง Token ไปทาง Query String)
    socket = new WebSocket(`${WS_URL}?token=${myToken}`);

    socket.onopen = () => {
      console.log('✅ เชื่อมต่อ WebSocket สำเร็จ');
    };

    // ⭐ 2. รอรับผลลัพธ์จาก Python AI
    socket.onmessage = (event) => {
      try {
        const aiResult = JSON.parse(event.data);
        drawBoundingBox(aiResult); // นำข้อมูลไปวาดกรอบ
      } catch (e) {
        console.error("Error parsing AI result", e);
      } finally {
        isProcessing = false; // ปลดล็อกให้ส่งเฟรมต่อไปได้
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    socket.onclose = (event) => {
      console.log('🔴 WebSocket ปิดการเชื่อมต่อ', event.code);
      if (event.code === 4001 || event.code === 4003) { // สมมติว่า 400x คือ Token หมดอายุจากฝั่ง Python
        alert("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
        localStorage.removeItem('token');
        window.location.href = '/auth';
      }
    };

    loadOfflineCount();
  });

  const requestMediaPermissions = async () => {
    errorMsg = '';
    isPermissionDenied = false;
    
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: true 
      });

      hasMediaPermission = true; 
      await tick();

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.muted = true; 
      }

      // เริ่มต้นลูปส่งภาพ
      startStreamingLoop();

    } catch (err) {
      console.error("Error accessing media:", err);
      isPermissionDenied = true;
    }
  };

  // ⭐ 3. ฟังก์ชันดึงภาพและส่งไปแบบ Binary
  const sendFrameToServer = () => {
    // ถ้าปิดกล้อง, Socket ยังไม่พร้อม, หรือกำลังประมวลผลรูปเก่าอยู่ -> ให้ข้ามไปเลย
    if (!videoElement || !canvasElement || socket?.readyState !== WebSocket.OPEN || !isVideoEnabled || isProcessing) {
      return;
    }

    isProcessing = true; // ล็อกสถานะไว้ รอจนกว่า AI จะตอบกลับ

    // ดึงภาพลง Canvas
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    
    // แปลงภาพเป็น Binary (Blob) แบบบีบอัด 50% แล้วส่งเข้า WebSocket ทันที
    canvasElement.toBlob((blob) => {
      if (blob) {
        socket.send(blob);
      } else {
        isProcessing = false; // ถ้าแปลงภาพพลาด ให้ปลดล็อก
      }
    }, 'image/jpeg', 0.5); 
  };

  // ลูปควบคุมการส่งภาพที่ปลอดภัยกว่า setInterval
  const startStreamingLoop = () => {
    const loop = () => {
      sendFrameToServer();
      // เรียกตัวเองซ้ำไปเรื่อยๆ (เบราว์เซอร์จะจัดการความเร็วให้เหมาะสม)
      streamingLoopId = requestAnimationFrame(loop); 
    };
    streamingLoopId = requestAnimationFrame(loop);
  };

  // ⭐ 4. ฟังก์ชันวาดกรอบสี่เหลี่ยม (Bounding Box) ทับบนจอ
  const drawBoundingBox = (aiResult) => {
    if (!overlayCanvasElement || !videoElement) return;

    overlayCanvasElement.width = videoElement.videoWidth;
    overlayCanvasElement.height = videoElement.videoHeight;
    const ctx = overlayCanvasElement.getContext('2d');
    
    // ล้างภาพวาดเก่าออกก่อน
    ctx.clearRect(0, 0, overlayCanvasElement.width, overlayCanvasElement.height);

    // สมมติว่า Python ส่งข้อมูลกลับมาในรูปแบบ { objects: [{label: "ดอกตูม", x: 50, y: 50, w: 100, h: 100}] }
    if (aiResult.objects && aiResult.objects.length > 0) {
      aiResult.objects.forEach(obj => {
        // วาดกรอบสี่เหลี่ยม
        ctx.strokeStyle = '#00FF00'; // สีเขียว
        ctx.lineWidth = 3;
        ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

        // วาดพื้นหลังข้อความ
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(obj.x, obj.y - 25, 120, 25);

        // วาดข้อความ (ชื่อระยะดอกมะลิ)
        ctx.fillStyle = '#000000';
        ctx.font = '16px sans-serif';
        ctx.fillText(obj.label, obj.x + 5, obj.y - 7);
      });
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        isVideoEnabled = !isVideoEnabled; 
        videoTrack.enabled = isVideoEnabled; 
      }
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        isAudioEnabled = !isAudioEnabled; 
        audioTrack.enabled = isAudioEnabled; 
      }
    }
  };

  onDestroy(() => {
    if (streamingLoopId) cancelAnimationFrame(streamingLoopId); 
    if (stream) stream.getTracks().forEach(track => track.stop()); 
    if (socket) socket.close(); 
  });

  const captureAndSaveOffline = async () => {
    if (!videoElement || !isVideoEnabled) {
      alert("กรุณาเปิดกล้องก่อนถ่ายภาพ");
      return;
    }
    // (เก็บโค้ดถ่ายภาพ Offline ไว้เหมือนเดิม)
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    const ctx = canvasElement.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    const base64Image = canvasElement.toDataURL('image/jpeg', 0.7);

    try {
      await db.scans.add({
        stage: "ตูมร้อยมาลัย",
        image_data: base64Image,
        timestamp: new Date().toISOString(),
        is_synced: 0
      });
      alert('📸 บันทึกข้อมูลลงเครื่อง (Offline) สำเร็จ!');
      loadOfflineCount();
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };
</script>

{#if isCheckingAuth}
  <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; color: white;">
    <h3>กำลังตรวจสอบสิทธิ์...</h3>
  </div>
{:else}
  <main style="max-width: 400px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
    <h2 style="text-align: center; color: white;">Jasmine Scanner</h2>
    
    {#if isPermissionDenied}
      <div style="background: white; padding: 30px; border-radius: 12px; text-align: center; margin-top: 20px;">
        <h2 style="color: #d32f2f; margin-top: 0;">⚠️ ไม่สามารถเข้าถึงกล้องได้</h2>
        <p style="color: #333;">ดูเหมือนว่าคุณจะเคยปฏิเสธการเข้าถึงกล้องไว้ครับ</p>
        <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left; color: #333;">
          <strong>วิธีแก้ไขง่ายๆ:</strong>
          <ol style="margin-bottom: 0; padding-left: 20px;">
            <li>คลิกที่ไอคอน <strong>🔒 กุญแจ</strong> หรือ <strong>📷 กล้องกากบาท</strong> บนแถบ URL ด้านบนสุดของหน้าจอ</li>
            <li>หาหัวข้อ "Camera (กล้อง)" และ "Microphone (ไมโครโฟน)"</li>
            <li>เปลี่ยนจาก <strong>Block (บล็อก)</strong> เป็น <strong>Allow (อนุญาต)</strong></li>
            <li>รีเฟรชหน้านี้อีกครั้ง</li>
          </ol>
        </div>
      </div>
    {:else if !hasMediaPermission}
      <div style="margin-top: 30px; background-color: #333; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
        <p style="color: #eee; margin-bottom: 20px; font-size: 15px; line-height: 1.5;">
          แอปพลิเคชันจำเป็นต้องเข้าถึง <strong>กล้องและไมโครโฟน</strong> เพื่อทำการสแกนและสตรีมมิ่ง
        </p>
        <button 
          on:click={requestMediaPermissions}
          style="width: 100%; padding: 14px; font-size: 16px; background-color: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;"
        >
          🔐 อนุญาตใช้งานกล้องและไมค์
        </button>
      </div>
    {:else}
      <div style="position: relative; width: 100%; border-radius: 8px; overflow: hidden; background-color: #000; box-shadow: 0 4px 6px rgba(0,0,0,0.5);">
        
        <video 
          bind:this={videoElement} 
          autoplay 
          playsinline 
          muted
          style="width: 100%; display: block; opacity: {isVideoEnabled ? 1 : 0.3}; transition: opacity 0.3s;" 
        ></video>

        <canvas 
          bind:this={overlayCanvasElement} 
          style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; opacity: {isVideoEnabled ? 1 : 0};"
        ></canvas>

      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 15px;">
        <button 
          on:click={toggleVideo}
          style="flex: 1; padding: 12px; font-size: 14px; background-color: {isVideoEnabled ? '#4CAF50' : '#757575'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s;"
        >
          {isVideoEnabled ? '📹 ปิดกล้อง' : '🚫 เปิดกล้อง'}
        </button>
        
        <button 
          on:click={toggleAudio}
          style="flex: 1; padding: 12px; font-size: 14px; background-color: {isAudioEnabled ? '#2196F3' : '#757575'}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s;"
        >
          {isAudioEnabled ? '🎤 ปิดไมค์' : '🔇 เปิดไมค์'}
        </button>
      </div>

      <canvas bind:this={canvasElement} style="display: none;"></canvas>

      <div style="margin-top: 15px;">
        <button 
          on:click={captureAndSaveOffline}
          style="width: 100%; padding: 14px; font-size: 16px; background-color: {isVideoEnabled ? '#ff3e00' : '#555'}; color: {isVideoEnabled ? 'white' : '#888'}; border: none; border-radius: 8px; cursor: {isVideoEnabled ? 'pointer' : 'not-allowed'}; font-weight: bold; transition: 0.3s;"
          disabled={!isVideoEnabled}
        >
          📸 ถ่ายภาพ & บันทึก (Offline)
        </button>
      </div>
    {/if}

    {#if !isPermissionDenied}
    <div style="margin-top: 30px; padding: 15px; background-color: #222; border-radius: 8px; border: 1px solid #444; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">
      <h3 style="margin-top: 0; font-size: 16px; color: #eee;">📦 ข้อมูลในเครื่อง (Offline DB)</h3>
      <p style="font-size: 14px; color: #aaa;">ข้อมูลรอส่งขึ้น Server: <strong style="color: #ff3e00; font-size: 18px;">{scansCount}</strong> รายการ</p>
      
      <button style="width: 100%; padding: 10px; background-color: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px;">
        ☁️ ยืนยันข้อมูล (รอต่อ API)
      </button>
    </div>
    {/if}

  </main>
{/if}