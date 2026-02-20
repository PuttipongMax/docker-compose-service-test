<?php
// session_start();
include("../config/config.php");
$company = $_SESSION["session_company_name_show"];

$currentYear = date("Y");
$currentMonth = date("m");

// ตั้งค่า default ปีและเดือน
if($currentMonth == '01'){
    $year_check = $currentYear-1;
    $month_check = '12';
    // Note: ตรงนี้ตัวแปร $current_month และ $current_year อาจจะไม่ตรงกับ $currentMonth, $currentYear ที่ประกาศด้านบน
    if($current_month == $month_check && $current_year == $year_check){
        $defaultYear = $currentYear;
        $defaultMonth = $currentMonth;
    }else{
        $defaultYear = $currentYear-1;
        $defaultMonth = '12';
    }
}else{
    $year_check = $currentYear;
    $month_check = $currentMonth-1;
    if($current_month == $month_check && $current_year == $year_check){
        $defaultYear = $currentYear;
        $defaultMonth = $currentMonth;
    }else{
        $defaultYear = $currentYear;
        $defaultMonth = $currentMonth-1;
    }
}
?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html>
<head>
    <title>(<?php echo $company;?>) จัดการ TFRS9 stage</title>
    <meta http-equiv="Content-Type" content="txt/html; charset=utf-8; scrollbars=no" />
    <META HTTP-EQUIV="Pragma" CONTENT="no-cache">
    <link type="text/css" rel="stylesheet" href="../act.css"></link>
    
    <link type="text/css" href="../../../jqueryui/css/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet" />    
    <script type="text/javascript" src="../../../jqueryui/js/jquery-1.4.2.min.js"></script>
    <script type="text/javascript" src="../../../jqueryui/js/jquery-ui-1.8.2.custom.min.js"></script>
    <script src="../../../js/dataTables/datatables.min.js"></script>

    <style>
        .custom-alert {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
            z-index: 9999;
        }
        .custom-alert .alert-box {
            background: white;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
            color: black; /* เปลี่ยนสีข้อความเป็นสีดำ */
            width: 300px; /* กำหนดความกว้างของกล่องแจ้งเตือน */
            text-shadow: none; /* ลบเงาของข้อความ */
        }
        .custom-alert .alert-box p {
            margin-bottom: 15px;
        }
        .custom-alert.active {
            display: flex;
        }
        .custom-alert button {
            background-color: #007bff;
            border: none;
            color: white;
            padding: 8px 8px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            /* font-size: 14px; */
            margin: 4px 2px;
            cursor: pointer;
            border-radius: 5px;
            min-width: 80px;
        }

        /* เพิ่มเงาและเปลี่ยนสีขอบให้ปุ่มดูโดดเด่นขึ้น */
        .btn-custom {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: none;
            color: white;
            padding: 5px 15px; /* ลดขนาด padding เพื่อทำให้ปุ่มเล็กลง */
            font-size: 14px; /* ลดขนาดตัวอักษร */
            border-radius: 20px; /* ขอบโค้งมน */
            cursor: pointer;
            transition: background-color 0.3s, box-shadow 0.3s;
            margin-top: 10px; /* เพิ่มช่องว่างด้านบนเพื่อความสวยงาม */
            width: 220px;
        }
        .btn-custom:focus {
            outline: none;
            box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        /* เพิ่มสไตล์เมื่อปุ่มถูกโฮเวอร์ */
        .btn-custom:hover {
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }

    </style>

    <script type="text/javascript">
        var company = '<?php echo $company; ?>';

        // เมื่อปิดเมนูจะทำการ unset session "json_data_TFRS9_Aging_force"
        window.addEventListener("unload", function () {
            navigator.sendBeacon('frm_list_TFRS9_Aging_force.php', JSON.stringify({ unsetSession: 0 }));
        });

        function popU(U,N,T){
            newWindow = window.open(U, N, T);
        }
        
        function s_tfrs_9(status_lock) {
            if (document.querySelectorAll('input[name="type_stage"]:checked').length === 0) {
                alert('กรุณาเลือก stage อย่างน้อยหนึ่งตัวเลือก!');
                return false;
            }else{
                // แสดง Progress GIF
                const panel = document.getElementById("panel");
                const btnPrint = document.querySelector("#isPrintPDF");
                const btnPrintExel = document.querySelector("#isPrintExel");
                panel.innerHTML = '<img src="../../../images/progress.gif" border="0" width="32" height="32" alt="กำลังโหลด...">';

                // สร้าง URL พร้อม query string
                const date = new Date();
                const year = date.getFullYear();
                var status_lock_send = status_lock;
                // const sort = document.querySelector('input[name="sort"]:checked')?.value || '';
                // const sortType = document.querySelector('input[name="sort_type"]:checked')?.value || '';
                const saveType = document.getElementById('saveType_hidden').value;
                const typeContract = document.getElementById('type_contract_hidden').value;
                const typeStage_dpd_1 = (document.getElementById('type_stage_dpd_1').checked).toString();
                const typeStage_dpd_2 = (document.getElementById('type_stage_dpd_2').checked).toString();
                const typeStage_dpd_3 = (document.getElementById('type_stage_dpd_3').checked).toString();
                // const typeStage_acc_1 = (document.getElementById('type_stage_acc_1').checked).toString();
                // const typeStage_acc_2 = (document.getElementById('type_stage_acc_2').checked).toString();
                // const typeStage_acc_3 = (document.getElementById('type_stage_acc_3').checked).toString();
                // console.log("typestage1 : ",typeStage_dpd_1,",",typeStage_acc_1);
                // console.log("typestage2 : ",typeStage_dpd_2,",",typeStage_acc_2);
                // console.log("typestage3 : ",typeStage_dpd_3,",",typeStage_acc_3);
                
                // &sort=${encodeURIComponent(sort)}&sort_type=${encodeURIComponent(sortType)}
                const url = `frm_list_TFRS9_Aging_force.php?
                            status_lock=${encodeURIComponent(status_lock_send)}
                            &year=${encodeURIComponent(year)}
                            &save_type=${encodeURIComponent(saveType)}
                            &type_contract=${encodeURIComponent(typeContract)}
                            &typestage_dpd_1=${encodeURIComponent(typeStage_dpd_1)}
                            &typestage_dpd_2=${encodeURIComponent(typeStage_dpd_2)}
                            &typestage_dpd_3=${encodeURIComponent(typeStage_dpd_3)}
                            `;
                // &typestage_acc_1=${encodeURIComponent(typeStage_acc_1)}
                // &typestage_acc_2=${encodeURIComponent(typeStage_acc_2)}
                // &typestage_acc_3=${encodeURIComponent(typeStage_acc_3)}

                // ใช้ fetch ดึงข้อมูลจาก server
                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.text(); // ดึงข้อมูลแบบ text
                    })
                    .then(data => {
                        // แสดงข้อมูลที่โหลดมาลงใน panel
                        console.log(data);
                        panel.innerHTML = data;
                        checkButton(data, btnPrint, btnPrintExel);
                    })
                    .catch(error => {
                        console.error('Error loading data:', error);
                        panel.innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
                    });
            }
            
            
        }

        function showCustomAlert(message, status_update, callback) {
            var alertBox = document.getElementById('customAlert');
            var start_month = null;
            var start_year = null;
            var type_export = null;

            document.getElementById('alertMessage').innerText = message;
            alertBox.classList.add('active');
            document.getElementById('alertOkButton').onclick = function() {
                alertBox.classList.remove('active');
                if (callback) callback();
                start_month = document.getElementById('start_month').value;
                start_year = document.getElementById('start_year').value;
                type_export = document.getElementById('type_export').value;

                // ดึง value ของ radio ที่ถูกเลือก
                let selectedRadio = document.querySelector('input[name="type_sort"]:checked');
                let type_sort = selectedRadio ? selectedRadio.value : '2'; // ถ้าไม่มีให้ default เป็น '2'

                console.log(start_month," : ",start_year);

                popU(
                'frm_list_TFRS9_Aging_force_pdf_forEX.php?month_select=' + start_month +
                '&year_select=' + start_year +
                '&type_export=' + type_export +
                '&type_sort=' + type_sort,
                '',
                'toolbar=no,menubar=no,resizable=no,scrollbars=yes,status=no,location=no,width=1100,height=800'
                );
            };
            document.getElementById('alertCancleButton').onclick = function() {
                alertBox.classList.remove('active');
                if (callback) callback();
            };
        }

        function chkSelectSave() // ตรวจสอบการเลือกรูปแบบการบันทึก
        {
            if(document.getElementById("saveType1").checked == true)
            {
                document.getElementById("saveType_hidden").value = "1";
            }
            else if(document.getElementById("saveType2").checked == true)
            {
                document.getElementById("saveType_hidden").value = "2";
            }
        }
        
        function chkTypeShow(){
            if(document.getElementById("type_contract").checked == true)
            {
                document.getElementById("type_contract_hidden").value = "1";
            }
            else if(document.getElementById("type_contract").checked == false)
            {
                document.getElementById("type_contract_hidden").value = "2";
            }
        }

        function check_num(e, type, $contract_ID) {
            var key;
            var targetInput = e.target || e.srcElement; // ระบุ element ที่ถูกเรียกใช้ฟังก์ชัน
            var fieldName = targetInput.getAttribute('name');
            var value = targetInput.value;

            // ฟังก์ชันตรวจสอบค่าที่อนุญาตเฉพาะ 1, 2, 3
            function isValidValue(inputValue) {
                return inputValue === "1" || inputValue === "2" || inputValue === "3";
            }

            if (window.event) {
                key = window.event.keyCode; // สำหรับ IE
            } else {
                key = e.which; // สำหรับ Firefox, Chrome ฯลฯ
            }

            var charStr = String.fromCharCode(key);

            // กรณีอนุญาตเฉพาะ 1, 2, 3 เมื่อ type เป็น 'stage'
            if (type === 'stage') {
                var newValue = value + charStr;
                if (!isValidValue(newValue)) {
                    e.preventDefault ? e.preventDefault() : (window.event.returnValue = false);
                    return;
                }else{
                    var remark = "remark_alert["+$contract_ID+"]";
                    var check_contract = "lgd_stage["+$contract_ID+"]";
                    var contract = "lgd_stage_text["+$contract_ID+"]";
                    var contractInputs = document.querySelectorAll("input[name^='contractIDs_all[']");
                    // contractInputs.forEach(function(input) {
                    //  var contractID = input.value.trim(); // ป้องกัน space เกิน
                    //  contractID = contractID.slice(0, -1);
                    //  if (contractID == $contract_ID) {
                    //      var placeholder_contract = document.getElementById(contract).placeholder;

                    //      if(placeholder_contract){
                                document.getElementById(remark).style.display = '';
                                document.getElementById(check_contract).style.display = '';
                            // }
                            document.getElementById(check_contract).disabled = false;
                    //  }
                    // });
                    if(newValue === "1" || newValue === "2"){
                        document.getElementById(check_contract).checked = true;
                        document.getElementById(contract).disabled = !this.checked;
                        document.getElementById(contract).style.display = 'none';
                        document.getElementById(check_contract).disabled = true;
                    }else{
                        document.getElementById(check_contract).checked = false;
                        
                        document.getElementById(contract).disabled = this.checked;
                        document.getElementById(contract).style.display = 'block';
                    }
                }
            }

            // ตรวจสอบการป้อนตัวเลข (0-9) หรือ จุดทศนิยม (.)
            var isNumber = key >= 48 && key <= 57; // 0-9
            var isDecimalPoint = key === 46; // จุดทศนิยม "."

            if (isNumber) {
                return; // อนุญาตให้ป้อนตัวเลขได้เสมอ
            } else if (isDecimalPoint) {
                // ถ้ามีจุดทศนิยมอยู่แล้วในค่า value ไม่ให้ป้อนเพิ่ม
                if (value.includes('.')) {
                    e.preventDefault ? e.preventDefault() : (window.event.returnValue = false);
                    return;
                }
            } else {
                // ป้องกันการป้อนค่าที่ไม่ใช่ตัวเลขหรือจุดทศนิยม
                e.preventDefault ? e.preventDefault() : (window.event.returnValue = false);
            }
        }

        function recheck_lgd($contract_ID){
            var stage_2 = "stage_2["+$contract_ID+"]";
            var check_contract = "lgd_stage["+$contract_ID+"]";
            var contract = "lgd_stage_text["+$contract_ID+"]";
            var placeholder_contract = document.getElementById(contract).placeholder;
            
            if(document.getElementById(check_contract).checked){
                document.getElementById(check_contract).disabled = false;
                document.getElementById(contract).value = null;
                document.getElementById(contract).disabled = !this.checked;
                document.getElementById(contract).style.display = 'none';
                document.getElementById(stage_2).readOnly = false;
                document.getElementById(stage_2).onkeypress = function(event) {
                                                                check_num(event, 'stage', $contract_ID);
                                                            };
                document.getElementById(stage_2).style.backgroundColor = "";
            }else{
                document.getElementById(check_contract).disabled = false;
                document.getElementById(contract).disabled = this.checked;

                if (!placeholder_contract) {
                    document.getElementById(stage_2).readOnly = false;
                    document.getElementById(stage_2).onkeypress = function(event) {
                                                                    check_num(event, 'stage', $contract_ID);
                                                                };
                    document.getElementById(stage_2).style.backgroundColor = "";
                    
                }
                else{
                    document.getElementById(stage_2).value = null;
                    document.getElementById(stage_2).readOnly = true;
                    document.getElementById(stage_2).onkeypress = null;
                    document.getElementById(stage_2).style.backgroundColor = "lightgray";
                }

                if(document.getElementById(stage_2).value !== "1" && document.getElementById(stage_2).value !== "2"){
                    document.getElementById(contract).style.display = 'block';
                }else{
                    document.getElementById(check_contract).disabled = true;
                }
            }
                
        }   

        function toggleLock(action_lock) {
            s_tfrs_9(action_lock);
        }


        function updateValue(inputElement,contract_ID) {
            // input.setAttribute("value", input.value);
            var stage_2 = "stage_2["+contract_ID+"]";
            var remark = "remark_alert["+contract_ID+"]";
            var check_contract = "lgd_stage[" + contract_ID + "]";
            var contract = "lgd_stage_text[" + contract_ID + "]";
            var placeholder_contract = document.getElementById(stage_2).placeholder;
            var contractInputs = Array.from(document.querySelectorAll("input[name^='contractIDs_all_stage_3[']"))
                                      .map(input => input.value.trim().slice(0, -1)); // เอาค่า input และตัดตัวสุดท้ายออก

            console.log(placeholder_contract);

            if (inputElement.value === "" && (placeholder_contract == 2 || placeholder_contract == 1 || !placeholder_contract)) {
                if (contractInputs.includes(contract_ID)) { // ตรวจสอบว่ามี contract_ID ใน array หรือไม่
                    document.getElementById(check_contract).checked = false;
                    document.getElementById(contract).style.display = 'block';
                    document.getElementById(contract).disabled = false;
                    document.getElementById(contract).value = "";
                    document.getElementById(check_contract).disabled = false;
                } else {
                    document.getElementById(remark).style.display = 'none';
                    document.getElementById(check_contract).style.display = 'none';
                    document.getElementById(contract).style.display = 'none';
                }
            }
            else{
                // เช็คค่าของ stage_1 ว่าถูกลบออกหรือไม่
                if (inputElement.value === "") {
                    document.getElementById(check_contract).checked = false;
                    document.getElementById(contract).style.display = 'block';
                    document.getElementById(contract).disabled = false;
                    document.getElementById(contract).value = "";
                    document.getElementById(check_contract).disabled = false;
                }
            }
            
            
        }

        function validate() {
            var theMessage = "Please complete the following: \n-----------------------------------\n";
            var noErrors = true;
            var hasAtLeastOneStageValue = false; // เช็คว่ามีค่าหรือไม่
            var hasOneNoHaveLGD_array = Array();
            var hasOneNoHaveLGD = false;

            // ตรวจสอบฟิลด์ PIN
            // if (document.frm.pin.value == "") {
            //     theMessage = theMessage + "\n --> กรุณาระบุ PIN";
            //     noErrors = false;
            // }

            var contractInputs = document.querySelectorAll("input[name^='stage_1[']");
            var contractInputs_2 = document.querySelectorAll("input[name^='stage_2[']");
            var contract_Lgd = document.querySelectorAll("input[name^='lgd_contract[']");
            contractInputs.forEach(function(input) {
                if (input.value.trim() !== "") {
                    hasAtLeastOneStageValue = true; // ถ้ามีช่องไหนมีค่า ให้ผ่าน
                }
            });
            contractInputs_2.forEach(function(input) {
                if (input.value.trim() !== "") {
                    hasAtLeastOneStageValue = true; // ถ้ามีช่องไหนมีค่า ให้ผ่าน
                }
            });
            contract_Lgd.forEach(function(input){
                var contract_id = input.value;
                // console.log(contract_id);
                var lgd_check_contract = "lgd_stage["+contract_id+"]";
                var lgd_contract = "lgd_stage_text["+contract_id+"]";
                // console.log(document.getElementById(lgd_check_contract).checked,document.getElementById(lgd_contract).value.trim());
                if(!document.getElementById(lgd_check_contract).checked && document.getElementById(lgd_contract).value.trim() === ""){
                    hasOneNoHaveLGD_array.push(false);
                }else if(document.getElementById(lgd_check_contract).checked || document.getElementById(lgd_contract).value.trim() !== ""){
                    hasOneNoHaveLGD_array.push(true);
                }
                // console.log(hasOneNoHaveLGD_array);
            });
            
            if(!hasOneNoHaveLGD_array.includes(false)){
                hasOneNoHaveLGD = true;
            }

            // recheck ว่าถ้ามีการกรอกค่าใดค่าหนึ่งมาให้สามารถกด submit form ได้
            if(hasOneNoHaveLGD == true){
                if(hasAtLeastOneStageValue == false){
                    hasAtLeastOneStageValue = true;
                }
            }
            else if(hasAtLeastOneStageValue == true){
                if(hasOneNoHaveLGD == false){
                    hasOneNoHaveLGD = true;
                }
            }

            // ถ้าไม่มีช่องไหนของ stage_2 ที่มีค่าเลย ให้แจ้งเตือน
            if (!hasAtLeastOneStageValue) {
                theMessage += "\n --> กรุณากรอกข้อมูลในช่อง stage_1 หรือ stage_2 อย่างน้อย 1 ช่อง";
                noErrors = false;
            }

            // ถ้ามีช่องไหนไม่ใส่ค่า LGD ให้แจ้งเตือน
            if (!hasOneNoHaveLGD) {
                theMessage += "\n --> กรุณากรอกข้อมูลในช่อง LGD ให้ครบถ้วนทุกสัญญาที่ stage DPD และ ACC มีค่าเท่ากับ 3";
                noErrors = false;
            }

            // ถ้ามีข้อผิดพลาด ให้แสดง alert
            if (!noErrors) {
                alert(theMessage);
                return false;
            }

            return true;
        }

        let sortDirections = {}; // เก็บสถานะการเรียงลำดับของแต่ละคอลัมน์

        function sortTable(columnIndex) {
            const table = document.getElementById("myTable");
            const rows = Array.from(table.rows).slice(1); // ข้ามแถวหัวข้อ
            const headers = table.rows[0].querySelectorAll("th");
            const isAscending = sortDirections[columnIndex] !== true; // ค่าเริ่มต้น: เรียงลำดับจากน้อยไปมาก

            // ลบลูกศรออกจากทุกคอลัมน์
            headers.forEach((header, index) => {
                header.innerHTML = header.innerHTML.replace(/ ⬆| ⬇/g, "");
            });

            rows.sort((a, b) => {
                let aText = a.cells[columnIndex].innerText.trim();
                let bText = b.cells[columnIndex].innerText.trim();

                // แปลงค่าถ้าเป็นตัวเลข
                if (columnIndex == 5) {
                    aText = parseInt(aText.replace(/[^0-9\.]+/g, ""));
                    bText = parseInt(bText.replace(/[^0-9\.]+/g, ""));
                }

                // ตรวจสอบว่าค่าเป็นตัวเลขหรือไม่
                if (!isNaN(aText) && !isNaN(bText)) {
                    return isAscending ? aText - bText : bText - aText;
                } else {
                    return isAscending
                        ? aText.localeCompare(bText)
                        : bText.localeCompare(aText);
                }
            });

            // อัปเดตตารางใหม่
            rows.forEach(row => table.tBodies[0].appendChild(row));

            // เพิ่มหรืออัปเดตลูกศรที่หัวข้อคอลัมน์
            const arrow = isAscending ? " ⬆" : " ⬇";
            headers[columnIndex].innerHTML += arrow;

            // อัปเดตสถานะการเรียงลำดับ
            sortDirections[columnIndex] = isAscending;
        }


 
    </script>
