use wasm_bindgen::prelude::*;
use image::codecs::jpeg::JpegEncoder;
use image::ColorType;

// คำสั่ง #[wasm_bindgen] คือการบอกคอมไพเลอร์ให้ส่งออกฟังก์ชันนี้ไปให้ JavaScript ใช้
#[wasm_bindgen]
pub fn compress_raw_to_jpeg(raw_rgba_pixels: &[u8], width: u32, height: u32, quality: u8) -> Vec<u8> {
    // สร้าง Buffer เปล่าๆ ในหน่วยความจำเพื่อรอรับข้อมูลภาพที่บีบอัดแล้ว
    let mut compressed_buffer = Vec::new();
    
    // ตั้งค่า Encoder สำหรับ JPEG และกำหนดคุณภาพ (Quality 1-100)
    let mut encoder = JpegEncoder::new_with_quality(&mut compressed_buffer, quality);
    
    // ทำการบีบอัดข้อมูลดิบ (RGBA) ลงไปใน Buffer
    // การทำงานตรงนี้จะเร็วมากเพราะทำงานในระดับ Native Memory ไม่ผ่าน JavaScript
    encoder.encode(raw_rgba_pixels, width, height, ColorType::Rgba8).unwrap();
    
    // ส่งคืน Array ของ Byte ออกไปให้ JavaScript (จะกลายเป็น Uint8Array)
    compressed_buffer
}