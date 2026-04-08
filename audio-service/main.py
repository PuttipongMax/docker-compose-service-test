import os
import uuid
import shutil
import subprocess  # 🟢 เพิ่ม import สำหรับวิธี Subprocess
import numpy as np
import librosa
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydub import AudioSegment
import yt_dlp
from pydantic import BaseModel
from fastapi.responses import FileResponse # 🟢 เพิ่ม import ตัวนี้
import json
from datetime import datetime

# 🟢 บังคับให้ Spleeter (TensorFlow) ใช้แค่ CPU ป้องกันปัญหาค้างใน Docker
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

app = FastAPI()

# ==========================================
# 1. ตั้งค่าระบบ
# ==========================================
TEMP_DIR = "/app/temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

class YouTubeRequest(BaseModel):
    url: str

# 📌 โกดังเก็บสถานะงาน (Task Store)
task_store = {}

# ==========================================
# 2. ฟังก์ชันช่วยเหลือ (Helper Functions)
# ==========================================
# ==========================================
# ส่วนจัดการฐานข้อมูลจำลอง (JSON File)
# ==========================================
HISTORY_FILE = os.path.join(TEMP_DIR, "history.json")

def get_history():
    """ดึงข้อมูลประวัติการวิเคราะห์ทั้งหมดจากไฟล์ JSON"""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_to_history(result_data):
    """บันทึกข้อมูลประวัติใหม่ลงในไฟล์ JSON"""
    history = get_history()
    result_data["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    history.insert(0, result_data) # เอาเพลงใหม่ล่าสุดไว้บนสุด
    
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=4)

