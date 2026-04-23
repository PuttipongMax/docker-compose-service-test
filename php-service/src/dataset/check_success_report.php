<?php
include("../../config/config.php");
header('Content-Type: application/json; charset=utf-8');

// หาวันที่สิ้นเดือนปัจจุบัน (รูปแบบเดียวกับที่ใช้ดึงข้อมูลหน้าเมนู)
$currentDate = nowDateTime();
$target_period = date('Y-m-t', strtotime($currentDate));

// ตัวแปรเก็บสถานะว่ารายงานไหนสำเร็จแล้วบ้าง (status_appv = '1')
$completed_reports = array(
    "BLS" => false
);

// ตรวจสอบรายงาน BLS
$sql_bls = "SELECT 1 FROM bot.thcap_dataset_bls_log 
            WHERE \"submit_period\" = '$target_period' 
            AND status_appv = '1' LIMIT 1";
$res_bls = pg_query($sql_bls);

if ($res_bls && pg_num_rows($res_bls) > 0) {
    $completed_reports["BLS"] = true;
}

echo json_encode(array(
    "status" => "success",
    "period" => $target_period,
    "completed" => $completed_reports
));
?>