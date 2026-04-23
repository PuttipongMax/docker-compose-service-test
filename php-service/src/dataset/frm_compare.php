<?php
// (ส่วน config.php ยังจำเป็น ถ้าคุณต้องใช้ session หรือตัวแปรอื่นๆ)
include("../../config/config.php"); 
$name_show = $_SESSION["session_company_name_show"];

// (รับค่า GET มาเพื่อใช้ใน Title)
$selected_month = isset($_GET['month']) ? (int)$_GET['month'] : null;
$selected_year = isset($_GET['year']) ? (int)$_GET['year'] : null;

$focus_report = isset($_GET["focus_report"]) ? pg_escape_string($_GET['focus_report']) : "";
$search_date = isset($_GET["search_date"]) ? pg_escape_string($_GET['search_date']) : "";

$upper_focus_report = strtoupper($focus_report);

$name_menu = "({$name_show}) Dataset {$upper_focus_report} - เปรียบเทียบข้อมูล";
// (สมมติว่าคุณมี $thai_months array)
$thai_months = array(
    1 => "มกราคม", 2 => "กุมภาพันธ์", 3 => "มีนาคม", 4 => "เมษายน",
    5 => "พฤษภาคม", 6 => "มิถุนายน", 7 => "กรกฎาคม", 8 => "สิงหาคม",
    9 => "กันยายน", 10 => "ตุลาคม", 11 => "พฤศจิกายน", 12 => "ธันวาคม"
);
$month_name = isset($thai_months[$selected_month]) ? $thai_months[$selected_month] : ''; // <== ใช้วิธีนี้แทน 
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title><?php echo $name_menu; ?></title>
    <link type="text/css" rel="stylesheet" href="act.css"></link>
</head>
<body>
    <div align="center">
        <h1><?php echo $name_menu; ?></h1>
        <p>ข้อมูลประจำเดือน: <?php echo htmlspecialchars($month_name . ' ปี ' . $selected_year); ?></p>
        
        <div style="margin-bottom: 20px;">
            <a href="frm_adddata.php?focus_window=main&search_date=<?php echo $search_date ?>&focus_report=<?php echo $focus_report ?>" style="padding: 8px 15px; background-color: #6c757d; color: white; text-decoration: none; border-radius: 5px;">&laquo; กลับไปหน้าข้อมูล</a>
        </div>
    </div>

    <div id="compare-legend"></div>

    <div id="compare-controls" align="center"></div>

    <div id="loading-indicator" style="text-align: center; padding: 50px; font-size: 1.2em;">
        Loading comparison data...
    </div>

    <div id="compare-container"></div>

    <script src="CompareRenderer.js?v=<?php echo filemtime('CompareRenderer.js'); ?>"></script>
    <script>
        document.addEventListener("DOMContentLoaded", async function() {
            const loadingEl = document.getElementById('loading-indicator');
            
            try {
                // 2. ดึงค่า Params จาก URL
                var getParam = new URLSearchParams(window.location.search);
                var getReport = getParam.get("focus_report");
                var getMonth = getParam.get("month");
                var getYear = getParam.get("year");
                var getRev1 = getParam.get("rev1") || ''; // (ค่า rev ที่ถูกเลือก ถ้ามี)

                // 3. [ย้ายมา] นี่คือ Fetch Logic ที่ดึงมาจาก Class
                const fetchUrl = new URL(`${getReport}/data_management.php`, window.location.href);
                fetchUrl.searchParams.set('focus_window', 'compare');
                fetchUrl.searchParams.set('focus_report', getReport);
                fetchUrl.searchParams.set('month', getMonth);
                fetchUrl.searchParams.set('year', getYear);
                fetchUrl.searchParams.set('rev1', getRev1);
                
                console.log("Fetching compare data from:", fetchUrl.toString());
                const response = await fetch(fetchUrl.toString());
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
                }
                
                const jsonData = await response.json();
                
                if (jsonData.status !== 'success') {
                    throw new Error(jsonData.message || 'Server returned an error');
                }
                
                // 4. [แก้ไข] ส่ง jsonData ที่ fetch ได้ เข้าไปใน Class
                const comparePage = new CompareRenderer({
                    controlsId: 'compare-controls',
                    containerId: 'compare-container',
                    loadingId: 'loading-indicator',
                    legendId: 'compare-legend',
                    getReport: getReport,
                    jsonData: jsonData // ส่งข้อมูลที่ดึงได้เข้าไปที่นี่
                });
                
                // 5. [แก้ไข] เรียก .render() แทน .initialize()
                comparePage.render();
            } catch (e) {
                document.getElementById('loading-indicator').innerHTML = 
                    `<p style="color:red; text-align:center;"><strong>Initialization Error:</strong> ${e.message}</p>`;
            }
        });
    </script>
</body>
</html>