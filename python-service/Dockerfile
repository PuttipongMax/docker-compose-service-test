# ใช้ Python 3.11 แบบ slim เพื่อให้ Image มีขนาดเล็กและโหลดไว
FROM python:3.11-slim

# ตั้งค่า Working Directory ใน Container
WORKDIR /app

# ป้องกันไม่ให้ Python เขียนไฟล์ .pyc (ขยะ) และให้แสดง Log ทันทีโดยไม่ต้องรอ Buffer
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# คัดลอกไฟล์ requirements มาติดตั้งก่อน (เทคนิคนี้ช่วยให้ Docker จำ Cache ได้ ถ้าเราไม่ได้แก้ requirements)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกโค้ดทั้งหมดลงไป 
# (ถึงแม้ใน docker-compose เราจะทำ Volume Mount ทับไปแล้ว แต่ใส่ไว้เผื่อรันเดี่ยวๆ ครับ)
COPY . .

# สั่งรัน Uvicorn เซิร์ฟเวอร์ พร้อมเปิดโหมด --reload สำหรับ Dev
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]