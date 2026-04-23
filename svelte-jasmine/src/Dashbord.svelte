<script>
  import { onMount, onDestroy } from 'svelte';
  
  const DASHBOARD_WS_URL = `ws://${window.location.hostname}:8003/ws/dashboard`; 
  let socket;
  let scannersData = {}; // เก็บข้อมูลจำแนกตาม ID เครื่อง

  onMount(() => {
    socket = new WebSocket(DASHBOARD_WS_URL);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // สมมติว่า Python ส่งมาแบบ: { scanner_id: '001', stats: { 'ดอกตูม': 5, 'ดอกบาน': 2 } }
      
      if (data.type === 'update') {
        // อัปเดตข้อมูลของ Scanner เครื่องนั้นๆ ลงหน้าจอ
        scannersData[data.scanner_id] = data.stats;
      }
    };
  });

  onDestroy(() => {
    if (socket) socket.close();
  });
</script>

<main>
  <h1>ศูนย์ควบคุม AI Jasmine</h1>
  
  <div class="grid-container">
    {#each Object.entries(scannersData) as [id, stats]}
      <div class="scanner-card">
        <h3>กล้องจุดที่: {id}</h3>
        <p>ดอกตูม (ร้อยมาลัย): {stats['ดอกตูม']} ดอก</p>
        <p>ดอกบาน: {stats['ดอกบาน']} ดอก</p>
      </div>
    {/each}
  </div>
</main>