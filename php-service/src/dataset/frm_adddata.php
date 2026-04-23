<?php
    include("../../config/config.php");
    header('Content-Type: text/html; charset=utf-8');
    // ชื่อย่อบริษัท
    $abbr_company = $_SESSION["session_company_name_show"];
    
    // รับค่าจาก URL
    $focus_report = isset($_GET["focus_report"]) ? pg_escape_string($_GET['focus_report']) : "";
    $upper_focus_report = strtoupper($focus_report);
    $search_date = isset($_GET["search_date"]) ? pg_escape_string($_GET['search_date']) : "";
    // ผู้ทำรายการ
    $userID = $_SESSION["av_iduser"];
    $name_company = "(" . $abbr_company . ") Dataset {$upper_focus_report}";    

    // =========================================================
    // --- WORKFLOW MIDDLEWARE (SERVER LEVEL) ---
    // =========================================================
    if ($focus_report === 'rwa' || $focus_report === 'cap') {

        // ตรวจสอบว่า "กำลังจะสร้าง/ดูข้อมูลของเดือนล่าสุด" ใช่หรือไม่?
        // ถ้าเป็นข้อมูลเดือนเก่า ($search_date ไม่ตรงกับ $endDateOnly) จะข้ามการเช็คนี้ไปเลย
        // กำหนดวันที่ปัจจุบัน
        $currentDate = nowDateTime();
        // หาวันสิ้นเดือนของเดือนปัจจุบัน (เช่น 2026-08-31)
        $endDateOnly = date('Y-m-t', strtotime($currentDate));
        if ($search_date !== $endDateOnly) {
            $sql_check = "SELECT 1 FROM bot.thcap_dataset_bls 
                        WHERE \"submit_period\" = '$search_date' 
                        AND status_appv = '1' LIMIT 1";
            $res_check = pg_query($sql_check);
            
            // ถ้าไม่มีข้อมูล BLS ที่อนุมัติแล้วในเดือนนั้น ให้เด้งออกทันที
            if (!$res_check || pg_num_rows($res_check) === 0) {
                echo "<script>
                    alert('ข้อมูลที่ดึงจากระบบอาจไม่ครบถ้วน : ต้องทำรายงาน BLS ประจำเดือน {$search_date} ให้ได้รับการอนุมัติก่อน!');                    
                </script>";
                // exit; // หยุดการโหลดหน้าเว็บทันที
            }
        }
    }
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $name_company ?></title>
    <link type="text/css" rel="stylesheet" href="act.css"></link>
</head>
<body>
    <center><h1><?php echo $name_company ?></h1></center>

    <div id="select-bar-container">
        </div>
    
    <div id="table-container">
        <p>Loading report...</p>
    </div>

    <script src="Store.js?v=<?php echo filemtime('Store.js'); ?>" type="text/javascript"></script>
    
    <script src="ReportRenderer.js?v=<?php echo filemtime('ReportRenderer.js'); ?>" type="text/javascript"></script>

    <script src="SelectBarRenderer.js?v=<?php echo filemtime('SelectBarRenderer.js'); ?>" type="text/javascript"></script>

    <script src="index.js?v=<?php echo filemtime('index.js'); ?>" type="text/javascript"></script>

    <script>
        document.addEventListener("DOMContentLoaded", function() {
            var getParam = new URLSearchParams(window.location.search);
            var getSearchDate = getParam.get("search_date");
            var getReport = getParam.get("focus_report");
            console.log([getSearchDate, getReport]);

            // 3.2. สร้าง Instance ของ App และเริ่มต้นการทำงาน
            try {
                let appConfig = {
                    reportType: getReport,
                    searchDate: getSearchDate,
                    containers: {
                        "selectBar": "#select-bar-container",
                        "table": "#table-container"
                    }
                }
                // (เราจะใช้ Class 'ReportApp' ที่อยู่ในไฟล์ App.js)
                const app = new ReportApp(appConfig);
                app.init();
                
                // (Optional: สำหรับ Debug ใน Console)
                window.app = app; 
            } catch (e) {
                console.error("Failed to initialize ReportApp:", e);
                document.getElementById('table-container').innerHTML = 
                    '<p class="error-message">Error initializing application. See console.</p>';
            }
        });
    </script>
</body>
</html>