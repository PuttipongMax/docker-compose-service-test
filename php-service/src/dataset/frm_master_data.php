<?php
    include("../config/config.php");
    header('Content-Type: text/html; charset=utf-8');
    // ชื่อย่อบริษัท
    $abbr_company = $_SESSION["session_company_name_show"];
    
    // รับค่าจาก URL
    // $focus_report = isset($_GET["focus_report"]) ? pg_escape_string($_GET['focus_report']) : "";
    // $upper_focus_report = strtoupper($focus_report);
    // $search_date = isset($_GET["search_date"]) ? pg_escape_string($_GET['search_date']) : "";
    // ผู้ทำรายการ
    $userID = $_SESSION["av_iduser"];
    $name_company = "(" . $abbr_company . ") Master Data";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $name_company ?></title>
    <link type="text/css" rel="stylesheet" href="act.css"></link>
    <link type="text/css" href="../../jqueryui/css/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet">
    <script type="text/javascript" src="../../jqueryui/js/jquery-1.4.2.min.js"></script>
    <script type="text/javascript" src="../../jqueryui/js/jquery-ui-1.8.2.custom.min.js"></script>
</head>
<body>
    <center><h1><?php echo $name_company ?></h1></center>
    
    <fieldset style="width: 95%; max-width: 1200px; margin: auto; border: 1px solid #D7EEFF; padding: 20px; background-color: #fff; border-radius: 5px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div id="master-data-container">
            <div style="text-align: center; padding: 50px; color: #666;">
                <p>Loading Master Data...</p>
            </div>
        </div>
    </fieldset>

    <script src="Store.js?v=<?php echo filemtime('Store.js'); ?>" type="text/javascript"></script>
    
    <script src="indexMasterData.js?v=<?php echo filemtime('indexMasterData.js'); ?>" type="text/javascript"></script>

    <script>
        
    </script>
</body>
</html>