// routes/auth.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// ให้อ่าน JSON ได้เฉพาะใน Router นี้ ปลอดภัยต่อ Proxy 100%
router.use(express.json()); 

// const JAVA_AUTH_URL = process.env.JAVA_AUTH_URL || 'http://localhost:8080/internal/auth';
const JAVA_AUTH_URL = process.env.JAVA_AUTH_URL || 'http://localhost:8080/internal/auth';

// Route: /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const response = await axios.post(`${JAVA_AUTH_URL}/register`, req.body);
        res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: "API Gateway Error: Cannot connect to Java Backend" });
        }
    }
});

// Route: /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const response = await axios.post(`${JAVA_AUTH_URL}/login`, req.body);
        res.status(response.status).json(response.data);
    } catch (error) {
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: "API Gateway Error: Cannot connect to Java Backend" });
        }
    }
});

module.exports = router;