def analyze_high_note(audio_path):
    y, sr = librosa.load(audio_path, sr=None)    
    f0, voiced_flag, voiced_probs = librosa.pyin(
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

def process_youtube_background(task_id: str, youtube_url: str):
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
        # 🔴 สเต็ป 1: โหลดยูทูป
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            base_filename = ydl.prepare_filename(info)
            wav_path = os.path.splitext(base_filename)[0] + '.wav'
            
        # 🔴 สเต็ป 2: AI แยกเสียง (ใช้ Subprocess)
        task_store[task_id] = {"status": "processing", "message": "✂️ AI Spleeter กำลังแยกเสียงนักร้อง... (อาจใช้เวลา 1-5 นาที)"}
        output_dir = os.path.join(TEMP_DIR, f"output_{task_id}")
        
        result = subprocess.run([
            "spleeter", "separate", 
            "-p", "spleeter:2stems", 
            "-o", output_dir, 
            wav_path
        ], capture_output=True, text=True)

        if result.returncode != 0:
            error_log = result.stderr.strip() or result.stdout.strip()
            detailed_error = f"[Code: {result.returncode}] {error_log}"
            print(f"[{task_id}] 🔴 Spleeter Failed: {detailed_error}")
            raise Exception(detailed_error)

        base_name = os.path.splitext(os.path.basename(wav_path))[0]
        vocal_file = os.path.join(output_dir, base_name, "vocals.wav")
        
        # 🔴 สเต็ป 3: วิเคราะห์ความถี่
        task_store[task_id] = {"status": "processing", "message": "🎤 กำลังวิเคราะห์หา High Note ความถี่สูงสุด..."}
        high_note, max_hz = "Unknown", 0.0
        if os.path.exists(vocal_file):
            high_note, max_hz = analyze_high_note(vocal_file)

        # 🟢 สเต็ป 4: ก๊อปปี้ไฟล์เก็บไว้ไม่ให้โดนลบทิ้ง (สำคัญมาก!)
        original_filename = f"{task_id}_original.wav"
        shutil.copy(wav_path, os.path.join(TEMP_DIR, original_filename))
        
        play_filename = f"{task_id}_vocals.wav"
        if os.path.exists(vocal_file):
            shutil.copy(vocal_file, os.path.join(TEMP_DIR, play_filename))

        # 🟢 สเต็ป 5: บันทึกข้อมูลและแจ้งสถานะ Completed
        result_data = {
            "source": "YouTube",
            "video_title": info.get('title', 'Unknown Title'),
            "highest_note": high_note,
            "highest_frequency_hz": round(max_hz, 2),
            "vocal_extracted": os.path.exists(vocal_file),
            "original_file": original_filename,
            "play_file": play_filename if os.path.exists(vocal_file) else None
        }

        save_to_history(result_data) # 💾 เซฟลง history.json ด้วย

        task_store[task_id] = {
            "status": "completed",
            "result": result_data
        }
    except Exception as e:
        task_store[task_id] = {"status": "error", "detail": str(e)}
    finally:
        # 🧹 ทำความสะอาดเฉพาะโฟลเดอร์ชั่วคราว (ไฟล์ที่เราก๊อปปี้ไว้จะยังอยู่รอด)
        if 'wav_path' in locals() and os.path.exists(wav_path):
            try: os.remove(wav_path)
            except: pass
        if 'output_dir' in locals() and os.path.exists(output_dir):
            try: shutil.rmtree(output_dir)
            except: pass

def process_file_background(task_id: str, input_path: str, filename: str):
    processing_path = input_path
    output_dir = os.path.join(TEMP_DIR, f"output_{task_id}")
    
    try:
        # 🔴 สเต็ป 1: แปลงไฟล์
        if filename.endswith(".mp3"):
            task_store[task_id] = {"status": "processing", "message": "🔄 กำลังแปลงไฟล์ MP3 เป็น WAV..."}
            wav_filename = os.path.splitext(filename)[0] + ".wav"
            wav_path = os.path.join(TEMP_DIR, f"{task_id}_{wav_filename}")
            audio = AudioSegment.from_mp3(input_path)
            audio.export(wav_path, format="wav")
            processing_path = wav_path 

        # 🔴 สเต็ป 2: AI แยกเสียง
        task_store[task_id] = {"status": "processing", "message": "✂️ AI Spleeter กำลังแยกเสียงนักร้อง... (อาจใช้เวลา 1-5 นาที)"}
        
        result = subprocess.run([
            "spleeter", "separate", 
            "-p", "spleeter:2stems", 
            "-o", output_dir, 
            processing_path
        ], capture_output=True, text=True)

        if result.returncode != 0:
            error_log = result.stderr.strip() or result.stdout.strip()
            detailed_error = f"[Code: {result.returncode}] {error_log}"
            print(f"[{task_id}] 🔴 Spleeter Failed: {detailed_error}")
            raise Exception(detailed_error)

        base_name = os.path.splitext(os.path.basename(processing_path))[0]
        vocal_file = os.path.join(output_dir, base_name, "vocals.wav")

        # 🔴 สเต็ป 3: วิเคราะห์ความถี่
        task_store[task_id] = {"status": "processing", "message": "🎤 กำลังวิเคราะห์หา High Note ความถี่สูงสุด..."}
        high_note, max_hz = "Unknown", 0.0
        if os.path.exists(vocal_file):
            high_note, max_hz = analyze_high_note(vocal_file)

        # 🟢 สเต็ป 4: ก๊อปปี้ไฟล์เก็บไว้ไม่ให้โดนลบทิ้ง (สำคัญมาก!)
        original_filename = f"{task_id}_original.wav"
        shutil.copy(processing_path, os.path.join(TEMP_DIR, original_filename))
        
        play_filename = f"{task_id}_vocals.wav"
        if os.path.exists(vocal_file):
            shutil.copy(vocal_file, os.path.join(TEMP_DIR, play_filename))

        # 🟢 สเต็ป 5: บันทึกข้อมูลและแจ้งสถานะ Completed
        result_data = {
            "source": "File",
            "file_name": filename,
            "highest_note": high_note,
            "highest_frequency_hz": round(max_hz, 2),
            "vocal_extracted": os.path.exists(vocal_file),
            "original_file": original_filename,
            "play_file": play_filename if os.path.exists(vocal_file) else None
        }

        save_to_history(result_data) # 💾 เซฟลง history.json ด้วย

        task_store[task_id] = {
            "status": "completed",
            "result": result_data
        }
    except Exception as e:
        task_store[task_id] = {"status": "error", "detail": str(e)}
    finally:
        # 🧹 ทำความสะอาด (ลบเฉพาะไฟล์ต้นทางและโฟลเดอร์ Spleeter)
        if os.path.exists(input_path): os.remove(input_path)
        if processing_path != input_path and os.path.exists(processing_path): os.remove(processing_path)
        if os.path.exists(output_dir): shutil.rmtree(output_dir)

# ==========================================
# 4. API Routes
# ==========================================
# 📚 Route สำหรับดึงประวัติรายการเพลงทั้งหมด
# @app.get("/api/audio/history")
# async def get_audio_history():
#     history = get_history()
#     return JSONResponse(content=history)

# 🟢 เพิ่ม API สำหรับส่งไฟล์เสียงกลับไปให้ React
@app.get("/api/audio/download/{filename}")
async def download_audio(filename: str):
    # ระบุพาร์ทไปยังโฟลเดอร์ temp_audio (จากรูปภาพ)
    file_path = os.path.join(TEMP_DIR, filename)
    
    # เช็คว่ามีไฟล์นี้อยู่จริงไหม
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ไม่พบไฟล์เสียงนี้ในระบบ")
    
    # ส่งไฟล์กลับไป (FastAPI จะจัดการเรื่อง Stream และ Header ให้เอง)
    return FileResponse(path=file_path, media_type="audio/wav", filename=filename)

# 💡 พิเศษ: หากต้องการดึงไฟล์เสียงร้อง (Vocals) ที่แยกเสร็จแล้วจาก Spleeter
@app.get("/api/audio/vocals/{task_id}/{filename}")
async def get_vocals(task_id: str, filename: str):
    # โครงสร้างโฟลเดอร์จะเป็น temp_audio/output_task_id/ชื่อเพลง/vocals.wav
    base_name = os.path.splitext(filename)[0]
    vocal_path = os.path.join(TEMP_DIR, f"output_{task_id}", base_name, "vocals.wav")
    
    if not os.path.exists(vocal_path):
        raise HTTPException(status_code=404, detail="ยังแยกเสียงไม่เสร็จ หรือไม่พบไฟล์เสียงร้อง")
        
    return FileResponse(path=vocal_path, media_type="audio/wav", filename=f"vocals_{base_name}.wav")

@app.get("/api/audio/status/{task_id}")
async def get_task_status(task_id: str):
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="ไม่พบหมายเลขคิวนี้")
    return task

