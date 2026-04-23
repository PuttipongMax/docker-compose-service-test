<?php
include("../config/config.php");
$name_show = $_SESSION["session_company_name_show"];
$name_company = "(" . $name_show . ") เพิ่มข้อมูล DATASET";
$currentDate = nowDateTime();
$userID = $_SESSION["av_iduser"];


$all_reports = array(
    // Monthly
    array("focus_report" => "ARS", "name_report" => "Arrangement Summary", "type" => "month"),
    array("focus_report" => "BLS", "name_report" => "Balance Sheet", "type" => "month"),
    array("focus_report" => "CAP", "name_report" => "Capital Fund", "type" => "month"),
    array("focus_report" => "DCD", "name_report" => "Deposit Classified by Type of Depositors", "type" => "month"),
    array("focus_report" => "IPI", "name_report" => "Involved Party", "type" => "month"),
    array("focus_report" => "IRS", "name_report" => "Interest Rate Summary", "type" => "month"),
    array("focus_report" => "IVP", "name_report" => "FI Investment Position", "type" => "month"),
    array("focus_report" => "LAR", "name_report" => "Loan Arrangement", "type" => "month"),
    array("focus_report" => "LCR", "name_report" => "Liquidity Coverage Ratio", "type" => "month"),
    array("focus_report" => "LPS", "name_report" => "Lending Purpose Summary", "type" => "month"),
    array("focus_report" => "RWA", "name_report" => "Risk Weighted Assets", "type" => "month"),
    array("focus_report" => "TCS", "name_report" => "Total Classified Lending Summary", "type" => "month"),
    // Quarterly
    array("focus_report" => "LMS", "name_report" => "Lending Movement Summary", "type" => "quarterly"),
    array("focus_report" => "LSB", "name_report" => "Lending Summary Classified by Business", "type" => "quarterly"),
    array("focus_report" => "PNL", "name_report" => "Profit & Loss", "type" => "quarterly"),
    array("focus_report" => "PVS", "name_report" => "Provision Summary", "type" => "quarterly"),
    // Semi-Annually
    array("focus_report" => "OPR", "name_report" => "Operational Risk", "type" => "semi-annually"),
    array("focus_report" => "PDS", "name_report" => "Net Profit Distribution", "type" => "semi-annually"),
);

// 2. สร้าง Array ว่างโดยใช้ array()
$final_reports_data = array();

// 3. วนลูปเช็คโฟลเดอร์และกำหนดสถานะ is_active
foreach ($all_reports as $report) {
    $folder_name = strtolower($report['focus_report']);
    if (is_dir($folder_name)) {
        $report['is_active'] = true;
    } else {
        $report['is_active'] = false;
    }
    $report['path'] = $folder_name . "/frm_index.php";
    $final_reports_data[] = $report;
}

