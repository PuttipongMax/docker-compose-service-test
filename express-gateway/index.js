// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import สิ่งที่เราแยกไฟล์ไว้
const authRoutes = require('./routes/auth');
const setupProxies = require('./middlewares/proxy');

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. ตั้งค่า CORS ---
const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// --- 2. ใช้งาน Auth Routes (ลงทะเบียนที่ path /api/auth) ---
app.use('/api/auth', authRoutes);

// --- 3. ใช้งาน Proxies (ต้องอยู่หลัง Auth Routes) ---
setupProxies(app);

// 3. (แถม) เส้นทางทดสอบ Gateway
app.get('/', (req, res) => {
    res.send('🚀 Express API Gateway is running!');
});

// เริ่มเดินเครื่อง Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🌐 API Gateway กำลังรันอยู่ที่ Port: ${PORT}`);
    console.log(`🔗 Proxy [Auth]   : /api/auth -> ${process.env.JAVA_AUTH_URL || 'http://localhost:8080/internal/auth'}`);
    console.log(`🔗 Proxy [Java]   : /java-api -> ${process.env.SPRING_URL || 'http://localhost:8080'}`);
    console.log(`🔗 Proxy [PHP]    : /legacy   -> ${process.env.PHP_URL || 'http://localhost:80'}`);
    console.log(`🚀 Proxy [Python] : /api/language -> ${process.env.PYTHON_URL || 'http://python-fastapi:8000'}`);
    console.log(`=========================================`);
});