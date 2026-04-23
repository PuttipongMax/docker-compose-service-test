# ใช้ Image ภาษา Rust เวอร์ชั่นล่าสุด
FROM rust:1.75-bookworm

# ติดตั้งเครื่องมือ wasm-pack
RUN curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# ตั้งค่า Working Directory
WORKDIR /app

# คำสั่งเริ่มต้นเมื่อรัน Container (แปลงโค้ดเป็น Wasm สำหรับรันบนเว็บ)
CMD ["wasm-pack", "build", "--target", "web", "--out-dir", "pkg"]