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
};

module.exports = setupProxies;