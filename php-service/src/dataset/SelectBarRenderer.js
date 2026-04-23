/**
 * คลาสสำหรับจัดการส่วนแสดงผล "แถบควบคุม" (Select Bar) ด้านบน
 * หน้าที่: สร้างและจัดการปุ่มกดต่างๆ (เพิ่มข้อมูล, ยืนยันการนำส่ง, เปรียบเทียบ) ตามสถานะของ Report
 */
class SelectBarRenderer {
    /**
     * param {HTMLElement} containerElement - DOM Element ที่จะให้วาดปุ่มลงไป
     * param {string} focusReport - ชื่อ Report ที่กำลังทำงานอยู่ (เช่น 'bls', 'ipi') ใช้สำหรับกำหนด Logic ปุ่ม
     */
    constructor(containerElement, focusReport = 'default') {
        // 1. Validation: ตรวจสอบว่ามี Container ส่งมาจริงหรือไม่
        if (!containerElement) {
            throw new Error('SelectBarRenderer needs a container element!');
        }
        // DEBUG: ตรวจสอบส่งชื่อ report มาถูกไหม
        // console.log('[SelectBarRenderer.js] Constructed for report:', focusReport);

        // 2. เก็บค่าลงตัวแปรของ Class (Properties)
        this.container = containerElement; // ที่วางปุ่ม
        this.focusReport = focusReport; // ชื่อ Report
        this.buttons = []; // อาเรย์เก็บรายการปุ่ม (เอาไว้ใช้ตอน render)
    }

    /**
     * Private Method (#): ฟังก์ชันภายในสำหรับกำหนดรายการปุ่ม
     * หน้าที่: คืนค่า Array ของปุ่มที่ควรจะแสดง โดยอิงตามชื่อ Report หรือสถานะข้อมูล
     */
    #getButtonsForReport(reportName, hasData = false, isPullDataEnabled = false) {
        // 1. สร้าง Config ของปุ่มมาตรฐานต่างๆ (Label, ID, CSS Class)
        const btnConfirm = { label: 'ยืนยันการนำส่ง', id: 'btn-confirm', class: 'btn btn-submit' };
        const btnCompare = { label: 'เปรียบเทียบ', id: 'btn-compare', class: 'btn btn-compare' };
        const btnBack = { label: 'กลับ', id: 'btn-back', class: 'btn btn-back' };
        let buttons = [];

        // 2. จัดลำดับปุ่มที่จะแสดงผล (Push ใส่ Array ตามลำดับซ้ายไปขวา)
        buttons.push({ label: 'เพิ่มข้อมูล', id: 'btn-add', class: 'btn btn-add' });        
        buttons.push(btnConfirm);
        buttons.push(btnCompare);

        // 3. ตรวจสอบ config ที่ส่งมาจาก server-side กำหนดว่ารายงานนี้สามารถดึงข้อมูลได้หรือไม่
        if (isPullDataEnabled) {
            // เพิ่มปุ่มสำหรับเปิดเมนูดึงข้อมูลตั้งต้น (ใช้สีปุ่มให้แตกต่าง เช่น btn-info หรือระบุ style ตรงๆ)
            buttons.push({ label: 'ดึงข้อมูลจากระบบ', id: 'btn-toggle-pull', class: 'btn', style: 'background-color: #17a2b8; color: white;' });
        }
        buttons.push(btnBack);
        
