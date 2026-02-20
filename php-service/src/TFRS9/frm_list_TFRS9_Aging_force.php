<?php
include("../config/config.php");
// include("../../../nw/function/checknull.php");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $data = json_decode($input, true);
    if(isset($data['unsetSession']) && $data['unsetSession'] == "0"){
        unset($_SESSION["json_data_TFRS9_Aging_force"]);
        exit();
    }
}

$year = date("Y");

$nowdate = date("Y-m-d");
$nowdate_day = date("d");
$current_year = date("Y");
$current_month = date("m");
$status_lock = $_GET['status_lock'];
$saveType = $_GET['save_type'];
$typeContract = $_GET['type_contract'];

// stage DPD
$typeStage_dpd_1 = $_GET['typestage_dpd_1'];
$typeStage_dpd_2 = $_GET['typestage_dpd_2'];
$typeStage_dpd_3 = $_GET['typestage_dpd_3'];

// stage ACC
$typeStage_acc_1 = $_GET['typestage_dpd_1'];
$typeStage_acc_2 = $_GET['typestage_dpd_2'];
$typeStage_acc_3 = $_GET['typestage_dpd_3'];
// $status_lock = pg_escape_string($_GET['status_lock']);
// $saveType = pg_escape_string($_GET['save_type']);
// $typeContract = pg_escape_string($_GET['type_contract']);
// // stage DPD
// $typeStage_dpd_1 = pg_escape_string($_GET['typestage_dpd_1']);
// $typeStage_dpd_2 = pg_escape_string($_GET['typestage_dpd_2']);
// $typeStage_dpd_3 = pg_escape_string($_GET['typestage_dpd_3']);
// // stage ACC
// $typeStage_acc_1 = pg_escape_string($_GET['typestage_dpd_1']);
// $typeStage_acc_2 = pg_escape_string($_GET['typestage_dpd_2']);
// $typeStage_acc_3 = pg_escape_string($_GET['typestage_dpd_3']);

$array_dpd = array();
$array_acc = array();
if($typeStage_dpd_1 == "true"){
    array_push($array_dpd,1);
}
if($typeStage_dpd_2 == "true"){
    array_push($array_dpd,2);
}
if($typeStage_dpd_3 == "true"){
    array_push($array_dpd,3);
}

if($typeStage_acc_1 == "true"){
    array_push($array_acc,1);
}
if($typeStage_acc_2 == "true"){
    array_push($array_acc,2);
}
if($typeStage_acc_3 == "true"){
    array_push($array_acc,3);
}

$array_stage_dpd = implode(',', array_map('intval', $array_dpd));
$array_stage_acc = implode(',', array_map('intval', $array_acc));

// $current_year = 2024;
// $current_month = 10;
$year_2 = $current_year-1;
$status_show = "";

function chk_null($str){
    if($str=="")
    {
        $str="NULL";
    }else if($str == 99){
        $str="X<br>(ปิดบัญชีไปแล้ว)";
    }else if($str == 0){
        $str="(ยังไม่มีการเปิดสัญญา)";
    }
    return $str;
}

// if ($year == $current_year) {
//     // กำหนด $focus_year ให้เป็นวันที่ 1 ของเดือนปัจจุบัน
//     $focus_year = "$year-$current_month-01";
// } else {
//     // กรณีปีไม่ใช่ปีปัจจุบัน
//     $focus_year = "$year-12-01";
// }