// --- END: ส่วนโค้ดที่ปรับปรุง ---
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($name_company); ?></title>
    <link type="text/css" rel="stylesheet" href="../thcap_installments/act.css"></link>
    <style>
        body { font-family: sans-serif; padding: 20px; background-color: #f4f4f9; }
        .container { width: 96%; max-width: 1200px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        
        .tab-nav { display: flex; border-bottom: 2px solid #dee2e6; margin-bottom: 20px; border-top: 2px solid #dee2e6; margin-top: 20px; }
        .tab-button { padding: 10px 20px; cursor: pointer; border: none; background-color: transparent; font-size: 1rem; color: #495057; border-bottom: 2px solid transparent; margin-bottom: -2px; }
        .tab-button.active { color: #007bff; border-color: #007bff; font-weight: bold; }
        .tab-panel { display: none; }
        .tab-panel.active { display: block; }
        
        .menu-container { display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; }
        .menu-item { 
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 15px 10px; 
            background-color: #007bff;
            color: white; 
            text-decoration: none; 
            border-radius: 5px;
            text-align: center; 
            transition: background-color 0.3s; 
            cursor: pointer;
            font-size: 0.9rem;
        }
            .menu-item:hover { background-color: #0056b3; color: white; }
            
            .menu-item-inactive {
                background-color: #a9a9a9;
                color: #e9ecef;
                cursor: not-allowed;
                pointer-events: none;
            }
            .menu-item-inactive:hover {
                background-color: #a9a9a9;
            }

            /* style ปุ่ม ตรวจสอบ Master Data */
            .btn-master-data {
                padding: 10px 20px;
                background-color: #28a745; /* สีเขียว */
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 1rem;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.3s, transform 0.1s;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn-master-data:hover {
                background-color: #218838;
            }
            .btn-master-data:active {
                transform: scale(0.98);
            }

            @media (max-width: 992px) { .menu-container { grid-template-columns: repeat(3, 1fr); } }
            @media (max-width: 576px) { .menu-container { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <div id="menu-view">
            <div class="header"><h1><?php echo $name_company; ?></h1></div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 1rem;">                
                <div style="color:red; display:flex; justify-content:start; gap:1rem; margin-top:1rem;" >
                    <div><span>หมายเหตุ </span></div>
                    <div style="display:flex; flex-direction:column; justify-content: start; gap:0.2rem;">
                        <span>1.เมนูนี้เป็นเมนูเลือกประเภทรายงานการกรอกข้อมูลของเเต่ละ Dataset</span>
                        <span>
                            2. ปุ่มทำรายการเป็นสีน้ำเงิน 
                            <div style="width: 0.8rem; height: 0.8rem; background-color: #007bff; display: inline-block; vertical-align: middle;"></div> 
                            หมายความว่า รายงานประเภทนั้นสามารถทำรายการได้
                        </span>
                        <span>
                            3. ปุ่มทำรายการเป็นสีเทา 
                            <div style="width: 0.8rem; height: 0.8rem; background-color: #6c757d; display: inline-block; vertical-align: middle;"></div> 
                            หมายความว่า รายงานประเภทนั้นยังไม่พร้อมให้ทำรายการ
                        </span>
                    </div>
                </div>
                <div>
                    <button type="button" id="btn-open-master-data" class="btn-master-data">
                        <span style="margin-right: 5px;"></span> ตรวจสอบ Master Data
                    </button>
                </div>
            </div>
            <div class="tab-nav">
                <button class="tab-button active" data-tab="month">รายเดือน</button>
                <button class="tab-button" data-tab="quarterly">รายไตรมาส</button>
                <button class="tab-button" data-tab="semi-annually">ราย 6 เดือน</button>
            </div>
            <div class="tab-content">
                <div id="month-panel" class="tab-panel active"><div id="menu-month" class="menu-container"></div></div>
                <div id="quarterly-panel" class="tab-panel"><div id="menu-quarterly" class="menu-container"></div></div>
                <div id="semi-annually-panel" class="tab-panel"><div id="menu-semi-annually" class="menu-container"></div></div>
            </div>
        </div>
    </div>

<script>
    function popU(U, N, T) {
        window.open(U, N, T);
    }

    document.addEventListener("DOMContentLoaded", function() {
        // รับข้อมูลที่ PHP สร้างไว้มาใช้งาน (ส่วนนี้ไม่ต้องแก้)
        const list_data = <?php echo json_encode($final_reports_data); ?>;

        list_data.sort((a, b) => a.focus_report.localeCompare(b.focus_report));

        const tabButtons = document.querySelectorAll(".tab-button");
        tabButtons.forEach(button => {
            button.addEventListener("click", () => {
                document.querySelector(".tab-button.active").classList.remove("active");
                document.querySelector(".tab-panel.active").classList.remove("active");
                button.classList.add("active");
                document.getElementById(`${button.dataset.tab}-panel`).classList.add("active");
            });
        });
        
        function generateMenuItems(data, container) {
            container.innerHTML = ''; 
            data.forEach(item => {
                const menuItem = document.createElement("a");
                menuItem.className = "menu-item";
                menuItem.href = "#";
                menuItem.style.fontSize = "2rem"; 
                menuItem.innerHTML = `
                    ${item.focus_report} 
                    <br> 
                    <span style="font-size: 0.9rem;">(${item.name_report})</span>
                `;
                
                if (item.is_active) {
                    menuItem.setAttribute('data-report-type', item.focus_report);
                    menuItem.setAttribute('data-report-name', item.name_report);
                    
                    menuItem.addEventListener('click', function(event) {
                        event.preventDefault();                    
                        
                        const url = `frm_index.php?focus_report=${item.focus_report.toLowerCase()}`; 

                        if (url) {
                            const reportType = this.getAttribute('data-report-type');
                            const windowName = `dataset_${reportType}`;
                            const windowFeatures = 'width=1200,height=748,scrollbars=yes,resizable=yes';
                            popU(url, windowName, windowFeatures);
                        } else {
                            alert('ไม่ได้กำหนด path สำหรับรายงานนี้');
                        }
                    });

                } else {
                    menuItem.classList.add("menu-item-inactive");
                }
                container.appendChild(menuItem);
            });
        }

        const monthlyData = list_data.filter(item => item.type === 'month');
        const quarterlyData = list_data.filter(item => item.type === 'quarterly');
        const semiAnnuallyData = list_data.filter(item => item.type === 'semi-annually');

        generateMenuItems(monthlyData, document.getElementById('menu-month'));
        generateMenuItems(quarterlyData, document.getElementById('menu-quarterly'));
        generateMenuItems(semiAnnuallyData, document.getElementById('menu-semi-annually'));

        // จัดการปุ่มเปิดหน้า Master Data
        const btnMasterData = document.getElementById('btn-open-master-data');
        if (btnMasterData) {
            btnMasterData.addEventListener('click', function() {
                // เปลี่ยน URL เป็นหน้าที่คุณเตรียมไว้สำหรับจัดการ Master Data
                const masterDataUrl = 'frm_master_data.php'; 
                const windowName = 'dataset_master_data';
                const windowFeatures = 'width=1200,height=748,scrollbars=yes,resizable=yes';
                
                popU(masterDataUrl, windowName, windowFeatures);
            });
        }
    });
</script>
</body>
</html>