@app.post("/api/audio/youtube")
async def analyze_youtube_audio(req: YouTubeRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    task_store[task_id] = {"status": "processing"}
    background_tasks.add_task(process_youtube_background, task_id, req.url)
    return JSONResponse(content={"status": "accepted", "task_id": task_id})

@app.post("/api/audio/analyze")
async def analyze_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not (file.filename.endswith(".wav") or file.filename.endswith(".mp3")):
        raise HTTPException(status_code=400, detail="กรุณาอัปโหลดไฟล์ .wav หรือ .mp3 เท่านั้น")

    task_id = str(uuid.uuid4())
    task_store[task_id] = {"status": "processing"}

    input_path = os.path.join(TEMP_DIR, f"{task_id}_{file.filename}")
    with open(input_path, "wb") as buffer:
        buffer.write(await file.read())

    background_tasks.add_task(process_file_background, task_id, input_path, file.filename)
    return JSONResponse(content={"status": "accepted", "task_id": task_id})

# 📚 Route สำหรับดึงประวัติ (สแกนไฟล์ตรงๆ จากโฟลเดอร์ temp_audio)
@app.get("/api/audio/history")
async def get_audio_history():
    file_list = []
    
    if os.path.exists(TEMP_DIR):
        for filename in os.listdir(TEMP_DIR):
            # 1. ดึงเฉพาะไฟล์เสียง (mp3, wav)
            if filename.endswith(".mp3") or filename.endswith(".wav"):
                
                # 2. ถ้าเป็นไฟล์เสียงร้องแยกซ้ำ ให้ข้ามไปก่อน (เราจะนำไปควบรวมกับไฟล์ต้นฉบับ)
                if filename.endswith("_vocals.wav"):
                    continue

                # 3. สร้างลอจิกจับคู่: เช็คว่าไฟล์ต้นฉบับนี้ มีไฟล์เสียงร้อง (Vocals) คู่กันอยู่ไหม
                base_name = filename.replace("_original.wav", "").replace(".wav", "").replace(".mp3", "")
                vocal_filename = f"{base_name}_vocals.wav"
                has_vocals = os.path.exists(os.path.join(TEMP_DIR, vocal_filename))

                # 4. นำข้อมูลใส่ List ส่งให้ React
                file_list.append({
                    "source": "Local Folder",
                    "file_name": filename.replace("_original", ""), # ลบคำว่า _original ออกจากชื่อที่แสดง
                    "original_file": filename,  # 💿 ชื่อไฟล์สำหรับปุ่ม "ต้นฉบับ"
                    "play_file": vocal_filename if has_vocals else None, # 🎤 ชื่อไฟล์สำหรับปุ่ม "เสียงร้อง" (ถ้ามี)
                    "highest_note": "-",        # ใส่ขีดไว้ เพราะไฟล์เก่าที่ไม่ได้เซฟ Database ไม่มีข้อมูลโน้ต
                    "highest_frequency_hz": 0
                })
                
    # 5. เรียงลำดับตัวอักษรชื่อไฟล์
    file_list.sort(key=lambda x: x["file_name"])
    
    from fastapi.responses import JSONResponse
    return JSONResponse(content=file_list)