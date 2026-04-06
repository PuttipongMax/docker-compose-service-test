// middlewares/verifyToken.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. ดึง Token จาก Header
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ message: "No Token" });
    // รูปแบบของ Header จะมาเป็น "Bearer eyJhbGciOiJIUzI1..." เราเลยต้อง split เอาช่องว่างออกแล้วเอาตัวที่ 2
    const token = authHeader && authHeader.split(' ')[1]; 

    console.log("Token ที่รับมาจาก React คือ:", token);
    // 2. ถ้าไม่มี Token แนบมาด้วย ให้เตะกลับทันที (401 Unauthorized)
    if (!token) {
        return res.status(401).json({ message: 'Access Denied: No Token Provided!' });
    }

    try {
        // 3. ตรวจสอบความถูกต้องของ Token
        // ⚠️ สำคัญมาก: JWT_SECRET ตรงนี้ ต้องตั้งให้ "ตรงกับ" ฝั่ง Java Spring Boot เป๊ะๆ!
        const secretKey = process.env.JWT_SECRET || 'my-32-character-ultra-secure-and-ultra-long-secret';
        
        // ถ้า Token ถูกต้องและยังไม่หมดอายุ จะได้ข้อมูล Payload ที่เราฝังไว้ตอนแรก (userId, role)
        const decoded = jwt.verify(token, secretKey);

        // 4. แปะข้อมูลที่แกะได้เข้าไปใน Request เพื่อให้ไปใช้งานต่อได้
        req.user = decoded; 
        
        // 5. ปล่อยให้ Request วิ่งผ่านยามไปหา Proxy ได้
        next(); 

    } catch (error) {
        // ถ้า Token ปลอม, ผิดรูปแบบ, หรือหมดอายุ
        return res.status(403).json({ message: 'Invalid or Expired Token!' });
    }
};

module.exports = verifyToken;