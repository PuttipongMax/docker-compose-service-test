/**
 * Class RenderPopupRow
 * หน้าที่: จัดการการแสดงผล "ฟอร์มบันทึกข้อมูล" (Popup Form) 
 * รองรับทั้งการ "เพิ่มใหม่" และ "แก้ไข" โดยอ่าน Config จาก localStorage
 */
class RenderPopupRow {
    /**
     * param {HTMLElement} containerElement - Element หลักที่จะวาดฟอร์มใส่เข้าไป
     */
    constructor(containerElement) {
        // 1. Validation: ตรวจสอบว่ามี Container จริงหรือไม่
        if (!containerElement) {
            throw new Error('RenderPopupRow needs a container element!');
        }
        // DEBUG: comment log ตรวจสอบทำงานได้ไหม
        // console.log('[RenderPopupRow.js] Constructed.');

        // 2. กำหนดตัวแปรพื้นฐาน (Properties)
        this.container = containerElement; // พื้นที่แสดงผล container
        this.formConfig = []; // เก็บโครงสร้างฟอร์ม (JSON Config) รับจาก window.store
        this.editData = null; // เก็บข้อมูลที่จะแก้ไข (ถ้ามี)
        this.isEditMode = false; // Flag บอกสถานะ (true=แก้ไข, false=เพิ่มใหม่)
        // 3. ตัวแปรสำหรับ Logic ของฟอร์ม
        // เก็บ Key ที่ต้องเช็คซ้ำ (Unique Check) เช่น รหัสบัตรประชาชน ห้ามซ้ำ กำหนดไว้ที่ไฟล์ models/data_config.json
        this.uniqueKeyConfigs = [];
        // 4.เก็บ Config ของฟอร์มย่อย (Dynamic Form) ใช้ในกรณีที่มี sub-form
        // ใช้ในกรณี: เลือก Radio A -> โชว์ชุดฟอร์ม A, เลือก Radio B -> โชว์ชุดฟอร์ม B
        // Structure: { 'value_1': [field1, field2], 'value_2': [field3] }
        this.nestedConfigs = {};
        // 5. ตัวแปรสำหรับระบบ Pagination (เลื่อนดูข้อมูลถัดไปใน Popup)
        this.allDataList = []; // เก็บรายการข้อมูลทั้งหมด (เพื่อหา Next/Prev)
        this.currentIndex = 0; // ตัวชี้ตำแหน่งปัจจุบัน
        this.currentRecord = {}; // ข้อมูล Record ปัจจุบันที่แสดงอยู่
        // 6. เริ่มต้นโหลด Config และเตรียมวาดฟอร์ม
        // (ฟังก์ชันนี้จะไปอ่าน localStorage หรือ Store เพื่อดึง popupConfig)
        this._loadConfig();
    }

    /**
     * Private Method: โหลด Config และเตรียมข้อมูล (Setup)
     * หน้าที่: อ่าน localStorage, เตรียม Form Structure, เตรียม Data List สำหรับ Pagination(สำหรับ formType == 'group'),
     * และกำหนด Mode การทำงาน (Add/Edit, Wizard/Standard(สำหรับ formType == 'group'))
     */
    _loadConfig() {
        // DEBUG: comment code ตรวจสอบ method ทำงานได้หรือไม่
        // console.log('[RenderPopupRow.js] _loadConfig() started.');

        // =========================================================
        // 1. อ่าน Config และข้อมูลเบื้องต้นจาก localStorage
        // ========================================================= 
        const configStr = localStorage.getItem('popupConfig');
        // Validation: ถ้าไม่มี Config (เช่น เปิดไฟล์ Popup ตรงๆ โดยไม่ผ่านหน้าหลัก) ให้ปิดทันที
        if (!configStr || configStr === 'null') {
            console.warn('[RenderPopupRow.js] No popupConfig found. Closing window.');
            window.close(); // ถ้าไม่มี Config (เปิดผิดวิธี) ให้ปิดหน้าต่างทันที
            return; 
        }
        // อ่านข้อมูลที่จะแก้ไข (ถ้ามี) -> ถ้าเป็น null แปลว่า "เพิ่มใหม่"
        const editDataStr = localStorage.getItem('editData');

        // (DEBUG: เคลียร์ Storage - ปิดไว้เพื่อใช้งาน กรณีต้องการให้ clear localstorage ทันทีหลังเปิด popup)      
        // localStorage.removeItem('popupConfig');
        // localStorage.removeItem('editData');

        try{
            // =========================================================
            // 2. Parse & Prepare Form Structure (โครงสร้างฟอร์ม)
            // =========================================================
            this.formConfig = JSON.parse(configStr);            
            // 2.1 สแกนหา Nested Config (ฟอร์มย่อย) จาก Radio Buttons
            // (เช่น ถ้าเลือก 'บุคคลธรรมดา' จะมีฟอร์มย่อยเด้งขึ้นมา)
            this._scanForNestedConfigs();
            // 2.2 รวม Config ทั้งหมด (Main + Sub-forms) เพื่อใช้สร้าง Unique Checks
            let allConfigs = [...this.formConfig]; // เริ่มจาก Main 

            // วนลูปเอา Config ย่อยมารวมด้วย
            Object.values(this.nestedConfigs).forEach(subCfg => {
                if (Array.isArray(subCfg)) {
                    allConfigs = allConfigs.concat(subCfg);
                }
            });
            
            // 2.3 สร้างรายการ Key ที่ต้องห้ามซ้ำ (Unique Check)
            // กรองหา field ที่มี attribute checkData="true"
            const seenKeys = new Set();
            this.uniqueKeyConfigs = [];
            allConfigs.forEach(field => {
                // เช็ค uniqid เพื่อไม่ให้เก็บซ้ำ (เผื่อ field เดียวกันอยู่ในหลายเงื่อนไข)
                if (field.checkData === "true" && !seenKeys.has(field.uniqid)) {
                    seenKeys.add(field.uniqid);
                    this.uniqueKeyConfigs.push({
                        key: field.uniqid,
                        label: field.label.replace(': *', '').replace('*', '').trim() // Clean label
                    });
                }
            });

            // =====================================================================
            // 3. เตรียม Data (Wizard Logic & Pagination) ใช้เฉพาะรายงานประเถท 'group'
            // =====================================================================
            let mainState = {};
            // ดึง State ล่าสุดจากหน้าหลัก (Parent Window) เพื่อใช้ตรวจสอบ Master Data
            if (window.opener && window.opener.store) {
                mainState = window.opener.store.getState();
            }

            const botItems = mainState.bot_code_items; // Master Data ของรายการ (สำหรับ Wizard)
            const savedData = mainState.data || []; // ข้อมูลที่ User เคยบันทึกไว้แล้ว

            // ---------------------------------------------------------------------
            // CASE A: Report Type 'Group' (เช่น BLS, LCR)
            // ---------------------------------------------------------------------
            // ตรวจสอบว่าเป็น Report ที่มี Master Data (botItems) หรือไม่
            if (botItems && Array.isArray(botItems) && botItems.length > 0) {
                // DEBUG: comment log ตรวจสอบเริ่มการทำงานได้
                // console.log('[RenderPopupRow] Mode: Wizard by Bot Code Items');
                
                // สร้างรายการข้อมูลทั้งหมด (allDataList) โดยอิงตาม Master List (botItems)
                this.allDataList = botItems.map(item => {
                    // เช็คว่ารายการนี้เคยถูกบันทึกหรือยัง?
                    const existingData = savedData.find(d =>                          
                        d.bot_code_items == item.code
                        // DEBUG: กรณี code ทำงานไม่ถูกต้อง หาก เปิด comment นี้แล้วทำงานได้ แสดงว่าขาด config ให้ทดสอบกับรายงาน 'BLS' 
                        // d.bot_code_items == item.code || d.balance_sheet_item == item.code
                    );

                    if (existingData) {
                        // ถ้ามีแล้ว เอาข้อมูลเดิมมา
                        return { ...existingData }; 
                    } else {
                        // ถ้ายังไม่มี -> สร้าง Object ว่าง พร้อม Pre-fill รหัสและชื่อรายการ
                        return {
                            bot_code_items: item.code, 
                            bot_code_items_des: item.details
                        };
                    }
                });

                // A.1: เข้ามาแบบ "แก้ไข" (User กดปุ่ม Edit ที่ตาราง) 
                if (editDataStr && editDataStr !== 'null') {
                    this.isEditMode = true;
                    const targetData = JSON.parse(editDataStr);
                    const targetCode = targetData.bot_code_items;
                    // DEBUG: กรณี code ทำงานไม่ถูกต้อง หาก เปิด comment นี้แล้วทำงานได้ แสดงว่าขาด config ให้ทดสอบกับรายงาน 'BLS'
                    // const targetCode = targetData.bot_code_items || targetData.balance_sheet_item;
                    
                    // หาว่าข้อมูลที่ส่งมาแก้ไข อยู่ตรงลำดับไหนใน List
                    this.currentIndex = this.allDataList.findIndex(d => 
                        d.bot_code_items == targetCode
                        // DEBUG: กรณี code ทำงานไม่ถูกต้อง หาก เปิด comment นี้แล้วทำงานได้ แสดงว่าขาด config ให้ทดสอบกับรายงาน 'BLS'
                        // d.bot_code_items == targetCode || d.balance_sheet_item == targetCode
                    );
                    if (this.currentIndex === -1) this.currentIndex = 0;
                } 
                // A.2: เข้ามาแบบ "เพิ่มใหม่" (User กดปุ่ม Add)
                else {
                    // กรณี 2: กด Add New เข้ามา -> หาตัวว่างตัวแรก!
                    this.isEditMode = false;
                    
                    // =====================================================================
                    // เตรียม Data (Wizard Logic) ใช้เฉพาะรายงานประเถท 'group'
                    // ค้นหา Index แรก ที่ยังว่างอยู่ (ยังไม่มี ID และยังไม่ได้กรอกยอดเงิน หรือ ยังไม่ถูกบันทึก)
                    // สมมติว่าถ้ามี id หรือ autoID แปลว่า save แล้ว
                    // (เช็คทั้ง ID และ ยอดเงิน เผื่อกรณีข้อมูลค้าง)
                    // =====================================================================                    
                    const nextFreeIndex = this.allDataList.findIndex(d => {
                        const hasId = d.id || d.autoID;                        
                        return !hasId // คืนค่า true ถ้ายังว่าง
                    });
                    if (nextFreeIndex !== -1) {
                        console.log(`[RenderPopupRow] Found unfinished item at index: ${nextFreeIndex}`);
                        this.currentIndex = nextFreeIndex;
                    } else {
                        // ไม่เจอตัวว่างเลย (เต็ม 235 แล้ว) -> แจ้งเตือนและปิด!
                        alert(`คุณได้บันทึกข้อมูลครบถ้วนทุกรายการแล้ว (${this.allDataList.length}/${this.allDataList.length})\n\nหากต้องการแก้ไขข้อมูล กรุณากดปุ่ม 'แก้ไข' ที่รายการในตาราง`);
                        window.close();
                        return;
                    }
                }
            } 
            // ---------------------------------------------------------------------
            // CASE B: Report Type 'Row' (เช่น IPI, IVP - เพิ่มทีละแถวอิสระ)
            // ---------------------------------------------------------------------
            else {
                // DEBUG: comment log ตรวจสอบว่าเข้าเงื่อนไขนี้ 
                // console.log('[RenderPopupRow] Mode: Standard Row');
                if (editDataStr && editDataStr !== 'null') {
                    // --- B.1: Edit Mode ---
                    // DEBUG: comment log ตรวจสอบข้อมูลที่ได้รับมาแก้ไข
                    console.log("[RenderPopupRow] Mode: Standard Row: ", editDataStr);
                    
                    // เปลี่ยน variable ยีนยันว่าเป็นการแก้ไข
                    this.isEditMode = true;
                    // ดึงข้อมูลจาก State 
                    const targetData = JSON.parse(editDataStr);

                    // เตรียม allDataList เผื่อไว้สำหรับการตรวจสอบซ้ำ (Duplicate Check)
                    this.allDataList = (savedData.length > 0) ? JSON.parse(JSON.stringify(savedData)) : [targetData];
                    // DEBUG ข้อมูลรอตรวจสอบ this.allDataList (currentData เป็น checker อีกตัวที่เก็บข้อมูลไว้)
                    // console.log("[RenderPopupRow]: this.allDataList", this.allDataList);

                    // หา Index (id) ของตัวที่จะแก้
                    const targetId = targetData.id || targetData.autoID;
                    this.currentIndex = this.allDataList.findIndex(d => (d.id || d.autoID) == targetId);
                    
                    // Fallback: ถ้าหาไม่เจอ ให้ default ที่ 0
                    if (this.currentIndex === -1) {
                        this.currentIndex = 0; 
                        if(this.allDataList.length === 0) this.allDataList = [targetData];
                    }
                } else {
                    // --- B.2: Add Mode ---
                    // สร้าง List ว่างๆ ขึ้นมา 1 ตัว เพื่อรองรับการกรอกข้อมูลใหม่
                    this.isEditMode = false;
                    // 1. สร้าง Object เริ่มต้น
                    const defaultData = {};
                    // =========================================================
                    // Auto-Detect Default Value (Generic Logic)
                    // หา Radio ที่มี Option code='1' และมี Sub-form (popup) กำหนดเป็น default selected
                    // =========================================================
                    if (this.formConfig && Array.isArray(this.formConfig)) {
                        this.formConfig.forEach(field => {
                            // เช็คว่าเป็น Radio หรือ Select
                            if ((field.element === 'radio' || field.element === 'select') && field.options) {
                                
                                // ค้นหา Option ที่เข้าเงื่อนไข:
                                // 1. code ต้องเป็น '1'
                                // 2. ต้องมี sub-form (opt.popup)
                                const targetOption = field.options.find(opt => 
                                    opt.code == '1' && (opt.popup && Array.isArray(opt.popup) && opt.popup.length > 0)
                                );

                                // ถ้าเจอ -> Set ค่า Default ให้ Field นั้นทันที
                                if (targetOption) {
                                    console.log(`[Auto-Default] Field "${field.uniqid}" set to "${targetOption.code}" (Found sub-form)`);
                                    defaultData[field.uniqid] = targetOption.code;
                                }
                            }
                        });
                    }
                    
                    // 2. นำ defaultData ไปใส่ใน allDataList
                    this.allDataList = [defaultData];
                    this.currentIndex = 0;
                }
            }

            // =========================================================
            // 4. Final Setup: กำหนด Record ปัจจุบันที่จะนำไปวาด
            // =========================================================
            this.currentRecord = this.allDataList[this.currentIndex];
            // Safety Check: ถ้าไม่มี record เลย (Error Case) ให้กันไว้ด้วย Object ว่าง
            if (!this.currentRecord) this.currentRecord = {};

            console.log('[RenderPopupRow] Unique Keys to check:', this.uniqueKeyConfigs);
        }catch(e){
            console.error('[RenderPopupRow.js] Failed to parse "popupConfig" JSON:', e, configStr);
            this.container.innerHTML = `<p style="color: red;">Error: ข้อมูล Config (popupConfig) ที่ได้รับมามีรูปแบบ JSON ไม่ถูกต้อง</p>`;
            return;
        }
    }

