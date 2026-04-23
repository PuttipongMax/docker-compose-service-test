<?php
include("../../config/config.php");

$focus_report = isset($_GET["focus_report"]) ? pg_escape_string($_GET["focus_report"]) : "";

$name_show = $_SESSION["session_company_name_show"];
$upper_focus_report = strtoupper($focus_report);
$name_company = "(" . $name_show . ") Dataset {$upper_focus_report}";

$main_table = "thcap_dataset_{$focus_report}";
$log_table = "thcap_dataset_{$focus_report}_log";

// กำหนดวันที่ปัจจุบัน (ใช้สำหรับสร้างข้อมูลใหม่)
$currentDate = nowDateTime();
$endDateOnly = date('Y-m-t', strtotime($currentDate));

// =========================================================
// --- 🛡️ WORKFLOW CHECK: ตรวจสอบสิทธิ์การสร้างข้อมูลใหม่ ---
// =========================================================
$is_allowed_to_add = true;
$lock_reason = "";

if ($upper_focus_report === 'RWA' || $upper_focus_report === 'CAP') {
    // เช็คว่า BLS ของ "เดือนปัจจุบัน" ได้รับการอนุมัติหรือยัง
    $sql_check_bls = "SELECT 1 FROM bot.thcap_dataset_bls 
                      WHERE \"submit_period\" = '$endDateOnly' 
                      AND status_appv = '1' LIMIT 1";
    
    // หมายเหตุ: ตรวจสอบให้แน่ใจว่าตัวแปร connection ตรงกับของคุณ (เช่น $db_conn)
    $res_check_bls = pg_query($sql_check_bls); 

    if (!$res_check_bls || pg_num_rows($res_check_bls) === 0) {
        $is_allowed_to_add = false;
        $lock_reason = "ต้องทำรายงาน BLS ประจำเดือน {$endDateOnly} ให้ได้รับการอนุมัติก่อน";
    }
}
// =========================================================
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title><?php echo htmlspecialchars($name_company); ?></title>
    <meta http-equiv="Pragma" content="no-cache">
    <link type="text/css" rel="stylesheet" href="act.css">
    <link type="text/css" href="../../jqueryui/css/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet">
    <script type="text/javascript" src="../../jqueryui/js/jquery-1.4.2.min.js"></script>
    <script type="text/javascript" src="../../jqueryui/js/jquery-ui-1.8.2.custom.min.js"></script>
    <script type="text/javascript">
        function popU(U, N, T) {
            window.open(U, N, T);
        }

        // --- [เพิ่ม] ฟังก์ชันสำหรับเริ่มดาวน์โหลดและแสดงข้อความแจ้งเตือน ---
        function startDownload(url) {
            window.location.href = url;
            setTimeout(function() {
                alert('การดาวน์โหลดเริ่มต้นแล้ว!\nไฟล์จะถูกบันทึกในโฟลเดอร์ดาวน์โหลดของคุณ');
            }, 1000);
        }
    </script>
