FROM python:3.10-slim

WORKDIR /app

# ติดตั้ง ffmpeg และไลบรารีเสียงที่จำเป็นสำหรับ Librosa/Spleeter
RUN apt-get update && apt-get install -y ffmpeg libsndfile1 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# สร้างโฟลเดอร์ชั่วคราวสำหรับเก็บไฟล์เสียง
RUN mkdir -p /app/temp_audio

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"]