<?php
include("../../config/config.php");
header('Content-Type: application/json; charset=utf-8');

// 1. ระบุตำแหน่งของไฟล์ JSON
$file_path = '../model/mock_data.json';

// ตรวจสอบว่ามีไฟล์อยู่จริงหรือไม่
if (file_exists($file_path)) {
    
    // 2. อ่านข้อมูลจากไฟล์
    $json_string = file_get_contents($file_path);
    
    // 3. แปลง JSON String เป็น PHP Variable
    // แบบที่ 1: แปลงเป็น Object (ค่าเริ่มต้น)
    $data_obj = json_decode($json_string);
    
    // แบบที่ 2: แปลงเป็น Associative Array (ใส่ true เป็นพารามิเตอร์ที่ 2)
    $data_arr = json_decode($json_string, true);

echo json_encode($data_arr); // ส่งข้อมูลกลับเป็น JSON ให้ UI ใช้งาน 
exit();
    }

$search_date = isset($_GET['search_date']) ? pg_escape_string($_GET['search_date']) : '';
// $focus_report = isset($_GET['focus_report']) ? strtolower(pg_escape_string($_GET['focus_report'])) : '';

if (empty($search_date)) {
    // หาวันที่สิ้นเดือนปัจจุบัน (รูปแบบเดียวกับที่ใช้ดึงข้อมูลหน้าเมนู)
    $currentDate = nowDateTime();
    $target_period = date('Y-m-t', strtotime($currentDate));
} else {
    $target_period = $search_date;
}

$response = array();
$form_schema = array();

/**
 * Helper Function: สร้างโครงสร้าง JSON สำหรับ Form Element (Dropdown)
 * พร้อมแนบ Options ที่ดึงจาก Database ไปด้วย
 */
function buildSelectSchema($query, $uniqid, $label, $selectedCondition = 'none') {
    $options = array();
    
    // [NEW] เพิ่ม Option เริ่มต้นเพื่อให้ผู้ใช้เลือก
    $options[] = array(
        "value" => "",
        "label" => "--- กรุณาเลือก ---",
        "selected" => ($selectedCondition === 'none' || $selectedCondition === 'first') 
    );

    $result = pg_query($query);
    $index = 0;
    
    if ($result) {
        while ($row = pg_fetch_assoc($result)) {
            $code = $row['code'];
            $details = $row['details'];
            
            // ตรวจสอบ Logic สำหรับกำหนดค่า Selected
            $isSelected = false;
            // ถ้าระบุค่าเฉพาะมา ให้เช็คว่าตรงกับ Code หรือไม่
            if ($selectedCondition !== 'none' && $selectedCondition !== 'first') {
                $isSelected = ($code === (string)$selectedCondition);
            }
            
            $options[] = array(
                "value" => $code,
                "label" => $details ? "{$code} : {$details}" : $code,
                "selected" => $isSelected
            );
            $index++;
        }
    }
    
    return array(
        "element" => "select",
        "typeInput" => "select",
        "uniqid" => $uniqid,
        "required" => true,
        "typeData" => "string",
        "label" => $label . " *",
        "checkData" => "true",
        "data_autocomplete" => "true",
        "options" => $options
    );
}

// =========================================================
// สั่งสร้าง Schema ทีละฟิลด์
// =========================================================
$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_arrangement_purpose_type ORDER BY code ASC", 
    "arrangement_purpose_code", 
    "Arrangement Purpose Code"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_lending_business_type ORDER BY code ASC", 
    "lending_business_type", 
    "Lending Business Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_operation_progress ORDER BY code ASC", 
    "operation_progress", 
    "Operation Progress"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_collateral_type ORDER BY code ASC", 
    "collateral_type", 
    "Collateral Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_loan_type ORDER BY code ASC", 
    "loan_type", 
    "Loan Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_movement_type ORDER BY code ASC", 
    "movement_type", 
    "Movement Type",
    "none" // ไม่บังคับเลือกตัวแรก
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_asset_classification_type ORDER BY code ASC", 
    "asset_and_contingent_classification_type", 
    "Asset & Contingent Classification Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_asset_classification_reason ORDER BY code ASC", 
    "asset_and_contingent_classification_reason", 
    "Asset & Contingent Classification Reason",
    "none"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_tdr_method_type ORDER BY code ASC", 
    "tdr_method_type", 
    "TDR Method Type",
    "none"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_tdr_type ORDER BY code ASC", 
    "tdr_type", 
    "TDR Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_ar_ar_relationship_type ORDER BY code ASC", 
    "ar_ar_relationship_type", 
    "AR-AR Relationship Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_ip_ar_relationship_type ORDER BY code ASC", 
    "ip_ar_relationship_type", 
    "IP-AR Relationship Type",
    "010001" // ล็อค Default ตามเงื่อนไขของคุณ
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_credit_type ORDER BY code ASC", 
    "credit_type", 
    "Credit Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_unique_id_type ORDER BY code ASC", 
    "unique_id_type", 
    "Unique ID Type"
);

