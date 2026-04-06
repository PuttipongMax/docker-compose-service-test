// middlewares/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');
const verifyToken = require('./verifyToken'); // <-- Import ยามเข้ามา

const setupProxies = (app) => {

    // ฟังก์ชันเสริม: ทำหน้าที่แนบ Header เข้าไปตอนที่กำลังจะ Forward Request ไปให้ Backend
    const onProxyReq = (proxyReq, req, res) => {
        if (req.user) {
            // เอาข้อมูลที่ยามแกะได้ (req.user) มาใส่เป็น Custom Header
            // ฝั่ง Java/PHP จะสามารถอ่าน req.header('X-User-Id') ไปใช้ Query Database ต่อได้เลย
            proxyReq.setHeader('X-User-Id', req.user.userId);
            proxyReq.setHeader('X-User-Role', req.user.role);
        }
    };

    // 1. Proxy ไปหา Java Spring Boot
    // ใส่ verifyToken คั่นกลาง แปลว่า Route นี้ "ต้องล็อกอิน" เท่านั้น
    app.use('/java-api', verifyToken, createProxyMiddleware({ 
        target: process.env.SPRING_URL || 'http://localhost:8080',
        changeOrigin: true,
        pathRewrite: {
            '^/java-api': '/api', 
        },
        onProxyReq: onProxyReq // <-- เรียกใช้ฟังก์ชันแนบ Header
    }));

    // 2. Proxy ไปหา PHP (Legacy)
    // ใส่ verifyToken คั่นกลาง แปลว่าระบบเก่าก็ถูกป้องกันด้วย JWT แล้ว!
    app.use('/legacy', verifyToken, createProxyMiddleware({ 
        target: process.env.PHP_URL || 'http://localhost:80', 
        changeOrigin: true,
        pathRewrite: {
         '^/legacy': '',
        },
        onProxyReq: onProxyReq // <-- เรียกใช้ฟังก์ชันแนบ Header
    }));

    // ---------------------------------------------------------
    // 3. 🚀 Proxy ไปหา Python FastAPI (ระบบแปลภาษา)
    // ---------------------------------------------------------
    // เมื่อ React เรียกมาที่ /api/language/... จะโดนเช็ค Token ก่อน
    // ถ้าผ่าน จะถูกโยนไปหา Python พร้อมแนบ X-User-Id ไปด้วย
    app.use('/api/language', verifyToken, createProxyMiddleware({
        target: process.env.PYTHON_URL || 'http://python-fastapi:8000',
        changeOrigin: true,
        // ไม่ต้องมี pathRewrite เพราะ Python ของเรารับ path เป็น /api/language/process ตรงๆ อยู่แล้ว
        onProxyReq: onProxyReq,
        onError: (err, req, res) => {
            console.error('[Gateway] Python Proxy Error:', err.message);
            res.status(502).json({ message: "Bad Gateway: Cannot connect to AI Service" });
        }
    }));

    // ---------------------------------------------------------
    // 4. 🎵 Proxy ไปหา Python Audio Service (ระบบแยกเสียง)
    // ---------------------------------------------------------
    app.use('/api/audio', verifyToken, createProxyMiddleware({
        target: process.env.AUDIO_URL || 'http://python-audio-service:8002', // ชี้ไปที่ Container ใหม่
        changeOrigin: true,
        onProxyReq: onProxyReq,
        // สำคัญมาก: ต้องเพิ่มเวลา Timeout เป็น 2 นาที (120000ms) 
        // เพราะ AI Spleeter จะใช้เวลาประมวลผลไฟล์เสียงครับ
        // 🚀 เพิ่มความอดทนให้รอ AI ได้สูงสุด 10 นาที (600000 ms)
        proxyTimeout: 600000, 
        timeout: 600000,
    }));    
};

module.exports = setupProxies;