    /**
     * Private Method: สแกนหา "ฟอร์มย่อย" (Nested/Popup Configs) ที่ซ่อนอยู่ใน Radio/Select
     * หน้าที่: วนลูป Config หลัก เพื่อดึงเอา Config ของฟอร์มลูกออกมาเก็บไว้ในตัวแปร this.nestedConfigs
     * ประโยชน์: ทำให้เวลา User กดเลือก Radio ไม่ต้องไปวนลูปหา Config ใหม่ทุกครั้ง (เปลี่ยนจาก O(N) เป็น Lookup O(1))
     */
    _scanForNestedConfigs() {
        // 1. วนลูปตรวจสอบทุก Field ใน Form Config หลัก
        this.formConfig.forEach(field => {
            // 2. สนใจเฉพาะ Field ประเภท Radio หรือ Select ที่มีตัวเลือก (options) เท่านั้น
            // (เพราะ Input ประเภท Text/Number จะไม่มีฟอร์มซ้อนอยู่ข้างใน)
            if ((field.element === 'radio' || field.element === 'select') && field.options) {
                // 3. วนลูปตรวจสอบทีละตัวเลือก (Option)
                field.options.forEach(opt => {
                    // 4. ถ้าตัวเลือกนี้มี property 'popup' และเป็น Array (แปลว่ามีฟอร์มย่อยซ่อนอยู่)
                    if (opt.popup && Array.isArray(opt.popup)) {
                        // 5. สร้าง Key สำหรับอ้างอิง: "ชื่อField_ค่าOption"
                        // ตัวอย่าง: ถ้า field="borrower_type" และ option="juristic" -> Key="borrower_type_juristic"
                        const key = `${field.uniqid}_${opt.code}`;
                        // 6. เก็บ Config ฟอร์มย่อยลงใน Object กลาง
                        this.nestedConfigs[key] = opt.popup;
                    }
                    // [NEW] เช็คกรณีที่เป็น Button Auto Increment (options เป็น Object ไม่ใช่ Array)
                    else if (field.typeInput === 'button' && field.options && field.options.popup) {
                        // ไม่ต้องทำอะไรพิเศษตรงนี้ เพราะ template อยู่ใน field.options.popup แล้ว
                        // เราจะดึงไปใช้ตอนกดปุ่มเลย
                    }
                });
            }
            // Case 2: [NEW] แบบ xsd_rules (สำหรับ ipi ที่มี individual_details/juristic_details)
            if (field.xsd_rules && Array.isArray(field.xsd_rules) && field.popup && !Array.isArray(field.popup)) {
                field.xsd_rules.forEach(rule => {
                    // 1. ดึงชื่อกลุ่ม (เช่น "individual_details")
                    const targetGroup = rule.target_group;
                    // 2. ดึง Config ของกลุ่มนั้นจาก field.popup
                    const subFormConfig = field.popup[targetGroup];

                    if (subFormConfig && Array.isArray(subFormConfig)) {
                        // 3. วนลูปสร้าง Key ตาม condition_values (เช่น ["1"] -> ipi_1)
                        if (rule.condition_values && Array.isArray(rule.condition_values)) {
                            rule.condition_values.forEach(val => {
                                const key = `${field.uniqid}_${val}`;
                                this.nestedConfigs[key] = subFormConfig;
                            });
                        }
                    }
                });
            }
        });
        // DEBUG: ตรวจสอบข้อมูล
        console.log('[RenderPopupRow] Nested Configs:', this.nestedConfigs);
    }

    // Helper ใหม่: ใช้เพื่อ map select และ radio เพื่อดึง Options จาก Store มาใส่ใน Config หลัก (ป้องกัน Dropdown ว่าง)
    _mergeOptionsFromStore() {
        if (!window.opener || !window.opener.store) return;
        const state = window.opener.store.getState();
        
        this.formConfig.forEach(field => {
            if (field.element === 'select') {
                // ถ้า Options ว่าง หรือเป็น Empty Array ให้พยายามดึงจาก Store
                if (!field.options || field.options.length === 0) {
                    const storeOptions = state[field.uniqid] || (state.data && state.data[field.uniqid]);
                    if (storeOptions && Array.isArray(storeOptions)) {
                        console.log(`[RenderPopupRow] Merging options for ${field.uniqid} from Store`);
                        field.options = storeOptions;
                    }
                }
            }
        });
    }

    /************************* ส่วนการแสดงผล (Presentation Layer) ***********************************
     * เมธอด render: จุดเริ่มต้นการวาดหน้าจอ Popup
     * หน้าที่: วาดฟอร์ม HTML, ผูก Event Listeners ทั้งหมด และเติมข้อมูลเริ่มต้น
     */
    render() {
        // Guard Clause: เช็คว่ามี Config หรือไม่
        if (!this.formConfig || this.formConfig.length === 0) {
            console.warn('[RenderPopupRow.js] Render aborted, formConfig is empty.');
            return;
        }
        // 1. ดึง Options จาก Store ก่อนวาด
        this._mergeOptionsFromStore();        
        // 1. Build HTML String: สร้างโครงสร้างฟอร์ม
        const formHtml = this._buildFormHtml();
        // 2. Inject to DOM: ยัดใส่ Container
        this.container.innerHTML = formHtml;
        this.formElement = this.container.querySelector('#popup-form'); // เก็บ Reference ไว้ใช้ต่อ
        // 3. Attach Form Events: ผูกปุ่ม Save และ Cancel
        this.formElement.addEventListener('submit', (e) => this._handleSave(e));
        this.formElement.querySelector('#btn-cancel').addEventListener('click', () => window.close());
        // 4. Attach Input Events: ผูก Listener ให้ Input ประเภทต่างๆ
        // จัดรูปแบบตัวเลข (comma)
        this._attachFormatListeners();
        // Dropdown change
        this._attachSelectListeners();
        // jQuery Datepicker
        this._attachDatepickerListeners();
        // Radio change (Dynamic Form)
        this._attachRadioListeners();
        // ผูก Event ให้ปุ่มกดเพิ่มรายการ (Auto Increment)
        this._attachDynamicButtonListeners();
        // เรียก Autocomplete
        this._attachAutocompleteListeners();
        // 5. Populate Data: เติมข้อมูลลงฟอร์ม (จาก this.currentRecord)
        this._populateForm(this.currentRecord);
        // 6. เรียกใช้งานรายงานต้องเปิด form ด้วย select และ radio button
        setTimeout(() => {
             this._triggerAllSelects();
        }, 100);
        // 7. Update UI State: อัปเดตสถานะต่างๆ (เช่น เลขหน้า, ProgressBar)
        this._updateStatusUI();
    }

    /**
     * Helper Method: สร้าง String HTML ของฟอร์มทั้งก้อน
     * returns {string} HTML Template String ส่วนนี้คือ Container สำหรับวาด form ตามโครงสร้างที่ได้จาก method _generateFieldHtml
     */
    _buildFormHtml() {
        let fieldsHtml = '';
        // 1. วาด Main Fields: วนลูป Config หลักสร้าง HTML ทีละ Field
        this.formConfig.forEach(field => {
            fieldsHtml += this._generateFieldHtml(field);
        });
        // 2. เพิ่ม Container เปล่าๆ สำหรับ Dynamic Fields
        // (หากรายงานใดมี sub-form ฟอร์มย่อยจะถูก Inject ใส่ตรงนี้เมื่อ User กด Radio/Select)
        fieldsHtml += `<div id="dynamic-form-container" style="margin-top: 15px; padding: 15px; border-radius: 5px; display:none;"></div>`;
        
        // (Logic Pagination การแสดงปุ่ม Nav(prev/next) ถูก comment)
        // const showNavButtons = this.allDataList && this.allDataList.length > 1;

        // 3. ประกอบร่าง Form Template ส่วนนี้คือส่วนที่แสดงผลในหน้า frm_popup_row.php
        return `
            <form id="popup-form">
                <h2 style="text-align:center;">${this.isEditMode ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล'}</h2>
                
                <div id="status-indicator" style="text-align:center; margin-bottom: 20px; font-size: 0.9em; color: #666;"></div>
                ${fieldsHtml}               
                <div class="form-actions" style="margin-top:20px; text-align:center;">
                    <button type="submit" class="btn btn-submit">บันทึก</button>
                    <button type="button" id="btn-cancel" class="btn btn-cancel">ปิด</button>
                </div>
            </form>
        `;
    }

    /**
     * Helper Method: สร้าง HTML สำหรับ Field 1 ตัว (Wrapper + Label + Input)
     * หน้าที่: แยกแยะประเภท Input (Select, Radio, Text, Button, Checkbox) แล้วเรียก Helper ย่อย (method)
     */
    _generateFieldHtml(field) {
        const label = field.label;
        const uniqid = field.uniqid;
        const required = field.required ? 'required' : '';
        const typeData = (field.typeData || '').toLowerCase();

        // เช็คว่าเป็น Global Field หรือไม่ กำหนดจาก Server-side
        const isGlobalField = (field.globalData === "true") || 
                              (uniqid === 'fi_reporting_group_id') || 
                              (uniqid === 'fi_report_group_id');
        let globalCheckboxHtml = '';
        if (isGlobalField) {
            // สร้าง Checkbox: Default = checked (ติ๊กถูกไว้ก่อน เพื่อคง behavior เดิม)
            globalCheckboxHtml = `
                    <div></div>
                    <div style="margin-top:-0.7rem; font-size: 0.9em; color:red; display:flex; align-items:center;">
                        <label style="font-weight: normal; cursor: pointer;">
                            <input type="checkbox" id="chk_global_${uniqid}" name="chk_global_${uniqid}" value="1">                        
                        </label>
                        <span style="font-size:0.6rem;">Click Checkbox หากต้องการแก้ไข ${label} ให้ไปใช้กับรายการอื่นด้วย</span>                    
                    </div>           
            `;
        }

        // Prepare Attributes: เตรียม Attribute พิเศษตามประเภทข้อมูล
        let extraAttributes = '';    
        if (typeData === 'integer' || typeData === 'numeric') {
            extraAttributes = `data-format="${typeData}"`;
        }
        else if (typeData === 'date') {
            extraAttributes = `data-type-data="date"`; // สำหรับ Datepicker
        }

        // เพิ่ม Attribute สำหรับ Autocomplete
        if (field.autoComplete === "true") {
            extraAttributes += ` data-autocomplete="true"`;
        }

        // Case: Hidden Input (สร้างแล้ว return เลย ไม่ต้องมี div ครอบ) คือ id หรือ autoID เพื่อใช้ในการแก้ไขหรือลบ
        if (field.typeInput === 'hidden') {
            return `<input type="hidden" id="${uniqid}" name="${uniqid}" ${extraAttributes} >`;
        }

        // Switch Case: เลือกวิธีสร้าง HTML ตามประเภท Element ถูกกำหนดไว้แล้วที่ models/data_config.json 
        let elementHtml = '';
        if (field.typeInput === 'button') {
            elementHtml = this._buildButtonElement(field);
            return `
                <div style="margin-bottom:15px; border-top:1px solid #eee; padding-top:15px;">                    
                    <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <label style="font-weight:bold; font-size: 14px; color: #333;">${label}</label>
                        ${elementHtml}
                    </div>
                    <div id="container_${field.uniqid}" class="dynamic-rows-wrapper" style="width: 100%;"></div>
                </div>
            `;
        }
        switch (field.element.toLowerCase()) {                
            case 'select':                
                elementHtml = this._buildSelectElement(field, extraAttributes, required);
                // Hidden field สำหรับเก็บ Description (เช่น code='01', des='Bangkok')
                // *** ต้องกำหนดไว้เพราะมีเก็บ description บางรายงาน ***
                elementHtml += `<input type="hidden" id="${uniqid}_des" name="${uniqid}_des">`;
                break;            
            case 'radio':
                elementHtml = this._buildRadioElement(field, required);
                break;            
            case 'input':
            default: 
                elementHtml = this._buildInputElement(field, extraAttributes, required);
                if (field.autoComplete === "true") {
                    elementHtml += `<input type="hidden" id="${uniqid}_des" name="${uniqid}_des">`;
                }
                // ถ้าเป็น Date ให้ห่อด้วย span เพื่อความสวยงาม (และรองรับปุ่มปฏิทิน)
                if (typeData === 'date') {elementHtml = `<span class="datepicker-wrapper">${elementHtml}</span>`;}
                break;
        }
        // Wrap with Form Group: ห่อด้วย div เพื่อจัด Layout ให้สวยงาม (Label ซ้าย และ Input ขวา)
        return `
            <div class="form-group" style="margin-bottom:10px;">
                <label for="${uniqid}" style="display:block; font-weight:bold; margin-bottom:5px;">${label}</label>
                ${elementHtml}
                ${globalCheckboxHtml}
            </div>
        `;
    }