</head>
<body>
    <div align="center">
        <div id="webreport">
            <div class="header"><h1><?php echo $name_company; ?></h1></div>
            <br>
            <table width="80%" border="1" align="center" cellspacing="0" cellpadding="10" bordercolor="#EDF8FE" bgcolor="#D5EFFD">
                <tr>
                    <td colspan="5" align="right">
                        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <span><b>ข้อมูล Dataset <?php echo $focus_report; ?></b></span>
                            
                            <div style="text-align: right;">
                                <button onclick="window.location.href='frm_adddata.php?search_date=<?php echo $endDateOnly ?>&focus_report=<?php echo $focus_report ?>'" style="cursor: pointer; padding: 5px 10px;">
                                    เพิ่มข้อมูล Dataset <?php echo $focus_report; ?> ประจำเดือน
                                </button>
                            </div>
                            
                        </div>
                    </td>
                </tr>
                <tr>
                    <td align="center">
                        <table width="100%" border="0" cellpadding="2" cellspacing="1">
                            <tr bgcolor="#79BCFF">
                                <th align="center" width="10%">ลำดับที่</th>
                                <th align="center" width="20%">Dataset Date</th>
                                <th align="center" width="20%">การทำรายการ</th>
                                <th align="center" width="20%">ออกรายงาน</th>
                            </tr>
                            <?php
                            // ดึงข้อมูลที่ไม่ซ้ำกันจากฐานข้อมูล PostgreSQL
                            $qry_result = pg_query("SELECT MAX(\"autoID\") AS \"autoID\", \"submit_period\" FROM bot.{$main_table} GROUP BY \"submit_period\" ORDER BY \"submit_period\" ASC");
                            
                            $i = 1;
                            if(pg_num_rows($qry_result) == 0) {
                                echo "<tr><td colspan='6' align='center' height='50'><b>- ไม่พบข้อมูล -</b></td></tr>";
                            } else {                                                                        
                                while ($res_lab = pg_fetch_array($qry_result)) {    
                                    $lbdID = $res_lab["autoID"];
                                    $submit_period = $res_lab["submit_period"];

                                     // สลับสีพื้นหลังของแถว
                                    $row_color = ($i % 2 == 0) ? "#EDF8FE" : "#D5EFFD";

                                    $csv_url = rawurlencode($focus_report)."/generate_report.php?submit_period=" . rawurlencode($submit_period);
                                    $xml_url = rawurlencode($focus_report)."/generate_xml_report.php?submit_period=" . rawurlencode($submit_period);

                                    // --- 1. ตรวจสอบสถานะ (Logic เดิม) ---
                                    $is_draft = false;
                                    $warning_msg = "";

                                    // เช็ครายการรออนุมัติ (Status 0)
                                    $sql_check_appv = "SELECT DISTINCT rev, status_appv  FROM bot.{$log_table} WHERE \"submit_period\" = '$submit_period' AND status_appv = '0'";
                                    $query_check_appv = pg_query($sql_check_appv);

                                    if(pg_num_rows($query_check_appv) > 0){
                                        $is_draft = true;
                                        $warning_msg = "แจ้งเตือน: ข้อมูลประจำเดือน $submit_period ยังรอการอนุมัติ \\nไฟล์นี้จะเป็นฉบับร่าง (Draft) ต้องการดาวน์โหลดหรือไม่?";
                                    } else {
                                        // เช็ครายการที่ผ่านอนุมัติ (Status 1)
                                        $sql_passAppv = "SELECT DISTINCT rev, status_appv FROM bot.{$log_table} WHERE \"submit_period\" = '$submit_period' AND status_appv = '1'";
                                        $query_passAppv = pg_query($sql_passAppv);
                                        
                                        if(pg_num_rows($query_passAppv) > 0){
                                            $is_draft = false; 
                                        } else {
                                            $is_draft = true; 
                                            
                                            $sql_appv = "SELECT DISTINCT rev FROM bot.{$log_table} WHERE \"submit_period\" = '$submit_period'";
                                            $query_appv = pg_query($sql_appv);
                                            $notPassRev = array();
                                            while($s = pg_fetch_assoc($query_appv)){
                                                $notPassRev[] = $s['rev'];
                                            }
                                            sort($notPassRev);
                                            $text_rev = implode(", ", $notPassRev);
                                            $warning_msg = "แจ้งเตือน: Revision $text_rev ไม่ผ่านการอนุมัติ \\nไฟล์นี้จะเป็นฉบับร่าง (Draft) ต้องการดาวน์โหลดหรือไม่?";
                                        }                                        
                                    }

                                    // --- 2. กำหนดข้อความ (Label) และ Action ตามสถานะ ---
                                    $label_csv = "ออกรายงาน (CSV)";
                                    $label_xml = "ออกรายงาน (XML)";
                                    $style_link = ""; 

                                    if ($is_draft) {
                                        $draft_tag = " <span style='color:red; font-weight:bold; font-size:smaller;'>[Draft]</span>";
                                        $label_csv .= $draft_tag;
                                        $label_xml .= $draft_tag;
                                        $js_action = "if(confirm('$warning_msg')) { startDownload('%s'); } return false;";
                                    } else {
                                        $js_action = "startDownload('%s'); return false;";
                                    }

                                    $action_csv = sprintf($js_action, $csv_url);
                                    $action_xml = sprintf($js_action, $xml_url);

                                    // --- 3. แสดงผล ---
                                    echo "<tr bgcolor='$row_color'>";
                                    echo "<td align='center'>$i</td>";
                                    echo "<td align='center'>$submit_period</td>";
                                    echo "<td align='center'><a href='frm_adddata.php?search_date=$submit_period&focus_report=$focus_report' class='view-link'>ดูข้อมูล</a></td>";
                                    echo "<td align='center'>
                                        <a href='#' onclick=\"$action_csv\" style=\"$style_link\">$label_csv</a> |
                                        <a href='#' onclick=\"$action_xml\" style=\"$style_link\">$label_xml</a>
                                    </td>";
                                    echo "</tr>";
                                    $i++;
                                }
                            }
                            ?>
                        </table>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>