$form_schema[] = buildSelectSchema(
    "SELECT code, details FROM bot.bot_fi_reporting_group_id ORDER BY code ASC", 
    "fi_report_group_id", 
    "Fi Report Group ID",
    "116003" // ล็อค Default ตามเงื่อนไขของคุณ
);

// $check_map_data = "SELECT * FROM bot.thcap_master_data";

// sql ดึงข้อมูลจากระบบ
$sql_sys_data = "WITH \"ContractDates\" AS (
                    SELECT 
                        \"contractID\", txs_contractid, \"conStartDate\",
                        \"conSubType_serial\", \"conType\", 
                        CASE 
                            WHEN \"conType\" = 'MG' THEN \"conLoanAmt\"
                            WHEN \"conType\" = 'SB' THEN \"conFinanceAmount\"
                        END AS \"contract_amount\",
                        \"thcap_get_all_date_seize\"(\"contractID\") AS d_seize,
                        \"thcap_get_all_date_totalseize\"(\"contractID\") AS d_totalseize,
                        \"thcap_get_all_date_writeoffacc\"(\"contractID\") AS d_writeoffacc,
                        \"thcap_get_all_date_writeoffaccbaddebt\"(\"contractID\") AS d_baddebt,
                        \"thcap_get_all_date_writeofftaxbaddebt\"(\"contractID\") AS d_taxbaddebt,
                        \"thcap_get_all_date_absclose\"(\"contractID\") AS d_close,
                        \"thcap_get_all_date_cancel\"(\"contractID\") AS d_cancel
                    FROM public.\"thcap_contract\"
                )
                SELECT 
                    c.*, 
                    master.purpose_type,
                    master.lending_business_type,
                    master.fi_report_group_id,
                    master.credit_type,
                    master.unique_id_type,
                    master.arrangement_purpose_code,
                    master.operation_progress,
                    master.tdr_method_type,
                    master.tdr_type,
                    master.loan_type,
                    master.movement_type,
                    master.asset_and_contingent_classification_type,
                    master.asset_and_contingent_classification_reason,
                    master.collateral_type,
                    master.revision,
                    CASE WHEN master.\"contractID\" IS NOT NULL THEN 1 ELSE 0 END AS has_master_data
                FROM \"ContractDates\" c
                LEFT JOIN (
                    SELECT DISTINCT ON (\"contractID\") *
                    FROM bot.thcap_master_data
                    ORDER BY \"contractID\", revision DESC
                ) master
                ON c.\"contractID\" = master.\"contractID\"
                WHERE 
                    d_close IS NULL 
                    AND \"conStartDate\" <= '$target_period'
                    AND d_cancel IS NULL
                    AND d_seize IS NULL
                    AND d_totalseize IS NULL
                    AND d_writeoffacc IS NULL
                    AND d_baddebt IS NULL
                    AND d_taxbaddebt IS NULL
                ORDER BY c.\"conStartDate\" ASC
                ";
$contract_active = array();
$result_query = pg_query($sql_sys_data);
while($result = pg_fetch_assoc($result_query)){
    $contract_active[] = $result;
}

// 4. ส่งผลลัพธ์กลับเป็น JSON ให้ UI ตัดสินใจ
echo json_encode(array(
    "status" => "success",
    "period" => $target_period,
    "data" => $contract_active,
    "column" => $form_schema,
));
?>