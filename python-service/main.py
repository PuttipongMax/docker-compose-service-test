import re
from fastapi import FastAPI
from pydantic import BaseModel
from pypinyin import pinyin, Style
from googletrans import Translator # <-- Import เพิ่มเข้ามา

app = FastAPI()
translator = Translator() # <-- เรียกใช้ตัวแปลภาษา

class WordRequest(BaseModel):
    text: str

def get_offline_pinyin(chinese_text: str):
    result = pinyin(chinese_text, style=Style.TONE)
    return " ".join([item[0] for item in result])

@app.post("/api/language/process")
async def process_language(req: WordRequest):
    word = req.text.strip()
    
    # 1. ตรวจจับภาษาด้วย Regex
    detected_lang = "English/Pinyin"
    if re.search(r'[\u0E00-\u0E7F]', word):
        detected_lang = "Thai"
    elif re.search(r'[\u4e00-\u9fff]', word):
        detected_lang = "Chinese"

    # 2. ทำการแปลภาษาแบบเรียลไทม์!
    try:
        thai_meaning = translator.translate(word, dest='th').text
        english_meaning = translator.translate(word, dest='en').text
        chinese_word = translator.translate(word, dest='zh-cn').text
    except Exception as e:
        print(f"Translation Error: {e}")
        thai_meaning = english_meaning = chinese_word = "ไม่สามารถแปลได้"

    # 3. แปลงจีนเป็นพินอิน
    pinyin_text = ""
    if chinese_word and chinese_word != "ไม่สามารถแปลได้":
        pinyin_text = get_offline_pinyin(chinese_word)

    return {
        "source_word": word,
        "detected_lang": detected_lang,
        "thai_meaning": thai_meaning,
        "english_meaning": english_meaning,
        "english_reading": "", # รอรับข้อมูลคำอ่านอังกฤษ (เช่น "ไวท์")
        "chinese_word": chinese_word,
        "pinyin": pinyin_text,
        "pinyin_reading": ""   # รอรับข้อมูลคำอ่านพินอิน (เช่น "ป๋าย เซ่อ เตอะ")
    }