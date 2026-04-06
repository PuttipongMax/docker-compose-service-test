import os
import uuid
import shutil
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from spleeter.separator import Separator
from pydub import AudioSegment
import yt_dlp
from pydantic import BaseModel

app = FastAPI()

# ==========================================
# 1. ตั้งค่าระบบและโหลด AI
# ==========================================
TEMP_DIR = "/app/temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

separator = Separator('spleeter:2stems')

class YouTubeRequest(BaseModel):
    url: str

# 📌 โกดังเก็บสถานะงาน (Task Store) เอาไว้ให้ React มาถามว่างานเสร็จหรือยัง
# หน้าตาข้อมูล: {"uuid": {"status": "processing" | "completed" | "error", "result": {...}}}
task_store = {}

# ==========================================
# 2. ฟังก์ชันช่วยเหลือ (Helper Functions)
# ==========================================
def analyze_high_note(audio_path):
    y, sr = librosa.load(audio_path, sr=None)    
    f0, voiced_flag, voiced_probs = librosa.pyyin(
        y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'), sr=sr
    )    
    valid_pitches = f0[voiced_flag]    
    if len(valid_pitches) == 0:
        return "No vocal detected", 0.0

    max_hz = np.max(valid_pitches)    
    highest_note = librosa.hz_to_note(max_hz)    
    return highest_note, float(max_hz)

# ==========================================
# 3. 👷‍♂️ ฟังก์ชันคนงานเบื้องหลัง (Background Workers)
# ==========================================

# คนงานดูดเสียง YouTube และวิเคราะห์
def process_youtube_background(task_id: str, youtube_url: str):
    # 🔴 สเต็ป 1: โหลดยูทูป
    task_store[task_id] = {"status": "processing", "message": "📥 กำลังดาวน์โหลดไฟล์เสียงจาก YouTube..."}

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(TEMP_DIR, f'{task_id}_%(title)s.%(ext)s'),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'wav',
            'preferredquality': '192',
        }],
        'extractor_args': { 'youtube': { 'player_client': ['android', 'web'] } },
        'quiet': True,
        'no_warnings': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            base_filename = ydl.prepare_filename(info)
            wav_path = os.path.splitext(base_filename)[0] + '.wav'
            
        # 🔴 สเต็ป 2: AI แยกเสียง (ขั้นตอนนี้จะนานที่สุด)
        task_store[task_id] = {"status": "processing", "message": "✂️ AI Spleeter กำลังแยกเสียงนักร้อง... (อาจใช้เวลา 1-5 นาที)"}
        output_dir = os.path.join(TEMP_DIR, f"output_{task_id}")
        separator.separate_to_file(wav_path, output_dir)

        base_name = os.path.splitext(os.path.basename(wav_path))[0]
        vocal_file = os.path.join(output_dir, base_name, "vocals.wav")
        
        # 🔴 สเต็ป 3: วิเคราะห์ความถี่
        task_store[task_id] = {"status": "processing", "message": "🎤 กำลังวิเคราะห์หา High Note ความถี่สูงสุด..."}
        high_note, max_hz = "Unknown", 0.0
        if os.path.exists(vocal_file):
            high_note, max_hz = analyze_high_note(vocal_file)

        # 🟢 อัปเดตสถานะว่า "เสร็จแล้ว!"
        task_store[task_id] = {
            "status": "completed",
            "result": {
                "source": "YouTube",
                "video_title": info.get('title', 'Unknown Title'),
                "highest_note": high_note,
                "highest_frequency_hz": round(max_hz, 2),
                "vocal_extracted": os.path.exists(vocal_file)
            }
        }
    except Exception as e:
        # 🔴 อัปเดตสถานะว่า "พัง"
        task_store[task_id] = {"status": "error", "detail": str(e)}
    finally:
        # 🧹 ทำความสะอาด
        if 'wav_path' in locals() and os.path.exists(wav_path):
            try: os.remove(wav_path)
            except: pass
        if 'output_dir' in locals() and os.path.exists(output_dir):
            try: shutil.rmtree(output_dir)
            except: pass

