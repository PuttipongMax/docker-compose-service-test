import re
from fastapi import FastAPI
from pydantic import BaseModel
from pypinyin import pinyin, Style
from googletrans import Translator # <-- Import เพิ่มเข้ามา
import asyncio

app = FastAPI()
translator = Translator() # <-- เรียกใช้ตัวแปลภาษา

# ✅ เพิ่ม Dictionary สำหรับจำลองเป็น Cache เก็บไว้ในหน่วยความจำ (Memory)
translation_cache = {}

class WordRequest(BaseModel):
    text: str

def get_offline_pinyin(chinese_text: str):
    result = pinyin(chinese_text, style=Style.TONE)
    return " ".join([item[0] for item in result])

@app.post("/api/language/process")
async def process_language(req: WordRequest):
    word = req.text.strip().lower()
    
    # ⚡ ถ้ามีใน Cache ให้ตอบกลับทันที (ไม่ต้องรออะไรเลย)
    if word in translation_cache:
        return translation_cache[word]

    # 1. ตรวจจับภาษาด้วย Regex
    detected_lang = "English/Pinyin"
    if re.search(r'[\u0E00-\u0E7F]', word):
        detected_lang = "Thai"
    elif re.search(r'[\u4e00-\u9fff]', word):
        detected_lang = "Chinese"

# 🚀 ฟังก์ชันช่วยแปลภาษาแบบทำงานพื้นหลัง (ไม่บล็อกการทำงาน)
    def fetch_translation(text, dest_lang):
        try:
            # 🛠️ สร้าง Translator ตัวใหม่เสมอสำหรับแต่ละ Thread เพื่อป้องกันการตีกัน
            local_translator = Translator()
            return local_translator.translate(text, dest=dest_lang).text
        except Exception as e:
            print(f"Error translating to {dest_lang}: {e}") # ปริ้น Error ดูใน Log
            return "ไม่สามารถแปลได้"

    # 2. ทำการแปลภาษาแบบเรียลไทม์!
    # 🚀 สั่งยิง Request ไปหา Google ทั้ง 3 ภาษา "พร้อมกัน" (Concurrent)
    loop = asyncio.get_event_loop()
    task_th = loop.run_in_executor(None, fetch_translation, word, 'th')
    task_en = loop.run_in_executor(None, fetch_translation, word, 'en')
    task_zh = loop.run_in_executor(None, fetch_translation, word, 'zh-cn')
    
    try :
        thai_meaning, english_meaning, chinese_word = await asyncio.wait_for(
            asyncio.gather(task_th, task_en, task_zh),
            timeout=8.0 # ถ้านานเกิน 8 วินาที ให้ถือว่าแปลไม่สำเร็จ
        )
    except asyncio.TimeoutError:
        print(f"แปลภาษาช้าเกินไป (Timeout) สำหรับคำว่า: {word}")
        # ถ้าค้างให้คืนค่าเริ่มต้นกลับไป เพื่อไม่ให้ API พัง
        thai_meaning = "แปลไม่สำเร็จ (รอนานเกินไป)"
        english_meaning = "Translation timeout"
        chinese_word = "ไม่สามารถแปลได้"
        
    # 3. แปลงจีนเป็นพินอิน
    pinyin_text = ""
    if chinese_word and chinese_word != "ไม่สามารถแปลได้":
        pinyin_text = get_offline_pinyin(chinese_word)

    result_data = {
        "source_word": word,
        "detected_lang": detected_lang,
        "thai_meaning": thai_meaning,
        "english_meaning": english_meaning,
        "english_reading": "", # รอรับข้อมูลคำอ่านอังกฤษ (เช่น "ไวท์")
        "chinese_word": chinese_word,
        "pinyin": pinyin_text,
        "pinyin_reading": ""   # รอรับข้อมูลคำอ่านพินอิน (เช่น "ป๋าย เซ่อ เตอะ")
    }

    # ⚡ ก่อน return ให้จดจำลง Cache ไว้ด้วย
    translation_cache[word] = result_data
    
    return result_data