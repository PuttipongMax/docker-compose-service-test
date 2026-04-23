<?php
include("../../../config/config.php");
header('Content-Type: application/json; charset=utf-8');

$data = $_POST;

if (empty($data['contractID'])) {
    echo json_encode(array("status" => "error", "message" => "ไม่พบข้อมูล รหัสสัญญาหลัก (contractID)"));
    exit;
}

$contractID = pg_escape_string($data['contractID']);
// TODO: ดึง ID ผู้ใช้งานจริงจาก Session 
// $create_user = 'system'; 
$create_user = pg_escape_string($_SESSION["av_iduser"]);

pg_query("BEGIN"); 

try {
    // =========================================================
    // 1. ค้นหา Revision ล่าสุด
    // =========================================================
    $revision = 1;
    $sql_check_rev = "SELECT MAX(revision) AS max_rev FROM bot.thcap_master_data WHERE \"contractID\" = '$contractID'";
    $res_rev = pg_query($sql_check_rev);
    
    if ($res_rev && $row_rev = pg_fetch_assoc($res_rev)) {
        if (!empty($row_rev['max_rev'])) {
            $revision = (int)$row_rev['max_rev'] + 1;
        }
    }

    // =========================================================
    // 2. ตรวจสอบและเตรียมข้อมูลทีละฟิลด์อย่างชัดเจน (Explicit Check)
    // =========================================================
    // ฟังก์ชันช่วยเช็ค: ถ้ามีค่าให้ครอบ single quote ('val') ถ้าไม่มีให้เป็นคำว่า NULL
    function getPostValue($key, $postData) {
        if (isset($postData[$key]) && trim($postData[$key]) !== '') {
            return "'" . pg_escape_string(trim($postData[$key])) . "'";
        }
        return "NULL";
    }

    $purpose_type = getPostValue('purpose_type', $data);
    $lending_business_type = getPostValue('lending_business_type', $data);
    $fi_report_group_id = getPostValue('fi_report_group_id', $data);
    $credit_type = getPostValue('credit_type', $data);
    $unique_id_type = getPostValue('unique_id_type', $data);
    $arrangement_purpose_code = getPostValue('arrangement_purpose_code', $data);
    $operation_progress = getPostValue('operation_progress', $data);
    $tdr_method_type = getPostValue('tdr_method_type', $data);
    $tdr_type = getPostValue('tdr_type', $data);
    $loan_type = getPostValue('loan_type', $data);
    $movement_type = getPostValue('movement_type', $data);
    $asset_cont_class_type = getPostValue('asset_and_contingent_classification_type', $data);
    $asset_cont_class_reason = getPostValue('asset_and_contingent_classification_reason', $data);
    $collateral_type = getPostValue('collateral_type', $data);

    $ar_ar_relationship_type = getPostValue('ar_ar_relationship_type', $data);
    $ip_ar_relationship_type = getPostValue('ip_ar_relationship_type', $data);

    // =========================================================
    // 3. สั่งรัน INSERT SQL แบบเห็นโครงสร้าง 100%
    // =========================================================
    $sql_insert = "
        INSERT INTO bot.thcap_master_data (
            \"contractID\", 
            purpose_type, 
            lending_business_type, 
            fi_report_group_id, 
            credit_type, 
            unique_id_type, 
            arrangement_purpose_code, 
            operation_progress, 
            tdr_method_type, 
            tdr_type, 
            loan_type, 
            movement_type, 
            asset_and_contingent_classification_type, 
            asset_and_contingent_classification_reason, 
            collateral_type,
            ar_ar_relationship_type,
            ip_ar_relationship_type,
            revision, 
            create_user
        ) VALUES (
            '$contractID',
            $purpose_type,
            $lending_business_type,
            $fi_report_group_id,
            $credit_type,
            $unique_id_type,
            $arrangement_purpose_code,
            $operation_progress,
            $tdr_method_type,
            $tdr_type,
            $loan_type,
            $movement_type,
            $asset_cont_class_type,
            $asset_cont_class_reason,
            $collateral_type,
            $ar_ar_relationship_type,
            $ip_ar_relationship_type,
            $revision,
            '$create_user'
        )
    ";

    $result_insert = pg_query($sql_insert);

    if ($result_insert) {
        pg_query("COMMIT");
        echo json_encode(array(
            "status" => "success", 
            "message" => "บันทึกข้อมูลสำเร็จ (Revision $revision)",
            "contractID" => $contractID,
            "revision" => $revision
        ));
    } else {
        throw new Exception(pg_last_error());
    }

} catch (Exception $e) {
    pg_query("ROLLBACK");
    echo json_encode(array(
        "status" => "error", 
        "message" => "SQL Error: " . $e->getMessage()
    ));
}
?>