</head>
<body>
    <center>
        <h1>(<?php echo $company;?>) จัดการ TFRS9 stage</h1>
        
        <table width="90%" border="0" cellspacing="0" cellpadding="0" align="center">
            <tr>
                <td align="center">
                    <fieldset><legend><B>ค้นหา</B></legend>
                        <INPUT TYPE="radio" name="saveType" id="saveType1" VALUE="1" onChange="chkSelectSave();" checked> แสดงทุกเลขสัญญา
                        <INPUT TYPE="radio" name="saveType" id="saveType2" VALUE="2" onChange="chkSelectSave();"> แสดงเฉพาะเลขสัญญาที่เคยกำหนด stage
                        <INPUT TYPE="hidden" name="saveType_hidden" id="saveType_hidden" VALUE="1">
                        <br/>
                        <INPUT TYPE="checkbox" id="type_contract" onChange="chkTypeShow();" checked> ไม่แสดงเลขสัญญาที่มีการปิดบัญชีภายใน 4 เดือนนี้
                        <INPUT TYPE="hidden" name="type_contract_hidden" id="type_contract_hidden" VALUE="1">
                        <br/>
                        <INPUT TYPE="checkbox" name="type_stage" id="type_stage_dpd_1" checked> stage 1
                        <INPUT TYPE="checkbox" name="type_stage" id="type_stage_dpd_2" checked> stage 2
                        <INPUT TYPE="checkbox" name="type_stage" id="type_stage_dpd_3" checked> stage 3
                        <br/><br/>
                        <input type="submit" value="ค้นหา" style="cursor:pointer;" onClick="s_tfrs_9('null');" />
                        <input id="isPrintPDF" type="button" value="พิมพ์ PPF" style="cursor:pointer;" onclick="javascript:popU('frm_list_TFRS9_Aging_force_pdf.php?printPDF=1','','toolbar=no,menubar=no,resizable=no,scrollbars=yes,status=no,location=no,width=1100,height=800')" />
                        <input id="isPrintExel" type="button" value="พิมพ์ Exel" style="cursor:pointer;" onclick="javascript:popU('frm_list_TFRS9_Aging_force_excel.php?printExel=1','','toolbar=no,menubar=no,resizable=no,scrollbars=yes,status=no,location=no,width=1100,height=800')" />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        <br><br>
                        
                        <input id="isPrintExel_forex" type="button" value="พิมพ์รายงานสำหรับผู้บริหาร" style="cursor:pointer; float:right; padding: 3px" onclick="showCustomAlert('Export File สำหรับผู้บริหาร',0)" />
                        <br><br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        <button style="float:right;"
                        onClick="javascript:popU('frm_list_TFRS9_Aging_force_history.php','','toolbar=no,menubar=no,resizable=no,scrollbars=yes,status=no,location=no,width=1100,height=800')"
                        >ประวัติการทำรายการ TFRS9 stage</button>

                    </fieldset>
                    
                    <br/><br/>
                    <div id="panel"></div>
                </td>
            </tr>
        </table>
    </center>
    <script lang="javascript">
        document.addEventListener("DOMContentLoaded", () => {
            const isPanel = document.querySelector("#panel");
            const btnPrintPDF = document.querySelector("#isPrintPDF");
            const btnPrintExel = document.querySelector("#isPrintExel");

            if (isPanel.innerHTML.trim() === "") {
                btnPrintPDF.style.display = "none";
                btnPrintExel.style.display = "none";
            }
        });

        async function checkButton(hasData, ...buttons) {       
            var contractInputs = document.querySelectorAll("input[name^='contractIDs[']");

            if (hasData && !document.body.innerText.includes("-- ไม่พบสัญญา --")) {
                buttons.forEach(btn => btn.style.display = "inline-block");

                contractInputs.forEach(function(input) {
                    var contractID = input.value.trim(); // ป้องกัน space เกิน
                    if (contractID) {
                        // ปรับ disabled โดยไม่ต้องหา input
                        var ct = contractID.slice(0, -1);
                        // recheck_lgd(ct);
                        var stage_2 = "stage_2["+ct+"]";

                        document.querySelector(`input[name='${stage_2}']`).readOnly = true;
                        document.querySelector(`input[name='${stage_2}']`).onkeypress = null;
                        document.querySelector(`input[name='${stage_2}']`).style.backgroundColor = "lightgray";
                    }
                });
            }
        }


    </script>
    <div id="customAlert" class="custom-alert">
        <div class="alert-box">
            <p id="alertMessage"></p>
            วันที่ : <select name="start_month" id="start_month" style="padding: 3px;">
                <option value="00">--เลือกเดือน--</option>
                <option value="01" <?php if($defaultMonth == "01") echo "selected"; ?>>มกราคม</option>
                <option value="02" <?php if($defaultMonth == "02") echo "selected"; ?>>กุมภาพันธ์</option>
                <option value="03" <?php if($defaultMonth == "03") echo "selected"; ?>>มีนาคม</option>
                <option value="04" <?php if($defaultMonth == "04") echo "selected"; ?>>เมษายน</option>
                <option value="05" <?php if($defaultMonth == "05") echo "selected"; ?>>พฤษภาคม</option>
                <option value="06" <?php if($defaultMonth == "06") echo "selected"; ?>>มิถุนายน</option>
                <option value="07" <?php if($defaultMonth == "07") echo "selected"; ?>>กรกฎาคม</option>
                <option value="08" <?php if($defaultMonth == "08") echo "selected"; ?>>สิงหาคม</option>
                <option value="09" <?php if($defaultMonth == "09") echo "selected"; ?>>กันยายน</option>
                <option value="10" <?php if($defaultMonth == "10") echo "selected"; ?>>ตุลาคม</option>
                <option value="11" <?php if($defaultMonth == "11") echo "selected"; ?>>พฤศจิกายน</option>
                <option value="12" <?php if($defaultMonth == "12") echo "selected"; ?>>ธันวาคม</option>
            </select>
            <select name="start_year" id="start_year" style="padding: 3px;">
                <?php 
                // Loop เพื่อสร้างตัวเลือกปี โดยย้อนหลังได้ 1 ปี และไม่มากกว่า 3 ปีจากปีปัจจุบัน
                for($i = $currentYear - 1; $i <= $currentYear + 3; $i++) {
                    $selected = ($i == $defaultYear) ? "selected" : "";
                    echo "<option value='$i' $selected>$i</option>";
                }
                ?>
            </select><br><br>
            ประเภทข้อมูล : <select name="type_export" id="type_export" padding: 3px;">
                <option value="1" >DPD</option>
                <option value="2" >DPD+FORCE</option>
            </select><br><br>
            <input type="radio" id="type_sort" name="type_sort" value="2" checked />
            <label for="type_sort">เรียงลำดับตาม stage (1-3)</label><br>
            <input type="radio" id="type_sort" name="type_sort" value="1"/>
            <label for="type_sort">เรียงลำดับตามเลขที่สัญญา</label><br><br>

            <button id="alertOkButton" >Export</button>
            <button id="alertCancleButton" style="background-color: #dc3545;">ยกเลิก</button>
        </div>
    </div>
</body>
</html>