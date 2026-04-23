<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Popup Form</title>
    <link type="text/css" href="../../jqueryui/css/ui-lightness/jquery-ui-1.8.2.custom.css" rel="stylesheet">
    <script type="text/javascript" src="../../jqueryui/js/jquery-1.4.2.min.js"></script>
    <script type="text/javascript" src="../../jqueryui/js/jquery-ui-1.8.2.custom.min.js"></script>
    <style>
         /* 1. พื้นหลัง (สีเทาอ่อน) */
        body { 
            background: #f4f4f4; 
            padding: 20px; 
            margin: 0;
        }

        /* 2. กรอบฟอร์มหลัก (สีเหลืองอ่อน) */
        #popup-form {
            max-width: 800px;
            margin: 20px auto;
            padding: 24px;
            background: #fefde8; /* (สีเหลืองอ่อน) */
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        /* 3. หัวข้อ (เช่น "เพิ่มข้อมูล") */
        #popup-form h2 {
            text-align: center;
            margin-top: 0;
            margin-bottom: 24px;
            color: #333;
        }

        /* 4. Layout แบบ Grid (Label + Input) */
        .form-group {
            display: grid;
            grid-template-columns: 250px 1fr; /* (ความกว้าง Label | ความกว้าง Input) */
            gap: 15px;
            align-items: center;
            margin-bottom: 15px;
        }
        
        /* 5. Label (ชิดขวา) */
        .form-group label {
            text-align: right;
            font-weight: bold;
            color: #555;
        }

        /* 6. Input และ Select (เต็มช่อง) */
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group select {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-sizing: border-box; /* (สำคัญมาก) */
        }
        
        .form-group input:disabled {
            background: #eee;
        }
        
        /* 7. ส่วนของปุ่ม (ชิดขวา) */
        .form-actions {
            margin-top: 25px;
            border-top: 1px solid #eee;
            padding-top: 20px;
            display: flex;
            justify-content: center; /* (จัดปุ่มไปทางขวา) */
            gap: 10px;
        }

        /* 8. CSS ของปุ่ม (สีตามรูป) */
        .form-actions button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: 14px;
            color: white;
        }
        
        /* ปุ่ม "ปิด" (Cancel) - สีแดง */
        .form-actions button#btn-cancel {
            background-color: #dc3545;
        }
        .form-actions button#btn-cancel:hover {
            background-color: #c82333;
        }
        
        /* ปุ่ม "เพิ่มรายการ" (Save) - สีเขียว */
        .form-actions button[type="submit"] {
            background-color: #28a745;
        }
        .form-actions button[type="submit"]:hover {
            background-color: #218838;
        }

        .toast-notification {
            position: fixed;
            top: -100px; /* 1. ซ่อนไว้ด้านบน (นอกจอ) */
            left: 50%;
            transform: translateX(-50%);
            
            padding: 12px 25px;
            background-color: #28a745; /* 2. สีเขียว (Success) */
            color: white;
            font-weight: bold;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1001;
            
            opacity: 0;
            transition: top 0.4s ease-out, opacity 0.4s ease-out;
        }        
        /* (Class 'show' ที่ JS จะเพิ่ม/ลบ) */
        .toast-notification.show {
            top: 20px; /* 3. เลื่อนลงมา (แสดง) */
            opacity: 1;
        }        
        /* (Class 'error' สำหรับข้อความล้มเหลว) */
        .toast-notification.error {
           background-color: #dc3545; /* 4. สีแดง (Error) */
        }
        /** จัดการ Layout ปฏิทิน datepicker */
        .datepicker-wrapper {
            display: flex;
            align-items: center;
            width: 100%; /* (ให้ Wrapper ยืดเต็ม 1fr) */
        }
        .ui-datepicker-trigger {
            cursor: pointer;
            margin-left: 5px; /* (เว้นระยะห่าง) */
        }

        /* เพิ่มใน <style> */
        .radio-group-container {
            display: flex;
            gap: 15px; /* ระยะห่างระหว่างตัวเลือก */
            align-items: center;
            background: #fefde8;
            padding: 8px 0;
        }

        .radio-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        /* แก้ไขให้ input type radio ไม่กว้าง 100% */
        .form-group input[type="radio"] {
            width: auto !important; /* บังคับให้ขนาดพอดีคำ */
            margin: 0;
            cursor: pointer;
        }

        .radio-item label {
            /* รีเซ็ตค่า Label ของ Radio ไม่ให้ชิดขวาเหมือน Label หลัก */
            text-align: left;
            font-weight: normal;
            cursor: pointer;
            margin: 0;
        }

        .dynamic-sub-row {
            background-color: #fff; /* พื้นหลังสีขาวให้ดูแยกส่วน */
            border: 1px dashed #ccc;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 10px;
        }

        /* สั่งให้ .form-group ที่อยู่ในฟอร์มย่อย ปรับสัดส่วนใหม่ */
        .dynamic-sub-row .form-group {
            /* ลดความกว้าง Label ชั้นในลง (เช่นเหลือ 150px หรือน้อยกว่า) */
            grid-template-columns: 180px 1fr !important; 
            gap: 10px;
            margin-bottom: 10px;
        }

        /* หรือถ้าหน้าจอเล็ก ให้เปลี่ยนเป็นแนวตั้ง (Label บน Input) */
        @media (max-width: 600px) {
            .dynamic-sub-row .form-group {
                grid-template-columns: 1fr !important;
                text-align: left;
            }
            .dynamic-sub-row .form-group label {
                text-align: left;
            }
        }
        
        /* จัดปุ่มลบ (x) ให้สวยงาม */
        .btn-remove-row {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #fff;
            border: 1px solid #dc3545;
            color: #dc3545;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .btn-remove-row:hover {
            background: #dc3545;
            color: white;
        }
    </style>
</head>
<body>

    <div id="popup-form-container">
        <p>Loading form...</p>
    </div>
    <script src="RenderPopupRow.js?v<?php echo filemtime('RenderPopupRow.js'); ?>" type="text/javascript"></script>
    <script>
        console.log('[frm_popup.php] Page loaded.'); // DEBUG
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[frm_popup.php] DOMContentLoaded. Initializing RenderPopup...'); // DEBUG
            const container = document.getElementById('popup-form-container');
            
            try {
                const popup = new RenderPopupRow(container);
                popup.render();
            } catch (e) {
                console.error('[frm_popup.php] Failed to initialize RenderPopup:', e); // DEBUG
                container.innerHTML = `<p style="color: red;">Fatal Error: ${e.message}</p>`;
            }
        });
    </script>
</body>
</html>