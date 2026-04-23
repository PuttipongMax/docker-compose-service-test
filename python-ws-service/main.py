from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import numpy as np
import cv2

app = FastAPI(title="Jasmine AI Scanner")

# ---------------------------------------------------------
# 1. ระบบจัดการการเชื่อมต่อ (Connection Manager)
# ---------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"✅ กล้องเชื่อมต่อสำเร็จ (รวมทั้งหมด: {len(self.active_connections)} เครื่อง)")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"🔴 กล้องตัดการเชื่อมต่อ (เหลือ: {len(self.active_connections)} เครื่อง)")

manager = ConnectionManager()

# ---------------------------------------------------------
# 2. เส้นทางสำหรับเช็คสถานะ Server (Health Check)
# ---------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "online", "service": "Python AI Service"}

# ---------------------------------------------------------
# 3. เส้นทาง WebSocket สำหรับรับภาพ Live Streaming
# ---------------------------------------------------------
@app.websocket("/ws/scanner")
async def websocket_scanner(websocket: WebSocket):
    # TODO: ในอนาคตเราจะดักจับ Token Authentication ตรงนี้
    await manager.connect(websocket)
    try:
        while True:
            # ⭐ รับข้อมูลภาพเป็น Binary (Bytes) เพียวๆ ไม่ใช้ Base64
            data_bytes = await websocket.receive_bytes()
            
            # แปลง Bytes เป็น Numpy Array
            nparr = np.frombuffer(data_bytes, np.uint8)
            # ถอดรหัสเป็นภาพ OpenCV (รูปแบบ BGR)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is not None:
                height, width, channels = img.shape
                
                # TODO: โยนตัวแปร 'img' เข้าโมเดล AI (TensorFlow/YOLO) ตรงนี้
                # ai_result = my_model.predict(img)

                # ตอบกลับหน้าบ้านเพื่อยืนยันว่าได้รับภาพและแปลงสำเร็จ
                await websocket.send_json({
                    "status": "success",
                    "resolution": f"{width}x{height}",
                    "message": "AI is ready to process"
                })
            else:
                await websocket.send_json({"status": "error", "message": "Corrupted frame"})

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาด: {e}")
        manager.disconnect(websocket)