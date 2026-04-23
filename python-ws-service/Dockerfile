# ใช้ Python 3.10 เวอร์ชั่น slim เพื่อความเบาและเร็ว
FROM python:3.10-slim

# ตั้งค่า Working Directory
WORKDIR /app

# คัดลอกไฟล์ requirements มาติดตั้งก่อน (เทคนิค Docker Cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกโค้ดทั้งหมดเข้ามา
COPY . .

# เปิดพอร์ต 8003
EXPOSE 8003

# รัน FastAPI ผ่าน uvicorn (ใช้ --reload เพื่อให้มันอัปเดตโค้ดอัตโนมัติเวลาเราแก้ไฟล์)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"]