    /**
     * สร้างปุ่มกด Auto Increment ใช้สำหรับกรอก Sub-form ถูกใช้ในรายงาน LAR 
     */
    _buildButtonElement(field) {
        // ดึง Template จาก options.popup
        let template = [];
        let action = "";
        if (field.options) {
            template = field.options.popup || [];
            action = field.options.action || "";
        }
        // แปลง Template เป็น JSON String ฝากไว้ใน data-attribute
        const templateStr = JSON.stringify(template).replace(/"/g, '&quot;');
        return `
            <button 
                type="button" 
                id="${field.uniqid}" 
                class="btn dynamic-add-btn" 
                style="background-color: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 0.9em;"
                data-action="${action}"
                data-target="container_${field.uniqid}"
                data-template="${templateStr}"
            >
                + เพิ่มรายการ
            </button>
        `;
    }

    /*
     * 2. Logic ผูก Event Listener ให้ปุ่มเพิ่มรายการ 
     */
    _attachDynamicButtonListeners() {
        const buttons = this.formElement.querySelectorAll('.dynamic-add-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // ตรวจสอบ action
                const action = e.target.dataset.action;
                if (action === 'inclements') {
                    this._handleAddSubFormRow(e.target);
                }
            });
        });
    }

    /**
     * [NEW] 3. Logic สร้าง HTML สำหรับ Row ใหม่ (Auto Increment)
     */
    _handleAddSubFormRow(buttonEl) {
        const targetId = buttonEl.dataset.target; 
        const templateConfig = JSON.parse(buttonEl.dataset.template || '[]');
        const container = this.formElement.querySelector(`#${targetId}`);

        if (!container || templateConfig.length === 0) return;

        // ====================================================================
        // เตรียม Options จาก Store ก่อนสร้าง HTML
        // ====================================================================
        let storeState = {};
        if (window.opener && window.opener.store) {
            storeState = window.opener.store.getState();
        }

        // วนลูป Template เพื่อยัด Options ใส่เข้าไป (ถ้าเป็น Select และไม่มี Options)
        templateConfig.forEach(field => {
            if (field.element === 'select' && (!field.options || field.options.length === 0)) {
                // พยายามหา Options จาก Store โดยใช้ชื่อ uniqid (เช่น unique_id_type)
                // รองรับทั้งอยู่ที่ Root State หรือใน key 'data' ของ State
                // (จาก PHP เราส่งมาใน ...restOfPayload ซึ่งอยู่ที่ Root ของ State)
                const options = storeState[field.uniqid] || (storeState.data && storeState.data[field.uniqid]);
                
                if (options && Array.isArray(options)) {
                    // console.log(`[RenderPopupRow] Injecting options for dynamic field: ${field.uniqid}`, options.length);
                    field.options = options;
                } else {
                    console.warn(`[RenderPopupRow] Warning: No options found in Store for field "${field.uniqid}"`);
                }
            }
        });

        const existingRows = container.querySelectorAll('.dynamic-sub-row').length;
        const nextIndex = existingRows + 1;

        let rowHtml = `
            <div class="dynamic-sub-row" data-index="${nextIndex}" style="background: #fcfcfc; border: 1px dashed #ccc; padding: 15px; margin-bottom: 10px; border-radius: 5px; position: relative;">
                <div style="font-size: 0.85em; color: #17a2b8; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom:5px;">
                    Sub-form ${nextIndex}
                </div>
                <button type="button" class="btn-remove-row" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #dc3545; cursor: pointer; font-size: 1.2em;" title="ลบรายการนี้">&times;</button>
        `;

        templateConfig.forEach(field => {
            // [IMPORTANT] Clone config และเปลี่ยน uniqid ให้ไม่ซ้ำกัน
            const newField = { 
                ...field, 
                uniqid: `${field.uniqid}_${nextIndex}`,
                label: `${field.label}` 
            };
            rowHtml += this._generateFieldHtml(newField);
        });

        rowHtml += `</div>`;

        container.insertAdjacentHTML('beforeend', rowHtml);

        const newRowEl = container.lastElementChild;
        this._attachFormatListeners(newRowEl);
        this._attachSelectListeners(newRowEl);
        this._attachDatepickerListeners(newRowEl);
        // เรียก Autocomplete โดยระบุ Scope เป็น Row ใหม่
        this._attachAutocompleteListeners(newRowEl);

        newRowEl.querySelector('.btn-remove-row').addEventListener('click', function() {
            if(confirm('ต้องการลบรายการย่อยนี้หรือไม่?')) {
                this.closest('.dynamic-sub-row').remove();
            }
        });
    }

    /**
     * [Private] Helper Method: สำหรับสร้าง HTML String ของ <input>
     * หน้าที่: กำหนด type, pattern, style และ attribute อื่นๆ ตาม Config ที่ส่งมา
     */
    _buildInputElement(field, extraAttributes, required) {
        // 1. กำหนดประเภท Input (Priority: typeInput -> type -> default 'text')
        let inputType = field.typeInput || field.type || 'text';

        // 2. กำหนดค่าเริ่มต้นตัวแปร
        let pattern = '';
        let widthInput = '100%';
        const typeData = (field.typeData || '').toLowerCase();        
        
        // 3. Logic พิเศษสำหรับประเภท 'date'
        if (typeData === 'date') {
            // เพิ่ม Regex Pattern เพื่อบังคับ Format เป็น YYYY-MM-DD
            pattern = 'pattern="\\d{4}-\\d{2}-\\d{2}"'; // (เพิ่มการตรวจสอบ format)
        }
        // 4. สร้าง Inline Style (ถ้าใน Config มีระบุความกว้างมา ให้ใช้ตามนั้น)
        const style = field.widthInput ? `style="width: ${field.widthInput};"` : `style="width: ${widthInput};"`;        
        // ตรวจสอบค่า disabled จาก JSON
        const disabledAttr = (field.disabled === "true" || field.disabled === true) ? 'disabled' : '';
        // 5. ประกอบร่างและคืนค่า HTML String
        return `
            <input 
                type="${inputType}" 
                id="${field.uniqid}" 
                name="${field.uniqid}"
                ${required}
                ${extraAttributes}
                ${pattern}
                ${style} ${disabledAttr}
            >
        `;
    }

    /**
     * [Private] Helper Method: สำหรับสร้าง HTML String ของ <select> (Dropdown)
     * หน้าที่: วนลูป Options, จัดการ Logic ซ่อนตัวเลือกที่ใช้แล้ว, และเตรียม Attribute สำหรับ Dynamic Form
     */
    _buildSelectElement(field, extraAttributes, required) {
        // Default Option
        let optionsHtml = '<option value="">-- กรุณาเลือก --</option>';
        // =========================================================
        // 1. Prepare Logic: ตรวจสอบเงื่อนไข "ซ่อนตัวเลือกที่ใช้แล้ว"        
        // =========================================================
        // เช็คว่าเป็นโหมด Group Wizard หรือไม่ (มีมากกว่า 1 หน้า หรือมี bot_code_items)
        const isWizardMode = this.allDataList && this.allDataList.length > 1;
        // เช็คว่าเป็น "Key Field" ที่ห้ามซ้ำหรือไม่ (เช่น รหัสรายการในงบดุล)
        const isKeyField = ['bot_code_items'].includes(field.uniqid);
        // DEBUG: กรณี code ทำงานไม่ถูกต้อง หาก เปิด comment นี้แล้วทำงานได้ แสดงว่าขาด config ให้ทดสอบกับรายงาน 'BLS'
        // const isKeyField = ['bot_code_items', 'balance_sheet_item'].includes(field.uniqid);

        // รวบรวม Code ทั้งหมดที่ "ถูกใช้ไปแล้ว" ในรายการอื่น
        let usedCodes = [];
        if (isWizardMode && isKeyField) {
            usedCodes = this.allDataList
                .filter(d => (d.id || d.autoID)) // เอาเฉพาะรายการที่บันทึกแล้ว (มี ID)
                .map(d => d[field.uniqid]);
        }
        
        // =========================================================
        // 2. Build Options: วนลูปสร้าง <option>
        // =========================================================
        // ตัวแปรเช็คว่า Dropdown นี้มีผลกับ Sub-form หรือไม่ (เพื่อใส่ class trigger)
        let hasPopup = false;
        if (field.options && Array.isArray(field.options)) {
            // DEBUG: comment log ตรวจสอบว่าสร้าง select name สำเร็จหรือไม่
            // console.log(`[RenderPopupRow.js] Building <select> sub-form for "${field.uniqid}"`);            
            
            optionsHtml += field.options.map(opt => {
                // เช็คว่า Option นี้มี Sub-form ซ่อนอยู่ไหม
                if (opt.popup) { hasPopup = true; }

                // --- LOGIC: ซ่อนตัวเลือกที่ใช้แล้ว (Used Code Filter) ---
                if (isWizardMode && isKeyField) {
                    const isUsed = usedCodes.includes(opt.code);                    
                    // เช็คว่าเป็น "ตัวมันเอง" หรือไม่? (กรณี Edit ต้องโชว์ตัวมันเองด้วย)
                    // ดึงค่าปัจจุบันจาก currentRecord
                    const currentVal = this.currentRecord ? this.currentRecord[field.uniqid] : '';
                    const isSelf = (currentVal == opt.code);
                    // ถ้า "ใช้ไปแล้ว" และ "ไม่ใช่ตัวมันเอง" -> ไม่ต้องแสดง (ซ่อน)
                    if (isUsed && !isSelf) {
                        return ''; 
                    }
                    console.log("[RenderPopupRow.js] isWizardMode: ", isWizardMode);
                }
                              
                // 1. เรา "ซ่อน" 'details' ไว้ใน data-attribute เพื่อใช้แสดงผลในหน้า ReportRenderer.js
                // 2. เราใช้ 'code' เป็น 'value' (เพื่อรักษา Data Integrity)
                // 3. เราแสดง "code - details" เป็น Text                 
                let labelText = opt.code;
                if (opt.details && opt.details !== 'undefined' && opt.details !== '') {
                    labelText += ` - ${opt.details}`;
                }
                // เช็ค Selected flag (เผื่อมี default config มาจาก PHP/JSON)
                const isSelected = opt.selected ? 'selected' : '';                 
                // รับค่า popup_model จาก Server มาใส่ไว้ใน data attribute
                const popupModelAttr = opt.popup_model ? `data-popup-model="${opt.popup_model}"` : '';
                // [FIXED] ใส่ data-details เฉพาะเมื่อมีค่าเท่านั้น (ป้องกันการส่งค่าว่างไปทับของเดิม)
                const detailsAttr = opt.details ? `data-details="${opt.details}"` : '';
                // สร้าง HTML String ของ <option>
                return `
                    <option 
                        value="${opt.code}" 
                        ${detailsAttr}
                        data-popup-model="${opt.popup_model || ''}"
                        ${isSelected}
                        ${popupModelAttr}
                    >
                        ${labelText}
                    </option>
                `;
            }).join('');

        } else {
            console.warn(`[RenderPopupRow.js] No 'options' array for "${field.uniqid}"`);
        }
        const style = field.widthInput ? `style="width: ${field.widthInput};"` : '';
        let triggerClass = hasPopup ? 'dynamic-select-trigger' : '';
        if (field.uniqid === 'involved_party_type') {
            triggerClass += ' dynamic-select-trigger'; 
        }
        // 3. ประกอบร่าง <select>
        return `
            <select 
                id="${field.uniqid}" 
                name="${field.uniqid}"
                ${required}
                ${extraAttributes} 
                ${style}
                class="${triggerClass}"
            >
                ${optionsHtml}
            </select>
        `;
    }

    /**
     * [Private] Helper Method: สำหรับสร้าง Radio Group
     * หน้าที่: รับ Config ของ Field แล้วแปลงเป็น HTML ของ Radio Buttons หลายๆ ตัวเรียงกัน
     * param {Object} field - Config ของ field นั้นๆ (ต้องมี field.options)
     * param {string} required - Attribute 'required' (ถ้าจำเป็น)
     */
    _buildRadioElement(field, required) {
        // 1. Validation: ตรวจสอบก่อนว่ามีตัวเลือก (options) มาให้สร้างหรือไม่
        // ถ้าไม่มี ให้คืนค่า Error Message สีแดงกลับไปแสดงผลแทน
        if (!field.options || !Array.isArray(field.options)) return '<span style="color:red">No options</span>';
        // ตรวจสอบค่า disabled จาก JSON
        const disabledAttr = (field.disabled === "true" || field.disabled === true) ? 'disabled' : '';
        // 2. เริ่มสร้าง Container (ใช้ Flexbox เพื่อจัดให้เรียงแนวนอน และเว้นระยะห่าง gap:15px)
        let html = '<div class="radio-group-container" style="display:flex; gap:15px;">';

        // 3. วนลูปสร้าง Radio Button ทีละตัวตาม Options ที่กำหนดใน JSON FILE
        field.options.forEach(opt => {
            // สร้าง ID ที่ไม่ซ้ำกัน (เพื่อใช้ผูกกับ tag <label for="...">)
            // รูปแบบ: "ชื่อField_รหัสตัวเลือก" (เช่น "ipi_1", "ipi_2")
            const id = `${field.uniqid}_${opt.code}`;
            
            // 4. ต่อ String HTML
            // - name="${field.uniqid}": ชื่อต้องเหมือนกันทั้งกลุ่ม เพื่อให้เลือกได้แค่ตัวเดียว (Mutually Exclusive)
            // - value="${opt.code}": ค่าที่จะถูกส่งไปบันทึก (เช่น '1', '2')
            // - class="dynamic-radio-trigger": ***สำคัญ*** ใส่ไว้เพื่อให้ JS มาดัก Event 'change' ได้ง่าย (สำหรับเปิด Sub-form)
            html += `
                <div style="display:flex; align-items:center; gap:5px;">
                    <input type="radio" 
                           id="${id}" 
                           name="${field.uniqid}" 
                           value="${opt.code}" 
                           ${required} ${disabledAttr}
                           class="dynamic-radio-trigger">
                    <label for="${id}" style="font-weight:normal; margin:0;">${opt.details}</label>
                </div>
            `;
        });
        // 5. ปิด Tag Container และคืนค่า HTML กลับไป
        html += '</div>';
        return html;
    }

    /**
     * [Private] เมธอดสำหรับผูก Event 'change' ให้กับ Radio Buttons
     * หน้าที่: ค้นหา Radio ที่มีคลาส 'dynamic-radio-trigger' แล้วสั่งให้มัน
     * เรียกฟังก์ชันวาดฟอร์มย่อย (_renderDynamicForm) เมื่อมีการกดเลือก
     */
    _attachRadioListeners() {
        // 1. ค้นหา Radio ทุกตัวในฟอร์มที่มี Class 'dynamic-radio-trigger'
        // (Class นี้ถูกใส่มาตอนสร้าง HTML ในเมธอด _buildRadioElement)
        this.formElement.querySelectorAll('.dynamic-radio-trigger').forEach(radio => {
            // 2. ผูก Event Listener ประเภท 'change'
            radio.addEventListener('change', (e) => {
                // 3. เรียกฟังก์ชัน _renderDynamicForm เพื่อจัดการแสดงผลฟอร์มย่อย
                // ส่งพารามิเตอร์ไป 2 ตัว:
                // - e.target.name:  ชื่อของ Field (เช่น 'ipi') เพื่อบอกว่าหัวข้อไหนถูกกด
                // - e.target.value: ค่าที่ถูกเลือก (เช่น '1' หรือ '2') เพื่อบอกว่าต้องไปดึง Config ชุดไหนมาวาด
                // ทั้งสองค่าถูกกำหนดแล้วที่ JSON FILE
                this._renderDynamicForm(e.target.name, e.target.value);
            });
        });
    }

    /**
     * [Private] Logic การแสดงผล "ฟอร์มย่อย" (Dynamic Sub-form)
     * หน้าที่: รับชื่อ Field และค่าที่เลือก -> ค้นหา Config ย่อย -> วาดลงใน Container -> ผูก Event ใหม่
     * param {string} fieldName - ชื่อของ Field ต้นเรื่อง (เช่น 'ipi')
     * param {string} selectedValue - ค่าที่ถูกเลือก (เช่น '1' หรือ '2')
     */
    _renderDynamicForm(fieldName, selectedValue) {
        const container = this.formElement.querySelector('#dynamic-form-container');

        // 1. สร้าง Key เพื่อไปค้นหา Config (เช่น 'borrower_type_1')
        const configKey = `${fieldName}_${selectedValue}`;
        // ข้อมูลโหลดเตรียมไว้แล้วใน _scanForNestedConfigs()
        const subConfig = this.nestedConfigs[configKey];
        // Reset: ล้างพื้นที่เก่าทิ้งก่อนเสมอ
        container.innerHTML = '';     
        if (subConfig && subConfig.length > 0) {
            container.style.display = 'block';    
            let headerText = "ข้อมูลเพิ่มเติม";
            // 1. หา Field Config ที่เป็น Radio ตัวต้นเรื่อง (เช่น ipi)
            const radioFieldConfig = this.formConfig.find(f => f.uniqid === fieldName);
            if (radioFieldConfig && radioFieldConfig.options) {
                // 2. หา Option ที่ถูกเลือก (เช่น code='1')
                const selectedOption = radioFieldConfig.options.find(opt => opt.code == selectedValue); // ใช้ == เผื่อ type ต่างกัน
                
                // 3. ดึง Label ออกมาใช้
                if (selectedOption && selectedOption.label) {
                    headerText = selectedOption.label;
                }
            }

            // 3. Inject Options: แก้ปัญหา Dropdown ใน Sub-form ไม่มีตัวเลือก
            if (window.opener && window.opener.store) {
                const state = window.opener.store.getState();
                subConfig.forEach(field => {
                    // ถ้าเป็น Select และยังไม่มี Options
                    if (field.element === 'select' && (!field.options || field.options.length === 0)) {
                        // ลองหา Options ใน State โดยใช้ชื่อ Field (เช่น unique_id_type)
                        // รองรับทั้งอยู่ที่ Root หรือใน Data
                        const optionsFromStore = state[field.uniqid] || (state.data && state.data[field.uniqid]);
                        
                        if (optionsFromStore && Array.isArray(optionsFromStore)) {
                            console.log(`[RenderPopupRow] Injecting options for sub-field "${field.uniqid}" from Store.`);
                            field.options = optionsFromStore;
                        } else {
                            console.warn(`[RenderPopupRow] Options for "${field.uniqid}" not found in Store.`);
                        }
                    }
                });
            }

            let html = `<h4 style="margin-top:0; margin-bottom:15px; border-bottom:1px solid #ddd; padding-bottom:5px; color:#666;">${headerText}</h4>`;            
            // วนลูปวาดทีละ Field (ใช้ _generateFieldHtml ซ้ำกับฟอร์มหลัก)
            subConfig.forEach(field => {
                html += this._generateFieldHtml(field);
            });
            container.innerHTML = html;
            // 4. Re-attach Events: ผูก Event Listener ให้กับของใหม่
            // *** ต้องส่ง 'container' เป็น scope เข้าไป เพื่อให้ bind เฉพาะในกล่องนี้ 
            // (ไม่ไป bind ซ้ำกับฟอร์มหลักด้านบน)
            this._attachFormatListeners(container);
            this._attachSelectListeners(container);
            this._attachDatepickerListeners(container);
            this._attachAutocompleteListeners(container);
            this._fillValues(subConfig, container, this.currentRecord);         
        } else {
            container.style.display = 'none';
        }
    }

    /**
     * [Private] Helper Method: เติมข้อมูลลงในฟอร์ม (Populate Data)
     * หน้าที่: นำข้อมูลจาก recordData มาใส่ใน Input, Select, Radio 
     * และจัดการ Logic เปิดฟอร์มย่อย (Dynamic Form) อัตโนมัติถ้ามีค่าอยู่แล้ว
     * param {Object} recordData - ข้อมูลที่จะนำมาแสดง (default = this.currentRecord)
     */
    _populateForm(recordData = this.currentRecord) {
        // Guard Clause: ถ้าไม่มีข้อมูลให้จบการทำงาน
        if (!recordData) return;
        
        // 1. แปลง Array เป็น Flat Data ก่อนเริ่มวาดฟอร์มเพื่อให้ Logic เดิมที่สแกนหา _1, _2 สามารถสร้าง Row ได้อัตโนมัติ
        const flatRecordData = this._flattenDataForUI(recordData);

        // =========================================================
        // [Hybrid Sticky Logic] รองรับทั้ง globalData="true" และ key เฉพาะเจาะจง
        // =========================================================
        if (window.opener && window.opener.store) {
            const state = window.opener.store.getState();
            // ใช้ formConfig ของตัว RenderPopupRow เอง (ซึ่งโหลดมาจาก Store/LocalStorage แล้ว)
            const configList = this.formConfig || []; 
            const lastInputs = state.last_inputs || {}; 

            configList.forEach(field => {
                const key = field.uniqid;
                let shouldApplySticky = false;
                // 1. เช็คว่ามี flag globalData="true" หรือไม่?
                if (field.globalData === "true") {
                    shouldApplySticky = true;
                }
                // 2. (Else) ถ้าไม่มี flag ให้เช็คว่าเป็น key พิเศษ "fi_reporting_group_id" หรือไม่?
                else if (key === 'fi_reporting_group_id') {
                    shouldApplySticky = true;
                }
                else if (key === 'fi_report_group_id') {
                    shouldApplySticky = true;
                }

                // ถ้าเข้าเงื่อนไขข้อใดข้อหนึ่ง AND ข้อมูลยังว่างอยู่ AND มีค่าที่จำไว้ใน Store
                if (shouldApplySticky && !flatRecordData[key] && lastInputs[key]) {
                    console.log(`[RenderPopupRow] Applying sticky value for "${key}":`, lastInputs[key]);
                    
                    // Set ค่า
                    flatRecordData[key] = lastInputs[key];
                    
                    // เคลียร์ Description ทิ้ง เพื่อให้ระบบดึง Text ใหม่จาก <option>
                    flatRecordData[`${key}_des`] = ''; 
                }
            });
        }
        // DEBUG: ข้อมูลที่บันทึกลง Store 
        console.log('[RenderPopupRow] Populating form with:', flatRecordData);

        // =========================================================
        // 2. Fill Main Form: เติมข้อมูลลง Input หลัก
        // =========================================================
        // เรียก Helper Function เพื่อวนลูปใส่ค่าลงใน Form Element จริงๆ
        this._fillValues(this.formConfig, this.formElement, flatRecordData);

        let allConfigsForPopulate = [...this.formConfig];
        Object.values(this.nestedConfigs).forEach(subCfg => {
            if (Array.isArray(subCfg)) allConfigsForPopulate = allConfigsForPopulate.concat(subCfg);
        });

        // 2.1 Fill Auto-Incremented Fields (Detect keys with _1, _2, etc.)
        // Logic: ตรวจสอบ Config ว่ามีปุ่ม increment ไหม แล้วสแกน Data
        allConfigsForPopulate.forEach(field => {
            if (field.typeInput === 'button' && field.options && field.options.action === 'inclements') {                
                const groupKey = field.uniqid; // เช่น 'collateral_group_info'
                const groupData = flatRecordData[groupKey]; // ดึง Array ออกมาตรงๆ
                const btn = this.formElement.querySelector(`#${field.uniqid}`);
                
                // ตัวแปรสำหรับเช็คว่า เจอข้อมูลเดิมไหม (ถ้าเจอจะไม่ทำ defaultItem)
                let hasExistingData = false;

                // Case A: ตรวจสอบข้อมูลแบบ Array (Priority สูงสุด)
                if (Array.isArray(groupData) && groupData.length > 0) {
                    console.log(`[RenderPopupRow] Found array data for ${groupKey}: ${groupData.length} items.`);
                    hasExistingData = true;
                    groupData.forEach(() => {
                        if (btn) this._handleAddSubFormRow(btn); 
                    });
                } 
                // Case B: [Fallback] ตรวจสอบข้อมูลแบบ Flat Data (key_1, key_2...)
                else {
                    const template = field.options.popup;
                    const firstTemplateField = template[0];
                    let i = 1;
                    while (true) {
                        const checkKey = `${firstTemplateField.uniqid}_${i}`;
                        if (flatRecordData[checkKey] !== undefined) {
                            hasExistingData = true; // เจอข้อมูลเก่า
                            if (btn) this._handleAddSubFormRow(btn);
                            i++;
                        } else {
                            break; 
                        }
                    }
                }

                // =================================================================
                // Case C: Default Item Logic 
                // ทำงานเมื่อ: ไม่เจอข้อมูลเก่า (hasExistingData = false) และมี config defaultItem
                // =================================================================
                if (!hasExistingData && field.defaultItem) {
                    const defaultCount = parseInt(field.defaultItem, 10);
                    if (!isNaN(defaultCount) && defaultCount > 0) {
                        console.log(`[RenderPopupRow] No data found. Generating ${defaultCount} default rows for ${field.uniqid}`);
                        for (let k = 0; k < defaultCount; k++) {
                            if (btn) this._handleAddSubFormRow(btn);
                        }
                    }
                }

                // หลังจากสร้าง Row เปล่าๆ เสร็จแล้ว เดี๋ยว _fillValues จะมาเติมค่าให้เองในรอบถัดไป
                // แต่ _fillValues ปกติมันเติมตาม configList
                // ดังนั้นเราต้องสั่ง fill เฉพาะ dynamic containers
                const container = this.formElement.querySelector(`#container_${field.uniqid}`);
                if (container) {
                    const rows = container.querySelectorAll('.dynamic-sub-row');
                    const template = field.options.popup;
                    rows.forEach((row, index) => {
                        const idx = index + 1; // 1, 2, 3...
                        // สร้าง Config ชั่วคราวที่เปลี่ยน uniqid แล้ว เพื่อส่งให้ _fillValues
                        const tempConfig = template.map(f => ({
                            ...f,
                            uniqid: `${f.uniqid}_${idx}`
                        }));
                        this._fillValues(tempConfig, row, flatRecordData);
                    });
                }
            }
        });
        
        // =========================================================
        // 3. Trigger Dynamic Form: เปิดฟอร์มย่อย (ถ้ามี)
        // =========================================================
        // วนลูป Config อีกรอบ เพื่อเช็คว่า Field ไหนเป็นตัวเปิด Sub-form (Radio/Select)
        this.formConfig.forEach(field => {
            // ใช้ค่าจาก recordData (ข้อมูลปัจจุบันของหน้านั้น)
            let val = recordData[field.uniqid];
            
            // --- A. กรณี Radio ---
            if (field.element === 'radio') {
                // Logic Mapper (เผื่อค่าใน DB ไม่ตรงกับ Value ใน Radio)
                // if (val === undefined && this.radioValueMappers[field.uniqid]) {
                //     val = this.radioValueMappers[field.uniqid](recordData);
                //     recordData[field.uniqid] = val; // Update ค่าที่แปลงแล้วกลับไป Data
                // }
                // // ถ้ามีค่า -> สั่งเปิด Dynamic Form (sub-form) ของค่านั้นทันที
                // if (val !== undefined && val !== null) {
                //     this._renderDynamicForm(field.uniqid, val);
                // }
                // ไม่ต้อง map แล้ว เพราะเดี๋ยว Dropdown จะเป็นตัว trigger ให้เองตอนจบ render
                if (val !== undefined && val !== null) {
                    const radio = this.formElement.querySelector(`input[name="${field.uniqid}"][value="${val}"]`);
                    if(radio) radio.checked = true;
                    
                    this._renderDynamicForm(field.uniqid, val);
                }
            }
            // --- Case B: OPTIONAL: Select (Dropdown) --- 
            else if (field.element === 'select') {
                if (val !== undefined && val !== null && val !== '') {
                    // เช็คว่า Dropdown นี้มี Option ไหนที่มี popup ไหม?
                    // (เช็คจาก options ว่ามีตัวไหนมี popup ไหม)
                    const hasPopup = field.options && field.options.some(o => o.popup);
                    if (hasPopup) {
                        this._renderDynamicForm(field.uniqid, val);
                    }
                }
            }
        });        

        // =========================================================
        // 4. Fill Sub Form: เติมข้อมูลลงในฟอร์มย่อย (ที่เพิ่งถูกเปิดมา)
        // =========================================================
        // ต้องทำขั้นตอนนี้เพราะ _fillValues รอบแรก (ข้อ 2) มันเติมแค่ Main Form
        // ส่วน Sub Form เพิ่งถูกสร้างในข้อ 3 (Trigger Dynamic Form) จึงต้องมาเติมซ้ำตรงนี้
        const container = this.formElement.querySelector('#dynamic-form-container');
        // เช็คว่า Container ถูกเปิดอยู่ไหม
        if (container && container.style.display !== 'none') {
            this.formConfig.forEach(field => {
                if (field.element === 'radio' || (field.element === 'select' && field.options)) {
                    const val = recordData[field.uniqid];
                    // Key สำหรับหา Config ย่อย
                    const configKey = `${field.uniqid}_${val}`;
                    // ถ้าเจอ Config ของ Sub-form ชุดนี้
                    if (this.nestedConfigs[configKey]) {
                        // สั่งเติมข้อมูลลงใน Container ย่อย
                        this._fillValues(this.nestedConfigs[configKey], container, recordData);
                    }
                }
            });
        }

        // =========================================================
        // 5. [Wizard Mode] Lock Key Fields: ล็อครหัสรายการ
        // =========================================================
        // ถ้าเป็นโหมด Wizard (รายการบังคับทำทีละข้อ) เราต้องห้ามแก้ไขรหัสรายการ
        if (this.allDataList.length > 1) {
            // DEBUG: กรณี code ทำงานไม่ถูกต้อง หาก เปิด comment นี้แล้วทำงานได้ แสดงว่าขาด config ให้ทดสอบกับรายงาน 'BLS'
            // let bot_code_items = ['bot_code_items', 'balance_sheet_item'];

            // รายชื่อ field ที่ต้องการล็อค (เช่น รหัสรายการ, รหัสงบดุล)
            // (หากต้องการเพิ่ม field อื่น เช่น balance_sheet_item ก็เพิ่มใน array นี้ได้)
            let bot_code_items = ['bot_code_items'];
            bot_code_items.forEach(name => {
                const el = this.formElement.querySelector(`[name="${name}"]`);
                if (el) {
                    // ใช้ CSS เพื่อล็อค (ดูเหมือน Read-only)
                    el.style.pointerEvents = 'none';
                    el.style.backgroundColor = '#e9ecef'; 
                }
            });
        }

    }

    /**
     * [Private] Helper Method: สำหรับเติมค่าลงใน Input/Select/Radio
     * หน้าที่: วนลูป Config และนำค่าจาก dataSource ไปใส่ใน Element ที่ตรงกันภายใน scope ที่กำหนด
     * param {Array} configList - รายการ Config ของฟิลด์ที่จะเติมค่า (Main config หรือ Sub config)
     * param {HTMLElement} scope - ขอบเขตที่จะค้นหา Element (เช่น this.formElement หรือ container ของ sub-form)
     * param {Object} dataSource - ข้อมูลที่จะนำมาใส่ (Record Data)
     */
    _fillValues(configList, scope, dataSource) {
        // Guard Clause: ถ้าไม่มีข้อมูลให้จบการทำงานทันที
        if (!dataSource) return;
        // เตรียม Master Data จาก Store เพื่อใช้ค้นหาคำอธิบาย (กรณีไม่มีใน dataSource)
        let storeState = {};
        if (window.opener && window.opener.store) {
            storeState = window.opener.store.getState();
        }

        // วนลูปทุก Field ใน Config ที่ส่งมา
        configList.forEach(field => {
            // ดึงค่าจาก dataSource โดยใช้ uniqid เป็น key
            const val = dataSource[field.uniqid];
            
            // =========================================================
            // CASE 1: Radio Button
            // =========================================================
            if (field.element === 'radio') {
                // ค้นหา Radio ที่มี name ตรงกับ uniqid และ value ตรงกับค่าใน data
                // (เช่น name="ipi" value="1")
                const radio = scope.querySelector(`input[name="${field.uniqid}"][value="${val}"]`);
                // ถ้าเจอ -> สั่งให้ติ๊กถูก (Checked)
                if (radio) radio.checked = true;
            } 
            // =========================================================
            // CASE 2: Select Dropdown (OPTIONAL)
            // =========================================================
            else if (field.element === 'select') {
                const select = scope.querySelector(`select[name="${field.uniqid}"]`);
                // ต้องมีทั้ง Element และมีค่า Value ถึงจะทำงาน
                if (select && val) {
                    select.value = val; // Set Value ให้ Dropdown
                    
                    // Set Description
                    const desInput = scope.querySelector(`input[name="${field.uniqid}_des"]`);
                    const desVal = dataSource[`${field.uniqid}_des`];
                    if (desInput && desVal) desInput.value = desVal;
                }
            }
            // =========================================================
            // CASE 3: Input (Text, Number, Date, Hidden)
            // =========================================================
            else { // Input
                const input = scope.querySelector(`input[name="${field.uniqid}"]`);
                // ตรวจสอบว่า Input มีอยู่จริง และค่าไม่เป็น undefined/null
                if (input && val !== undefined && val !== null) {
                    // ตรวจสอบ Format (ที่ฝากไว้ใน data-attribute ตอนสร้าง HTML)
                    const format = input.dataset.format;
                    if (format === 'integer' || format === 'numeric') {
                        // ถ้าเป็นตัวเลข -> เรียก Helper เพื่อใส่ลูกน้ำ/ทศนิยม
                        input.value = this._formatNumber(val.toString(), format);
                    } else {
                        // ถ้าเป็น Text ธรรมดา -> ใส่ค่าลงไปตรงๆ
                        input.value = val;

                        // =========================================================
                        // [NEW LOGIC] กรณีเป็น Autocomplete ให้เติม Title (Tooltip)
                        // =========================================================
                        if (input.dataset.autocomplete === "true") {
                            let desc = "";

                            // A. ลองหาจากข้อมูลที่ Save ไว้ก่อน (key_des)
                            if (dataSource[`${field.uniqid}_des`]) {
                                desc = dataSource[`${field.uniqid}_des`];
                            }
                            
                            // B. ถ้าไม่มี ให้ไปค้นหาจาก Master Data ใน Store
                            if (!desc && storeState) {
                                const masterList = storeState[field.uniqid] || (storeState.data && storeState.data[field.uniqid]);
                                if (Array.isArray(masterList)) {
                                    // ค้นหา item ที่ code ตรงกับ value
                                    const found = masterList.find(item => item.code == val);
                                    if (found) {
                                        desc = found.details;
                                    }
                                }
                            }

                            // DEBUG: ใช้สำหรับตรวจสอบคำ อธิบาย ของ code หากมี
                            // console.log(`[Auto-Match Init] ${field.uniqid} (${val}) -> ${desc}`);
                            // ถ้าเจอคำอธิบาย -> ใส่ใน Title และ Placeholder
                            if (desc) {
                                input.title = desc;                                
                                // หาและอัปเดต Hidden Field (_des) ด้วย
                                const descFieldName = `${field.uniqid}_des`;
                                const descInput = scope.querySelector(`input[name="${descFieldName}"]`);
                                if (descInput) {
                                    descInput.value = desc;
                                }
                            }
                        }

                        // 3. Lock ID Field logic
                        if (['autoID', 'id'].includes(field.uniqid) && input.type !== 'hidden') {
                            input.disabled = true;
                        }
                    }
                    
                    // Logic พิเศษ: ป้องกันการแก้ไข Primary Key (ID / AutoID)
                    // ถ้า Field นี้คือ ID และไม่ใช่ Hidden Type -> สั่ง Disable ห้ามแก้
                    if (['autoID', 'id'].includes(field.uniqid) && input.type !== 'hidden') {
                        input.disabled = true;
                    }
                }
            }
        });
    }

    /**
     * [Private] Event Handler เมื่อกดปุ่ม "บันทึก" (Save) ใน Popup
     * หน้าที่: เก็บข้อมูลจากฟอร์ม, Validate, และส่ง Action กลับไปอัปเดต Store ของหน้าหลัก
     * หมายเหตุ: ยังไม่มีการยิง API ไป Server ข้อมูลจะถูกเก็บใน State ชั่วคราว (Client-side)
     */
    _handleSave(e) {
        e.preventDefault(); 
        if (!window.opener || !window.opener.store) {
            alert('Error: ไม่สามารถเชื่อมต่อกับหน้าต่างหลักได้ (window.opener.store not found)');
            return;
        }
        const disabledInputs = this.formElement.querySelectorAll(':disabled');
        // ปลด redio disbles เพื่อตรวจสอบสถานะ form ก่อนบันทึก
        disabledInputs.forEach(input => input.disabled = false);
        const formData = new FormData(this.formElement);
        disabledInputs.forEach(input => input.disabled = true);

        const dataToSend = {};
        // (Logic _unformatNumber (ลบ comma) ยังคงใช้ได้กับ cả integer และ numeric)
        formData.forEach((value, key) => {
            const element = this.formElement.querySelector(`[name="${key}"]`);            
            if (element && (element.dataset.format === 'integer' || element.dataset.format === 'numeric')) {
                // 1. ลบ comma
                let unformattedValue = this._unformatNumber(value);                
                // 2. ถ้าเป็น 'integer' ให้ "ตัดทศนิยมทิ้ง"
                if (element.dataset.format === 'integer') {
                    // (เราต้อง parse เป็น float ก่อน แล้วค่อย trunc
                    const numericVal = parseFloat(unformattedValue);
                    if (!isNaN(numericVal)) {
                        unformattedValue = Math.trunc(numericVal).toString();
                    }
                }
                dataToSend[key] = unformattedValue;                
            } else {
                dataToSend[key] = value;
            }
        });        
        // DEBUG: ข้อมูลที่จะนำไปบันทึกลง State data
        console.log('[RenderPopupRow.js] Form data collected:', dataToSend);

        // =========================================================================
        // ตรวจสอบข้อมูลซ้ำ กรณีที่กำหนดไว้ว่า field ใดห้ามซ้ำ ("checkData"="true")
        // =========================================================================
        if (this.uniqueKeyConfigs.length > 0) {
            const allData = window.opener.store.getState().data;
            const duplicateItem = this._isDuplicate(allData, dataToSend); 
            if (duplicateItem) {
                const errorMsg = this._buildDuplicateErrorMessage(duplicateItem);
                this._showSuccessAlert(errorMsg, "error", 4000); 
                return;
            }
        }

        // =========================================================================
        // ตรวจสอบการเปลี่ยนแปลงของข้อมูล
        // =========================================================================
        const dataChanged = this._isDataChanged(dataToSend);
        // เช็คว่า Record นี้มี ID แล้วหรือยัง (เพื่อแยกแยะ Add/Edit ให้แม่นยำขึ้นใน Wizard Mode)
        if (this.isEditMode && !dataChanged) {
            this._showSuccessAlert("ไม่มีการเปลี่ยนแปลงข้อมูล", "error");
            return;
        }

        // =========================================================================
        // ตรวจสอบ Global Data ตามที่ต้องการ (Click Checkbox)
        // =========================================================================
        let isGlobalDataUpdated = false;
        this.formConfig.forEach(field => {
            const key = field.uniqid;
            // เงื่อนไขตามที่คุณกำหนด
            const isGlobal = (field.globalData === "true") || (key === 'fi_reporting_group_id') || (key === 'fi_report_group_id');

            if (isGlobal) {
                const value = dataToSend[key];
                // หา Checkbox ของ Field นี้
                const chkGlobal = this.formElement.querySelector(`#chk_global_${key}`);                
                // เงื่อนไข: มีค่า + (Checkbox ต้องไม่มี หรือ ถ้ามีต้องถูกติ๊ก)
                const isChecked = chkGlobal ? chkGlobal.checked : true; // ถ้าไม่มี checkbox ให้ถือว่า true (เผื่อเคสอื่น)
                // ถ้ามีการส่งค่าของ field เหล่านี้มา
                if (value && value !== '' && isChecked) {
                    // 1. ส่งค่าไปอัปเดต Store (เพื่อให้จำค่าสำหรับรายการถัดไป - Batch Logic)
                    window.opener.store.dispatch({
                        type: 'BATCH_UPDATE_KEY',
                        payload: {
                            key: key,
                            value: value,
                            desKey: `${key}_des`,
                            desValue: dataToSend[`${key}_des`] || '',
                            isGlobal: true
                        }
                    });                    
                    // 2. Mark ว่ามีการกระทำกับ Global Data
                    isGlobalDataUpdated = true; 
                }
            }
        });        

        // =========================================================================
        // ตรวจสอบข้อมูลทำรายการ 
        // 1.ทำรายการจากรายงานประเภทใด (typeForm เช่น 'row', 'group')
        // 2.Action การทำรายการ เพิ่มใหม่ หรือ แก้ไข
        // =========================================================================
        try {
            const newItem = { 
                ...this.currentRecord, 
                ...dataToSend, 
                _temp_saved: true 
            };
            this.allDataList[this.currentIndex] = newItem;
            this.currentRecord = newItem; // <--- สำคัญ!
            // 4. Dispatch Store
            const id = this.currentRecord.id || this.currentRecord.autoID;            
            // แปลง Flat Data -> Nested Array ก่อน Dispatch
            const finalDataToSend = this._transformToNested(dataToSend); 
            
            // DEBUG: ข้อมูลหลังกระจาย field จาก "_transformToNested"
            // console.log('[RenderPopupRow.js] Final Data to Dispatch:', finalDataToSend);

            if (this.isEditMode) {
                // --- 1. โหมด "Edit" ---             
                console.log('[RenderPopupRow.js] Dispatching EDIT_ITEM with id:', id);
                window.opener.store.dispatch({
                    type: 'EDIT_ITEM',
                    payload: { id: id, newData: finalDataToSend }
                });
                this._showSuccessAlert('บันทึกการแก้ไขเรียบร้อย');
                window.close();
            } else {
                // --- 2. โหมด "Add" ---
                console.log('[RenderPopupRow.js] Dispatching ADD_ITEM');
                window.opener.store.dispatch({
                    type: 'ADD_ITEM',
                    payload: finalDataToSend
                });
                // ============================================================
                // [NEW LOGIC] Auto Next (บันทึกแล้วไปต่อเลย)
                // ============================================================                
                if (this.allDataList.length > 1) {                    
                    // ถ้า "ยังไม่ใช่" หน้าสุดท้าย -> ไปหน้าถัดไป
                    if (this.currentIndex < this.allDataList.length - 1) {
                        this._showSuccessAlert('บันทึกแล้ว... กำลังไปรายการถัดไป', 'success', 0); // Alert สั้นๆ 0.8 วิ                    
                        // Delay นิดนึงเพื่อให้เห็น Alert แล้วค่อยเลื่อน
                        setTimeout(() => {
                            this._navigate(1); 
                        }, 0);                        
                    } else {
                        // ถ้าเป็นรายการสุดท้าย -> แจ้งเตือนและปิด Popup
                        this._showSuccessAlert('บันทึกรายการสุดท้ายเรียบร้อย! กำลังปิดหน้าต่าง...', 'success', 1500);
                        setTimeout(() => {
                            window.close();
                        }, 1200);
                        // window.close(); // (Optional: ถ้าอยากให้ปิดหน้าต่างเลยเมื่อครบ)
                    }
                } else {
                    // กรณีโหมดปกติ (Row เดียว)
                    // DEBUG: ตรวจสอบเข้าเงื่อนไข
                    // console.log('[RenderPopupRow.js] Add successful. Clearing form.');

                    // =========================================================
                    //  จำค่า Radio ก่อน Reset (Sticky Radio) ใช้กำหนด default radio sub-form
                    // =========================================================                        
                    // 1. "จำ": วนลูปหา Radio ทุกตัวที่ถูก Check อยู่
                    const stickyRadios = {};
                    const checkedRadios = this.formElement.querySelectorAll('input[type="radio"]:checked');
                    checkedRadios.forEach(radio => {
                        stickyRadios[radio.name] = radio.value;
                    });

                    this.currentRecord = {}; 
                    this.allDataList[this.currentIndex] = {};
                    // 2. (สำเร็จ: เคลียร์ฟอร์ม) "ล้าง": สั่ง Reset Form (ค่า Text/Number จะหายหมด)
                    this.formElement.reset();

                    // =========================================================
                    // ใช้สำหรับรายงานประเภทที่มี Sub-form : ล้าง HTML ของรายการย่อยทิ้ง (ป้องกันแถวงอกเพิ่ม)
                    // =========================================================
                    // 1. ล้าง Container ของพวกปุ่มเพิ่มรายการ (Button Type) เช่น Loan Type Info
                    this.formConfig.forEach(field => {
                        if (field.typeInput === 'button') {
                            const container = this.formElement.querySelector(`#container_${field.uniqid}`);
                            if (container) {
                                container.innerHTML = ''; // <--- ลบแถวเก่าทิ้งให้หมด
                            }
                        }
                    });

                    // 2. ล้าง Dynamic Form Container (ของพวก Radio/Select Sub-form)
                    const dynamicFormContainer = this.formElement.querySelector('#dynamic-form-container');
                    if (dynamicFormContainer) {
                        dynamicFormContainer.innerHTML = '';
                        dynamicFormContainer.style.display = 'none';
                    }

                    // 3. "คืน": เอาค่าที่จำไว้กลับมาใส่ และสั่งวาด Sub-form ใหม่
                    Object.keys(stickyRadios).forEach(name => {
                        const val = stickyRadios[name];
                        const radioToRestore = this.formElement.querySelector(`input[name="${name}"][value="${val}"]`);
                        
                        if (radioToRestore) {
                            // 3.1 ติ๊กถูกกลับไป
                            radioToRestore.checked = true;
                            
                            // 3.2 สั่งวาด Dynamic Form (Sub-form) ของตัวเลือกนั้นทันที
                            // (เพื่อให้ช่องกรอกที่ซ่อนอยู่ เด้งกลับมา)
                            this._renderDynamicForm(name, val);
                        }
                    });

                    // 4. Trigger Select และแจ้งเตือน
                    this._triggerAllSelects();
                    this._showSuccessAlert('เพิ่มข้อมูลสำเร็จ! (กรอกต่อได้)');
                    // เพื่อดึงค่า Global ที่เพิ่ง Save ตะกี้ กลับมาใส่เป็น Default ให้รายการถัดไป
                    this._populateForm({});                    
                }
                this._updateStatusUI();
            }            
        } catch (err) {
            console.error('Failed to dispatch to opener.store:', err);
            this._showSuccessAlert(`เกิดข้อผิดพลาด: ${err.message}`, 'error');
            // alert('เกิดข้อผิดพลาดในการส่งข้อมูลกลับหน้าหลัก');            
        }        
    }
    
    // ===========================================
    // ฟังก์ชัน Helper (Format/Unformat/Select)
    // ===========================================
    _buildDuplicateErrorMessage(duplicateItem) {
        // (อ่านจาก 'this.uniqueKeyConfigs')
        const parts = this.uniqueKeyConfigs.map(config => {
            const label = config.label;
            const value = duplicateItem[config.key];
            return `${label}: "${value}"`;
        });
        return `ข้อมูลซ้ำ: ${parts.join(', ')}`;
    }

    /**
     * ตรวจสอบว่ามี "Key คู่" ซ้ำใน Store หรือไม่
     */
    _isDuplicate(allData, currentItem) {
        // (อ่านจาก 'this.uniqueKeyConfigs')
        if (this.uniqueKeyConfigs.length === 0) {
            return false;
        }
        // เพราะในโหมด Wizard ข้อมูลปัจจุบันอยู่ที่ currentRecord
        const currentRecord = this.currentRecord || {};
        const currentId = currentRecord.id || currentRecord.autoID;

        const duplicate = allData.find(item => {
            const itemId = item.id || item.autoID;
            
            // ถ้ามี ID และ ID ตรงกับตัวที่กำลังทำอยู่ (Self) ให้ข้ามไป (ไม่ถือว่าซ้ำ)
            if (currentId && itemId == currentId) {
                return false;
            }

            if (item._status === 'deleted') {
                return false;
            }

            // (อ่านจาก 'this.uniqueKeyConfigs')
            return this.uniqueKeyConfigs.every(config => {
                const key = config.key;
                const itemValue = (item[key] === null || item[key] === undefined) ? "" : item[key].toString();
                const currentValue = (currentItem[key] === null || currentItem[key] === undefined) ? "" : currentItem[key].toString();
                return itemValue == currentValue;
            });
        });

        return duplicate || false; // (คืนค่า Object หรือ false)
    }

    /**
     * (private) เปรียบเทียบข้อมูลเดิม (this.currentRecord) กับข้อมูลใหม่ (newData)
     */
    _isDataChanged(newData) {
        const originalDataNested = this.currentRecord || {};
        const originalDataFlat = this._flattenDataForUI(originalDataNested);

        if (!originalDataNested) return true;

        // Loop 1: Compare Values
        for (const key in newData) {
            if (key === 'id' || key === 'autoID') continue;

            let newVal = newData[key];
            let oldVal = originalDataFlat[key];

            // Normalize Null/Undefined
            if (newVal === null || newVal === undefined) newVal = "";
            if (oldVal === null || oldVal === undefined) oldVal = "";

            // 1. สร้างตัวแปรชั่วคราวที่ลบลูกน้ำออก (เพื่อใช้เช็คตัวเลขเท่านั้น)
            const cleanNew = newVal.replace(/,/g, '');
            const cleanOld = oldVal.replace(/,/g, '');

            const isNumeric = (n) => !isNaN(parseFloat(n)) && isFinite(n) && n !== '';

            // 2. เช็คว่าเป็นตัวเลขหรือไม่ (โดยใช้ค่าที่ลบลูกน้ำแล้ว)
            if (isNumeric(cleanNew) && isNumeric(cleanOld)) {
                // 3. เทียบค่าแบบ Float
                // Math.abs(...) < 0.000001 คือการเทียบ float ที่ปลอดภัยกว่า === แต่งานทั่วไปใช้ === ก็พอได้
                if (parseFloat(cleanNew) === parseFloat(cleanOld)) {
                    continue; // ถ้าค่าเท่ากันทางคณิตศาสตร์ ถือว่าไม่เปลี่ยน
                }
            }         

            // ==============================================================================
            // แก้ปัญหา Phantom Change (บันทึกได้ทั้งที่ไม่ได้แก้)
            // ถ้า Field ที่เปลี่ยนเป็นแค่ Description (_des) ให้เช็คว่า "รหัสหลัก" เปลี่ยนไหม?
            // ถ้า "รหัสหลัก" ไม่เปลี่ยน -> ให้ข้าม Description นี้ไปเลย (ถือว่าไม่ได้แก้)
            // ==============================================================================
            if (key.endsWith('_des')) {
                const mainKey = key.replace('_des', ''); // หาชื่อ field หลัก เช่น ip_ar_relationship_type_1
                
                // ต้องมั่นใจว่าใน newData มี field หลักส่งมาด้วย
                if (newData.hasOwnProperty(mainKey)) {
                    let newMain = newData[mainKey] || "";
                    let oldMain = originalDataFlat[mainKey] || "";
                    
                    // Normalize ค่าหลัก
                    newMain = newMain.toString().trim();
                    oldMain = oldMain.toString().trim();
                    
                    // ถ้ารหัสหลัก "เหมือนเดิม" แสดงว่า Description ที่เปลี่ยนไป เป็นแค่การ Auto-fill ของระบบ
                    if (newMain === oldMain) {
                        continue; // ข้ามไป ไม่นับว่าเป็นการเปลี่ยนแปลง
                    }
                }
            }
            // เปรียบเทียบค่าจริง
            if (newVal !== oldVal) {
                console.log(`Changed: ${key} | Old: "${oldVal}" vs New: "${newVal}"`);
                return true;
            }
        }

        // Loop 2: Check Deletion (Logic เดิม)
        for (const key in originalDataFlat) {
            if (/_[\d]+$/.test(key) && !key.endsWith('_des')) {
                 if (!newData.hasOwnProperty(key)) {
                     return true;
                 }
            }
        }
        return false;
    }

    _showSuccessAlert(message, type = 'success', duration = 1500) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        if (type === 'error') {
            toast.classList.add('error');
        }
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration); // <-- ใช้ 'duration'
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, duration + 400); 
    }

    _attachFormatListeners() {
        const numberInputs = this.formElement.querySelectorAll('[data-format="integer"], [data-format="numeric"]');
        numberInputs.forEach(input => {
            input.addEventListener('focus', (e) => this._onNumberFocus(e));
            input.addEventListener('blur', (e) => this._onNumberBlur(e));
        });
    }

    /**
     * ผูก Event 'onchange' ให้ <select>
     * - ใช้ cloneNode เพื่อแก้ปัญหา Maximum call stack size exceeded
     * - เพิ่มการเรียก _onSelectChange ทันที เพื่อให้คำอธิบาย (Description) มาครบตั้งแต่เริ่ม
     */
    _attachSelectListeners(scope) {
        // ถ้าไม่ส่ง scope มา ให้ใช้ formElement หลัก
        const targetScope = scope || this.formElement;
        const selectElements = targetScope.querySelectorAll('select');        
        selectElements.forEach(selectEl => {
            // 1. Clone Element เพื่อล้าง Event Listeners เก่าที่อาจค้างอยู่
            const newSelect = selectEl.cloneNode(true);            
            // 2. นำตัวใหม่ไปแทนที่ตัวเก่าใน DOM
            selectEl.parentNode.replaceChild(newSelect, selectEl);            
            // 3. ผูก Event Listener ใหม่
            newSelect.addEventListener('change', (e) => this._onSelectChange(e));            
            // 4. [สำคัญ] สั่งรัน Logic 1 ครั้งทันทีกับ Element ตัวใหม่
            // เพื่อดึงค่า data-details จาก option ที่ selected มาใส่ใน hidden field
            this._onSelectChange({ target: newSelect });
        });
    }

    /**
     * ใช้สำหรับเปลี่ยน input Date ให้รองรับ datepicker jquery
     */
    _attachDatepickerListeners() {
        console.log('[RenderPopupRow.js] Attaching jQuery Datepickers...');
        
        // 1. ค้นหา input ทั้งหมดที่ถูกแท็กว่าเป็น 'date'
        const dateInputs = this.formElement.querySelectorAll('[data-type-data="date"]');
        
        dateInputs.forEach(input => {
            // 2. ใช้ jQuery $(input) เพื่อเรียก .datepicker()
            try {
                $(input).datepicker({
                    showOn: 'button',
                    buttonImage: '../thcap/images/calendar.gif', // (ตามโค้ดของคุณ)
                    buttonImageOnly: true,
                    changeMonth: true,
                    changeYear: true,
                    dateFormat: 'yy-mm-dd' // (y สองตัว = YYYY, m สองตัว = MM)
                });
                console.log(`[RenderPopupRow.js] Datepicker attached to #${input.id}`);
            } catch (e) {
                console.error(`[RenderPopupRow.js] Failed to attach datepicker to #${input.id}. Is jQuery UI loaded?`, e);
                // (ถ้า jQuery ล้มเหลว ให้ใช้ Placeholder)
                input.placeholder = "YYYY-MM-DD";
            }
        });
    }

    /**
     * ผูก jQuery Autocomplete แบบ Hybrid (Local State + Remote API)
     * 1. เช็คว่ามีข้อมูล Master Data ใน State หรือไม่ (ตามชื่อ uniqid)
     * 2. ถ้ามี -> ใช้ค้นหาในเครื่อง (Local Search)
     * 3. ถ้าไม่มี -> ยิง Ajax ไปที่ Server (Remote Search)
     */
    _attachAutocompleteListeners(scope) {
        // 1. ตัวแปรเก็บ Context ของ Class ไว้เรียกใช้ function ภายในรูป
        const self = this;

        var $scope = $(scope || this.formElement);
        var inputs = $scope.find('[data-autocomplete="true"]');

        var storeState = {};
        if (window.opener && window.opener.store) {
            storeState = window.opener.store.getState();
        }

        var config = storeState || {};
        var autoCompleteConfig = config.auto_complete || {}; 
        var ajaxData = { criteria: "Default" }; 
        var rawData = autoCompleteConfig.data;

        // --- [NEW] Helper Function สำหรับแกะเลขที่สัญญาเก่า ---
        // รับข้อความ (Label หรือ Details) แล้วคืนค่า Value ที่ควรจะเป็น
        var extractContractID = function(fullString, defaultValue) {
            fullString = String(fullString || "");
            // Regex หา pattern #(xxx/xxxx) เช่น #(187/2553)
            var match = fullString.match(/#\((.*?)\)/);
            if (match && match[1]) {
                return match[1]; // คืนค่า 187/2553
            }
            return defaultValue; // ถ้าไม่มี ให้คืนค่าเดิม
        };


        if (rawData) {
            if (typeof rawData === 'object') {
                ajaxData = $.extend({}, ajaxData, rawData);
            } else if (typeof rawData === 'string' && rawData !== "") {
                try { 
                    var parsed = JSON.parse(rawData);
                    ajaxData = $.extend({}, ajaxData, parsed);
                } catch(e) {}
            }
        }

        inputs.each(function() {
            var input = this;
            var $input = $(this);
            
            // ป้องกันการ Init ซ้ำ
            if ($input.data('ac-init')) return;
            $input.data('ac-init', true);

            var fieldKey = input.id;
            var localData = storeState[fieldKey] || (storeState.data && storeState.data[fieldKey]);
            var isServerConfigMatch = (autoCompleteConfig.uniqueid && fieldKey === autoCompleteConfig.uniqueid);
            var sourceFn = null; 

            // 1. Prepare Source
            if (isServerConfigMatch) {
                sourceFn = function(request, response) {
                    var targetUrl = autoCompleteConfig.url;
                    if (!targetUrl) { response([]); return; }
                    $.ajax({
                        url: targetUrl,
                        type: autoCompleteConfig.type || "GET",
                        dataType: autoCompleteConfig.dataType || "json",
                        data: $.extend({}, ajaxData, { term: request.term }),
                        success: function(data) { 
                             var mappedData = $.map(data, function(item) {
                                // เช็คว่ามีสัญญาเก่าหรือไม่จาก label
                                var realValue = extractContractID(item.label, item.value);
                                // ใช้ $.extend เพื่อเก็บข้อมูลทุกอย่างที่ Server-side ส่งมาไว้                                
                                var newItem = $.extend({}, item); 
                                // คงตัวแปรเบื้องต้นไว้
                                newItem.label = item.label; 
                                newItem.value = realValue; 
                                newItem.details = item.label;                                                                         
                                return newItem; // คืนค่า Object ที่มีข้อมูลครบถ้วน
                            });
                            response(mappedData); 
                        },
                        error: function() { response([]); }
                    });
                };
            }
            else if (localData && $.isArray(localData) && localData.length > 0) {
                sourceFn = function(request, response) {
                    var term = request.term.toLowerCase();
                    var results = [];
                    for (var i = 0; i < localData.length; i++) {
                        var item = localData[i];
                        var code = String(item.code || '').toLowerCase();
                        var details = String(item.details || '').toLowerCase();
                        if (code.indexOf(term) > -1 || details.indexOf(term) > -1) {
                            results.push({
                                label: item.code + ' : ' + item.details,
                                value: item.code,
                                details: item.details
                            });
                        }
                        if (results.length >= 50) break;
                    }
                    response(results);
                };
            }

            // 2. Logic ฟังก์ชันตรวจสอบข้อมูล (แยกออกมาเพื่อเรียกใช้ได้ทั้งใน change และ blur)
            var performAutoMatch = function() {
                var val = $.trim($input.val());
                var descName = input.name + '_des';
                var $descField = $scope.find('input[name="' + descName + '"]');

                // Case: ลบค่าทิ้ง -> ล้าง Description
                if (val === "") {
                    if ($descField.length > 0 && $descField.val() !== "") {
                        $descField.val("").trigger('change');
                        $input.trigger('change');
                    }
                    $input.attr('title', "");
                    return;
                }

                // ค้นหาใน Local Data (Manual Search)
                var foundItem = null;
                if (localData && $.isArray(localData)) {
                    for (var i = 0; i < localData.length; i++) {
                        // เปรียบเทียบแบบ String Exact Match
                        if (String(localData[i].code) === val) {
                            foundItem = localData[i];
                            break;
                        }
                    }
                }

                if (foundItem) {
                    var details = foundItem.details || '';
                    // console.log("[Auto-Match] Found:", details); // Debug
                    $input.attr('title', details);
                    
                    if ($descField.length > 0) {
                        // Optimization: ถ้าค่าเหมือนเดิม ไม่ต้อง Trigger (ป้องกัน Loop)
                        if($descField.val() !== details){
                           // อัปเดตค่า Hidden Field
                            $descField.val(details); 
                            // Trigger เพื่อความชัวร์ (แม้ FormData จะอ่าน value โดยตรงก็ตาม)
                            $descField.trigger('change');
                            $input.trigger('change');
                        }                                                
                    }
                } else {
                    // console.warn("[Auto-Match] Not Found:", val);
                    // ถ้าไม่เจอ -> ล้างค่า Description ทิ้ง
                    if ($descField.length > 0) {
                        // ล้างค่าเมื่อไม่เจอ (ตาม Logic เดิม)
                        // แต่เพิ่ม Check ว่าถ้าค่าเดิมมันว่างอยู่แล้ว ก็ไม่ต้องทำอะไร
                        if ($descField.val() !== "") {
                            $descField.val(""); 
                            $descField.trigger('change');
                            $input.trigger('change');
                        }
                    }
                }
            };

            // 3. Init Autocomplete
            if (typeof sourceFn === 'function') {
                $input.autocomplete({
                    minLength: 1,
                    source: sourceFn,
                    select: function(event, ui) {
                        var details = ui.item.details || ui.item.label || '';
                        $input.attr('title', details);
                        var descName = input.name + '_des';
                        var $descField = $scope.find('input[name="' + descName + '"]');
                        if ($descField.length > 0) {
                            $descField.val(details);
                            $descField.trigger('change');
                        }

                        // ================================================================                         
                        // ถ้าเป็น Local Search (เช่น Lending Business Type) จะไม่เข้าเงื่อนไขนี้
                        // ================================================================
                        if (isServerConfigMatch) {
                            $scope.find('input, select, textarea').each(function() {
                                var $el = $(this);
                                var elName = $el.attr('name');
                                var excludeNames = [
                                    input.name, input.name + '_des', 
                                    'id', 'autoID', 'bot_code_items', 'bot_code_items_des', '_status'
                                ]; 
                                
                                if (elName && $.inArray(elName, excludeNames) === -1) {
                                    var type = $el.attr('type');
                                    var tagName = this.tagName.toLowerCase();
                                    var hasChanged = false;

                                    if (type === 'radio' || type === 'checkbox') {
                                        // คืนค่า Default ของ Radio/Checkbox
                                        if (this.checked !== this.defaultChecked) {
                                            this.checked = this.defaultChecked;
                                            hasChanged = true;
                                        }
                                    } else if (tagName === 'select') {
                                        // คืนค่า Default ของ Dropdown Select
                                        var defaultVal = "";
                                        var $options = $el.find('option');
                                        
                                        // ดึงค่าจาก Option ตัวที่มี attribute 'selected' ซ่อนอยู่
                                        $options.each(function() {
                                            if (this.defaultSelected) { 
                                                defaultVal = this.value;
                                                return false; // break loop
                                            }
                                        });
                                        
                                        // ถ้าไม่ได้ระบุ selected ไว้เลย ให้ใช้ Option ตัวแรกสุด (เช่น --กรุณาเลือก--)
                                        if (defaultVal === "" && $options.length > 0) {
                                            defaultVal = $options.eq(0).val();
                                        }

                                        if ($el.val() !== defaultVal) {
                                            $el.val(defaultVal); 
                                            hasChanged = true;
                                        }
                                    } else {
                                        // คืนค่า Default ของ Text, Hidden, Textarea
                                        var defaultVal = this.defaultValue || "";
                                        if ($el.val() !== defaultVal) {
                                            $el.val(defaultVal); 
                                            hasChanged = true;
                                        }
                                    }
                                    
                                    if (hasChanged) $el.trigger('change');
                                }
                            });


                            // =========================================================
                            // --- 2. Data Mapper Router From Data System ---
                            // =========================================================
                            for (var key in ui.item) {
                                if (!ui.item.hasOwnProperty(key)) continue;
                                if (key === 'label' || key === 'value' || key === 'details') continue;

                                var val = ui.item[key];
                                if (val === null || val === undefined) continue;

                                // [LOGIC]: ถ้ารับค่ามาเป็น "Array" แปลว่าเป็น Group Data
                                if ($.isArray(val)) {
                                    // console.log("---------------------------------------------------");
                                    // console.log("[DEBUG Router] ตรวจพบข้อมูลกลุ่ม (Array) ที่ Key: " + key);
                                    
                                    // หาปุ่ม "เพิ่มรายการ" ที่มี ID ตรงกับ Key นี้
                                    var btnAdd = $scope.find('#' + key + '.dynamic-add-btn');
                                    
                                    if (btnAdd.length > 0) {
                                        var container = $scope.find('#container_' + key);
                                        var $currentRows = container.find('.dynamic-sub-row');
                                        var targetRowCount = val.length;
                                        
                                        // [SYNC DATA 1]: ถ้าหน้าจอมีแถว "เกิน" ข้อมูลที่ได้รับ -> ลบทิ้งจากด้านล่าง (ข้อมูลก่อนหน้า)
                                        // (เช่น ถ้า UI มี 1 แถว แต่ Array มา 0 แถว -> มันจะ remove แถวที่ 1 ทิ้งจนเหลือ 0 ทันที)
                                        if ($currentRows.length > targetRowCount) {
                                            $currentRows.slice(targetRowCount).remove();
                                            console.log('[DEBUG Router] ลบแถวส่วนเกินของ ' + key + ' ทิ้ง ' + ($currentRows.length - targetRowCount) + ' แถว');
                                        }

                                        // [SYNC DATA 2]: ถ้าหน้าจอมีแถว "ขาด" -> กดปุ่มสร้างเพิ่ม
                                        while (container.find('.dynamic-sub-row').length < targetRowCount) {
                                            self._handleAddSubFormRow(btnAdd[0]);
                                            console.log('[DEBUG Router] สร้างแถวเพิ่มสำหรับ ' + key);
                                        }

                                        // [SYNC DATA 3]: หยอดข้อมูลลงแถวที่เตรียมไว้พอดีแล้ว
                                        // วนลูปตามจำนวน Object ที่อยู่ใน Array
                                        for (var i = 0; i < val.length; i++) {
                                            var itemObj = val[i];
                                            // นับว่าต้องสร้างแถวที่เท่าไหร่
                                            var rowIndex = i + 1;
                                            
                                            // console.log('[DEBUG Router] สั่งสร้างแถวที่ ' + rowIndex + ' สำหรับกลุ่ม ' + key);
                                            // self._handleAddSubFormRow(btnAdd[0]);
                                            
                                            // วนลูปข้อมูลใน Object เพื่อหยอดใส่ Input ย่อย (_1, _2)
                                            for (var subKey in itemObj) {
                                                if (!itemObj.hasOwnProperty(subKey)) continue;
                                                if (subKey.indexOf('_des') !== -1) continue;

                                                var subVal = itemObj[subKey];
                                                // สร้างชื่อเป้าหมาย เช่น primary_involved_party_id_1
                                                var targetInputName = subKey + '_' + rowIndex; 
                                                // ค้นหา attribute name sub-input
                                                var targetSubEl = $scope.find('[name="' + targetInputName + '"]');
                                                
                                                if (targetSubEl.length > 0) {
                                                    var tagName = targetSubEl[0].tagName.toLowerCase();
                                                    var inputType = targetSubEl.attr('type');

                                                    if (targetSubEl.attr('data-format') === 'numeric' || targetSubEl.attr('data-format') === 'integer') {
                                                        subVal = self._formatNumber(subVal.toString(), targetSubEl.attr('data-format'));
                                                    }                                                
                                                    // สั่งใส่ค่าและ Trigger (ครอบคลุมทั้ง Text และ Select)
                                                    targetSubEl.val(subVal).trigger('change');
                                                    if (tagName === 'select') {
                                                        targetSubEl.val(subVal).trigger('change');
                                                    } else if (tagName === 'input' && (inputType === 'radio' || inputType === 'checkbox')) {
                                                        var targetRadio = $scope.find('input[name="' + targetInputName + '"][value="' + subVal + '"]');
                                                        if (targetRadio.length > 0) targetRadio.attr('checked', true).trigger('change');
                                                    } else {
                                                        targetSubEl.val(subVal).trigger('change');
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        console.warn("[DEBUG Router] หาปุ่มแม่ id='" + key + "' ไม่เจอในหน้าฟอร์ม!");
                                    }
                                    // console.log("---------------------------------------------------");
                                    continue; // ทำ Array เสร็จแล้ว ให้ข้ามไป Key ถัดไป
                                }

                                // [LOGIC]: สำหรับข้อมูลแบบธรรมดา (Flat Data)
                                var targetEl = $scope.find('[name="' + key + '"]');
                                if (targetEl.length > 0) {
                                    var tagName = targetEl[0].tagName.toLowerCase();
                                    var inputType = targetEl.attr('type');

                                    if (tagName === 'input' && (inputType === 'text' || inputType === 'hidden' || !inputType)) {
                                        if (targetEl.attr('data-format') === 'numeric' || targetEl.attr('data-format') === 'integer') {
                                            val = self._formatNumber(val.toString(), targetEl.attr('data-format'));
                                        }
                                        targetEl.val(val).trigger('change'); 
                                    } else if (tagName === 'select') {
                                        targetEl.val(val).trigger('change'); 
                                    } else if (inputType === 'radio' || inputType === 'checkbox') {
                                        var targetRadio = $scope.find('input[name="' + key + '"][value="' + val + '"]');
                                        if (targetRadio.length > 0) targetRadio.attr('checked', true).trigger('change'); 
                                    }
                                }
                            }
                        } else {
                            // =========================================================
                            // ถ้าเป็น Local Search ให้จบการทำงานแค่นี้ ไม่ต้อง Reset Default ช่องอื่นๆ
                            // =========================================================
                            console.log("[Local Auto-Fill] Updated field: " + input.name);
                        }
                    },
                    change: function(event, ui) {
                        // ใช้เป็น Backup Logic (กรณี Blur พลาด)
                        if (!ui.item) performAutoMatch();
                    }
                });

                // [สำคัญมาก] ผูก Event 'blur' แยกต่างหาก เพื่อให้ทำงานทันทีที่เมาส์ออกจากช่อง (ก่อนกด Save)
                $input.bind('blur', function() {
                    performAutoMatch();
                });
                
                // [สำคัญมาก] ผูก Event 'keyup' (Enter) เผื่อคนกด Enter เพื่อ Submit Form เลย
                $input.bind('keyup', function(e) {
                    if (e.which == 13) performAutoMatch();
                });
            }
        });
    }

    /**
     * Helper เพื่อสั่งรัน onSelectChange ให้ <select> ทุกตัว
     * (จำเป็นหลัง 'reset()' ฟอร์ม)
     */
    _triggerAllSelects() {
        console.log('[RenderPopupRow.js] Triggering select sync after reset...');
        const selectElements = this.formElement.querySelectorAll('select');
        selectElements.forEach(selectEl => {
            this._onSelectChange({ target: selectEl });
        });
    }

    /**
     * เมื่อ <select> ถูกเปลี่ยน
     */
    _onSelectChange(e) {
        const selectElement = e.target;
        
        // 1. หา <option> ที่ถูกเลือก
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        
        // (ป้องกัน Error ถ้า -- Please select -- ถูกเลือก)
        if (!selectedOption || selectedOption.value === "") {
            // ถ้าเลือก "-- Please select --" ให้ล้างค่า 'des'
            const descFieldName = `${selectElement.name}_des`;
            const descField = this.formElement.querySelector(`[name="${descFieldName}"]`);
            if(descField) {
                descField.value = "";
            }
            if (selectElement.classList.contains('dynamic-select-trigger')) {
                if (selectElement.id === 'involved_party_type') {
                    const radios = this.formElement.querySelectorAll('input[name="radio_form"]');
                    // radios.forEach(r => r.checked = false);
                    radios.forEach(r => {
                         r.checked = false;
                         r.disabled = false; // Un-lock
                     });
                 }
                this._renderDynamicForm(selectElement.name, ""); 
             }
            return;
        }

        // 2. อ่าน 'data-details' ที่เราซ่อนไว้
        const details = selectedOption.dataset.details || '';
        // 3. หา <input type="hidden"> ที่พ่วงกัน (e.g., "lending_arr_type_des")
        // const descFieldName = `${selectElement.name}_des`;
        // const descField = this.formElement.querySelector(`[name="${descFieldName}"]`);
        const descField = this.formElement.querySelector(`[name="${selectElement.name}_des"]`);
        if (descField && details !== undefined) {
            descField.value = details;
        }

        // 4. ตั้งค่า
        if (descField) {
            console.log(`[RenderPopupRow.js] Setting ${descField} = "${details}"`);
            descField.value = details;
        } else {
            console.warn(`[RenderPopupRow.js] Could not find hidden field: ${descField}`);
        }

        // =================================================================
        // [NEW] Logic: Dropdown (Involved Party) -> Trigger Radio (IPI)
        // =================================================================
        // ตรวจสอบว่ามี popup_model ส่งมาหรือไม่ (เช่น "individual_details")
        const popupModel = selectedOption.dataset.popupModel;         

        // console.log("1. Selected Option Model:", popupModel); // เช็คว่าค่ามาไหม?
        if (popupModel && selectElement.id === 'involved_party_type') {
            const ipiConfig = this.formConfig.find(f => f.uniqid === 'radio_form');
            // console.log("2. IPI Config Found:", ipiConfig); // เช็คว่าหา Config ipi เจอไหม?

            let targetRadioValue = null;

            if (ipiConfig && ipiConfig.xsd_rules) {
                // ลอง Log ดูว่า rule ทั้งหมดมีอะไรบ้าง
                // console.log("3. Available Rules:", ipiConfig.xsd_rules);

                const rule = ipiConfig.xsd_rules.find(r => r.target_group === popupModel);
                // console.log("4. Matched Rule:", rule); // เช็คว่าจับคู่เจอไหม?

                if (rule && rule.condition_values) {
                    targetRadioValue = rule.condition_values[0]; 
                    // console.log("5. Target Radio Value:", targetRadioValue); // ได้เลข 1 หรือ 2 ไหม?
                }
            }

            if (targetRadioValue) {
                const radioToClick = this.formElement.querySelector(`input[name="radio_form"][value="${targetRadioValue}"]`);
                // console.log("6. Radio Element:", radioToClick); // หา Element Radio เจอไหม?
                
                if (radioToClick) {
                    radioToClick.checked = true;
                    // เรียก Render ตรงๆ
                    // console.log("7. Calling _renderDynamicForm...");
                    this._renderDynamicForm(ipiConfig.uniqid, targetRadioValue); 
                    return;
                }
            } else {
                console.warn("!! Mapping Failed: ไม่พบ Rule ที่ตรงกับ " + popupModel);
            }
        }

        // if (selectElement.classList.contains('dynamic-select-trigger')) {
        //     // เรียกใช้ฟังก์ชันเดียวกับ Radio Button ได้เลย เพราะ Logic เหมือนกัน
        //     // (ส่ง name และ value ไปดึง config จาก this.nestedConfigs)
        //     this._renderDynamicForm(selectElement.name, selectElement.value);
        // }
    }

    _onNumberFocus(e) { e.target.value = this._unformatNumber(e.target.value); }
     /**
     * เมื่อคลิกออกจากช่องตัวเลข
     */
    _onNumberBlur(e) {
         // 1. อ่าน 'data-format' (integer หรือ numeric)
         const formatType = e.target.dataset.format;
         // 2. ส่ง formatType ไปให้ฟังก์ชัน
         e.target.value = this._formatNumber(e.target.value, formatType);
    }
    /**
     * ฟังก์ชันฟอร์แมตตัวเลข (รองรับ integer และ numeric)
     */
    _formatNumber(value, formatType = 'numeric') { // (default เป็น numeric ถ้าไม่ระบุ)
        const cleanedValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
        if (isNaN(cleanedValue)) {
            return '';
        }
        let options = {};
        let valueToFormat = cleanedValue;
        // 1. ถ้าเป็น 'integer' (จำนวนเต็ม)
        if (formatType === 'integer') {
            // "ตัด" ทศนิยมทิ้ง (e.g., 123.7 -> 123)
            valueToFormat = Math.trunc(cleanedValue); 
            options = {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            };
        } else {
            // 3. ถ้าเป็น 'numeric' (ทศนิยม 2 ตำแหน่ง)
            valueToFormat = cleanedValue; // (ไม่ต้องตัด)
            options = {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            };
        }
        // 3. ฟอร์แมต (ใส่ comma)
        return new Intl.NumberFormat('en-US', options).format(valueToFormat);
    }
    _unformatNumber(value) { return value.replace(/,/g, ''); }

    /**
     * ฟังก์ชันเปลี่ยนหน้า (Record Navigation)
     * param {number} step - จำนวนที่เลื่อน (+1 หรือ -1)
     */
    _navigate(step) {
        // 1. Save Current to Memory
        const formData = new FormData(this.formElement);
        const tempObj = { ...this.currentRecord };
        
        formData.forEach((value, key) => {
            // Unformat Number Logic
            const element = this.formElement.querySelector(`[name="${key}"]`);
            if (element && (element.dataset.format === 'integer' || element.dataset.format === 'numeric')) {
                 let unformatted = this._unformatNumber(value);
                 if (element.dataset.format === 'integer') {
                    const parsed = parseFloat(unformatted);
                    if(!isNaN(parsed)) unformatted = Math.trunc(parsed).toString();
                 }
                 tempObj[key] = unformatted;
            } else {
                 tempObj[key] = value;
            }
            // Keep _des
             if (element && element.tagName === 'SELECT') {
                const desKey = key + '_des';
                const hiddenDes = this.formElement.querySelector(`[name="${desKey}"]`);
                if(hiddenDes) tempObj[desKey] = hiddenDes.value;
             }
        });

        this.allDataList[this.currentIndex] = tempObj;

        // 2. Change Index
        const newIndex = this.currentIndex + step;
        if (newIndex < 0 || newIndex >= this.allDataList.length) return;
        
        this.currentIndex = newIndex;
        this.currentRecord = this.allDataList[this.currentIndex];
        if (!this.currentRecord) this.currentRecord = {};

        // 3. Reset & Re-populate
        this.formElement.reset();
        const dynamicContainer = this.formElement.querySelector('#dynamic-form-container');
        if(dynamicContainer) {
            dynamicContainer.innerHTML = '';
            dynamicContainer.style.display = 'none';
        }

        // เคลีย form กลับเป็นค่า default
        this.formConfig.forEach(field => {
            if (field.typeInput === 'button') {
                const container = this.formElement.querySelector(`#container_${field.uniqid}`);
                if (container) {
                    container.innerHTML = '';
                }
            }
        });

        this._populateForm(this.currentRecord);
        // this._updateNavigationUI();
        this._updateStatusUI();
    
    }

    // method helper show list items formType group
    _updateStatusUI() {
        const statusEl = this.formElement.querySelector('#status-indicator');
        if (!statusEl) return;

        let currentFormType = 'row';
        if (window.opener && window.opener.store) {
            const state = window.opener.store.getState();
            currentFormType = state.formType;
        }

        const isWizardMode = (currentFormType === 'group') && (this.allDataList && this.allDataList.length > 1);

        console.log("dataList", this.allDataList);
        // เช็คว่าเป็นโหมด Wizard หรือไม่
        if (isWizardMode) {
            statusEl.style.display = 'block';
            
            const total = this.allDataList.length;

            console.log(this.allDataList)
            
            // [FIXED LOGIC] การนับรายการที่เสร็จแล้ว
            const completedCount = this.allDataList.filter(d => {
                // 1. มี ID (มาจาก DB) -> เสร็จแน่นอน
                const hasId = (d.id || d.autoID || d.book_id);
                if (hasId) return true;
                // 2. เพิ่งกด Save (Flag) -> เสร็จแน่นอน
                if (d._temp_saved === true) return true;
                // ถ้ามีแค่ ID อย่างเดียว แต่ไม่มี Amount เป็นโครงเปล่า สามารถบันทึกได้
                return false;
            }).length;

            const remaining = total - completedCount;
            
            // แสดงผล UI
            if (remaining <= 0) {
                statusEl.innerHTML = `<span style="color:green; font-weight:bold;">✓ บันทึกครบทุกรายการแล้ว (${total}/${total})</span>`;
            } else {
                statusEl.innerHTML = `
                    บันทึกแล้ว <b style="color:green">${completedCount}</b> / ${total} 
                    <span style="margin-left:10px; color:#d32f2f; background:#ffebee; padding:2px 8px; border-radius:10px; font-size:0.85em;">
                        เหลืออีก ${remaining} รายการ
                    </span>
                `;
            }
        } else {
            statusEl.style.display = 'none';
            statusEl.innerHTML = ''; 
        }
    }

    /**
     * [NEW] แปลงข้อมูล Flat (จาก Form) -> Nested Array (สำหรับ Save ลง DB)
     * ตัวอย่าง: { type_1: 'A', val_1: 100 } -> { group: [{ type: 'A', val: 100 }] }
     */
    _transformToNested(flatData) {
        const structuredData = { ...flatData };
        // [FIXED] 1. รวม Config ทั้งหมดก่อน (Main + Sub-forms)
        let allConfigs = [...this.formConfig];
        Object.values(this.nestedConfigs).forEach(subCfg => {
            if (Array.isArray(subCfg)) allConfigs = allConfigs.concat(subCfg);
        });

        // วนลูป Config หาปุ่มที่เป็น Group (action="inclements")
        allConfigs.forEach(field => {
            if (field.typeInput === 'button' && field.options?.action === 'inclements') {
                const groupKey = field.uniqid; // ชื่อ key หลัก เช่น 'collateral_group_info'
                const subFields = field.options.popup; // รายชื่อ field ย่อยใน group
                const groupArray = [];
                
                // 1. สแกนหา Index ทั้งหมดที่มีอยู่ใน flatData (เช่น 1, 2, 5...)
                // โดยดูจาก field ตัวแรกใน template เป็นหลัก
                const firstSubField = subFields[0];
                const regex = new RegExp(`^${firstSubField.uniqid}_(\\d+)$`);
                const foundIndices = new Set();

                Object.keys(flatData).forEach(key => {
                    const match = key.match(regex);
                    if (match) foundIndices.add(parseInt(match[1]));
                });

                // 2. วนลูปสร้าง Object ตาม Index ที่เจอ
                Array.from(foundIndices).sort((a, b) => a - b).forEach(index => {
                    const itemObj = {};
                    let hasData = false;

                    subFields.forEach(sub => {
                        const flatKey = `${sub.uniqid}_${index}`;
                        const desKey = `${sub.uniqid}_${index}_des`; // hidden description

                        // ถ้ามีข้อมูล ให้ยัดใส่ Object โดยตัด suffix _index ทิ้ง
                        if (structuredData.hasOwnProperty(flatKey)) {
                            itemObj[sub.uniqid] = structuredData[flatKey];
                            delete structuredData[flatKey]; // ลบ flat key ทิ้ง
                            hasData = true;
                        }
                        // จัดการ Description (ถ้ามี)
                        if (structuredData.hasOwnProperty(desKey)) {
                            itemObj[`${sub.uniqid}_des`] = structuredData[desKey];
                            delete structuredData[desKey];
                        }
                    });

                    if (hasData) groupArray.push(itemObj);
                });

                // 3. ยัด Array กลับเข้าไปใน Data หลัก
                // ใหม่: บังคับใส่ค่าลงไปเลย แม้จะเป็น Array ว่าง เพื่อให้ไปทับค่าเก่า
                structuredData[groupKey] = groupArray;
            }
        });

        return structuredData;
    }

    /**
     * [NEW] แปลงข้อมูล Nested Array (จาก DB) -> Flat (สำหรับวาด UI)
     * ตัวอย่าง: { group: [{ type: 'A' }] } -> { type_1: 'A' }
     * แปลงข้อมูล Nested Array (จาก DB/State) -> Flat Keys (สำหรับวาด UI)
     * รองรับทั้งกรณีค่ามาเป็น Array จริงๆ หรือเป็น JSON String
     */
   _flattenDataForUI(recordData) {
        const flatData = { ...recordData };

        // [FIXED] รวม Config
        let allConfigs = [...this.formConfig];
        Object.values(this.nestedConfigs).forEach(subCfg => {
            if (Array.isArray(subCfg)) allConfigs = allConfigs.concat(subCfg);
        });

        allConfigs.forEach(field => {
            // หาปุ่มที่เป็น Group (Auto Increment) เช่น collateral_group_info
            if (field.typeInput === 'button' && field.options?.action === 'inclements') {
                const groupKey = field.uniqid;
                let groupData = recordData[groupKey];

                // [Robustness] ถ้าเป็น String JSON ให้แปลงเป็น Array ก่อน
                if (typeof groupData === 'string') {
                    try {
                        groupData = JSON.parse(groupData);
                    } catch (e) {
                        console.error(`Error parsing JSON for ${groupKey}:`, e);
                        groupData = [];
                    }
                }

                // ถ้ามีข้อมูลเป็น Array ให้แตกค่าออกมา
                if (Array.isArray(groupData) && groupData.length > 0) {
                    const subFields = field.options.popup;
                    
                    groupData.forEach((item, idx) => {
                        const uiIndex = idx + 1; // UI เริ่มที่ 1
                        
                        subFields.forEach(sub => {
                            // Map ค่า: เช่น collateral_type -> collateral_type_1
                            if (item[sub.uniqid] !== undefined) {
                                flatData[`${sub.uniqid}_${uiIndex}`] = item[sub.uniqid];
                            }
                            // Map คำอธิบาย: เช่น collateral_type_des -> collateral_type_1_des
                            if (item[`${sub.uniqid}_des`] !== undefined) {
                                flatData[`${sub.uniqid}_${uiIndex}_des`] = item[`${sub.uniqid}_des`];
                            }
                        });
                    });
                    
                    // [Optional] Update ค่าที่เป็น Array กลับเข้าไปใน flatData ด้วย (เพื่อให้ _populateForm เช็ค length ได้)
                    flatData[groupKey] = groupData;
                }
            }
        });
        return flatData;
    }

}