if($current_month == 1){
    $current_month = 1;
    $month_1 = 1;
    $month_2 = 12;
    $month_3 = 11;
    $month_4 = 10;
    $year1 = $current_year;
    $year2 = $year_2;
    $year3 = $year_2;
    $year4 = $year_2;
    $condition_where = "(EXTRACT(MONTH FROM asofdate) IN (1) AND EXTRACT(YEAR FROM asofdate) = '$current_year') OR
                (EXTRACT(MONTH FROM asofdate) IN ('$month_2','$month_3','$month_4') AND EXTRACT(YEAR FROM asofdate) = '$year_2')";
}else{
    $month_1 = intval($current_month);
    $month_2 = intval($current_month-1);
    $month_3 = intval($current_month-2);
    $month_4 = intval($current_month-3);
    $year1 = $current_year;
    $year2 = $current_year;
    $year3 = $current_year;
    $year4 = $current_year;
    $condition_where = "(EXTRACT(MONTH FROM \"asofdate\") in ('$current_month','$month_2','$month_3','$month_4') AND EXTRACT(YEAR FROM asofdate) = '$current_year')";
    if($month_2 == 1 && $month_3 == 0){
        $month_3 = 12;
        $month_4 = 11;
        $year3 = $year_2;
        $year4 = $year_2;
        $condition_where = "(EXTRACT(MONTH FROM asofdate) IN ('$current_month','$month_2') AND EXTRACT(YEAR FROM asofdate) = '$current_year') OR
                    (EXTRACT(MONTH FROM asofdate) IN ('$month_3','$month_4') AND EXTRACT(YEAR FROM asofdate) = '$year_2')";
    }else if($month_3 == 1 && $month_4 == 0){
        $month_4 = 12;
        $year4 = $year_2;
        $condition_where = "(EXTRACT(MONTH FROM asofdate) IN ('$current_month','$month_2','$month_3') AND EXTRACT(YEAR FROM asofdate) = '$current_year') OR
                    (EXTRACT(MONTH FROM asofdate) IN ('$month_4') AND EXTRACT(YEAR FROM asofdate) = '$year_2')";
    }
}
// echo "month_1 : ".$month_1." : ".$year1."<br>";
// echo "month_2 : ".$month_2." : ".$year2."<br>";
// echo "month_3 : ".$month_3." : ".$year3."<br>";
// echo "month_4 : ".$month_4." : ".$year4."<br>";
$start_type = "";
$condition_select_type = "";
$condition_dpd = "";
$condition_acc = "";
$stage_start = "";
$stage_stop = "";
if($typeContract == 1){
    $start_type = "HAVING";
    $condition_select_type = 
                    "NOT (
                        COALESCE(MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_1' AND EXTRACT(YEAR FROM a.asofdate) = '$year1' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_1' AND EXTRACT(YEAR FROM a.asofdate) = '$year1')
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year1' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year1' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_1'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year1'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year1' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_1'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END), -1) = 99 

                        AND 

                        COALESCE(MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2')
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year2'
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year2' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_2'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year2'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year2' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_2'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END), -1) = 99

                        AND 

                        COALESCE(MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3')
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year3'
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year3' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_3'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year3'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year3' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_3'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END), -1) = 99

                        AND 

                        COALESCE(MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4')
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year4'
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year4' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_4'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year4'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year4' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_4'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END), -1) = 99
                    )";
    if(!empty($array_stage_dpd) || !empty($array_stage_acc)){
        $stage_start = "AND(";
        $stage_stop = ")";
    }
}
if(!empty($array_stage_dpd) || !empty($array_stage_acc)){
    if($typeContract == 2){
        $start_type = "HAVING";
    }
}
    if(!empty($array_stage_dpd) && !empty($array_stage_acc)){
        $condition_dpd =
                        "MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2' THEN a.dpd 
                        END) IN($array_stage_dpd)
                        ";
        $condition_acc =                
                        "OR
                            MAX(f02.stage) IN($array_stage_acc)
                        ";
    }else if(!empty($array_stage_dpd) && empty($array_stage_acc)){
        $condition_dpd =
                    "MAX(CASE 
                        WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2' THEN a.dpd 
                    END) IN($array_stage_dpd)
                    ";
    }else if(empty($array_stage_dpd) && !empty($array_stage_acc)){
        $condition_acc =
                    "MAX(f02.stage) IN($array_stage_acc)";
    }



