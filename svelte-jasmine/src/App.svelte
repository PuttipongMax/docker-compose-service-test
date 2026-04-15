<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { db } from './db.js';
  import { io } from 'socket.io-client';

  let videoElement;
  let canvasElement;
  let scansCount = 0;
  let stream;
  let errorMsg = '';
  
  // ตัวแปรสำหรับ Socket และ Live Stream
  const NGINX_URL = '/'; 
  let socket;
  let broadcastInterval; 
  
  // ตัวแปรเช็คสถานะ
  let isCheckingAuth = true;
  let hasMediaPermission = false; 
  let isPermissionDenied = false; // ⭐ เพิ่มตัวแปรเช็คว่าโดนบล็อกสิทธิ์ไหม

  // ⭐ เพิ่มตัวแปรสถานะการเปิด/ปิด ของกล้องและไมค์
  let isVideoEnabled = true;
  let isAudioEnabled = true;

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

    socket = io(NGINX_URL, {
      path: '/socket.io/',
      auth: { token: myToken }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
      if (err.message.includes('Authentication error')) {
        alert("เซสชันหมดอายุ กรุณาล็อกอินใหม่");
        localStorage.removeItem('token');
        window.location.href = '/auth';
      }
    });

    loadOfflineCount();
  });

  const requestMediaPermissions = async () => {
    errorMsg = '';
    isPermissionDenied = false;
    
    try {
      // ⭐ แก้จุดที่ 1: ใช้ ideal เพื่อบอกว่า "ขอกล้องหลังนะ แต่ถ้าไม่มี (เช่น เล่นบนคอม) เอากล้องอะไรมาก็ได้"
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: true 
      });

      // ⭐ แก้จุดที่ 2: เปลี่ยนสถานะให้ Svelte วาดแท็ก <video> ขึ้นมาบนจอก่อน
      hasMediaPermission = true; 

      // ⭐ แก้จุดที่ 3: รอเศษเสี้ยววินาที ให้ UI วาดเสร็จก่อน ค่อยเอาภาพยัดใส่กล่อง
      await tick();

      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.muted = true; 
      }

      hasMediaPermission = true; 

      broadcastInterval = setInterval(() => {
        // ถ้าปิดกล้องอยู่ ไม่ต้องดึงภาพส่งไป
        if (!videoElement || !canvasElement || !socket.connected || !isVideoEnabled) return;
        
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        const ctx = canvasElement.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        
        const liveFrame = canvasElement.toDataURL('image/jpeg', 0.3);
        socket.emit('video-frame', liveFrame);
      }, 150);

    } catch (err) {
      console.error("Error accessing media:", err);
      isPermissionDenied = true; // ⭐ แจ้งระบบว่าโดนบล็อก
    }
  };

  // ⭐ ฟังก์ชันเปิด/ปิดกล้อง
  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        isVideoEnabled = !isVideoEnabled; // สลับสถานะ
        videoTrack.enabled = isVideoEnabled; // สั่งเปิด/ปิด Track
      }
    }
  };

  // ⭐ ฟังก์ชันเปิด/ปิดไมค์
  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        isAudioEnabled = !isAudioEnabled; // สลับสถานะ
        audioTrack.enabled = isAudioEnabled; // สั่งเปิด/ปิด Track
      }
    }
  };

  onDestroy(() => {
    if (broadcastInterval) clearInterval(broadcastInterval); 
    if (stream) stream.getTracks().forEach(track => track.stop()); 
    if (socket) socket.disconnect(); 
  });

  const captureAndSaveOffline = async () => {
    if (!videoElement || !isVideoEnabled) {
      alert("กรุณาเปิดกล้องก่อนถ่ายภาพ");
      return;
    }

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
      <video 
        bind:this={videoElement} 
        autoplay 
        playsinline 
        muted
        style="width: 100%; border-radius: 8px; background-color: #000; box-shadow: 0 4px 6px rgba(0,0,0,0.5); opacity: {isVideoEnabled ? 1 : 0.3}; transition: opacity 0.3s;" 
      ></video>
      
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