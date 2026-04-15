const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken'); // นำเข้า JWT เพื่อถอดรหัส Token

const app = express();
const server = http.createServer(app);

// ใช้ Secret Key เดียวกับที่ตั้งไว้ใน .env ของโปรเจกต์หลัก
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// 🔒 Middleware ของ Socket.io: ตรวจสอบ Token และ Role ก่อนอนุญาตให้เชื่อมต่อ
io.use((socket, next) => {
  // รับ Token ที่แนบมาจาก Frontend (Svelte)
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    // ถอดรหัส Token จะได้ข้อมูล User และ Role ออกมา
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded; // เก็บข้อมูล user ไว้ใน socket object
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

io.on('connection', (socket) => {
  const role = socket.user.role; // สมมติว่าใน Token มี Payload { id, email, role }
  console.log(`🟢 User connected: ${socket.user.email} [Role: ${role}]`);

  // รับภาพจากคนสแกน (Broadcaster)
  socket.on('video-frame', (imageBase64) => {
    // เช็คสิทธิ์: คนส่งภาพต้องเป็น ADMIN หรือ SCANNER เท่านั้น
    if (role === 'ADMIN' || role === 'SCANNER') {
      // กระจายภาพไปให้คนอื่นดู (ยกเว้นตัวเอง)
      socket.broadcast.emit('broadcast-frame', imageBase64);
    } else {
      socket.emit('error', 'คุณไม่มีสิทธิ์ส่งภาพ Live');
    }
  });

  // (Optional) ถ้ามีการส่งคำสั่งพิเศษ เช่น บังคับปิดกล้อง สามารถจำกัดสิทธิ์ MANAGER ได้
  socket.on('stop-broadcast', () => {
     if (role === 'ADMIN' || role === 'MANAGER') {
         io.emit('command', 'stop');
     }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.user.email}`);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Dedicated Socket Service running on port ${PORT}`);
});