<?php include("../config/config.php"); ?>
<meta http-equiv="Content-Type" content="txt/html; charset=utf-8" />

<?php
    function chk_null($str){
        if($str=="")
        {
            $str="NULL";
        }
        return $str;
    }

    $iduser = $_SESSION['uid'];
    $stage_1 = $_POST['stage_1']; // เลข stage เดือนปัจจุบัน
    $stage_2 = $_POST['stage_2']; // เลข stage ย้อนหลัง 1 เดือน
    $lgd = $_POST['lgd_stage']; 
    $lgd_force = $_POST['lgd_stage_text'];
    
    // ปีและเดือนปัจจุบัน
    $year_1 = date("Y");
    $month_1 = date("m");

    if ($month_1 == 1) { // ถ้าเป็นเดือนมกราคม
        $year_2 = $year_1 - 1;
        $month_2 = 12; // ย้อนกลับไปธันวาคมของปีก่อนหน้า
    } else {
        $year_2 = $year_1;
        $month_2 = $month_1 - 1; // ลดเดือนลง 1
    }

    $lgd_data = array();
    $lgd_data_check = array();
    foreach($stage_2 as $contract_id_stage => $s_2_stage){
        $s_2_stage_chk = chk_null($s_2_stage);
        if($s_2_stage_chk !== "NULL" && ($s_2_stage_chk == "1" || $s_2_stage_chk == "2")){
            array_push($lgd_data_check,$contract_id_stage);
        }
        //สัญญาที่ไม่มีการ force LGD
        if(isset($lgd[$contract_id_stage]) && chk_null($lgd[$contract_id_stage]) !== "NULL"){
            array_push($lgd_data_check,$contract_id_stage);
            // var_dump("lgd: ".$contract_id_stage."=>".$lgd[$contract_id_stage]."<br>");
            // $lgd_data[$contract_id_stage] = $lgd[$contract_id_stage];
        }
        //สัญญาที่กรอกข้อมูล force LGD
        // var_dump($lgd_force[$contract_id_stage]."<br>");
        if(isset($lgd_force[$contract_id_stage])){
        // if(isset($lgd_force[$contract_id_stage]) && chk_null($lgd_force[$contract_id_stage]) !== "NULL"){
            // var_dump("lgd_force: ".$contract_id_stage."=>".$lgd_force[$contract_id_stage]."<br>");
            $lgd_data[$contract_id_stage] = $lgd_force[$contract_id_stage];
        }
    }
    // echo "======================================================data key==============================================="."<br>";
    $recheck = "false";
    foreach($lgd_data as $d => $data_l){
        $dgl_data = chk_null($data_l);
        $qrycurrentstage = pg_query("SELECT \"stage\" FROM public.thcap_aging_force
                                    WHERE \"contractID\" = '$d'
                                    AND EXTRACT(MONTH FROM start_date) = '$month_2'
                                    AND EXTRACT(YEAR FROM start_date) = '$year_2'
                                    ORDER BY autoid DESC
                                    LIMIT 1");
        $result_stage = pg_fetch_result($qrycurrentstage,0);
        $num_rows_currentstage = pg_num_rows($qrycurrentstage);
        if($num_rows_currentstage > 0){
            // echo $d.' => result_stage : '.$result_stage."<br>";
        }
       
        if($dgl_data !== "NULL" || $result_stage == 3){
            $recheck = "true";
        }
        // echo $d." : ".$data_l."<br>";
    }
    // echo "======================================================data check==============================================="."<br>";
    foreach($lgd_data_check as $da => $data_l_check){
        // echo $da." : ".$data_l_check."<br>";
    }

    pg_query("BEGIN TRANSACTION");
    
    $status = 0;
    $mss = '';
    
    if($stage_1 != NULL){
        foreach($stage_1 as $contract_id => $s_1){
            $stage_chg_1 = chk_null($s_1);
            if($stage_chg_1 !== "NULL"){
                echo $contract_id." : stage => ".$s_1."<br>";
                // สร้างวันที่เริ่มต้นเป็นวันที่ 1 ของเดือนนั้น
                $start_date = $year_1 . '-' . $month_1 . '-01';
                // คำนวณวันที่สุดท้ายของเดือนโดยใช้ฟังก์ชัน date()
                $end_date = date("Y-m-t", strtotime($start_date)); // ฟังก์ชัน "t" จะให้วันที่สุดท้ายของเดือนนั้น
                $sql_insert_aging_force = " INSERT INTO \"thcap_aging_force\" 
                                            (\"contractID\",\"stage\",\"start_date\",\"end_date\",\"doerID\",\"doerStamp\")
                                    VALUES  ('$contract_id',$stage_chg_1,'$start_date','$end_date','$iduser',CURRENT_TIMESTAMP) ";

                if($qry_insert_aging_force = pg_query($sql_insert_aging_force)){}
                else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_aging_force กรุณาตรวจสอบ <br>"; break;}
                $sql_insert_TFRS9 = " INSERT INTO \"thcap_aging_force_request\" 
                                            (\"contractID\",\"stage\",\"start_date\",\"end_date\",\"doerID\",\"doerStamp\",\"approveID\",\"approveStamp\",\"approve_status\")
                                    VALUES  ('$contract_id',$stage_chg_1,'$start_date','$end_date','$iduser',CURRENT_TIMESTAMP,'$iduser',CURRENT_TIMESTAMP,1) ";

                if($qry_insert_TFRS9 = pg_query($sql_insert_TFRS9)){}
                else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_aging_force_request กรุณาตรวจสอบ <br>"; break;}
            }
        }
    }
    

    if($stage_2 != NULL){
        foreach($stage_2 as $contract_id => $s_2){
            $stage_chg_2 = chk_null($s_2);
            if($stage_chg_2 !== "NULL"){
                echo $contract_id." : stage => ".$s_2."<br>";
                // สร้างวันที่เริ่มต้นเป็นวันที่ 1 ของเดือนนั้น
                $start_date = $year_2 . '-' . $month_2 . '-01';
                // คำนวณวันที่สุดท้ายของเดือนโดยใช้ฟังก์ชัน date()
                $end_date = date("Y-m-t", strtotime($start_date)); // ฟังก์ชัน "t" จะให้วันที่สุดท้ายของเดือนนั้น
                $sql_insert_aging_force = " INSERT INTO \"thcap_aging_force\" 
                                            (\"contractID\",\"stage\",\"start_date\",\"end_date\",\"doerID\",\"doerStamp\")
                                    VALUES  ('$contract_id',$stage_chg_2,'$start_date','$end_date','$iduser',CURRENT_TIMESTAMP) ";
                                    
                if($qry_insert_aging_force = pg_query($sql_insert_aging_force)){}
                else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_aging_force กรุณาตรวจสอบ <br>"; break;}
                $sql_insert_TFRS9 = " INSERT INTO \"thcap_aging_force_request\" 
                                            (\"contractID\",\"stage\",\"start_date\",\"end_date\",\"doerID\",\"doerStamp\",\"approveID\",\"approveStamp\",\"approve_status\")
                                    VALUES  ('$contract_id',$stage_chg_2,'$start_date','$end_date','$iduser',CURRENT_TIMESTAMP,'$iduser',CURRENT_TIMESTAMP,1) ";

                if($qry_insert_TFRS9 = pg_query($sql_insert_TFRS9)){}
                else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_aging_force_request กรุณาตรวจสอบ <br>"; break;}
                
            }
        }
    }
    $qry_lgd_force_month = pg_query("SELECT * FROM public.\"thcap_tfrs9_contract_lgd\"
                                    WHERE month = '$month_2'
                                    AND year = '$year_2' 
                                    AND revision = (
                                                SELECT MAX(revision) 
                                                FROM public.\"thcap_tfrs9_contract_lgd\"
                                                WHERE month = '$month_2' 
                                                    AND year = '$year_2'
                                            )
                                    ORDER BY \"auto_id\" DESC");
    $num_rows_lgd_month = pg_num_rows($qry_lgd_force_month);
    $res_max_revision = pg_fetch_array($qry_lgd_force_month);
    $revision_data = 1;
    $max_revision = 1;
    if($num_rows_lgd_month > 0){
        $max_revision = $res_max_revision['revision'];
        $revision_data = $res_max_revision['revision']+1;
    }
    if(($lgd_data !== NULL && !empty($lgd_data))){
        // echo 'recheck: '.$recheck."<br>";
        if($recheck == "true"){
            foreach($lgd_data as $contract_id_lgd => $lgd_d){
                $lgd_da = chk_null($lgd_d);
                if($lgd_da !== "NULL"){
                    echo $contract_id_lgd." : lgd => ".$lgd_d."<br>";
                    //หา revision ล่าสุด
                    $sql_check_lgd_force = pg_query("SELECT revision FROM public.thcap_tfrs9_contract_lgd
                                                    WHERE \"contractID\" = '$contract_id_lgd'
                                                    ORDER BY auto_id DESC");
                    $res_check_lgd_force = pg_fetch_array($sql_check_lgd_force);

                    $LGD_data = $lgd_data[$contract_id_lgd];
                    // if($LGD_data == 'on'){
                    //     $LGD_data = 0;
                    // }
                    $sql_insert_lgd_force = " INSERT INTO public.thcap_tfrs9_contract_lgd
                                            (\"contractID\",\"lgd\",\"month\",\"year\", \"doerID\", \"doerStamp\",revision)
                                            VALUES ('$contract_id_lgd', $LGD_data, '$month_2','$year_2','$iduser',CURRENT_TIMESTAMP,'$revision_data')";
                
                    if($qry_insert_lgd_force = pg_query($sql_insert_lgd_force)){}
                    else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_tfrs9_contract_lgd กรุณาตรวจสอบ <br>"; break;}
                }else{
                    // echo $contract_id_lgd." : lgd_1 => ".$lgd_d."<br>";
                    $sql_check_lgd_force_lastrev = pg_query("SELECT revision FROM public.thcap_tfrs9_contract_lgd
                                                    WHERE \"contractID\" = '$contract_id_lgd'
                                                    AND month = '$month_2'
                                                    AND year = '$year_2' 
                                                    AND \"revision\" = '$max_revision'
                                                    ORDER BY auto_id DESC");
                    $num_rows_lgd_month_lastrev = pg_num_rows($sql_check_lgd_force_lastrev);
                    if($num_rows_lgd_month_lastrev > 0 && !in_array($contract_id_lgd, $lgd_data_check)){
                        echo $contract_id_lgd." : lgd_1 => ".$lgd_d."<br>";
                        $update_lgd_lastrev = pg_query("UPDATE public.thcap_tfrs9_contract_lgd
                                                        SET revision='$revision_data'
                                                        WHERE \"contractID\" = '$contract_id_lgd'
                                                        AND month = '$month_2'
                                                        AND year = '$year_2'
                                                        AND \"revision\" = '$max_revision'");
                    }
                    // $res_check_lgd_force_lastrev = pg_fetch_array($sql_check_lgd_force_lastrev);
                }
            }
        }else{
            if($num_rows_lgd_month > 0){
                $sql_insert_lgd_force = " INSERT INTO public.thcap_tfrs9_contract_lgd
                                    (\"contractID\",\"lgd\",\"month\",\"year\", \"doerID\", \"doerStamp\",revision)
                                    VALUES ('MG-SC01-1111111', 0, '$month_2','$year_2','$iduser',CURRENT_TIMESTAMP,'$revision_data')";
                    
                if($qry_insert_lgd_force = pg_query($sql_insert_lgd_force)){}
                else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_tfrs9_contract_lgd กรุณาตรวจสอบ <br>";}
            }
        }
    }else{
        $sql_insert_lgd_force = " INSERT INTO public.thcap_tfrs9_contract_lgd
                                (\"contractID\",\"lgd\",\"month\",\"year\", \"doerID\", \"doerStamp\",revision)
                                VALUES ('MG-SC01-1111111', 0, '$month_2','$year_2','$iduser',CURRENT_TIMESTAMP,'$revision_data')";
            
        if($qry_insert_lgd_force = pg_query($sql_insert_lgd_force)){}
        else{ $status++; $mss = "เกิดข้อผิดพลาดในการ INSERT ลง thcap_tfrs9_contract_lgd กรุณาตรวจสอบ <br>";}
    }

    if($status>0){
        pg_query("ROLLBACK");
        echo "<script>
            alert('บันทึกข้อมูลไม่สำเร็จ $mss');
            window.close(); // ปิด popup
        </script>";
        exit();

    } else {
        pg_query("COMMIT");
        echo "<script>
            alert('บันทึกข้อมูลสำเร็จ');
            window.opener.location.reload(); // รีเฟรชหน้าหลัก
            window.close(); // ปิด popup
        </script>";
        exit();
    }
?>