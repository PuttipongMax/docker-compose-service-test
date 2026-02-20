<?php
include("../config/config.php");

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html>
<head>
    <title><?php echo $name_company; ?></title>
    <meta http-equiv="Content-Type" content="txt/html; charset=utf-8" />
    <link type="text/css" rel="stylesheet" href="act.css"></link>

    <link type="text/css" href="../../jqueryui/css/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet" />
    <script type="text/javascript" src="../../jqueryui/js/jquery-1.4.2.min.js"></script>
    <script type="text/javascript" src="../../jqueryui/js/jquery-ui-1.8.2.custom.min.js"></script>

</head>
<body>

<table width="80%" border="0" cellspacing="0" cellpadding="0" style="margin-top:1px" align="center">
<tr>
    <td>
        <center><h1>ประวัติการทำรายการเปลี่ยน stage ทั้งหมด</h1></center>
        <span style="display: block; text-align: left; color: red;">
            หมายเหตุ : ประวัติจะเริ่มนับจากการทำรายการในเมนู "จัดการ TFRS9 stage เท่านั้น"<br>
            <span style="display: inline-block; margin-left: 60px;">
                โดยเริ่มใช้ตั้งแต่วันที่ 5 กุมภาพันธ์ 2568 (05/02/2025)
            </span>
        </span>
        <table width="100%" border="0" cellSpacing="1" cellPadding="3" align="center" bgcolor="#FFFFFF">
            <tr style="font-weight:bold;" valign="middle" bgcolor="#D6D6D6" align="center">
                <td style="width: 150px;">เลขที่สัญญา
                <td>ชื่อลูกค้า (ผู้กู้)</td>
                <td>Stage เดิมก่อนที่จะเปลี่ยน</td>
                <td>Stage ที่เปลี่ยน</td>
                <td>ปีและเดือนที่ทำรายการ</td>
                <td>ผู้ทำรายการ</td>
                <td>เวลาที่ทำรายการ</td>
                <td>ผู้อนุมัติรายการ</td>
                <td>วันเวลาที่อนุมัติ</td>
                <td>สถานะรายการ</td>
            </tr>
            <?php
            $sql_history = "SELECT a.\"contractID\", a.\"stage\", a.\"start_date\",
                                a.\"doerID\",a.\"doerStamp\",b.\"thcap_fullname\",
                                a.\"approveID\", a.\"approveStamp\", a.\"approve_status\"
                            FROM public.thcap_aging_force_request a
                            LEFT JOIN public.\"vthcap_ContactCus_detail\" b ON a.\"contractID\" = b.\"contractID\"
                            WHERE b.\"CusState\" = 0
                            ORDER BY \"autoid\" DESC";
            $qry_history = pg_query($sql_history);
            $nub=pg_num_rows($qry_history);
            if ($nub > 0) { // ตรวจสอบว่ามีข้อมูลหรือไม่
                while($res_history = pg_fetch_array($qry_history)){
                    $contract = $res_history["contractID"];
                    $thcap_fullname = $res_history["thcap_fullname"];
                    $stage = $res_history["stage"];
                    $start_date = $res_history["start_date"];
                    // ->
                        // แยกเดือนและปีออกมา
                        $date_parts = explode("-", $start_date);

                    $doerID = $res_history["doerID"];
                    $doerStamp = $res_history["doerStamp"];
                    $approveID = $res_history["approveID"];
                    $approveStamp = $res_history["approveStamp"];
                    $approveStamp = $res_history["approveStamp"];
                    $approve_status = $res_history["approve_status"];

                    if($approve_status == 0){
                        $approve_status_show = "<span style='color: red;'>ไม่อนุมัติ</span>";
                    }elseif($approve_status == 1){
                        $approve_status_show = "<span style='color: green;'>อนุมัติเรียบร้อย</span>";
                    }elseif($approve_status == 9){
                        $approve_status_show = "<span style='color: blue;'>รออนุมัติ</span>";
                    }else{
                        $approve_status_show = "<span style='color: brown;'>ไม่รองรับสถานะนี้</span>";
                    }

                    $i += 1;
                    if($i % 2 == 0){
                        echo "<tr bgcolor=#EEEEEE onmouseover=\"javascript:this.bgColor = '#FFFF99';\" onmouseout=\"javascript:this.bgColor = '#EEEEEE';\" align=center>";
                    } else {
                        echo "<tr bgcolor=#F5F5F5 onmouseover=\"javascript:this.bgColor = '#FFFF99';\" onmouseout=\"javascript:this.bgColor = '#F5F5F5';\" align=center>";
                    }

                    $qry_user1 = pg_query("SELECT CONCAT(fname,' ',lname) AS \"doerFullname\"
                                            FROM public.fuser WHERE id_user = '$doerID'");
                    $res_app1 = pg_fetch_array($qry_user1);
                    $doerFullname = $res_app1["doerFullname"];

                    $qry_user2 = pg_query("SELECT CONCAT(fname,' ',lname) AS \"appvFullname\"
                                            FROM public.fuser WHERE id_user = '$approveID'");
                    $res_app2 = pg_fetch_array($qry_user2);
                    $appvFullname = $res_app2["appvFullname"];

                    $qrybackduedate = pg_query("SELECT \"thcap_get_all_backmonths\"('$contract','$start_date')");
                    list($nubmonth) = pg_fetch_array($qrybackduedate);
                    ?>
                    <td><span onclick="javascript:popU('../../thcap_installments/frm_Index.php?show=1&idno=<?php echo $contract?>','','toolbar=no,menubar=no,resizable=no,scrollbars=yes,status=no,location=no,width=1100,height=800')" style="cursor:pointer;"><font color="red"><u><?php echo $contract; ?><br><?php echo $oldContractID; ?></u></font></span></td>
                    <td><?php echo $thcap_fullname; ?></td>
                    <td>
                        <?php 
                        if ($nubmonth <= 1) {
                            echo 1;
                        } elseif ($nubmonth > 1 && $nubmonth <= 3) {
                            echo 2;
                        } elseif ($nubmonth > 3) {
                            echo 3;
                        }
                        ?>
                    </td>
                    <td><?php echo $stage; ?></td>
                    <td><?php echo $date_parts[0]."-".$date_parts[1]; ?></td>
                    <td><?php echo $doerFullname; ?></td>
                    <td><?php echo $doerStamp; ?></td>
                    <td><?php echo $appvFullname; ?></td>
                    <td><?php echo $approveStamp; ?></td>
                    <td><?php echo $approve_status_show; ?></td>

                    </tr>
                    <?php
                }
            } else {
                echo "<tr><td colspan='9' align='center'>ไม่มีประวัติ</td></tr>"; // แสดงข้อความเมื่อไม่มีข้อมูล
            }
            ?>
            <tr bgcolor="#D6D6D6">
                <td colspan="12" align="right" >จำนวนแสดง : <?php echo $aprows = pg_num_rows($qry_history); ?>  รายการ</td>
            </tr>
        </table><br>
        </form>
        </div>
    </td>
</tr>   
</table>
<script>
    function popU(U, N, T) {
    window.open(U, N, T);
}
</script>