        return buttons;
    }

    /**
     * เมธอดสำหรับสร้าง HTML String ของปุ่มทั้งหมด
     * หน้าที่: วนลูปข้อมูลใน this.buttons แล้วแปลงเป็นโค้ด HTML <button> ต่อกันยาวๆ
     * returns {string} - HTML String ที่พร้อมนำไปใส่ใน innerHTML
     */
    buildButtons() {
        // 1. เริ่มต้นตัวแปรสำหรับเก็บ HTML เป็นค่าว่าง
        let html = '';
        // 2. วนลูปข้อมูลปุ่มทีละตัว (ที่ได้จาก #getButtonsForReport)
        this.buttons.forEach(btn => {
            // 3. ต่อ String HTML ของปุ่มแต่ละตัว (Concatenation)
            // - id: ใส่ ID เพื่อให้ดักจับ Event click ได้ถูกต้อง
            // - class="${btn.class || 'btn'}": เทคนิค Short-circuit ถ้าไม่มี class ส่งมา ให้ใช้ 'btn' เป็นค่า Default
            // - label: ข้อความที่จะแสดงบนปุ่ม
            html += `<button type="button" id="${btn.id}" class="${btn.class || 'btn'}" style="${btn.style}">${btn.label}</button>`;
        });
        // 4. ส่ง HTML ทั้งก้อนกลับไป
        return html;
    }

    /**
     * เมธอด render: วาดส่วนควบคุม (Select Bar)
     * หน้าที่: สร้าง Dropdown (เดือน/ปี/rev) และปุ่มกดต่างๆ โดยคำนึงถึงสถานะ Locked/Unlocked และ is_confirm สำหรับ formType:'group'
     * param {Object} data - ข้อมูล State ทั้งหมด (รวมถึง flag ต่างๆ เช่น isSystemLocked, isConfirmLocked)
     * param {boolean} hasData - (ไม่ค่อยได้ใช้ใน logic นี้ เพราะดูจาก data โดยตรงแม่นยำกว่า)
     */
    render(data, hasData = false) {
        // DEBUG: comment log ตรวจสอบ param data ส่งอะไรมา
        // console.log('[SelectBarRenderer.js] Rendering with data:', data, 'HasData:', hasData);

        // =========================================================
        // 1. Prepare Data: เตรียมข้อมูลสำหรับ Dropdowns
        // =========================================================       
        // อ่าน URL Parameters (เพื่อ Set ค่า Default ให้ Dropdown ตรงกับ URL)
        const urlParams = new URLSearchParams(window.location.search);
        // เลือกใช้วันที่จาก URL ก่อน -> ถ้าไม่มีใช้จาก Data -> ถ้าไม่มีใช้าค่าว่าง
        const currentSearchDate = urlParams.get('search_date') || data.search_date || ""; 
        // const currentRev = urlParams.get('rev'); // (เราจะใช้ 'selected' จาก PHP แทน)

        // ดึง Options สำหรับ Dropdown เลือกเวอร์ชัน
        const revisions = data.revision || data.revision_options || []; 
        // ข้อความสถานะมุมขวาบน
        const statusMsg = data.status_message || "ยังไม่มีข้อมูลที่บันทึกไว้";

        // ตั้งค่า Default เดือน/ปี เป็น "ปัจจุบัน" ไว้ก่อน
        const today = new Date();
        let selectedYear = today.getFullYear().toString();
        let selectedMonth = (today.getMonth() + 1).toString().padStart(2, '0');

        // ดึงค่า boolean จาก server-side (ถ้าไม่มีกำหนดมาให้ default เป็น false)
        // กำหนดว่ารายงานนี้ สามารถดึงข้อมูลจากระบบได้หรือไม่
        const isPullDataEnabled = data.pull_data === true;
        // กำหนดว่ารายงานนี้ ใช้การเรียกข้อมูลจากเดือนอื่นได้หรือไม่
        const isPullDataDateEnabled = data.pull_data_date === true;

        // ถ้ามีวันที่ค้นหา (Search Date) ให้แตก string 'YYYY-MM-DD' มาใช้แทนค่าปัจจุบัน
        if (currentSearchDate) {
            try {
                const parts = currentSearchDate.split('-');
                if (parts.length === 3) {
                    selectedYear = parts[0];
                    selectedMonth = parts[1];
                }
            } catch (e) { console.error("ไม่สามารถแยกวันที่ได้:", e); }
        }

        // =========================================================
        // 2. Build HTML: สร้าง String HTML ของ Controls
        // =========================================================
        let controlsHtml = '';        
        // --- 2.1 Dropdown เลือกเดือน ---
        controlsHtml += `<label for="month_select">ประจำเดือน:</label> `;
        controlsHtml += `<select id="month_select" name="month">`;
        const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
        
        let pullMonthOptions = ''; // เตรียมไว้สำหรับ Panel ดึงข้อมูล
        for (let i = 1; i <= 12; i++) {
            const monthValue = i.toString().padStart(2, '0');
            const selected = (monthValue === selectedMonth) ? 'selected' : '';
            controlsHtml += `<option value="${monthValue}" ${selected}>${monthNames[i - 1]}</option>`;

            // สร้าง Option ของเดือนก่อนหน้าเพื่อเป็น Default ของ Pull Data
            let pullSelected = (i === parseInt(selectedMonth) - 1 || (selectedMonth === '01' && i === 12)) ? 'selected' : '';
            pullMonthOptions += `<option value="${monthValue}" ${pullSelected}>${monthNames[i - 1]}</option>`;
        }
        controlsHtml += `</select> `;

        // --- 2.2 Dropdown เลือกปี (ย้อนหลัง 5 ปี) ---
        controlsHtml += `<select id="year_select" name="year">`;
        let pullYearOptions = '';
        const currentYear = today.getFullYear();
        for (let y = currentYear; y >= currentYear - 5; y--) {
            const yearStr = y.toString();
            const selected = (yearStr === selectedYear) ? 'selected' : '';
            controlsHtml += `<option value="${yearStr}" ${selected}>${yearStr}</option>`;

            // ปีสำหรับ Pull Data (ถ้าเดือนนี้มกราคม ปีของข้อมูลก่อนหน้าต้องเป็นปีที่แล้ว)
            let defaultPullYear = selectedMonth === '01' ? (parseInt(selectedYear) - 1).toString() : selectedYear;
            let pullSelected = (yearStr === defaultPullYear) ? 'selected' : '';
            pullYearOptions += `<option value="${yearStr}" ${pullSelected}>${yearStr}</option>`;        
        }
        controlsHtml += `</select> `;

        // --- 2.3 Dropdown เลือกเวอร์ชัน (Revision) ---
        controlsHtml += `<label for="revision_select" style="margin-left: 10px;">เวอร์ชั่น:</label> `;
        controlsHtml += `<select id="revision_select" name="revision_select">`;
        // หากมีการบันทึกข้อมูลที่ database จะส่ง rev ล่าสุดกลับมาด้วย
        if (revisions.length > 0) {
            revisions.forEach(option => {
                const value = option.value;
                const text = option.text;
                // ตรวจสอบ selected flag จาก PHP
                const selected = option.selected ? 'selected' : '';           
                controlsHtml += `<option value="${value}" ${selected}>${text}</option>`;
            });
        } else {
            controlsHtml += `<option value="">(ไม่พบข้อมูล)</option>`;
        }
        controlsHtml += `</select> `;

        // --- 2.4 ปุ่มกด (Buttons) ---
        // เรียกเมธอดช่วยสร้างปุ่ม (Add, Confirm, etc.)
        this.buttons = this.#getButtonsForReport(this.focusReport, hasData, isPullDataEnabled);
        controlsHtml += this.buildButtons();

        // สร้าง container เปล่าเป็น default เพื่อไม่ให้ Syntax Error
        let pullDataPanelHtml = '';
        // ตรวจสอบ config ว่าเป็นรายงานที่สามารถดึงข้อมูลได้หรือไม่
        if (isPullDataEnabled) {
            // สร้าง container เฉพาะส่วนเลือกวันที่ (ถ้าเปิดใช้งาน)
            let customDateHtml = '';
            if (isPullDataDateEnabled) {
                customDateHtml = `
                    <span>
                        <label style="margin-right: 10px; cursor: pointer; color: #333; font-weight: normal; user-select: none;">
                            <input type="checkbox" id="chk_custom_pull_date" style="vertical-align: middle;"> ระบุเดือน/ปี อ้างอิงจากรายงาน BOT ที่เคยนำส่ง:
                        </label>

                        <span id="pull_dropdown_container" style="display: none; transition: all 0.3s ease;">
                            <select id="pull_month_select" style="padding:4px; border-radius:3px;">
                                ${pullMonthOptions}
                            </select>
                            <select id="pull_year_select" style="padding:4px; border-radius:3px;">
                                ${pullYearOptions}
                            </select>
                        </span>
                    </span>
                `;
            }
            // การแสดงผลหน้าดึงข้อมูล และ หมายเหตุ ส่วน customDateHtml มาแทรก (ถ้าเป็น false มันก็จะเป็นค่าว่าง '')
            pullDataPanelHtml = `
                <div id="pull-data-panel" style="display: none; background-color: #fff3cd; border: 1px solid #ffeeba; padding: 4px; border-radius: 5px; margin-top: 4px; text-align: center; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                    <strong style="color: #856404; margin-right: 15px;">ดึงข้อมูลตั้งต้น (Prepare Data):</strong>
                    
                    ${customDateHtml}

                    <button id="btn-execute-pull" class="btn btn-submit" style="margin-left: 15px; padding: 5px 15px; background-color:#28a745;">ดำเนินการดึงข้อมูล</button>

                    <div style="display: flex; justify-content: center; color: #d32f2f; font-size: 11px;">
                        <div style="font-weight: bold; margin-right: 10px; white-space: nowrap; ">
                            <span>* หมายเหตุ: </span>
                        </div>
                        <div style="display:flex; flex-direction:column; text-align: left; color: #dc3545;"> 
                            <span>1.ผู้ทำรายการสามารถ Click ปุ่ม "ดำเนินการดึงข้อมูล" เพื่อดึงข้อมูลจากระบบ</span> 
                            ${isPullDataDateEnabled ? `<span>2.ผู้ทำรายการสามารถ Click Checkbox เพื่อดึงข้อมูลที่เคยนำส่งประจำเดือนแล้วในระบบ มาทำรายการต่อได้</span>` : ''}
                            <span>${isPullDataDateEnabled ? '3' : '2'}.การดึงข้อมูล <b>ค่าตั้งต้น (Draft)</b> เท่านั้น ผู้ทำรายการต้องตรวจสอบข้อมูลและกดยืนยันการนำส่งเพื่อบันทึก</span>
                            <span>${isPullDataDateEnabled ? '4' : '3'}.ผู้ทำรายการจะไม่สามารถดึงข้อมูลใหม่ได้ หากข้อมูลเคยถูกบันทึกเข้าระบบประจำเดือนไปแล้ว ต้องแก้ไขจากรายงานเดิมและบันทึกเป็น Revision ใหม่เท่านั้น</span>
                        </div>
                    </div>                
                </div>
            `;
        }

        // จัดการข้อความ status_pull_msg ที่ส่งมาจาก server-side
        let pullMsgHtml = '';
        if (data.status_pull_msg) {
            // เช็คสถานะ: ถ้าดึงสำเร็จ (true) ให้ตัวอักษรสีเขียว ถ้าไม่สำเร็จ (false) สีแดง
            const msgColor = data.pull_status === true ? '#28a745' : '#dc3545';            
            // สร้าง HTML แทรกเส้นคั่น (Border) เล็กๆ ก่อนแสดงข้อความ
            pullMsgHtml = `
                <span style="margin-left: 15px; padding-left: 15px; border-left: 2px solid #ccc; color: ${msgColor};">
                    ${data.status_pull_msg}
                </span>
            `;
        }

        // =========================================================
        // 3. Assemble: ประกอบร่าง HTML ทั้งหมดลง Container
        // =========================================================
        let finalHtml = `<fieldset style="width: 90%; margin: auto; border: 1px solid #798CFF; padding: 11px; border-radius: 5px; margin-bottom:1rem;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
                ${controlsHtml}
            </div>
            ${pullDataPanelHtml} <div style="display:flex; gap: 1rem; align-items:center;">
                <div>${this._renderLegend(data.formType)}</div>
                <div style="text-align: center; font-weight: semi-bold; font-size: 13px;">
                    ${statusMsg}  ${pullMsgHtml}
                </div>   
            </div>
        </fieldset>`;
        // สร้างหน้า UI SelectBar container
        this.container.innerHTML = finalHtml;
        
        // ผูก Event Listener ให้กับ Dropdowns (เมื่อเปลี่ยนเดือน/ปี ให้ Reload)
        this._attachFilterListeners();

        // =========================================================
        // 4. Handle Lock State: จัดการการเปิด/ปิดปุ่มตามเงื่อนไข
        // =========================================================
        const btnAdd = this.container.querySelector('#btn-add');
        const btnConfirm = this.container.querySelector('#btn-confirm'); // ปุ่มยืนยัน (ถ้ามี)

        // รับค่า Flag (ถ้าไม่มีให้ default เป็น false เพื่อความปลอดภัย)
        // ติด Rev ล่าสุดยังไม่ได้ อนุมัติ Lock ระดับสูง (รออนุมัติ) -> ห้ามแก้ทุกอย่าง
        const isSystemLocked = data.isSystemLocked || false;
        // ใช้สำหรับรายงานประเภท group ถ้าข้อมูลไม่ครบ Lock ระดับรอง (ข้อมูลไม่ครบ) -> แก้ได้แต่ห้ามส่ง
        const isConfirmLocked = data.isConfirmLocked || false;

        // ดึง Element ปุ่มและ Panel ดึงข้อมูล
        const btnTogglePull = this.container.querySelector('#btn-toggle-pull'); 
        const pullPanel = this.container.querySelector('#pull-data-panel');
        const btnExecutePull = this.container.querySelector('#btn-execute-pull'); // ปุ่ม ดึงข้อมูล
        const isDataExist = data.hasData; // เช็คว่ามีข้อมูลหรือไม่

        // ให้ปุ่ม Toggle (สีฟ้า) กดเปิด/ปิด Panel ได้ตลอดเวลา ไม่ว่าจะล็อคหรือไม่
        if (btnTogglePull) {
            btnTogglePull.disabled = false;
            btnTogglePull.style.opacity = "1";
            btnTogglePull.style.cursor = "pointer";
            btnTogglePull.title = "เปิด/ปิด หน้าต่างดึงข้อมูล";
        }
        
        // ตรวจสอบเงื่อนไข isSystemLocked ก่อนเสมอ
        if (isSystemLocked) {
            // --- CASE A: System Lock (ติด Rev รออนุมัติ) -> ห้ามทำอะไรเลย ---
            if (btnAdd) {
                btnAdd.disabled = true;
                btnAdd.style.opacity = "0.5";
                btnAdd.style.cursor = "not-allowed";
                btnAdd.title = "ติดสถานะรออนุมัติ";
            }
            if (btnConfirm) {
                btnConfirm.disabled = true;
                btnConfirm.style.display = "none"; // ซ่อนปุ่ม Confirm ไปเลย
            }
            // [NEW LOGIC] ล็อคปุ่มดึงข้อมูล และซ่อน Panel
            if (btnExecutePull) {
                btnExecutePull.disabled = true;
                btnExecutePull.style.opacity = "0.5";
                btnExecutePull.style.cursor = "not-allowed";
                btnExecutePull.title = "ระบบถูกล็อค (รออนุมัติ)";
            }
        } 
        else {
            // --- CASE B: System ปกติ (แก้ไขได้) ---            
            // 1. ปุ่ม Add/Edit: เปิดเสมอเพื่อให้ User เข้าไปแก้ได้
            if (btnAdd) {
                btnAdd.disabled = false;
                btnAdd.style.opacity = "1";
                btnAdd.style.cursor = "pointer";
                btnAdd.title = "เพิ่มข้อมูล";
            }

            // 2. ปุ่ม Confirm: เช็คเงื่อนไขข้อมูลครบถ้วน
            if (btnConfirm) {
                 btnConfirm.style.display = "inline-block"; 
                 
                if (isConfirmLocked) {
                    // ข้อมูลไม่ครบ -> ล็อคปุ่ม + โชว์ข้อความ
                    btnConfirm.disabled = true;
                    btnConfirm.style.opacity = "0.6";
                    btnConfirm.style.cursor = "not-allowed";
                    btnConfirm.title = data.customMessage; // "ข้อมูลยังไม่ครบ..."
                } else {
                    // ข้อมูลครบ -> ปลดล็อค
                    btnConfirm.disabled = false;
                    btnConfirm.style.opacity = "1";
                    btnConfirm.style.cursor = "pointer";
                    btnConfirm.title = "พร้อมนำส่ง";
                }
            }

            // =========================================================
            // จัดการปุ่มดึงข้อมูล (เช็คว่ามีข้อมูลแล้วหรือไม่)
            // =========================================================
            if (btnExecutePull) {
                if (isDataExist) {
                    // มีข้อมูลในตารางแล้ว -> ล็อคปุ่มสีเขียว
                    btnExecutePull.disabled = true;
                    btnExecutePull.style.opacity = "0.5";
                    btnExecutePull.style.cursor = "not-allowed";
                    btnExecutePull.title = "มีข้อมูลในระบบแล้ว ไม่สามารถดึงข้อมูลซ้ำได้\n(หากต้องการดึงใหม่ ต้องลบข้อมูลในตารางออกให้หมดก่อน)";
                } else {
                    // ตารางว่างเปล่า -> เปิดปุ่มสีเขียวให้กดดึงข้อมูลได้
                    btnExecutePull.disabled = false;
                    btnExecutePull.style.opacity = "1";
                    btnExecutePull.style.cursor = "pointer";
                    btnExecutePull.title = "ดำเนินการดึงข้อมูล";
                }
            }          
        }
    }
    
    /**
     * Method นี้ทำหน้าที่: ผูก Event Listener 'change' ให้กับ Dropdowns ทั้ง 3 ตัว (เดือน, ปี, เวอร์ชัน)
     * เมื่อผู้ใช้เลือกค่าใหม่ -> จะเรียกฟังก์ชัน #_handleFilterChange ทันที
     */
    _attachFilterListeners() {
        try {
            // รับ Event Object (e) ส่งต่อไปด้วย เพื่อให้รู้ว่า "id" ใดเป็นคนเปลี่ยนค่า
            // 1. Dropdown เดือน
            this.container.querySelector('#month_select').addEventListener('change', (e) => this.#_handleFilterChange(e));
            // 2. Dropdown ปี
            this.container.querySelector('#year_select').addEventListener('change', (e) => this.#_handleFilterChange(e));
            // 3. Dropdown เวอร์ชัน (rev)
            this.container.querySelector('#revision_select').addEventListener('change', (e) => this.#_handleFilterChange(e));

            // Event สำหรับปุ่มเปิด/ปิด Panel ดึงข้อมูล
            const btnToggle = this.container.querySelector('#btn-toggle-pull');
            const pullPanel = this.container.querySelector('#pull-data-panel');
            const btnCancelPull = this.container.querySelector('#btn-cancel-pull');

            if (btnToggle && pullPanel) {
                btnToggle.addEventListener('click', () => {
                    // สลับสถานะ ซ่อน/แสดง
                    if (pullPanel.style.display === 'none') {
                        pullPanel.style.display = 'block';
                    } else {
                        pullPanel.style.display = 'none';
                    }
                });
            }

            if (btnCancelPull && pullPanel) {
                btnCancelPull.addEventListener('click', () => {
                    pullPanel.style.display = 'none';
                });
            }
            // =========================================================
            // Event สำหรับ Checkbox Toggle เดือน/ปี
            // =========================================================
            const chkCustomDate = this.container.querySelector('#chk_custom_pull_date');
            const pullMonthSelect = this.container.querySelector('#pull_month_select');
            const pullYearSelect = this.container.querySelector('#pull_year_select');

            if (chkCustomDate && pullMonthSelect && pullYearSelect) {
                chkCustomDate.addEventListener('change', (e) => {
                    // อ่านสถานะว่า Checkbox ถูกติ๊ก (true) หรือไม่ถูกติ๊ก (false)
                    const isChecked = e.target.checked;
                    
                    // สลับสถานะ disabled ของ Dropdown
                    // ถ้า isChecked เป็น true -> disabled จะเป็น false (ใช้งานได้)
                    // ถ้า isChecked เป็น false -> disabled จะเป็น true (ใช้งานไม่ได้)
                    pullMonthSelect.disabled = !isChecked;
                    pullYearSelect.disabled = !isChecked;
                });
            }
            // =========================================================
            // Event สำหรับ Checkbox Toggle ซ่อน/แสดง เดือน/ปี
            // =========================================================
            // const chkCustomDate = this.container.querySelector('#chk_custom_pull_date');
            const dropdownContainer = this.container.querySelector('#pull_dropdown_container'); // ดึงตัว span ที่ครอบไว้
            if (chkCustomDate && dropdownContainer) {
                chkCustomDate.addEventListener('change', (e) => {
                    const isChecked = e.target.checked;
                    
                    // สลับสถานะ ซ่อน/แสดง (display)
                    if (isChecked) {
                        dropdownContainer.style.display = 'inline-block'; // แสดง Dropdown
                    } else {
                        dropdownContainer.style.display = 'none'; // ซ่อน Dropdown
                    }
                });
            }
            
        } catch (e) {
            console.error("[SelectBarRenderer.js] Failed to attach filter listeners:", e);
        }
    }

    /**
     * Method นี้ทำหน้าที่: สร้าง HTML สำหรับแสดง "คำอธิบายสี" (Legend) ใต้แถบ Filter
     * param {string} formType - ประเภทฟอร์ม ('row' หรือ 'group') 
     * - ถ้าเป็น 'row' จะแสดงสีแดง (ข้อมูลที่ถูกลบ)
     * - ถ้าเป็น 'group' จะไม่แสดงสีแดง (เพราะ group ลบไม่ได้ เพราะ logic และ รูปแบบการทำรายการต่างกัน)
     */
    _renderLegend(formType) {        
        return `
            <div style="width: fit-content; margin: 10px auto 6px auto; padding: 10px; border: 1px solid #ccc; border-radius: 5px; background-color: #f9f9f9; font-size: 11px;">
                <b>หมายเหตุ:</b>
                <span style="display: inline-block; width: 13px; height: 13px; background-color: #d4edda; ..."></span>
                <span style="vertical-align: middle; margin-left: 5px;">ข้อมูลที่เพิ่มใหม่</span>
                ${formType == 'row' ? 
                    `<span style="display: inline-block; width: 13px; height: 13px; background-color: #f8d7da; ..."></span>
                    <span style="vertical-align: middle; margin-left: 5px;">ข้อมูลที่ถูกลบ</span>` : ''
                }                
                <span style="display: inline-block; width: 13px; height: 13px; background-color: #fff3cd; ..."></span>
                <span style="vertical-align: middle; margin-left: 5px;">ข้อมูลที่เปลี่ยนแปลง</span>                
            </div>
        `;
    }

    /**
     * Private Method: จัดการเมื่อมีการเปลี่ยน Filter (Event Handler)
     * หน้าที่: คำนวณวันสิ้นเดือนใหม่ และสั่ง Reload หน้าเว็บ (Refresh)
     * param {Event} event - Event Object จากการ change
     */
    #_handleFilterChange(event) { 
        // DEBUG: comment log ตรวจสอบ method ทำงานได้หรือไม่
        // console.log('[SelectBarRenderer.js] Filter changed, reloading page...');

        // 1. อ่านค่าใหม่จาก Dropdown ทั้งหมดจาก DOM
        const newMonth = this.container.querySelector('#month_select').value;
        const newYear = this.container.querySelector('#year_select').value;
        const newRev = this.container.querySelector('#revision_select').value;

        // 2. คำนวณวันสิ้นเดือน
        const lastDayDate = new Date(newYear, newMonth, 0); 
        const lastDay = lastDayDate.getDate().toString().padStart(2, '0');

        // 3. อ่านค่า Parameters ปัจจุบัน (เพื่อเก็บ 'focus_report') เตรียม URL Params สำหรับ Reload
        const currentParams = new URLSearchParams(window.location.search);

        // 4. อัปเดต param 'search_date' เป็น YYYY-MM-DD (วันสิ้นเดือน)
        currentParams.set('search_date', `${newYear}-${newMonth}-${lastDay}`);
        
        // 5. Logic สำคัญ: การจัดการ Revision
        // ต้องแยกแยะว่า User เปลี่ยนอะไร?
        if (event.target.id === 'revision_select') {
            // CASE A: User เปลี่ยน "เวอร์ชัน" เอง
            // -> ต้องส่ง rev ที่เลือกไปด้วย เพื่อให้ดูข้อมูลเวอร์ชันนั้นๆ
            currentParams.set('rev', newRev);
        } else {
            // CASE B: User เปลี่ยน "เดือน" หรือ "ปี"
            // -> ต้อง "ลบ" rev ทิ้งไป
            // เหตุผล: เพื่อให้ PHP ไปหา Revision ล่าสุดของเดือนใหม่นั้นมาแสดงอัตโนมัติ (Default View)
            // ถ้าส่ง rev เดิมไป อาจจะไม่เจอข้อมูล เพราะเดือนใหม่ยังไม่มี rev นั้น
            currentParams.delete('rev');
        }
        
        // 6. สั่ง Reload หน้าด้วย Parameters ใหม่
        window.location.search = currentParams.toString();
    }
}