$condition_select = "MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_1' AND EXTRACT(YEAR FROM a.asofdate) = '$year1' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_1' AND EXTRACT(YEAR FROM a.asofdate) = '$year1')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year1' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year1' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_1'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year1'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year1' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_1'))
                                    ) THEN 0
                                    ELSE a.dpd 
                                END
                        END) AS dpd_month_01,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_1' AND EXTRACT(YEAR FROM a.asofdate) = '$year1' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_1' AND EXTRACT(YEAR FROM a.asofdate) = '$year1')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year1' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year1' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_1'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year1'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year1' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_1'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END) AS acc_month_01,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year2' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year2' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_2'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year2'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year2' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_2'))
                                    ) THEN 0
                                    ELSE a.dpd 
                                END
                        END) AS dpd_month_02,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_2' AND EXTRACT(YEAR FROM a.asofdate) = '$year2')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year2' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year2' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_2'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year2'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year2' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_2'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END) AS acc_month_02,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year3' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year3' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_3'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year3'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year3' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_3'))
                                    ) THEN 0
                                    ELSE a.dpd 
                                END
                        END) AS dpd_month_03,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year3' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year3' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_3'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year3'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year3' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_3'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END) AS acc_month_03,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year4' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year4' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_4'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year4'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year4' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_4'))
                                    ) THEN 0
                                    ELSE a.dpd 
                                END
                        END) AS dpd_month_04,
                        MAX(CASE 
                            WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4' THEN 
                                CASE 
                                    WHEN b.\"contractID\" IS NOT NULL AND 
                                    (
                                        (EXTRACT(MONTH FROM b.\"conabsclose_date\") = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4')
                                        OR
                                        (EXTRACT(YEAR FROM b.\"conabsclose_date\") < '$year4' 
                                        OR (EXTRACT(YEAR FROM b.\"conabsclose_date\") = '$year4' AND EXTRACT(MONTH FROM b.\"conabsclose_date\") < '$month_4'))
                                    ) THEN 99
                                    WHEN c.\"contractID\" IS NOT NULL AND
                                    (
                                        (EXTRACT(YEAR FROM c.\"conDate\") > '$year4'
                                        OR (EXTRACT(YEAR FROM c.\"conDate\") = '$year4' AND EXTRACT(MONTH FROM c.\"conDate\") > '$month_4'))
                                    ) THEN 0
                                    ELSE a.acc 
                                END
                        END) AS acc_month_04,
                        -- ค่า Stage ปัจจุบันจาก `thcap_aging_force` เดือนปัจจุบัน
                        MAX(CASE 
                            WHEN f01.\"contractID\" IS NOT NULL THEN f01.stage
                            ELSE NULL
                        END) AS current_acc_month_01,
                        -- ค่า Stage ปัจจุบันจาก `thcap_aging_force` เดือนย้อนหลัง 1 เดือน
                        MAX(CASE 
                            WHEN f02.\"contractID\" IS NOT NULL THEN f02.stage
                            ELSE NULL
                        END) AS current_acc_month_02,
                        -- Check if dpd values change
                        CASE 
                            WHEN 
                                COALESCE(MAX(CASE WHEN f01.\"contractID\" IS NOT NULL THEN f01.stage END), 0) 
                                <> 
                                COALESCE(MAX(CASE WHEN f02.\"contractID\" IS NOT NULL THEN f02.stage END), 0)
                                OR 
                                COALESCE(MAX(CASE WHEN f02.\"contractID\" IS NOT NULL THEN f02.stage END), 0) 
                                <> 
                                COALESCE(MAX(CASE WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN a.dpd END), 0)
                                OR 
                                COALESCE(MAX(CASE WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN a.dpd END), 0) 
                                <> 
                                COALESCE(MAX(CASE WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4' THEN a.dpd END), 0)
                            THEN 1 
                            ELSE 0 
                        END AS status_dpd,
                        -- Check if acc values change
                        CASE 
                            WHEN 
                                COALESCE(MAX(CASE WHEN f01.\"contractID\" IS NOT NULL THEN f01.stage END), 0) 
                                <> 
                                COALESCE(MAX(CASE WHEN f02.\"contractID\" IS NOT NULL THEN f02.stage END), 0)
                                OR 
                                COALESCE(MAX(CASE WHEN f02.\"contractID\" IS NOT NULL THEN f02.stage END), 0) 
                                <> 
                                COALESCE(MAX(CASE WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN a.acc END), 0)
                                OR 
                                COALESCE(MAX(CASE WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_3' AND EXTRACT(YEAR FROM a.asofdate) = '$year3' THEN a.acc END), 0)
                                <> 
                                COALESCE(MAX(CASE WHEN EXTRACT(MONTH FROM a.asofdate) = '$month_4' AND EXTRACT(YEAR FROM a.asofdate) = '$year4' THEN a.acc END), 0)
                            THEN 1 
                            ELSE 0 
                        END AS status_acc
                        ";

$monthNames = array
  (     '1'=>'มกราคม',
        '2'=> 'กุมภาพันธ์',
        '3'=> 'มีนาคม',
        '4'=> 'เมษายน',
        '5'=> 'พฤษภาคม',
        '6'=> 'มิถุนายน',
        '7'=> 'กรกฎาคม',
        '8'=> 'สิงหาคม',
        '9'=> 'กันยายน',
        '10'=> 'ตุลาคม',
        '11'=> 'พฤศจิกายน',
        '12'=> 'ธันวาคม'
  );

$aryColor = array(
        "1" => '#27ae60',
        "2" => '#f4d03f',
        "3" => '#c0392b',
        "X<br>(ปิดบัญชีไปแล้ว)" => '#8e8e8e',
        "(ยังไม่มีการเปิดสัญญา)" => '#DCDCDC',
        "NULL" => '#BEBEBE'
   );

   $head_columns_data = array(
    'head_table' => "เดือน $monthNames[$month_1] ปี $year1, เดือน $monthNames[$month_2] ปี $year2",
    'column_1' => $nowdate_day." ".$monthNames[$month_1]." ".$year1,
    'column_2' => $monthNames[$month_2]." ".$year2,
    'column_3' => $monthNames[$month_3]." ".$year3,
    'column_4' => $monthNames[$month_4]." ".$year4
   );

?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html>
<head>
    <meta http-equiv="Content-Type" content="txt/html; charset=utf-8; scrollbars=no" />
    <META HTTP-EQUIV="Pragma" CONTENT="no-cache">
    <link type="text/css" rel="stylesheet" href="../act.css"></link>
    
    <link type="text/css" href="../../../jqueryui/css/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet" />   
     
    <script type="text/javascript" src="../../../jqueryui/js/jquery-1.4.2.min.js"></script>
    <script type="text/javascript" src="../../../jqueryui/js/jquery-ui-1.8.2.custom.min.js"></script>

    <style>
        th[onclick] {
            cursor: pointer;
        }
        th[onclick]:hover {
            background-color: #FFA500;
        }

        table {
            table-layout: fixed; /* กำหนดให้แต่ละ column มีขนาดเท่ากัน */
        }

        th, td {
            width: auto; /* ปรับขนาดอัตโนมัติให้เท่ากัน */
            text-align: center; /* จัดข้อความให้อยู่ตรงกลาง */
            word-wrap: break-word; /* ป้องกันข้อความล้น */
        }

    

        .centered-input {
            width: 100%; /* ทำให้ input เต็มขนาด td */
            height: 100%; /* ปรับให้ input เต็มความสูง td */
            box-sizing: border-box; /* คำนวณขนาดรวม padding */
            text-align: center; /* จัดให้ input อยู่ตรงกลาง */
        }

        button.save,
        button.close {
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            border: none;
            transition: background-color 0.3s;
        }

        button.search {
            padding: 6px 12px;
            border-radius: 3px;
            cursor: pointer;
            border: none;
            transition: background-color 0.3s;
        }

        button.save {
            background-color: #28a745;
            color: #fff;
        }

        button.save:hover {
            background-color: #218838; 
        }

        button.close {
            background-color: #6c757d;
            color: #fff;
        }

        button.close:hover {
            background-color: #495057;
        }

        button.search {
            background-color:rgb(152, 158, 163);
            color: #fff;
            /* color: #212529; */
        }

        button.search:hover {
            background-color:rgb(150, 148, 148);
            /* background-color: #6c757d; */
        }


    </style>
<span style="display: block; text-align: left; color: red;">
    หมายเหตุ : การกรอกข้อมูล LGD ต้องกรอกข้อมูลให้ครบทุกเลขสัญญาที่ stage มีค่า = 3 (โดยทำการกรอกข้อมูล force LGD ของสัญญาที่ต้องการกำหนด LGD และ checkbox สัญญาที่ไม่ต้องการกรอกกำหนด LGD)<br>
    <span style="display: inline-block; margin-left: 60px;">
        การกดปุ่ม "🔒 Lock" &nbsp;&nbsp;&nbsp;=> ข้อมูลการกรอก force stage และ force LGD จะถูกล้อคไม่ให้สามารถแก้ไขข้อมูลได้ทั้งหมด<br>
        การกดปุ่ม "🔓 Unlock" => ข้อมูลการกรอก force stage และ force LGD จะถูกปลดล้อคให้สามารถแก้ไขข้อมูลได้ทั้งหมด
    </span>
</span>
<fieldset><legend><B><?php echo "เดือน $monthNames[$month_1] ปี $year1, เดือน $monthNames[$month_2] ปี $year2"; ?></B></legend>
<form name="frm" action="frm_TFRS9_Aging_force_process.php" method="POST" enctype="multipart/form-data" onsubmit="return validate();">
    <table id="myTable" width="100%" border="0" cellpadding="2" cellspacing="1" bgcolor="black" align="center">
        <thead>
            <tr bgcolor="#79BCFF">
                <th rowspan="2">เลขสัญญา</th>
                <th rowspan="2">ผู้กู้หลัก</th>
                <th colspan="2"><?php echo $nowdate_day." ".$monthNames[$month_1]." ".$year1; ?></th>
                <th colspan="3" bgcolor=blcak><?php echo $monthNames[$month_2]." ".$year2; ?> 
                <?php if($status_lock == "lock"){?>
                    <button type="button" id="toggleLockBtn" onclick="toggleLock('unlock')">🔓 Unlock</button>
                <?php }else{?>
                    <button type="button" id="toggleLockBtn" onclick="toggleLock('lock')">🔒 Lock</button>
                <?php } ?>
                </th>
                <th colspan="2"><?php echo $monthNames[$month_3]." ".$year3; ?></th>
                <th colspan="2" bgcolor=blcak><?php echo $monthNames[$month_4]." ".$year4; ?></th>
            </tr>
            <tr bgcolor="#79BCFF">
                <th>DPD</th>
                <th>ACC</th>
                <th bgcolor=blcak>DPD</th>
                <th bgcolor=blcak>ACC</th>
                <th bgcolor=blcak>LGD (ทางบัญชี)</th>
                <th>DPD</th>
                <th>ACC</th>
                <th bgcolor=blcak>DPD</th>
                <th bgcolor=blcak>ACC</th>
            </tr>
        </thead>
        <tbody>

        <?php
        
        $sql_contract = "WITH max_autoid_01 AS (
                            -- หา MAX(autoid) สำหรับเดือน ปัจจุบัน
                            SELECT \"contractID\", MAX(\"autoid\") AS max_autoid
                            FROM public.\"thcap_aging_force\"
                            WHERE EXTRACT(MONTH FROM start_date) = $month_1
                            AND EXTRACT(YEAR FROM start_date) = $year1
                            GROUP BY \"contractID\"
                        ),
                        latest_stage_01 AS (
                            -- ดึงข้อมูล stage ล่าสุดของเดือน ปัจจุบัน
                            SELECT f.*
                            FROM public.\"thcap_aging_force\" f
                            INNER JOIN max_autoid_01 m 
                            ON f.\"contractID\" = m.\"contractID\" AND f.\"autoid\" = m.max_autoid
                        ),
                        max_autoid_02 AS (
                            -- หา MAX(autoid) สำหรับเดือน ย้อนหลัง 1 เดือน
                            SELECT \"contractID\", MAX(\"autoid\") AS max_autoid
                            FROM public.\"thcap_aging_force\"
                            WHERE EXTRACT(MONTH FROM start_date) = $month_2
                            AND EXTRACT(YEAR FROM start_date) = $year2
                            GROUP BY \"contractID\"
                        ),
                        latest_stage_02 AS (
                            -- ดึงข้อมูล stage ล่าสุดของเดือน ย้อนหลัง 1 เดือน
                            SELECT f.*
                            FROM public.\"thcap_aging_force\" f
                            INNER JOIN max_autoid_02 m 
                            ON f.\"contractID\" = m.\"contractID\" AND f.\"autoid\" = m.max_autoid
                        )
                        SELECT a.\"contractID\", d.\"thcap_fullname\",
                        $condition_select
                        FROM public.\"vthcap_contract_tfrs9_stage\" a
                        LEFT JOIN public.\"thcap_contract_absclose\" b ON a.\"contractID\" = b.\"contractID\"
                        LEFT JOIN public.\"thcap_contract\" c ON a.\"contractID\" = c.\"contractID\"
                        LEFT JOIN public.\"vthcap_ContactCus_detail\" d ON a.\"contractID\" = d.\"contractID\" AND d.\"CusState\" = 0
                        -- JOIN กับค่า MAX(autoid) ของเดือน 12/2024
                        LEFT JOIN latest_stage_01 f01 ON a.\"contractID\" = f01.\"contractID\"
                        -- JOIN กับค่า MAX(autoid) ของเดือน 1/2025
                        LEFT JOIN latest_stage_02 f02 ON a.\"contractID\" = f02.\"contractID\"
                        WHERE
                        ($condition_where)
                        GROUP BY 
                            a.\"contractID\", d.\"thcap_fullname\"
                        $start_type
                        $condition_select_type
                        $stage_start
                        $condition_dpd
                        $condition_acc
                        $stage_stop
                        ORDER BY 
                            a.\"contractID\", d.\"thcap_fullname\"
                        -- ORDER BY \"contractID\" ASC, asofdate DESC 
                        -- LIMIT 20
                        ";
        $qry_contract = pg_query($sql_contract);
        $num_rows = pg_num_rows($qry_contract);

        $i = 0;
        $have_data = 0;
        if($num_rows == 0){
            echo 
                "<tr bgcolor=\"#EDF8FE\"  onmouseover=\"javascript:this.bgColor = '#FFFF99';\" onmouseout=\"javascript:this.bgColor = '#EDF8FE';\">
                    <td align=\"center\" colspan=\"11\">-- ไม่พบสัญญา --</td>
                </tr>";
        }else{
            $tfrs9_data = array();
            $contractIDs = array();
            $contractIDs_all = array();
            $contractIDs_all_stage_3 = array();
            while($res_contract = pg_fetch_array($qry_contract))
            {
                $i++;
                if($saveType == 1 || ($saveType == 2 && $res_contract['status_acc'] == 1)){
                $have_data = 1;
                $contractID = $res_contract['contractID'];          

                $asof_date = $res_contract['asofdate'];
                $thcap_fullname = $res_contract['thcap_fullname'];
                $query_txs_contractId = "SELECT \"txs_contractid\" FROM \"thcap_contract\" WHERE \"contractID\" = '$contractID'";
                $res_txs_contractId = pg_query($query_txs_contractId);
                if($result_txs_contractId = pg_fetch_array($res_txs_contractId)) {
                    $oldcontractID = trim($result_txs_contractId["txs_contractid"]);                    
                }

                $qry_conDate = pg_query("SELECT \"conStartDate\" FROM \"thcap_contract\" WHERE \"contractID\" = '$contractID'") or die ("ERROR thcap_contract");

                $dpd_month_01_check = chk_null($res_contract['dpd_month_01']);
                $dpd_month_02_check = chk_null($res_contract['dpd_month_02']);
                $dpd_month_03 = chk_null($res_contract['dpd_month_03']);
                $dpd_month_04 = chk_null($res_contract['dpd_month_04']);
                if($dpd_month_01_check !== "X<br>(ปิดบัญชีไปแล้ว)" && $dpd_month_01_check !== "(ยังไม่มีการเปิดสัญญา)"){

                    if($dpd_month_01_check == "NULL" && ($dpd_month_02_check == "X<br>(ปิดบัญชีไปแล้ว)" || $dpd_month_02_check == "(ยังไม่มีการเปิดสัญญา)")){
                        $dpd_month_01 = chk_null($res_contract['dpd_month_02']);
                        if($typeContract == 1 && ($dpd_month_03 == "X<br>(ปิดบัญชีไปแล้ว)" && $dpd_month_04 == "X<br>(ปิดบัญชีไปแล้ว)")){
                            continue;
                        }
                    }else{
                        $qrybackduedate = pg_query("SELECT \"thcap_get_all_backmonths\"('$contractID','$nowdate')");
                        list($nubmonth) = pg_fetch_array($qrybackduedate);
                                
                        // ตรวจสอบว่ามีการใช้ stage_force หรือไม่
                        $qry_aging_force = pg_query("SELECT stage FROM \"thcap_aging_force\" 
                                                    WHERE \"contractID\" = '$contractID' 
                                                    AND '$nowdate' BETWEEN \"start_date\" AND \"end_date\" 
                                                    ORDER BY \"autoid\" DESC LIMIT 1 ");
                        $res_stage_force = pg_fetch_array($qry_aging_force);
                        $stage_force = $res_stage_force["stage"];

                        // ถ้ามีการใช้ stage_force ให้แสดงสีเทา
                        if ($stage_force !== null) {
                            if ($nubmonth <= 1) { // < 31 วัน
                                $dpd_month_01 = 1;
                            } else if ($nubmonth > 1 && $nubmonth <= 3) { // 32 - 60 วัน
                                $dpd_month_01 = 2;
                            } else if ($nubmonth > 3) { // > 60 วัน
                                $dpd_month_01 = 3;
                            }
                        } else {
                            if ($nubmonth <= 1) { // < 31 วัน
                                $dpd_month_01 = 1;
                            } else if ($nubmonth > 1 && $nubmonth <= 3) { // 32 - 60 วัน
                                $dpd_month_01 = 2;
                            } else if ($nubmonth > 3) { // > 60 วัน
                                $dpd_month_01 = 3;
                            }
                        }
                    }
                    
                }else{
                    $dpd_month_01 = chk_null($res_contract['dpd_month_01']);
                }
                
                
                // $dpd_month_01 = chk_null($res_contract['dpd_month_01']);
                $acc_month_01_check = chk_null($res_contract['acc_month_01']);
                $acc_month_01 = chk_null($res_contract['current_acc_month_01']);
                $dpd_month_01_check = chk_null($res_contract['dpd_month_01']);
                $dpd_month_02 = chk_null($res_contract['dpd_month_02']);
                $acc_month_02_check = chk_null($res_contract['acc_month_02']);
                $acc_month_02 = chk_null($res_contract['current_acc_month_02']);
                $dpd_month_02_check = chk_null($res_contract['dpd_month_02']);
                $dpd_month_03 = chk_null($res_contract['dpd_month_03']);
                $acc_month_03 = chk_null($res_contract['acc_month_03']);
                $dpd_month_04 = chk_null($res_contract['dpd_month_04']);
                $acc_month_04 = chk_null($res_contract['acc_month_04']);

                $tfrs9_data[] = array(
                    'NO' => $i,
                    'conid' => $contractID,
                    'fullname'  => $thcap_fullname,
                    'dpd_month_01' => $dpd_month_01,
                    'acc_month_01_check' => $acc_month_01_check,
                    'acc_month_01' => $acc_month_01,
                    'dpd_month_01_check' => $dpd_month_01_check,
                    'dpd_month_02' => $dpd_month_02,
                    'acc_month_02_check' => $acc_month_02_check,
                    'acc_month_02' => $acc_month_02,
                    'dpd_month_02_check' => $dpd_month_02_check,
                    'dpd_month_03' => $dpd_month_03,
                    'acc_month_03' => $acc_month_03,
                    'dpd_month_04' => $dpd_month_04,
                    'acc_month_04' => $acc_month_04
                );

                if($conStartDate >= "$year-01-01" && $conStartDate <= "$year-12-31"){
                    echo "<tr bgcolor=\"#ffb3b3\"  onmouseover=\"javascript:this.bgColor = '#ff9999';\" onmouseout=\"javascript:this.bgColor = '#ffb3b3';\">";
                }
                else
                {
                    if($i%2==0){
                        echo "<tr bgcolor=\"#EDF8FE\"  onmouseover=\"javascript:this.bgColor = '#FFFF99';\" onmouseout=\"javascript:this.bgColor = '#EDF8FE';\">";
                    }else{
                        echo "<tr bgcolor=\"#D5EFFD\" onmouseover=\"javascript:this.bgColor = '#FFFF99';\" onmouseout=\"javascript:this.bgColor = '#D5EFFD';\">";
                    }
                }

                echo "<td 
                    style=\"font-size: 11px; text-align: center; cursor: pointer; color: blue; text-decoration: underline;\" 
                    onClick=\"javascript:popU('../../thcap_installments/frm_Index.php?show=1&idno=$contractID','','toolbar=no,menubar=no,resizable=no,scrollbars=yes,status=no,location=no,width=1100,height=800')\"
                    >$contractID
                        <br>
                        <span style=\"color: red;\">$oldcontractID</span>
                    </td>";
                echo "<td style=\"font-size: 11px; text-align: center;\" >$thcap_fullname</td>";
                echo "<td align=\"center\" bgcolor=$aryColor[$dpd_month_01]>$dpd_month_01</td>";                

                // เงื่อนไขเช็คการกำหนด stage เดือนปัจจุบัน
                if(($acc_month_02 !== "X<br>(ปิดบัญชีไปแล้ว)" && $acc_month_02 !== "(ยังไม่มีการเปิดสัญญา)") && $acc_month_02 !== "NULL" && ($acc_month_01_check !== "X<br>(ปิดบัญชีไปแล้ว)" && $acc_month_01_check !== "(ยังไม่มีการเปิดสัญญา)")){
                    if($status_lock == "lock"){
                        echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_01]>$acc_month_01</td>";
                    }else{
                        echo "<td align=\"center\" bgcolor=#EDF8FE>";
                        if($acc_month_01 == "NULL"){
                            $acc_month_01_show = null;                      
                        }else{
                            $acc_month_01_show = $acc_month_01;
                            echo "<span style=\"color: red;\">stage ที่เคยแก้ไข : $acc_month_01_show</span>";                   
                        }
                        echo "<INPUT class=\"centered-input\" TYPE=\"text\" name=\"stage_1[$contractID]\" id=\"stage_1[$contractID]\" 
                                oninput=\"updateValue(this,'$contractID')\"
                                onkeypress=\"check_num(event,'stage','$contractID')\"
                                placeholder=\"$acc_month_01_show\">             
                            </td>";
                    }
                }else{
                    if($dpd_month_01_check == "NULL" && ($dpd_month_02_check == "X<br>(ปิดบัญชีไปแล้ว)" || $dpd_month_02_check == "(ยังไม่มีการเปิดสัญญา)")){
                        echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_02_check]>$acc_month_02_check</td>";                         
                    }else{
                        echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_01_check]>$acc_month_01_check</td>";                    
                    }
                }

                echo "<td align=\"center\" bgcolor=$aryColor[$dpd_month_02]>$dpd_month_02</td>";
                // เงื่อนไขเช็คการกำหนด stage เดือนก่อนหน้า 1 เดือน
                if($acc_month_02 !== "X<br>(ปิดบัญชีไปแล้ว)" && $acc_month_02 !== "(ยังไม่มีการเปิดสัญญา)" && ($acc_month_02_check !== "X<br>(ปิดบัญชีไปแล้ว)" && $acc_month_02_check !== "(ยังไม่มีการเปิดสัญญา)")){
                    if($status_lock == "lock"){
                        echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_02]>$acc_month_02</td>";
                    }else{
                        echo "<td align=\"center\" bgcolor=#EDF8FE>";
                        if($acc_month_02 == "NULL"){
                            $acc_month_02_show = null;                  
                        }else{
                            $acc_month_02_show = $acc_month_02;
                            echo "<span style=\"color: red;\">stage ที่เคยแก้ไข : $acc_month_02_show</span>";                       
                        }
                        echo "<INPUT class=\"centered-input\" TYPE=\"text\" name=\"stage_2[$contractID]\" id=\"stage_2[$contractID]\" 
                            oninput=\"updateValue(this,'$contractID')\"
                            onkeypress=\"check_num(event,'stage','$contractID')\"
                            placeholder=\"$acc_month_02_show\">             
                        </td>";
                    }
                    $lgd_permission = $acc_month_02_show;
                }else{
                    echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_02_check]>$acc_month_02_check</td>";
                    $lgd_permission = $acc_month_02_check;
                }
                // check stage ของสัญญานั้นๆเพื่อกำหนดการแสดงช่องให้กรอกข้อมูล Lgd
                if($lgd_permission == null){
                // if($lgd_permission == null || ($lgd_permission !== null && $lgd_permission !== '3')){
                    $lgd_permission = $dpd_month_02;
                }
                // ใช้เพื่อตรวจสอบว่าเคยมีการ force LGD ในเดือนนั้นๆแล้วหรือยัง
                $qry_lgd_force_month = pg_query("SELECT * FROM public.\"thcap_tfrs9_contract_lgd\"
                                                    WHERE month = '$month_2'
                                                    AND year = '$year2' 
                                                    AND revision = (
                                                        SELECT MAX(revision) 
                                                        FROM public.\"thcap_tfrs9_contract_lgd\"
                                                        WHERE month = '$month_2' 
                                                            AND year = '$year2'
                                                    )
                                                    ORDER BY \"auto_id\" DESC");
                $num_rows_lgd_month = pg_num_rows($qry_lgd_force_month);
                $res_max_revision = pg_fetch_array($qry_lgd_force_month);
                $max_revision = 1;
                if($num_rows_lgd_month > 0){
                    $max_revision = $res_max_revision['revision'];
                }

                // ตรวจสอบว่ามี lgd force ของสัญญานี้แล้วหรือไม่
                $qry_lgd_force = pg_query("SELECT * FROM public.\"thcap_tfrs9_contract_lgd\"
                                                    WHERE \"contractID\" = '$contractID' 
                                                    AND month = '$month_2'
                                                    AND year = '$year2' 
                                                    AND revision = '$max_revision'
                                                    ORDER BY \"auto_id\" DESC LIMIT 1");
                $num_rows_lgd = pg_num_rows($qry_lgd_force);
                $res_lgd_force = pg_fetch_array($qry_lgd_force);
                $lgd_force = $res_lgd_force['lgd'];
                if ($lgd_force) {
                    array_push($contractIDs_all, $contractID);
                }
                // process
                if($lgd_permission == 3 && $status_lock !== "lock"){
                    array_push($contractIDs_all_stage_3, $contractID);
                    if ($lgd_force) {
                        array_push($contractIDs, $contractID);
                    }
                    $check_lgd = '';
                    $text_display = "block"; // แสดงค่าถ้ามีการ force LGD
                    if($num_rows_lgd_month > 0){ //มีการ force LGD ของเดือนนี้แล้ว
                        if($num_rows_lgd == 0){  //แต่ไม่มีการ force LGD ของสัญญานี้ให้ default เป็น check = การไม่ force ค่า LGD
                            $check_lgd = "checked"; // checkbox ถ้าไม่มีการ force LGD
                            $text_display = "none";
                        }else{
                            if($lgd_force == 0){
                                $check_lgd = "checked"; // checkbox ถ้าไม่มีการ force LGD
                                $text_display = "none";
                            }
                        }
                    }
                    
                    echo "<td align=\"center\">
                        <span id=\"remark_alert[$contractID]\" style=\"display: block; text-align: left; color: red;\">
                        ติ๊กในกรณีที่สัญญานี้ไม่มีค่า LGD<br>
                        </span>
                        <INPUT TYPE='checkbox' name=\"lgd_stage[$contractID]\" id=\"lgd_stage[$contractID]\" $check_lgd onclick=\"recheck_lgd('$contractID')\">
                        <INPUT class=\"centered-input\" TYPE=\"text\" name=\"lgd_stage_text[$contractID]\" id=\"lgd_stage_text[$contractID]\" 
                        onkeypress=\"check_num(event,'lgd','$contractID')\"
                        placeholder=\"$lgd_force\" style=\"display: $text_display;\">
                        <INPUT class=\"centered-input\" TYPE=\"hidden\" name=\"lgd_contract[]\" id=\"lgd_contract[]\" value=\"$contractID\">
                    </td>";
                }else{
                    $default_check_lgd = "checked";
                    $default_display = "none";
                    echo "<td align=\"center\" bgcolor=#3D3C3A>";
                    // if ($lgd_force) {
                        echo 
                        "<span id=\"remark_alert[$contractID]\" style=\"display: $default_display; text-align: left; color: red;\">
                        ติ๊กในกรณีที่สัญญานี้ไม่มีค่า LGD<br>
                        </span>
                        <INPUT TYPE='checkbox' name=\"lgd_stage[$contractID]\" id=\"lgd_stage[$contractID]\" $default_check_lgd onclick=\"recheck_lgd('$contractID')\" style=\"display: $default_display;\">
                        <INPUT class=\"centered-input\" TYPE=\"text\" name=\"lgd_stage_text[$contractID]\" id=\"lgd_stage_text[$contractID]\" 
                        onkeypress=\"check_num(event,'lgd','$contractID')\"
                        placeholder=\"$lgd_force\" style=\"display: $default_display;\">
                        <INPUT class=\"centered-input\" TYPE=\"hidden\" name=\"lgd_contract[]\" id=\"lgd_contract[]\" value=\"$contractID\" style=\"display: $default_display;\">";
                    // }
                    echo "</td>";
                }
                
                echo "<td align=\"center\" bgcolor=$aryColor[$dpd_month_03]>$dpd_month_03</td>";
                echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_03]>$acc_month_03</td>";
                echo "<td align=\"center\" bgcolor=$aryColor[$dpd_month_04]>$dpd_month_04</td>";
                echo "<td align=\"center\" bgcolor=$aryColor[$acc_month_04]>$acc_month_04</td>";
                echo "</tr>";

                }
                if($have_data == 0 && $num_rows == $i){
                    echo 
                    "<tr bgcolor=\"#EDF8FE\"  onmouseover=\"javascript:this.bgColor = '#FFFF99';\" onmouseout=\"javascript:this.bgColor = '#EDF8FE';\">
                        <td align=\"center\" colspan=\"11\">-- ไม่พบสัญญา --</td>
                    </tr>";
                }
            }
            foreach($contractIDs as $c){
                echo "<input type=\"hidden\" name=\"contractIDs[]\" value=\"$c;\"/>";
            }
            foreach($contractIDs_all as $c_all){
                echo "<input type=\"hidden\" name=\"contractIDs_all[]\" value=\"$c_all;\"/>";
            }
            foreach($contractIDs_all_stage_3 as $c_all_3){
                echo "<input type=\"hidden\" name=\"contractIDs_all_stage_3[]\" value=\"$c_all_3;\"/>";
            }

            $array_data = array(
                'head_column' => $head_columns_data,
                'tfrs9_data' => $tfrs9_data
            );

            $json_data = json_encode($array_data);
            $_SESSION["json_data_TFRS9_Aging_force"] = $json_data;
        }
        
        ?>
        </tbody>
    </table>
    <br>
    <div align='center'>
        <button type='submit' class='save'>บันทึก</button>
        <button type='button' class='close' onclick="window.close()">ปิด</button>
    </div>
</form>
<br><br>
</fieldset>