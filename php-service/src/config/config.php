<?php
session_start();
$_SESSION['seesion_company_fullname'] = 'Insult company group';
$_SESSION['session_company_name_show'] = 'ICG';
$_SESSION['av_iduser'] = '811';

/**
 * 1. ตั้งค่าการเชื่อมต่อ (ดึงจาก Environment Variables)
 * ค่าเหล่านี้จะถูกส่งมาจาก docker-compose.yml -> .env
 */
$host = getenv('DB_HOST');      // ชื่อ Service ใน Docker Compose (เช่น 'database' หรือ 'db')
$dbname = getenv('DB_NAME');    // ชื่อฐานข้อมูล
$user = getenv('DB_USER');      // ชื่อผู้ใช้
$pass = getenv('DB_PASS');  // รหัสผ่าน
$port = getenv('DB_PORT');                 // ใช้ Port มาตรฐานภายใน Docker เสมอ (ไม่ต้องใช้ 5433)

// ตรวจสอบว่ามีค่า Environment ครบหรือไม่ (ป้องกัน Error แบบงงๆ)
if (!$host || !$dbname || !$user || !$pass) {
    die("Error: Environment variables for database are not set. Please check docker-compose.yml");
}

// 2. สร้าง Connection String
$conn_str = "host={$host} port={$port} dbname={$dbname} user={$user} password={$pass}";

// 3. เริ่มการเชื่อมต่อ
$connection = null;
try {
    // ใช้ @ เพื่อซ่อน Warning message เริ่มต้นของ PHP และให้ catch จัดการแทน
    $connection = pg_connect($conn_str);

    // ตรวจสอบว่าการเชื่อมต่อสำเร็จหรือไม่
    if ($connection === false) {
        throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล PostgreSQL ได้");
    }else{
    }

    // echo "เชื่อมต่อ PostgreSQL สำเร็จ!";

    // ... (ส่วนของโค้ดที่ต้องทำงานกับฐานข้อมูล) ...

} catch (Exception $e) {
    // แสดงข้อความเมื่อเชื่อมต่อล้มเหลว
    echo "การเชื่อมต่อล้มเหลว: " . $e->getMessage();

} finally {
    // 4. ปิดการเชื่อมต่อเสมอใน finally block
    // if ($connection) {
    //     pg_close($connection);
    //     echo "\nการเชื่อมต่อถูกปิดแล้ว";
    // }
    //  $connection = pg_connect($conn_str);

    // // ตรวจสอบว่าการเชื่อมต่อสำเร็จหรือไม่
    // if ($connection === false) {
    //     throw new Exception("ไม่สามารถเชื่อมต่อฐานข้อมูล PostgreSQL ได้");
    // }else{
    // }
}

function nowDateTime() {
    // คืนค่าวันที่และเวลาปัจจุบันในรูปแบบ 'Y-m-d H:i:s'
    return date('Y-m-d H:i:s');
}

// function pg_escape_string($string){
//     return trim($string);
// }

?>