# คนงานวิเคราะห์ไฟล์เสียง
def process_file_background(task_id: str, input_path: str, filename: str):
    processing_path = input_path
    output_dir = os.path.join(TEMP_DIR, f"output_{task_id}")
    
    try:
        if filename.endswith(".mp3"):
            # 🔴 สเต็ป 1: แปลงไฟล์
            task_store[task_id] = {"status": "processing", "message": "🔄 กำลังแปลงไฟล์ MP3 เป็น WAV..."}
            wav_filename = os.path.splitext(filename)[0] + ".wav"
            wav_path = os.path.join(TEMP_DIR, f"{task_id}_{wav_filename}")
            audio = AudioSegment.from_mp3(input_path)
            audio.export(wav_path, format="wav")
            processing_path = wav_path 

        # 🔴 สเต็ป 2: AI แยกเสียง (ขั้นตอนนี้จะนานที่สุด)
        task_store[task_id] = {"status": "processing", "message": "✂️ AI Spleeter กำลังแยกเสียงนักร้อง... (อาจใช้เวลา 1-5 นาที)"}
        separator.separate_to_file(processing_path, output_dir)
        
        base_name = os.path.splitext(os.path.basename(processing_path))[0]
        vocal_file = os.path.join(output_dir, base_name, "vocals.wav")
        music_file = os.path.join(output_dir, base_name, "accompaniment.wav")

        # 🔴 สเต็ป 3: วิเคราะห์ความถี่
        task_store[task_id] = {"status": "processing", "message": "🎤 กำลังวิเคราะห์หา High Note ความถี่สูงสุด..."}
        high_note, max_hz = "Unknown", 0.0
        if os.path.exists(vocal_file):
            high_note, max_hz = analyze_high_note(vocal_file)

        # 🟢 อัปเดตสถานะว่า "เสร็จแล้ว!"
        task_store[task_id] = {
            "status": "completed",
            "result": {
                "source": "File",
                "file_name": filename,
                "highest_note": high_note,
                "highest_frequency_hz": round(max_hz, 2),
                "vocal_extracted": os.path.exists(vocal_file)
            }
        }
    except Exception as e:
        task_store[task_id] = {"status": "error", "detail": str(e)}
    finally:
        if os.path.exists(input_path): os.remove(input_path)
        if processing_path != input_path and os.path.exists(processing_path): os.remove(processing_path)
        if os.path.exists(output_dir): shutil.rmtree(output_dir)


# ==========================================
# 4. API Routes
# ==========================================

# 📇 Route ใหม่: สำหรับให้ React แวะมาถามสถานะ (Polling)
@app.get("/api/audio/status/{task_id}")
async def get_task_status(task_id: str):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบหมายเลขคิวนี้")
    return task

@app.post("/api/audio/youtube")
async def analyze_youtube_audio(req: YouTubeRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4()) # สร้างบัตรคิว
    task_store[task_id] = {"status": "processing"} # บันทึกว่ากำลังทำ
    
    # โยนงานให้ทำเบื้องหลัง แล้วตอบกลับ React ทันที!
    background_tasks.add_task(process_youtube_background, task_id, req.url)
    
    return JSONResponse(content={"status": "accepted", "task_id": task_id})

@app.post("/api/audio/analyze")
async def analyze_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not (file.filename.endswith(".wav") or file.filename.endswith(".mp3")):
        raise HTTPException(status_code=400, detail="กรุณาอัปโหลดไฟล์ .wav หรือ .mp3 เท่านั้น")

    task_id = str(uuid.uuid4())
    task_store[task_id] = {"status": "processing"}

    # เซฟไฟล์ต้นฉบับก่อน แล้วค่อยโยนให้ Background ทำงาน
    input_path = os.path.join(TEMP_DIR, f"{task_id}_{file.filename}")
    with open(input_path, "wb") as buffer:
        buffer.write(await file.read())

    background_tasks.add_task(process_file_background, task_id, input_path, file.filename)
    
    return JSONResponse(content={"status": "accepted", "task_id": task_id})