// ==================================
// 1. Dependencies (Reducer)
// ==================================
// function สร้าง "temp_..." จะใช้เป็น id ชั่วคราว กรณีเพิ่มข้อมูลใหม่ action : "ADD_ITEM"
function createTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// State ที่ใชัเก็บข้อมูล
const initialState = {
    columns: [], // เก็บข้อมูล column จาก models/data_config.json
    data: [], // เก็บข้อมูล data ทั้งหมดที่ fetch มาจาก ".../data_management.php"
    originalData: [], // เก็บข้อมูล data ตั้นต้น ที่ fetch มาเพื่อใช้ตรวจสอบ การเปลี่ยนแปลงข้อมูล
    popup: [], // เก็บข้อมูล popup จาก models/data_config.json
    formType: "row" // กำหนด formType เริ่มต้นเป็น row
};

/**
 * Helper Function สำหรับ Reducer: เปรียบเทียบข้อมูลใหม่ (newData คือ การเปลี่ยนแปลงจากการเพิ่ม, แก้ไข และ ลบ รวมถึงการ ยกเลิกการลบด้วย) กับข้อมูลดั้งเดิม (originalData คือ ข้อมูลเดิมจาก database)
 */
function _checkIfDataIsDifferent(originalItem, newItem, popupConfig) {
    // (ถ้าไม่มีข้อมูลเดิม = นี่คือแถวใหม่) _status: 'new' return ออกจาก function ไม่ต้องเปรียบเทียบเพราะเป็นข้อมูลใหม่
    if (!originalItem) return true;

    // ฟังก์ชันย่อยสำหรับวนลูปตรวจสอบ (รองรับ Recursion) ประกาศเป็น arrow function เพราะกำหนดให้ทำงานภายใน function นี้เท่านั้น
    // ฟังก์ชันนี้ รับ parameter configList คือ popup จากไฟล์ models/data_config.json
    const checkRecursive = (configList) => {
        // ตรวจสอบ formatted ข้อมูลต้องเป็น Array objects ซึ่งปกติจะถูกส่งมาพร้อมข้อมูลจาก database ในรูปแบบ Array Objects แล้ว
        if (!Array.isArray(configList)) return false;

        // Loop array เพื่อเข้าถึง key เพื่อนำไปตรวจสอบความแตกต่าง
        for (const field of configList) {
            // field.uniqid คือ key ที่เรากำหนดจาก models/data_config.php
            const key = field.uniqid;

            // -------------------------------------------------------------
            // CASE SPECIAL: Field ประเภท Button (Group/Array)
            // -------------------------------------------------------------
            if (field.typeInput === 'button' && field.options?.action === 'inclements') {
                const orgArr = originalItem[key] || [];
                const newArr = newItem[key] || [];
                
                // 1. เช็คจำนวนแถวต้องเท่ากัน
                if (orgArr.length !== newArr.length) return true;

                // 2. เช็คเนื้อหาทีละแถว (Deep Compare ตาม Config ย่อย)
                const subConfig = field.options.popup;
                
                // วนลูปเปรียบเทียบทุกแถว
                for (let i = 0; i < orgArr.length; i++) {
                    const orgRow = orgArr[i];
                    const newRow = newArr[i];

                    // วนลูปตรวจสอบทุก Field ในแถวนั้นๆ
                    for (const subField of subConfig) {
                        const subKey = subField.uniqid;
                        
                        // เทียบค่า (String vs String)
                        let v1 = (orgRow[subKey] != null) ? orgRow[subKey].toString().trim() : "";
                        let v2 = (newRow[subKey] != null) ? newRow[subKey].toString().trim() : "";

                        // จัดการตัวเลข (Integer/Numeric)
                        const subType = (subField.typeData || '').toLowerCase();
                        if (subType === 'integer' || subType === 'numeric') {
                            v1 = v1.replace(/,/g, '');
                            v2 = v2.replace(/,/g, '');
                            if (subType === 'integer') {
                                const n1 = parseFloat(v1);
                                if (!isNaN(n1)) v1 = Math.trunc(n1).toString();
                                const n2 = parseFloat(v2);
                                if (!isNaN(n2)) v2 = Math.trunc(n2).toString();
                            }

                            // ===================================================
                            // Logic ดักจับทศนิยม (Numeric) ต่อจากโค้ดเดิม
                            // แปลงเป็น Float เพื่อเทียบค่าทางคณิตศาสตร์ (1170.60 จะเท่ากับ 1170.6)
                            // ===================================================
                            const num1 = parseFloat(v1);
                            const num2 = parseFloat(v2);                            
                            if (!isNaN(num1) && !isNaN(num2)) {
                                if (num1 !== num2) return true; // ถ้าเลขไม่เท่ากัน คืนค่า true ทันที
                                continue; // *** สำคัญมาก: ถ้าเลขเท่ากัน ให้ข้ามการเทียบ String ด้านล่างไปเลย! ***
                            }
                        }
                        if (v1 !== v2) return true; // เจอจุดต่างใน Array
                    }
                }                
                continue; // ถ้าผ่านลูป Array มาได้ แสดงว่าเหมือนกัน -> ข้ามไป Field ถัดไป
            }

            // Clean Format: ข้อมูลดั้งเดิมจาก database
            let originalValue = (originalItem[key] === null || originalItem[key] === undefined) ? "" : originalItem[key].toString().trim();
            // Clean Format: ข้อมูลปัจจุบัน
            const currentValue = (newItem[key] === null || newItem[key] === undefined) ? "" : newItem[key].toString().trim();
            
            // [FIXED] ตรวจสอบว่า "มีคีย์นี้ใน DB" หรือ "มีค่าใหม่ถูกกรอกเข้ามา"
            const isKeyInOriginal = key in originalItem;
            const hasNewValue = currentValue !== "";
            // เฉพาะ field ที่มีอยู่ใน DB เท่านั้นที่เราจะเปรียบเทียบ
            if (isKeyInOriginal || hasNewValue) {
                const typeData = (field.typeData || '').toLowerCase();
                if (typeData === 'integer' || typeData === 'numeric') {
                    // นำ "," ออกจาก่ตัวแปรประเภท integer หรือ numeric เพื่อใช้เทียบข้อมูลให้ formatted เดียวกัน
                    const v1Clean = originalValue.replace(/,/g, '');
                    const v2Clean = currentValue.replace(/,/g, '');

                    const n1 = parseFloat(v1Clean);
                    const n2 = parseFloat(v2Clean);
                    // ถ้าเป็นตัวเลขที่ถูกต้องทั้งคู่ ให้เทียบค่าตัวเลข
                    if (!isNaN(n1) && !isNaN(n2)) {
                        if (n1 !== n2) {
                            // console.log(`[Diff Number] ${key}: ${n1} vs ${n2}`); // Debug
                            return true; 
                        }
                        // *** สำคัญ: ถ้าตัวเลขเท่ากันแล้ว ให้ข้ามการเทียบ String ด้านล่างไปเลย ***
                        // เพื่อป้องกันกรณี "123" !== "123.00" ในรูปแบบ String
                        continue; 
                    }
                }

                // *** DEBUG: 2 POINT นี้ใช้ตรวจสอบ ข้อมูลที่ไม่ตรงกันได้ หากมีการตรวจสอบข้อมูลไม่ถูกต้องตาม Logic สามารถเปิด comment เพื่อดูผลลัพธ์ข้อมูลได้ ***
                // [DEBUG POINT 1] เปรียบเทียบ Main Value (Trim แล้ว)
                // const v1 = originalValue.trim();
                // const v2 = currentValue.trim();                
                // if (v1 !== v2) {
                //     console.log(`%c[Diff Found] Key: ${key}`, 'color: red; font-weight: bold;');
                //     console.log(`Original DB: "${v1}"`);
                //     console.log(`New Form   : "${v2}"`);
                //     // return true; 
                // }
                // [DEBUG POINT 2] เปรียบเทียบ Description (_des)
                // if (field.element === 'select' || field.autoComplete === 'true') {
                //     const descKey = `${key}_des`;
                //     if (descKey in originalItem) {
                //         const oDes = (originalItem[descKey] || "").toString().trim();
                //         const nDes = (newItem[descKey] || "").toString().trim();                        
                //         if (oDes !== nDes) {
                //             console.log(`%c[Diff Found] Description: ${descKey}`, 'color: orange; font-weight: bold;');
                //             console.log(`Original DB: "${oDes}"`);
                //             console.log(`New Form   : "${nDes}"`);
                //             // return true;
                //         }
                //     }
                // }
            
                // จบการทำงาน เมือ เจอ ข้อมูลที่แตกต่าง
                if (originalValue !== currentValue) {
                    // DEBUG: comment log ใช้ ตรวจสอบ logic ทำได้ถูกต้องตามต้องการหรือไม่
                    // console.log(`Diff detected at ${key}: ${originalValue} vs ${currentValue}`);
                    return true; // เจอความต่าง -> จบข่าว
                }
            }

            // -------------------------------------------------------------
            // ตรวจสอบ Nested Form (Radio / Select)
            // รองรับทั้งแบบเก่า (popup ใน options) และแบบใหม่ (xsd_rules + popup object)
            // -------------------------------------------------------------
            if (field.element === 'radio' || field.element === 'select') {
                const selectedVal = newItem[key];

                if (selectedVal) {
                    // --- CASE A: แบบใหม่ (ใช้ xsd_rules และ popup แยกออกมา) ---
                    if (field.xsd_rules && field.popup && !Array.isArray(field.popup)) {
                        // 1. วนหา Rule ที่ condition_values ตรงกับค่าที่ User เลือก
                        const rule = field.xsd_rules.find(r => 
                            Array.isArray(r.condition_values) && r.condition_values.includes(selectedVal.toString())
                        );

                        // 2. ถ้าเจอ Rule และมี target_group ให้ Recursion เข้าไปเช็ค
                        if (rule && rule.target_group) {
                            const subConfig = field.popup[rule.target_group];
                            // ต้องเช็คว่าเป็น Array ก่อนส่งเข้า checkRecursive
                            if (Array.isArray(subConfig)) {
                                if (checkRecursive(subConfig)) return true;
                            }
                        }
                    } 
                    
                    // --- CASE B: แบบเก่า ใช้กรณีเลือก radio ธรรมดา (popup ฝังอยู่ใน options แต่ละตัว) ---
                    else if (field.options && Array.isArray(field.options)) {
                        const selectedOption = field.options.find(opt => opt.code == selectedVal);
                        if (selectedOption && selectedOption.popup) {
                            if (checkRecursive(selectedOption.popup)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false; // ตรวจครบทุกชั้นแล้ว ไม่เจอความต่าง
    };
    // *** ห้ามเปลี่ยนชือตัวแปร checkRecursive เด็ดขาด ***
    return checkRecursive(popupConfig);        
}

/**
 * 1.function นี้ รับข้อมูลเบื้องต้นเพื่อนำไปแสดงผลใช้ตัวแปรชื่อ State 
 * 2.variable action คือ string data ใช้ตรวจสอบ switch-case
 */
function reportReducer(state = initialState, action) {
    // DEBUG : comment นี้ใ่ช้่ตรวจสอบข้อมูลที่ถูกบันทึกลง Store (used save state)
    // console.log('[Store] Action:', action.type);
    switch (action.type) {
        // กรณีแรก คือ การ Load ข้อมูลที่ fetch มาเก็บไว้
        case 'LOAD_DATA': {
            // 1. กระจาย "payload" ทั้งหมดเข้ามาใน State (วิธีนี้จะบันทึก 'lending_arr_type', 'purpose_type' ฯลฯ ลง State อัตโนมัติ)
            // Destruct ข้้อมูลจาก payload (Store)
            const { data, prepare_data, ...restOfPayload } = action.payload;

            // ตัวแปรตรวจสอบข้อมูลจากระบบ หรือไม่
            let activeData = []; // เก็บข้อมูลที่นำไปใช้
            let isFromPrepared = false; // ตรวจสอบแหล่งข้อมูลจากระบบหรือไม่

            // เงื่อนไขที่คุณเสนอ: ถ้ามี data ให้ใช้ data, ถ้าไม่มีให้ดู prepare_data
            if(data && data.length > 0){
                activeData = data;
            }else if(prepare_data && prepare_data.length > 0){
                activeData = prepare_data;
                isFromPrepared = true; // เปิด Flag ว่านี่คือข้อมูลจากระบบ
            }

            // [NEW] 1.1 หา Config ของ Popup เพื่อดูว่า Field ไหนบ้างที่เป็น Group (Array)
            // (ปกติ Config จะส่งมาพร้อม payload ในตัวแปร popup หรือมีอยู่ใน state เดิม)
            const popupConfig = restOfPayload.popup || state.popup || [];
            
            // เก็บรายชื่อ Key ที่ต้อง Parse (เช่น ['collateral_group_info', 'loan_type_info'])
            const keysToParse = [];
            if (Array.isArray(popupConfig)) {
                popupConfig.forEach(field => {
                    // เช็คว่าเป็นปุ่มแบบเพิ่มรายการ (ซึ่งข้อมูลจะถูกเก็บเป็น JSON String ใน DB)
                    if (field.typeInput === 'button' && field.options?.action === 'inclements') {
                        keysToParse.push(field.uniqid);
                    }
                });
            }

            // 2. สร้าง pristine Data จะเพิ่ม _status : 'pristine' ซึ่งหมายความว่า ไม่มีการเปลี่ยนแปลงของข้อมูล ใช้ในการตรวจสอบสถานะข้อมูล ว่ายังคงเดิมจาก database
            // const pristineData = (data || []).map(item => ({
            //     ...item,
            //     _status: 'pristine'
            // }));
            // 2. สร้าง pristine Data และ [NEW] แปลง JSON String -> Array Objects
            const pristineData = (activeData || []).map(item => {
                const parsedItem = { ...item };

                // วนลูป Key ที่ต้องแปลง
                keysToParse.forEach(key => {
                    const rawVal = parsedItem[key];
                    // ถ้ามีค่าและเป็น String -> ให้ Parse เป็น JSON Object/Array
                    if (rawVal && typeof rawVal === 'string') {
                        try {
                            // [Fix] แก้ปัญหา Escape characters (ถ้ามี) เช่น "\\" -> "\"
                            // const cleanJson = rawVal.replace(/\\\\/g, '\\');
                            parsedItem[key] = JSON.parse(rawVal);
                        } catch (e) {
                            console.warn(`[Reducer] Failed to parse JSON for key "${key}":`, e);
                            parsedItem[key] = []; // ถ้าพังให้เป็น Array ว่าง
                        }
                    }
                });

                // =========================================================
                // [NEW LOGIC]: สร้าง temp_id ให้กับข้อมูลที่มาจาก prepare_data
                // =========================================================
                if (isFromPrepared && !parsedItem.id && !parsedItem.autoID) {
                    parsedItem.id = createTempId(); // เรียกใช้ฟังก์ชันที่มีอยู่แล้วบนสุดของไฟล์
                }

                return {
                    ...parsedItem,
                    _status: isFromPrepared ? 'new' : 'pristine' 
                };
            });

            // 3. เมื่อติด tag _status:'pristine' แล้วจะ รวม State เพื่อนำไปแสดงผลต่อไป
            return { 
                ...state, 
                ...restOfPayload, // <-- บันทึก keys ทั้งหมด (columns, popup, formType, lending_arr_type, ...)
                data: pristineData, // <-- เขียนทับ 'data' ด้วยเวอร์ชัน 'pristine'
                originalData: JSON.parse(JSON.stringify(pristineData))
            };
        }
        // กรณีเพิ่มข้อมูลใหม่ จะสร้าง id ช่วคราว และ เพิ่ม key _status: 'new' หมายถึงข้อมูลใหม่
        case 'ADD_ITEM': {
            const newId = createTempId();
            const newItem = { ...action.payload, id: newId, _status: 'new' };
            // เพิ่มข้อมูลไหม่เข้า State 
            return { ...state, data: [...state.data, newItem], lastActionId: newId, lastActionTime: Date.now() };
        }
        // กรณีแก้ไขข้อมูล ตรวจสอบการเปลี่ยนแปลงของข้อมูลใช้ในการ updated data
        case 'EDIT_ITEM': {
            const updatedData = state.data.map(item => {
                // กรณีจะแก้ไขได้ ต้องมี id ก่อน (ต้องมี _status:'pristine' หรือ _status:'new')
                // การเลือกใช้ทั้้ง key "id" หรือ "autoID" เพื่อให้รองรับกรณีเพิ่มข้อมูลใหม่จะไม่มี autoID 
                const itemId = item.id || item.autoID;
                if (itemId == action.payload.id) { 
                    // หา "ข้อมูลดั้งเดิม" (Pristine)
                    const originalItem = state.originalData.find(orgItem => 
                        (orgItem.id || orgItem.autoID) == action.payload.id
                    );
                    // ข้อมูลใหม่ (จาก Popup) ดึงข้อมูลจาก payload 
                    const newItemData = action.payload.newData;

                    // DEBUG: comment log ตรวจสอบ field uniqid และ field อื่นๆ
                    // console.log("[App] Popup Structure",state.popup);

                    // เปรียบเทียบ (ข้อมูลดั้งเดิม vs ข้อมูลใหม่) ด้วย function _checkIfDataIsDifferent
                    const hasChanged = _checkIfDataIsDifferent(originalItem, newItemData, state.popup);                    
                    // ตรวจสอบ ว่าใช่ temp_id หรือไม่
                    const isTempId = itemId && itemId.toString().startsWith("temp_");
                    let newStatus;
                    // if-condition ตัดสินใจหลังแก้ไข _status = 'new' และ id ขึ้นต้นด้วย "temp_..." 
                    // หมายความว่าเป็นข้อมูลใหม่ และ ถูกแก้ไข ให้นับว่าคือข้อมูลใหม่ (ไม่ว่าจะแก้ไขกี่ครั้งก็่ตาม)
                    if(item._status === 'new' || isTempId){
                        newStatus = 'new'
                    }else{
                        // condition นี้ให้นำ variable ที่ได้จาก function มาตรวจสอบและนำไปใช้ได้เลย
                        newStatus = hasChanged ? 'edited' : 'pristine';
                    }                    
                    // [DEBUG]: comment console.log ตรวจสอบข้อมูล และ id ที่แก้ไขแสดงผลถูกไหม
                    // console.log(`[Store] EDIT_ITEM: ID ${itemId}. Changed: ${hasChanged}. New Status: ${newStatus}`);                    
                    return { ...item, ...newItemData, _status: newStatus };
                }
                return item;
            });
            // ส่งข้อมูลที่ update แล้วไปใช้งานต่อ
            return { ...state, data: updatedData, lastActionId: action.payload.id, lastActionTime: Date.now() };
        }
        // กรณีลบข้อมูล ตรวจสอบ id เพื่อนำไปใช้ส่วนการแสดงผล และ updated item-deleted
        case 'DELETE_ITEM': {
            const targetId = action.payload.id;
            let nextFocusId = targetId; // Default: ให้ focus ที่ตัวเอง (กรณีเป็น pristine ที่แค่ขีดฆ่า)

            // 1. หาตำแหน่ง (Index) ของแถวที่กำลังจะถูกลบ
            const targetIndex = state.data.findIndex(item => (item.id || item.autoID) == targetId);
            const itemToDelete = state.data[targetIndex];

            // 2. Logic การหา ID เป้าหมายใหม่ สำหรับให้ Scroll เลื่อนไปหา
            if (itemToDelete) {
                const isTempId = targetId && targetId.toString().startsWith("temp_");
                
                // ถ้าเป็นข้อมูล temp_ ซึ่งกำลังจะถูก .filter หายไปจากหน้าจอ
                if (itemToDelete._status === 'new' || (itemToDelete._status === 'edited' && isTempId)) {
                    // ให้ใช้ ID ของ "แถวก่อนหน้า" เป็นเป้าหมายแทน
                    if (targetIndex > 0) {
                        const prevItem = state.data[targetIndex - 1];
                        nextFocusId = prevItem.id || prevItem.autoID;
                    } 
                    // แต่ถ้ามันเป็นแถวแรกสุด ให้ใช้ ID ของ "แถวถัดไป" แทน
                    else if (targetIndex < state.data.length - 1) {
                        const nextItem = state.data[targetIndex + 1];
                        nextFocusId = nextItem.id || nextItem.autoID;
                    } 
                    // ถ้าลบจนหมดตาราง ไม่มีแถวเหลือเลย ก็ไม่ต้อง focus อะไร
                    else {
                        nextFocusId = null;
                    }
                }
            }
            
            return {
                ...state,
                data: state.data.map(item => {
                    const itemId = item.id || item.autoID;
                    if (itemId == action.payload.id) {
                        // DEBUG: comment ใช้ดู id ข้อมูลการลบ update State
                        // console.log(`[Store] Marking item for deletion:`, item);
                        const isTempId = itemId && itemId.toString().startsWith("temp_");
                        // if-condition จัดการข้อมูล 
                        // 1.หากข้อมูลเพิ่มใหม่จะให้ลบออกเลย  
                        // 2.หากเป็นข้อมูล 'pristine' ที่แก้ไขจะมี _status: 'edited' แต่หากถูกลบ จะต้องตรวจสอบด้วยว่า id มี temp หรือไม่อีกชั้นหนึ่งเพื่อกันข้้อผิดพลาด
                        if (item._status === 'new' || (item._status === 'edited' && isTempId)) {
                            // 1.ถ้าเป็น 'new' (ยังไม่เคย save) ให้ลบจริง และ การแก้ไขจากการลบ กรณีเพิ่มใหม่ด้วย  
                            return { ...item, _status: 'temp_deleted' }; // (มาร์คไว้เผื่อ filter ออก)
                        } else {
                            // 2.ถ้าเป็น 'pristine' หรือ 'edited' (มีใน DB) ให้มาร์ค 'deleted'
                            return { ...item, _status: "deleted" }; 
                        }
                    }
                    return item;
                })
                // (กรองแถว 'new' ที่ถูกลบ ออกไปเลย) เนื่องจากเป้นข้อมูลใหม่ จึงลบ ออกจาก State เพื่อให้จัดการข้อมูลง่ายขึ้น            
                .filter(item => item._status !== 'temp_deleted'),
                lastActionId: nextFocusId,
                lastActionTime: Date.now()
            };
        }
        // กรณียกเลิกการลบ จะคืน _status: 'pristine'
        case 'UNDO_DELETE_ITEM': {
            // Logic ยกเลิกการลบ
             return {
                ...state,
                data: state.data.map(item => {
                    const itemId = item.id || item.autoID;
                    if (itemId == action.payload.id) {                        
                        // ตรวจสอบ id
                        const originalItem = state.originalData.find(orgItem => 
                            (orgItem.id || orgItem.autoID) == action.payload.id
                        ); 
                        
                        // (เปรียบเทียบ "ข้อมูลปัจจุบัน" (ที่ซ่อนอยู่) กับ "ข้อมูลดั้งเดิม")
                        const hasChanged = _checkIfDataIsDifferent(originalItem, item, state.popup);
                        // ให้คืนค่าเป็นค่าเดิมจาก Database ทุกครั้ง
                        // หลังจากยกเลิกการลบแล้วจะฟื้นข้อมูลเดิมจาก database เท่านั้น
                        const newStatus = hasChanged ? 'pristine' : 'pristine';

                        // DEBUG comment log การแสดงผลข้อมูลการลบ
                        // console.log(`[Store] UNDO_DELETE_ITEM: ID ${itemId}. Changed: ${hasChanged}. New Status: ${newStatus}`);
                        
                        // "ถ้าเป็น pristine ให้นำ originalItem มาแสดง"
                        if (newStatus === 'pristine') {
                            // (เรา "คืนค่า" ข้อมูลดั้งเดิมทั้งหมด (รวม _status: "pristine" ที่อยู่ใน originalItem))
                            return originalItem;
                        } 
                        
                        // if-condition นี้สามารถฟื้นข้อมูลการแก้ไขจากการโดนลบได้ และ ฟื้นคืนข้อมูลจาก database ได้
                        // const newStatus = hasChanged ? 'edited' : 'pristine';                        
                        // if (newStatus === 'pristine') {
                        //     // (เรา "คืนค่า" ข้อมูลดั้งเดิมทั้งหมด (รวม _status: "pristine" ที่อยู่ใน originalItem))
                        //     return originalItem;
                        // } 
                        // else {
                        //     // (ถ้ายัง 'edited' ให้คงค่าที่ 'item' มี)
                        //     return { ...item, _status: newStatus }; 
                        // }
                    }
                    return item;
                }),
                lastActionId: action.payload.id,
                lastActionTime: Date.now()
            };
        }
        // Case นี้จำเป็นสำหรับฟีเจอร์ Global Data / Sticky Value ใช้สำหรับแก้ไขข้อมูลที่เป็น Global Data
        case 'BATCH_UPDATE_KEY': {
            const { key, value, desKey, desValue, isGlobal } = action.payload;
            // 1. จำค่าล่าสุด (Sticky)
            const newLastInputs = { ...(state.last_inputs || {}), [key]: value };
            // 2. Map Data
            const updatedData = state.data.map(item => {
                // ข้ามรายการที่ถูกลบ
                if (item._status === 'deleted' || item._status === 'temp_deleted') return item;                
                // [Optimization] ถ้าค่าเท่าเดิมเป๊ะๆ ให้ข้ามเลย
                if (item[key] === value && (!desKey || item[desKey] === desValue)) {
                    return item;
                }
                // ตรวจสอบว่าจะอัปเดตหรือไม่
                const shouldUpdate = isGlobal ? true : (!item[key] || item[key] === '' || item[key] === null);
                if (shouldUpdate) {
                    const updatedItem = { ...item, [key]: value };
                    if (desKey) {
                        updatedItem[desKey] = desValue;
                    }
                    // ------------------------------------------------------------
                    // LOGIC STATUS UPDATE
                    // ------------------------------------------------------------
                    // 1. รายการใหม่ ('new') -> คงสถานะ 'new'
                    const itemId = item.id || item.autoID;
                    const isTempId = itemId && String(itemId).startsWith('temp_');

                    if (item._status === 'new' || (item.id && item.id.toString().startsWith('temp_'))) {
                         updatedItem._status = 'new';
                    }
                    else if (isGlobal) {
                         // 1. ต้องหาข้อมูล Original มาเทียบ
                         const originalItem = state.originalData.find(org => 
                             String(org.id || org.autoID) === String(item.id || item.autoID)
                         );

                         if (originalItem) {
                             // 2. ใช้ฟังก์ชันตรวจสอบ (ที่แก้ Trim แล้ว) มาเช็ค
                             const hasChanged = _checkIfDataIsDifferent(originalItem, updatedItem, state.popup);
                             // 3. ถ้าเหมือนเดิม -> pristine, ถ้าต่าง -> edited
                             updatedItem._status = hasChanged ? 'edited' : 'pristine';
                         } else {
                             updatedItem._status = 'edited';
                         }                    
                    } 
                    // 3. ถ้าไม่ใช่ Global (Sticky) ปกติจะถือว่าแก้ไข (หรือแล้วแต่ Logic)
                    else {
                        // updatedItem._status = 'edited'; // (Optional)
                    }
                    return updatedItem;
                }
                return item;
            });

            return {
                ...state,
                data: updatedData,
                last_inputs: newLastInputs
            };
        }
        default:
            return state;
    }
}

// ==================================
// 2. ReportApp Class
// ==================================
class ReportApp {
    // เริ่มต้นการสร้างหน้า UI
    constructor(config) {
        // 1. เก็บค่า Config และตั้งค่าตัวแปรพื้นฐาน รับมาจากหน้า frm_adddata.php
        this.config = config;
        console.log("[App] Config received:", config);
        // กำหนดตัวแปรสำหรับ Logic รายงาน
        this.currentReportName = config.reportType; // ชื่อรายงาน (เช่น 'bls', 'ipi')
        this.searchDate = config.searchDate; // วันที่ค้นหา (จะมี pattern 'yyyy-mm-dd' และกำหนด dd เป้นวันสิ้นเดือน)

        // 2. ดึงค่า Revision (rev) จาก URL Parameter
        // จำเป็นต้องใช้เพื่อดูว่าเรากำลังดูข้อมูลเวอร์ชันไหนอยู่ เบื้้องต้นกำหนดให้ใช้ rev ล่าสุดที่ได้จาก Server-side (".../data_management.php" เป็นคนจัดการ)
        const urlParams = new URLSearchParams(window.location.search);
        this.searchRev = urlParams.get('rev') || null; // <-- อ่าน 'rev'
        // DEBUG: comment log หาก เข้าใช้ครั้งแรก rev จะถูกตั้งเป็น null เสมอเพื่อให้ใช้ revล่าสุดจาก Server-side มาแสดงผล
        // console.log(`[App] Initial Rev from URL: ${this.searchRev}`);
        this.lastScrolledId = null;
        this.lastRenderedTime = 0;
        // --- 3. ตรวจสอบและดึง DOM Elements (Binding) ---
        try {
            // ชื่่อ id ใช้กำหนดเป็น container Selectbar
            this.selectBarContainer = document.querySelector(this.config.containers.selectBar);
            // ชื่่อ id ใช้กำหนดเป็น container table
            this.tableContainer = document.querySelector(this.config.containers.table);
            // ตรวจสอบข้อมูล id ต้องถูกกำหนดในหน้า frm_adddata.php แล้ว Validation: ถ้าหาไม่เจอ ให้หยุดทำงานและแจ้ง Error ทันที (Critical Failure)
            if (!this.selectBarContainer || !this.tableContainer) {
                throw new Error("ไม่พบ Container Elements ที่จำเป็น (เช็ค config.containers)");
            }
        } catch (e) {
            // (โยน Error เพื่อให้ script หยุดทำงาน) ส่วนนี้ต้องเปิดไว้หาก catch จะหมายถึงไม่มี config และทำงานไมได้ทันที
            throw new Error(`Initialization failed: ${e.message}`);
        }
        
        // --- 4. สร้าง State Management (Store) ---
        this.store = new Store(reportReducer); 
        // [สำคัญ] สร้าง "Bridge" หรือสะพานเชื่อม
        // ฝากตัวแปร store ไว้ที่ window เพื่อให้หน้า Popup (ที่เปิดด้วย window.open)
        // สามารถย้อนกลับมาเรียกใช้ข้อมูลผ่าน window.opener.store ได้
        window.store = this.store;
        
        // --- 5. สร้าง UI Renderers ---
        // แยกส่วนการแสดงผลออกเป็น 2 ส่วนชัดเจน
        // 5.1 สร้าง instance จาก SelectBarRenderer.js ส่วนควบคุมด้านบน คือ SelectBar (ปุ่มทำรายการ, Dropdown เลือก เดือน/ปี และ rev) 
        this.controlsRenderer = new SelectBarRenderer(this.selectBarContainer, this.currentReportName);
        // 5.2 สร้าง instance จาก ReportRenderer.js ส่วนตารางแสดงข้อมูล
        this.tableRenderer = new ReportRenderer(this.tableContainer);
    }

    /**
     * เมธอดเริ่มต้นการทำงานของ App (Entry Point)
     * จะถูกเรียกหลังจาก Constructor ทำงานเสร็จสิ้น
     */
    init() {
        // comment log นี้เป็นเพียงการตรวจสอบว่าทำงานได้
        // console.log("[App] Initializing...");

        // 1. Subscribe (ติดตาม): ผูกฟังก์ชัน _render เข้ากับ Store
        // เมื่อ Store มีการเปลี่ยนแปลงข้อมูล (State changed) -> ให้เรียก _render เพื่อวาดหน้าจอใหม่ทันที
        // .bind(this) จำเป็นต้องใช้ เพื่อให้ 'this' ภายใน _render ยังคงหมายถึง Class ReportApp
        this.store.subscribe(this._render.bind(this));
        // 2. Setup Events: ผูกปุ่มคลิกต่างๆ เตรียมไว้
        this._bindEventListeners();
        // 3. Load Data: เริ่มดึงข้อมูลจาก Server-side
        this._fetchInitialData();
    }

    /**
     * Helper Function: เช็คและเลื่อน Scroll ไปหาแถวที่เพิ่งแก้ไข หรือ เพิ่มใหม่ หรือ ลบ 
     */
    _autoScrollToFocusRow(targetId) {
        if (!targetId) return;

        console.log(`[App] Auto-focusing row: ${targetId}`);
        
        // รอให้ DOM วาดเสร็จ (เผื่อเครื่องช้า ปรับเป็น 200-300ms ได้)
        setTimeout(() => {
            const row = document.getElementById(`row_${targetId}`);
            if (row) {
                // 1. สั่งเลื่อน
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 2. สั่ง Highlight
                const originalBg = row.style.backgroundColor;
                row.style.transition = 'background-color 0.5s';
                row.style.backgroundColor = '#fff9c4'; // สีเหลือง
                
                setTimeout(() => {
                   row.style.backgroundColor = originalBg; 
                }, 1000);
            }
        }, 300);
    }

    /**
     * เมธอดสำหรับผูก Event Listeners กับ DOM Elements
     * ใช้เทคนิค Event Delegation (ผูกที่ Container แม่ แทนที่จะผูกทุกปุ่มย่อย)
     */
    _bindEventListeners() {
        // ดักจับการคลิกที่ส่วนควบคุมด้านบน (Select Bar) เช่น ปุ่ม เพิ่มข้อมูล, ยืนยันนำส่ง, เปรียบเทียบ และ Dropdown
        this.selectBarContainer.addEventListener('click', this._handleSelectBarClick.bind(this));
        // ดักจับการคลิกที่ตารางข้อมูล (Table) เช่น ปุ่ม แก้ไข, ลบ
        // ใช้ bind(this) เพื่อให้ฟังก์ชันปลายทางยังเรียกใช้ method ของคลาสได้ (เช่น this.store)
        this.tableContainer.addEventListener('click', this._handleTableClick.bind(this));
        // DEBUG: ผูก Event SelectBarRenderer.js
        // console.log("[App] Event listeners bound.");
    }

    /**
     * เมธอด Asynchronous สำหรับดึงข้อมูลตั้งต้นจาก Server-side (PHP)
     */
    async _fetchInitialData() {
        // DEBUG: comment log ใช้ตรวจสอบชื่อรายงานและวันที่เลือก
        // console.log(`[App] Fetching data for report: ${this.currentReportName}, date: ${this.searchDate}`);
        
        // 1. UX: แสดงข้อความ Loading ระหว่างรอข้อมูล
        this.tableContainer.innerHTML = '<p class="loading-message">Loading data...</p>';

        // 2. Prepare Params: สร้าง Query String สำหรับส่งไป PHP
        // ใช้ URLSearchParams เพื่อจัดการ encoding อัตโนมัติ (เช่น ช่องว่าง, อักขระพิเศษ)
        const params = new URLSearchParams({
            focus_report: this.currentReportName, // ชื่อรายงาน
            search_date: this.searchDate, // วันที่ ใช้ formatted 'yyyy-mm-dd'
            focus_window: 'main' // บอก Server-side(PHP) ว่าเรียกจากหน้าหลัก (if-condition)
        });

        // ถ้ามีเลข Revision (rev) ให้ส่งไปด้วย (กรณีดูข้อมูลย้อนหลัง)
        if (this.searchRev) {
            params.set('rev', this.searchRev);
        }

        // สร้าง URL ปลายทาง มี Standrad ตามโครงสร้าง folder ดังนี้
        // นำหน้าด้วยชือย่อรายงาน เช่น "ipi/data_management.php"
        // ภายใน folder ต้องมี file ชื่อ data_management.php
        const API_ENDPOINT = `${this.currentReportName}/data_management.php?${params.toString()}`;
        // DEBUG: comment log ตรวจสอบ String Endpoint 
        // console.log(`[App] Fetching from: ${API_ENDPOINT}`);

        try {
            // 3. Fetching: ส่ง Request ไปยัง Server-side
            const response = await fetch(API_ENDPOINT);
            // ตรวจสอบ HTTP Status Code (ถ้าไม่ใช่ 200-299 ถือว่า Error)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} (URL: ${API_ENDPOINT})`);
            }
            // 4. Parsing: แปลงข้อมูลที่ได้กลับมาเป็น JSON Object เนื่องจากข้อมูลจาก Server-side จะส่งกลับมาเป็น Json เสมอ
            const data = await response.json();
            // DEBUG: comment log การ fetch ข้อมูลเดิมจาก database ยังไม่ได้เก็บเข้า State
            // console.log("[App] Data fetched successfully:", data);

            // 5. Update Store: ส่งข้อมูลเข้าสู่ระบบ State Management
            // Action 'LOAD_DATA' จะถูกส่งไปที่ reportReducer เพื่อบันทึกลง State ในกระบวนการนี้หากมีข้อมูลจาก Server-side จะถูกกำหนด _status: 'pristine'
            // และจะไปกระตุ้นให้เกิดการ _render หน้าจออัตโนมัติ (เพราะเรา Subscribe ไว้ใน init)
            this.store.dispatch({ type: 'LOAD_DATA', payload: data });

        } catch (error) {
            // 6. Error Handling: กรณีเน็ตหลุด หรือ PHP Error เช่น Http:500
            console.error('Fetch error:', error);
            // แสดงข้อความ Error ให้ User เห็นบนหน้าจอ
            this.tableContainer.innerHTML = `<p class="error-message">Failed to load data: ${error.message}</p>`;
        }
    }

    /**
     * เมธอด _render: หัวใจหลักของการแสดงผล
     * ถูกเรียกทุกครั้งที่ Store มีการเปลี่ยนแปลง (State Changed) 
     * ทำหน้าที่คำนวณ Logic การล็อคปุ่ม, ข้อความแจ้งเตือน และสั่งให้ Component ย่อย (Bar/Table) วาดหน้าจอ
     */
    _render() {
        // 1. ดึงข้อมูล State ล่าสุดจาก Store มาเตรียมประมวลผล
        const currentState = this.store.getState();
        // DEBUG: comment log แสดงข้อมูลหลังจากเก็บเข้า State
        console.log("[App] Rendering new state...", currentState);

        // ส่วนที่ 1: ตรวจสอบ Logic การล็อคระบบ (System Lock)
        // ตรวจสอบว่ามี Revision ไหนที่สถานะเป็น "รออนุมัติ" (status_appv = '0') หรือไม่
        const allRevisions = currentState.revision || [];       
        const isSystemLocked = allRevisions.some(rev => {
            // (ป้องกันกรณี Rev 0 หรือ dummy data ถ้ามี) เนื่่องจากในระบบไม่มี rev 0 จึงต้องป้องกันกรณีไม่มีข้อมูลเลย
            if (String(rev.value) === "0") return false;

            // ถ้าเจอ status '0' (รออนุมัติ) -> ให้ถือว่าระบบต้องถูกล็อค ห้ามแก้ไขเพิ่ม
            // (ส่วน status '1'=อนุมัติแล้ว, '2'=ตีกลับ -> ถือว่า Process จบแล้ว แก้ไขต่อได้)
            // แปลงเป็น string เพื่อความชัวร์
            const statusStr = String(rev.status_appv);
            return statusStr === '0';
        });

        // --- ส่วนที่ 2: ตรวจสอบความครบถ้วนของข้อมูล (Specific Business Logic) ---
        // กรณี formType เป็น 'group' ต้องมีจำนวนรายการครบตามที่กำหนดใน bot_code_items จาก Server-side เท่านั้นจึงจะทำการ ยืนยันการส่งข้อมูลได้
        let isDataIncomplete = false;
        let completionMessage = "";
        if (currentState.formType === 'group') {
            // หาจำนวน bot_code_items ที่ได้จาก key: 'bot_code_items' (Server-side)
            const totalRequired = currentState.bot_code_items ? currentState.bot_code_items.length : 0;            
            // นับจำนวนข้อมูลที่มีอยู่จริง (กรองเอาที่ถูกสั่งลบ _status: 'deleted' ออกไปก่อนนับ)
            const currentCount = currentState.data.filter(d => d._status !== 'deleted').length;
            
            // ถ้าข้อมูลยังไม่ครบตามจำนวน -> ล็อคปุ่ม Confirm (แต่ยังให้แก้ไขข้อมูลได้)
            if (currentCount < totalRequired) {
                isDataIncomplete = true; // ล็อคปุ่ม Confirm
                completionMessage = `(ข้อมูลยังไม่ครบ: ${currentCount}/${totalRequired})`;
            }
        }

        // --- ส่วนที่ 3: สร้างข้อความแจ้งเตือน (UI Feedback) ---
        // ลำดับความสำคัญ: System Lock (ร้ายแรงกว่า) > Data Incomplete
        // หมายความว่าหากมีข้อมูลรออนุมัติจะเข้าเงื่อนไข System Lock เสมอ
        let customMessage = "";
        if (isSystemLocked) {
            customMessage = "มี Revision ที่ยังไม่ได้รับการอนุมัติค้างอยู่ ระบบจึงล็อคการแก้ไขทั้งหมด";
        } else if (isDataIncomplete) {
            customMessage = `ไม่สามารถนำส่งได้ ${completionMessage}`;
        }

        // --- ส่วนที่ 4: เตรียมข้อมูลเพื่อส่งไปแสดงผล ---
        // ข้อมูลที่จะแสดงในตาราง (ส่งไปทั้งหมดรวมถึงตัวที่ user แก้ไขอยู่)
        let dataToRender = currentState.data;
        // เช็คว่ามีข้อมูลหรือไม่ (เพื่อคุมการแสดงผล Empty State)  
        const hasData = currentState.data && currentState.data.length > 0;
        // เช็คว่ามีการเปลี่ยนแปลงข้อมูลหรือไม่ (เพื่อเปิด/ปิด ปุ่ม Save/Confirm)
        // Logic: มี item ใหม่ OR มี item ถูกแก้ไข OR มี item ถูกสั่งลบ
        const hasChanges = currentState.data.some(item => item._status === 'new' || item._status === 'edited') ||
                           currentState.data.filter(item => item._status === 'deleted').length > 0;
        
        // ===========================================                           
        // --- ส่วนที่ 5: ส่งข้อมูลไปยัง Renderer (View) ---
        // ===========================================
        // 5.1 เตรียม Props สำหรับ "SelectBar" (ส่วนควบคุมด้านบน)
        const controlData = {
            revision: currentState.revision,
            status_message: currentState.status_message,
            search_date: currentState.search_date,
            hasData: hasData,
            hasChanges: hasChanges,
            customMessage: customMessage,
            formType: currentState.formType,
            isSystemLocked: isSystemLocked,   // ล็อคทุกอย่าง (รออนุมัติ) Lock All: ปิดทุกปุ่ม (Add/Save/Confirm)
            isConfirmLocked: isDataIncomplete, // ล็อคแค่ปุ่มยืนยัน (ข้อมูลไม่ครบ) Lock Confirm: ปิดแค่ปุ่มยืนยัน
            pull_data: currentState.pull_data,
            pull_data_date: currentState.pull_data_date,
            pull_status: currentState.pull_status,
            status_pull_msg: currentState.status_pull_msg
        };
        // DEBUG: comment log ตรวจสอบการแสดงผลข้อมูลที่ส่งไป SelectBarRenderer.js
        // console.log(controlData);

        // สั่ง Render SelectBar บรรทัดนี้จะทำการสร้าง UI และ DOM
        this.controlsRenderer.render(controlData);

        // สั่ง Render Table (ตารางข้อมูล) บรรทัดนี้จะทำการสร้าง UI และ DOM
        this.tableRenderer.render({
            ...currentState,
            data: dataToRender, // <-- ตอนนี้ส่งข้อมูลจริงไปแล้ว
            revision: currentState.revision,
            status_message: currentState.status_message,
            isLocked: isSystemLocked  // <-- Renderer จะเอาตัวนี้ไปทำ opacity: 0.5
        }); 
        // ==========================================================
        // เช็คว่ามี Action ใหม่เกิดขึ้นหรือไม่ (ดูจากเวลา)
        // ==========================================================
        // ถ้ามี lastActionTime และ เวลานั้น "ใหม่กว่า" ครั้งล่าสุดที่ Render
        if (currentState.lastActionTime && currentState.lastActionTime !== this.lastRenderedTime) {            
            // สั่ง Scroll ไปหา ID นั้น
            this._autoScrollToFocusRow(currentState.lastActionId);            
            // อัปเดตเวลาล่าสุดที่ทำรายการไปแล้ว
            this.lastRenderedTime = currentState.lastActionTime;
        }
    }

    /**
     * Event Handler หลักสำหรับจัดการการคลิกปุ่มต่างๆ บน SelectBar (แถบเมนูด้านบน)
     * รองรับปุ่ม: เพิ่มข้อมูล, ยืนยันการนำส่ง, เปรียบเทียบ, กลับ
     */
    async _handleSelectBarClick(e) {
        // instance varable ด้วย event จะดึง id ของ ปุ่มที่กำหนดไว้ใน SelectBarRenderer.js
        const targetId = e.target.id;
        // ดึง State ล่าสุดมาเตรียมไว้ (เพราะต้องใช้ข้อมูลในนั้นไป process ต่อ)
        const state = this.store.getState();

        // ==============================
        // CASE 1: ปุ่ม "เพิ่มข้อมูล" (Add)
        // ==============================
        if (targetId === 'btn-add') {
            // DEBUG: comment log ตรวจสอบปุ่มทำงานได้ไหม
            // console.log("[App] Add button clicked");
            
            // 1. เตรียม Config สำหรับ Popup (รวม Options ของ Dropdown เข้าไปใน Config)
            const stitchedPopupConfig = this._getStitchedPopupConfig(state);
            
            // 2. ใช้ localStorage เป็นตัวกลางส่งข้อมูลข้ามไปหน้า Popup
            // - popupConfig: โครงสร้างฟอร์ม + options
            localStorage.setItem('popupConfig', JSON.stringify(stitchedPopupConfig));
            // - ลบ editData/originalData ทิ้ง เพื่อให้ Popup รู้ว่าเป็นโหมด "เพิ่มใหม่"
            localStorage.removeItem('editData');
            localStorage.removeItem('originalData');
            // เปิด window popup                                
            this._openPopup('frm_popup_row.php');
        }
        // ============================================
        // CASE 2: ปุ่ม "ยืนยันการนำส่ง" (Confirm / Save)
        // ============================================
        if (targetId === 'btn-confirm') {
            // ====================================================================
            // [NEW LOGIC] ตรวจสอบ Required Fields (ข้อมูลห้ามเป็นค่าว่าง)
            // ====================================================================
            // 2.1 ดึงรายชื่อ Field ที่บังคับกรอก (required: true) ออกมาจาก popup config
            const requiredFields = [];
            const scanRequiredFields = (configList) => {
                if (!Array.isArray(configList)) return;
                configList.forEach(field => {
                    // เช็ค property required (รองรับทั้ง boolean และ string)
                    if (field.required === true || field.required === 'true') {
                        requiredFields.push({
                            key: field.uniqid,
                            // เก็บชื่อ Label ไว้แสดงผล Error (ลบเครื่องหมาย : และ * ออกเพื่อความสวยงาม)
                            label: (field.label || field.uniqid).replace(/[:*]/g, '').trim()
                        });
                    }
                    // สแกนหาใน sub-form หรือ options เผื่อมี nested required
                    if (field.options && Array.isArray(field.options)) {
                        field.options.forEach(opt => {
                            if (opt.popup) scanRequiredFields(opt.popup);
                        });
                    }
                });
            };
            scanRequiredFields(state.popup); // เริ่มสแกนจาก Root Popup

            // console.log(requiredFields);
            // 2.2 วนลูปตรวจสอบข้อมูลทุกแถวใน State
            let validationError = null;
            for (let i = 0; i < state.data.length; i++) {
                const item = state.data[i];
                
                // ข้ามรายการที่ถูกสั่งลบไปแล้ว ไม่ต้องนำมาตรวจสอบ
                if (item._status === 'deleted' || item._status === 'temp_deleted') continue;

                // [NEW] ตัวแปร Array สำหรับเก็บรายชื่อฟิลด์ (Label) ที่ยังไม่ได้กรอกเฉพาะแถวนี้
                let missingLabelsInRow = [];

                // ตรวจสอบกับฟิลด์ที่บังคับกรอก
                for (const reqField of requiredFields) {
                    const val = item[reqField.key];
                    
                    // เงื่อนไขค่าว่าง: undefined, null หรือ string ว่าง (trim แล้ว)
                    if (val === undefined || val === null || String(val).trim() === '') {
                        // เก็บชื่อ label ใส่ array ไว้ก่อน (ยังไม่หยุดการทำงานของลูปนี้ เพื่อหาฟิลด์อื่นต่อ)
                        missingLabelsInRow.push(reqField.label);
                    }
                    // เงื่อนไขค่าว่าง: undefined, null หรือ string ว่าง (trim แล้ว)
                    // if (val === undefined || val === null || String(val).trim() === '') {
                    //     // เก็บข้อความ Error พร้อมระบุแถว (Row Index) ให้ User ทราบ
                    //     validationError = `ตรวจสอบพบข้อมูลไม่สมบูรณ์!\n\nกรุณากรอกข้อมูล "${reqField.label}"\n(รายการแถวที่ ${i + 1})`;
                    //     break; // หยุดหาฟิลด์อื่นในแถวนี้
                    // }
                }
                // if (validationError) break; // เจอ Error แล้ว หยุดวนลูปแถวถัดไปทันที
                // ถ้าพบว่ามีข้อมูลที่ไม่ได้กรอกอย่างน้อย 1 ช่องในแถวนี้
                if (missingLabelsInRow.length > 0) {
                    // [แก้ไข] นำรายชื่อ Label มาเรียงต่อกันเป็นลิสต์ตัวเลข (1., 2., 3.)
                    const missingListText = missingLabelsInRow.map((label, index) => `${index + 1}. ${label}`).join('\n');
                    
                    // สร้างข้อความ Error แจ้งเตือนแบบสรุปรวม
                    validationError = `ตรวจสอบพบข้อมูลไม่สมบูรณ์ใน รายการแถวที่ ${i + 1}\n\nกรุณากรอกข้อมูลต่อไปนี้ให้ครบถ้วน:\n${missingListText}`;
                    
                    // Break เพื่อหยุดการตรวจสอบแถวถัดไป
                    break; 
                }
            }

            // 2.3 ถ้าพบ Error ให้แจ้งเตือนและหยุดการทำงานทันที (ไม่ส่งข้อมูลไป Server)
            if (validationError) {
                await this._showConfirmationModal(validationError);
                return; // จบการทำงาน
            }
            // ====================================================================

            // DEBUG: comment log ตรวจสอบปุ่มทำงานได้ไหม
            // console.log("[App] Confirm button clicked");

            // 1. Filter ข้อมูล: แยกแยะรายการตามสถานะเพื่อเตรียมส่ง Server-side (".../process_detail_type.php")
            // - itemsToAdd: ข้อมูลใหม่ (status 'new') หรือ pristine (เผื่อกรณี logic พิเศษ)
            const itemsToAdd = state.data.filter(item => (item._status === 'new' ||  item._status == 'pristine'));
            // - itemsToEdit: ข้อมูลที่มีการแก้ไข
            const itemsToEdit = state.data.filter(item => item._status === 'edited');
            // - itemsToDelete: ข้อมูลที่ถูกสั่งลบ
            const itemsToDelete = state.data.filter(item => item._status === 'deleted');

            // (ตัวแปรช่วยเช็ค Validation: ดูเฉพาะรายการใหม่จริงๆ) ใช้ในการตรวจสอบเท่านั้น
            const itemsToCheckNewOnly = state.data.filter(item => item._status === 'new');

            // DEBUG: comment log ตรวจสอบข้อมูลก่อนนำส่ง
            // console.log({ "new": itemsToAdd, "edit": itemsToEdit, "delete": itemsToDelete});
            
            // 2. Validation: ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่?
            // ถ้าไม่มีการเพิ่ม, แก้ไข, หรือลบเลย -> ให้แจ้งเตือนและหยุดทำงานทันที
            if (itemsToCheckNewOnly.length === 0 && itemsToEdit.length === 0 && itemsToDelete.length === 0) {
                console.log("[App] No changes found. Aborting confirm.");
                await this._showConfirmationModal("ไม่มีการเพิ่ม, แก้ไข, หรือลบข้อมูล");
                return; // <-- หยุดการทำงาน
            }
            
            // 3. UI Feedback: ล็อคปุ่มกันการกดซ้ำ และเปลี่ยนข้อความ
            const confirmButton = e.target;

            // 4. Prepare Payload: สร้าง Object ข้อมูลที่จะส่ง
            const payloadToSend = {
                added: itemsToAdd,
                edited: itemsToEdit,
                deleted: itemsToDelete,              
                search_date: this.searchDate,
                focus_report: this.currentReportName
            };
            // สร้าง URL ปลายทาง มี Standrad ตามโครงสร้าง folder ดังนี้
            // นำหน้าด้วยชือย่อรายงาน เช่น "ipi/process_detail_type.php"
            // ภายใน folder ต้องมี file ชื่อ process_detail_type.php
            const endpoint = `${this.currentReportName}/process_detail_type.php`;

            // 5. User Confirmation: ถามยืนยันครั้งสุดท้ายก่อนส่งจริง
            const confirmed = await this._showConfirmationModal(`ยืนยันการนำส่งข้อมูล? (เพิ่ม ${itemsToCheckNewOnly.length} รายการ, แก้ไข ${itemsToEdit.length} รายการ, ลบ ${itemsToDelete.length} รายการ)`, 'submit');
            if (!confirmed) return;

            // ล็อคปุ่มหลังจากยืนยันแล้ว
            confirmButton.disabled = true;
            confirmButton.textContent = 'กำลังบันทึก...';

            // 6. Packing Data: ห่อข้อมูลด้วย FormData (เพื่อรองรับการส่งแบบ POST ปกติ)
            const formData = new FormData();
            /** ห่อหุ้มด้วย key "data" เพื่อให้เรียกใช้ในหน้า process ได้ */
            formData.append('data', JSON.stringify(payloadToSend));

            try {
                // DEBUG: comment log ตรวจสอบ endpoint และ ข้อมูลที่ส่ง
                // console.log(`[App] Sending payload to ${endpoint}:`, payloadToSend);

                // 7. Execute Request: ยิงข้อมูลไปที่ Server-side
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData // <-- ส่ง "data" ทั้งก้อน
                });

                // ตรวจสอบ HTTP Error
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Server responded with ${response.status}: ${errorText}`);
                }

                // 8. Handle Response: รับผลลัพธ์จาก Server
                const result = await response.json();
                if(result.status == 'success'){
                    // status = 'success' คือบันทึกสำเร็จ   
                    await this._showConfirmationModal(result.message);
                    // DEBUG : comment นี้ใช้สำหรับ test หากต้องการดูข้อมูล response จาก process เช่น
                    // console.log("[App] Confirm success:", result);                  
                    // await this._showConfirmationModal("บันทึกข้อมูลสำเร็จ!");

                    // 9. Update Revision: สำคัญมาก! 
                    // เมื่อบันทึกเสร็จ จะได้ Revision Number ใหม่มา
                    // เราต้อง Reload หน้าเว็บพร้อมกับ rev ใหม่ เพื่อให้เห็นข้อมูลเวอร์ชันล่าสุด
                    // this._fetchInitialData();
                    const newRev = result.data.new_rev;
                    const currentParams = new URLSearchParams(window.location.search);
                    // ต้องส่ง rev ทุกครั้งหลังทำรายการสำเร็จ
                    currentParams.set('rev', newRev); // อัปเดต param 'rev'
                    window.location.search = currentParams.toString(); // สั่ง Reload หน้าเว็บ
                }else{
                    // กรณี Server ตอบกลับว่าไม่สำเร็จ (Logic Error)
                    await this._showConfirmationModal(result.message);
                }                                
            } catch (error) {       
                // กรณีเกิด Error ระหว่างการส่ง (Network Fail, Syntax Error)         
                console.error('[App] Confirm failed:', error);
                // DEBUG comment นี้ใช้สำหรับ test หากเกิด error กรณี ล้มเหลว
                // await this._showConfirmationModal(`เกิดข้อผิดพลาด: ${error.message}`);            
            } finally {
                // 10. Cleanup: ปลดล็อคปุ่มเสมอ ไม่ว่าจะสำเร็จหรือล้มเหลว
                confirmButton.disabled = false;
                confirmButton.textContent = 'ยืนยันการนำส่ง';
            }
        }
        // =========================================
        // CASE 3: ปุ่ม "เปรียบเทียบข้อมูล" (Compare)
        // =========================================
        if (targetId === 'btn-compare') {
            // DEBUG: comment log ตรวจสอบปุ่มทำงานได้ไหม
            // console.log("[App] Compare button clicked. Opening compare page...");
            
            // 1. อ่านค่า Params ปัจจุบันจาก URL (ที่ SelectBar ตั้งไว้)
            const urlParams = new URLSearchParams(window.location.search);
            const search_date = urlParams.get('search_date');
            const rev = urlParams.get('rev');

            // 2. อ่านค่าจาก Dropdown เดือน/ปี (เพื่อนำไปแสดงเป็น Title ในหน้าถัดไป)
            const monthEl = this.selectBarContainer.querySelector('#month_select');
            const yearEl = this.selectBarContainer.querySelector('#year_select');
            
            // 3. สร้าง URL Parameters สำหรับหน้า Compare (Query String ใหม่สำหรับหน้า Compare)
            const compareParams = new URLSearchParams();
            compareParams.set('focus_report', this.currentReportName);
            
            if (search_date) compareParams.set('search_date', search_date);
            if (rev) compareParams.set('rev1', rev); // (ส่ง rev ปัจจุบันไปเป็น 'rev1')
            
            // (ใช้ค่าจาก <select> สำหรับ 'month' และ 'year' (สำหรับ Title ในหน้า Compare))
            if (monthEl) compareParams.set('month', monthEl.value);
            if (yearEl) compareParams.set('year', yearEl.value);

            // 4. เปลี่ยนหน้าไปยัง frm_compare.php
            // *** หมายเหตุ: การใช้ '_self' จะเปิดในหน้าเดิม ***
            this._openPopup(`frm_compare.php?${compareParams.toString()}`, '_self');
        }
        // =================================
        // CASE 4: ปุ่ม "ย้อนกลับ" (Back)
        // =================================
        if (targetId === 'btn-back') {
            console.log("[App] Back button clicked. Navigating back.");
            // (การใช้ 'history.back()' อาจไม่ปลอดภัยถ้าผู้ใช้มาหน้านี้โดยตรง)
            // ย้อนกลับไปหน้า Index ของ Report นั้นๆ
            window.location.href = `frm_index.php?focus_report=${this.currentReportName}`; // (ตัวอย่าง: กลับไป 2 ระดับ)
        }
        // =========================================
        // CASE 5: ปุ่ม "ดำเนินการดึงข้อมูล" (Execute Pull Data)
        // =========================================
        if (targetId === 'btn-execute-pull') {
            // ===================================================================
            // [NEW GUARD CLAUSE] ตรวจสอบก่อนว่า Store มีข้อมูลอยู่แล้วหรือไม่
            // ===================================================================
            // กรองเอาเฉพาะข้อมูลที่ยังไม่ถูกลบ (_status !== 'deleted') มานับ
            const newDataCount = state.data.filter(d => d._status == 'pristine').length;
            if (newDataCount > 0) {
                await this._showConfirmationModal("ไม่สามารถดำเนินการได้ เนื่องจากมีข้อมูลอยู่ในตารางแล้ว", "notice");
                return; // หยุดการทำงานทันที (ไม่ไปต่อ)
            }
            // [NEW] 1. อ่านค่าสถานะ Checkbox ว่าถูกติ๊ก (ระบุเอง) หรือไม่
            const chkCustomDate = this.selectBarContainer.querySelector('#chk_custom_pull_date');
            const isCustomDateChecked = chkCustomDate ? chkCustomDate.checked : false;
            
            let pullSearchDate = "";
            let confirmMessage = "ต้องการดึงข้อมูลตั้งต้น (Prepare Data) จากวันที่ล่าสุด ใช่หรือไม่?\n\n* ข้อมูลปัจจุบันที่ยังไม่บันทึกอาจสูญหาย";
            const isPullDataDateEnabled = state.pull_data_date === true;
            // ถ้าเปิดโหมดวันที่ ถึงจะไปพยายามอ่านค่าจาก Dropdown
            if (isPullDataDateEnabled) {
                // 1. อ่านค่าเดือน/ปี "อ้างอิง" ที่ผู้ใช้ต้องการดึง
                const pullMonthEl = this.selectBarContainer.querySelector('#pull_month_select');
                const pullYearEl = this.selectBarContainer.querySelector('#pull_year_select');
                
                if (pullMonthEl && pullYearEl) {
                    const pullMonth = pullMonthEl.value;
                    const pullYear = pullYearEl.value;
                    // คำนวณหาวันสิ้นเดือนของเดือนอ้างอิง (เพื่อส่งไปให้ PHP)
                    const pullLastDayDate = new Date(pullYear, pullMonth, 0); 
                    pullSearchDate = `${pullYear}-${pullMonth}-${pullLastDayDate.getDate().toString().padStart(2, '0')}`;
                }

                if(isCustomDateChecked) {
                    confirmMessage = `ต้องการดึงข้อมูลตั้งต้น (Prepare Data) จากวันที่ \n${pullSearchDate} ใช่หรือไม่?\n\n* ข้อมูลปัจจุบันที่ยังไม่บันทึกอาจสูญหาย`;
                }
            }
            // alert ยืนยันก่อนเริ่มดึงข้อมูล
            const confirmed = await this._showConfirmationModal(confirmMessage, 'submit');

            if (confirmed) {
                // 3. ยิง API คล้ายๆ _fetchInitialData แต่เพิ่ม Flag หรือส่งวันที่อ้างอิงไป
                this.tableContainer.innerHTML = '<p class="loading-message">กำลังดึงข้อมูลอ้างอิง...</p>';

                const params = new URLSearchParams({
                    focus_report: this.currentReportName, 
                    search_date: this.searchDate, // วันที่ของรายงานปัจจุบัน
                    is_custom_pull_date: isCustomDateChecked ? '1' : '0',
                    focus_window: 'main',
                    criteria: 'prepare_data'
                });
                // แนบวันที่ไปด้วย เฉพาะกรณีที่มีค่าเท่านั้น (ลดขยะใน Payload) วันที่ของข้อมูลอ้างอิง (ส่งไปให้ PHP จัดการ prepare_data)
                if (pullSearchDate !== "") {
                    params.append('pull_reference_date', pullSearchDate);
                }

                const API_ENDPOINT = `${this.currentReportName}/fetch_sys_data.php?${params.toString()}`;

                try {
                    const response = await fetch(API_ENDPOINT);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    
                    const data = await response.json();

                    // อัปเดตข้อมูลเข้า Store 
                    this.store.dispatch({ type: 'LOAD_DATA', payload: data });
                    
                    // ปิด Panel และแจ้งเตือน
                    this.selectBarContainer.querySelector('#pull-data-panel').style.display = 'none';

                    // ตรวจสอบ pull status และ message log จาก server-side
                    let alertMessage = "";
                    if (data.pull_status === true) {
                        // กรณี true: ใช้ข้อความมาตรฐานจาก Client
                        alertMessage = 'ดึงข้อมูลตั้งต้นเรียบร้อยแล้ว กรุณาตรวจสอบและกดยืนยันการนำส่ง';
                    } else {
                        // กรณี false (หรือไม่มี key นี้): ใช้ข้อความจาก Server (ถ้า Server ไม่ได้ส่งมาให้ fallback เป็นข้อความ default)
                        alertMessage = data.status_pull_msg || 'ดึงข้อมูลเสร็จสิ้น แต่ไม่พบข้อมูลในระบบ';
                    }
                    // แสดงข้อความแจ้งเตือน (สามารถใช้ type 'notice' หรือ 'submit' ก็ได้)
                    await this._showConfirmationModal(alertMessage, 'notice');
                } catch (error) {
                    console.error('Pull Data Error:', error);
                    await this._showConfirmationModal(`เกิดข้อผิดพลาด: ${error.message}`);
                }
            }
        }
    }

    /**
     * Event Handler สำหรับจัดการคลิกภายในตาราง (Table Container)
     * ใช้หลักการ Event Delegation: ผูก event ที่ <table> แต่ดักจับการกดปุ่มข้างใน
     */
    async _handleTableClick(e) {
        const target = e.target;
        // DEBUG: ตรวจสอบ event
        // console.log(target);
        const id = target.dataset.id;
        const rowIndex = target.dataset.index;
        // DEBUG: ตรวจสอบ rowIndex คือ run number นำมาใช้บอกว่า user กำลังลบแถวไหน
        // console.log(rowIndex);

        // Guard Clause: ถ้าสิ่งที่คลิกไม่มี id (เช่น คลิกโดนพื้นที่ว่าง หรือ text) ให้จบการทำงาน
        if (!id) return;

        // =========================================================
        // CASE 1: ปุ่ม "แก้ไข" (Edit)
        // =========================================================
        if (target.classList.contains('btn-edit')) {
            console.log(`[App] Edit button clicked for ID: ${id}`);
            const state = this.store.getState();

            // 2. ค้นหาข้อมูลจาก State โดยใช้ ID
            // รองรับทั้ง id (เพิ่มใหม่), autoID (จาก database)
            // 2.1 ข้อมูลปัจจุบัน (Working Copy): ข้อมูลล่าสุดที่อาจถูกแก้ไปแล้ว (เอาไว้โชว์ในฟอร์ม)
            const currentItem = state.data.find(item => (item.id || item.autoID || item.book_id) == id);
            // 2.2 ข้อมูลดั้งเดิม (Pristine Copy): ข้อมูลดิบจาก DB (เอาไว้เปรียบเทียบว่ามีการแก้ไขจริงไหม)
            const originalItem = state.originalData.find(item => (item.id || item.autoID || item.book_id) == id);
            if (currentItem) {
                // 3. เตรียม Config: ผูก Options (Dropdown) เข้ากับ Config ของ Popup
                const stitchedPopupConfig = this._getStitchedPopupConfig(state);
                
                // 4. ส่งข้อมูลข้ามหน้าต่างผ่าน localStorage
                // - popupConfig: โครงสร้างฟอร์ม                                
                localStorage.setItem('popupConfig', JSON.stringify(stitchedPopupConfig));
                // - editData: ข้อมูลที่จะนำไปแสดงใน Input fields
                // (ส่ง "Working Copy" ให้ฟอร์ม (เพื่อให้ User เห็นค่าล่าสุดที่เขาแก้))
                localStorage.setItem('editData', JSON.stringify(currentItem));
                // - originalData: ข้อมูลตั้งต้น (ใช้เช็ค dirty state หรือ restore ค่า)
                // (ส่ง "Pristine Copy" ให้ฟอร์ม (เพื่อให้ _isDataChanged ใช้เปรียบเทียบ))
                localStorage.setItem('originalData', JSON.stringify(originalItem));
                // 5. เปิดหน้า Popup แก้ไข
                this._openPopup('frm_popup_row.php');
            } else {
                console.warn(`[App] Edit error: Could not find item with ID: ${id}`);
            }
        }

        // =========================================================
        // CASE 2: ปุ่ม "ลบ" (Delete)
        // =========================================================
        if (target.classList.contains('btn-delete')) {
            // DEBUG: comment log ตรวจสอบการทำงานนำ id มาด้วยหรือไม่
            // console.log(`[App] Delete button clicked for ID: ${id}`);

            // 1. แสดง Modal ยืนยัน (ต้องรอ user กดก่อน ถึงจะไปต่อได้ด้วย await)
            const confirmed = await this._showConfirmationModal(`คุณต้องการลบข้อมูล No.${rowIndex}`, 'submit');
            if (confirmed) {
                // DEBUG: comment log ตรวจสอบ id ถูกส่งไป Store หรือไม่
                console.log(`[App] Deleting item ID: ${id}`);
                // 2. ส่งคำสั่งลบไปที่ Store
                this.store.dispatch({ type: 'DELETE_ITEM', payload: { id: id } });
            }
        }

        // =========================================================
        // CASE 3: ปุ่ม "ยกเลิกการลบ" (Undo Delete)
        // =========================================================
        if (target.classList.contains('btn-undo')) {
            // DEBUG: comment log ตรวจสอบการทำงานนำ id มาด้วยหรือไม่
            console.log(`[App] Undo button clicked for ID: ${id}`);
            // (ไม่ต้อง Confirm, กดแล้ว Undo คืนค่าทันที)
            this.store.dispatch({ type: 'UNDO_DELETE_ITEM', payload: { id: id } });
        }
    }

    /**
     * Helper Function: สำหรับ map BOT_CODE select ข้อมูล Options เข้ากับ Config ของ Popup
     * หน้าที่: นำข้อมูล Master Data (เช่น รายชื่อธนาคาร, ประเภทดอกเบี้ย, CODE_BOT) ที่โหลดมาเก็บไว้ใน State
     * ยัดเข้าไปใน Property 'options' ของ Field นั้นๆ เพื่อให้หน้า Popup สามารถสร้าง <select> ได้ทันที
     * * @param {Object} state - State ทั้งหมดของ Store
     * @returns {Array} - Array ของ Popup Config ที่มี options ครบถ้วนพร้อมใช้งาน
     */
    _getStitchedPopupConfig(state) {
        // DEBUG: ตรวจสอบ function ทำงานได้หรือไม่
        // console.log('[App] Stitching popup config...');

        // วนลูป state.popup (ซึ่งเป็น Array โครงสร้างฟอร์มจาก JSON)
        // ใช้ .map เพื่อสร้าง Array ใหม่ (ไม่ไปแก้ไข state เดิมโดยตรง - Immutability)
        return state.popup.map(field => {
            // ตรวจสอบ 2 เงื่อนไข:
            // 1. เป็น input ประเภท 'select' (Dropdown) หรือไม่?
            // 2. ใน State มีข้อมูล options สำหรับ field นี้หรือไม่? (โดยดูจาก key ที่ชื่อตรงกับ uniqid)
            //    เช่น field.uniqid = 'fi_reporting_group_id' -> ก็ไปหา state['fi_reporting_group_id']
            if (field.element === 'select' && state[field.uniqid]) {
                // DEBUG: ตรวจสอบมี uniqid ที่ชือตรงกันหรือไม่
                // console.log(`[App] -> Attaching ${state[field.uniqid].length} options to "${field.uniqid}"`);

                // กรณีเจอ: ให้ Clone field เดิม แล้วเพิ่ม/ทับ property "options" ลงไป
                return {
                    ...field, // copy ค่า config เดิม (label, element, etc.) ที่ได้จาก models/data_config.json
                    options: state[field.uniqid] // แนบ Array ตัวเลือกเข้าไป (field.uniqid)
                };
            }
            // กรณีไม่เจอ หรือไม่ใช่ select: ให้คืนค่า config เดิมกลับไปตรงๆ
            return field;
        });
    }

    /**
     * ใช้สำหรับเปิด window.popup รับ parameter 2 ตัว
     * 1.pathFile : Endpoint ที่เรากำหนด
     * 2.type : default เป็น "_blank" หมายถึงเปิด window ใหม่
     */
    _openPopup(pahtFile, type="_blank") {
        var popupWidth = 900;
        var popupHeight = 750;
        var left = (screen.width - popupWidth) / 2;
        var top = (screen.height - popupHeight) / 2;
        var popupWindow = window.open(pahtFile, type, "width=" + popupWidth + ",height=" + popupHeight + ",left=" + left + ",top=" + top + ",resizable=yes,scrollbars=yes");
        if (popupWindow) popupWindow.focus();
        return popupWindow;
    }

    /**
     * Helper Method: สร้าง Modal ยืนยัน (Custom Confirm Box) 
     * @param {string} message - ข้อความที่จะแสดงในกล่อง
     * @param {string} type - 'submit' (มีปุ่มยืนยัน/ยกเลิก) หรือ 'notice' (มีปุ่มรับทราบปุ่มเดียว)
     * @returns {Promise<boolean>} - คืนค่า Promise ที่จะ Resolve เป็น true (ยืนยัน) หรือ false (ยกเลิก)
     * ทำให้สามารถเรียกใช้แบบ await ได้ เช่น: const result = await this._showConfirmationModal("...");
     */
    _showConfirmationModal(message, type='notice') {
        // ห่อด้วย Promise เพื่อให้ Code ฝั่งคนเรียกสามารถ "รอ" (await) จนกว่า user จะกดปุ่มได้
        return new Promise((resolve) => {
            // 1. สร้าง Overlay (พื้นหลังสีดำจางๆ)
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; align-items: center; justify-content: center;';
            // 2. สร้างกล่อง Modal (สีขาว ตรงกลาง)
            const modal = document.createElement('div');
            modal.style.cssText = 'background: white; padding: 25px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 90%; max-width: 400px; text-align: center;';
            // 3. ใส่ข้อความ
            const msg = document.createElement('p');
            msg.textContent = message;
            msg.style.cssText = 'margin: 0 0 20px; font-size: 16px; white-space: pre-wrap;';
            // 4. สร้าง Container สำหรับปุ่มกด
            const btnContainer = document.createElement('div');
            btnContainer.style.cssText = 'display: flex; justify-content: center; gap: 10px;';

            // --- Logic การจัดการ Event ---
            // ฟังก์ชันย่อยสำหรับปิด Modal
            // ทำหน้าที่: ลบ Element ออกจากหน้าจอ และส่งค่าผลลัพธ์กลับไป (Resolve)
            const closeModal = (result) => {
                document.body.removeChild(overlay); // Cleanup DOM
                resolve(result); // ส่งค่า true/false กลับไปที่ await
            };
            // ===================================================================================
            // LOGIC ตรวจสอบประเภท (Type) ของ Modal เพื่อความรัดกุมจะเขียน if-condition กำหนด type
            // ===================================================================================
            if(type == 'submit'){
                // ปุ่ม "ยืนยัน" (สีแดง ตามสไตล์ปุ่ม Delete หรือ Action สำคัญ)
                const btnConfirm = document.createElement('button');
                btnConfirm.textContent = 'ยืนยัน';
                btnConfirm.style.cssText = 'padding: 8px 15px; border: none; border-radius: 5px; background: #d9534f; color: white; cursor: pointer;';
                btnConfirm.onclick = () => closeModal(true);
                // ปุ่ม "ยกเลิก" (สีเทา)
                const btnCancel = document.createElement('button');
                btnCancel.textContent = 'ยกเลิก';
                btnCancel.style.cssText = 'padding: 8px 15px; border: 1px solid #ccc; border-radius: 5px; background: #f4f4f4; color: #333; cursor: pointer;';                
                btnCancel.onclick = () => closeModal(false);
                // ประกอบร่าง HTML Elements
                btnContainer.appendChild(btnCancel);
                btnContainer.appendChild(btnConfirm);
            }else if(type == 'notice'){
                // กรณี 'notice' (หรือส่ง type อื่นๆ มาผิด จะตกมาเข้าเคสนี้เป็น Default เพื่อความปลอดภัย)
                // ต้องการแค่แจ้งให้ทราบ (Acknowledge)
                const btnNotice = document.createElement('button');
                btnNotice.textContent = 'ตกลง'; // ใช้คำว่า 'ตกลง' ให้เหมาะกับการเป็น Notice
                btnNotice.style.cssText = 'padding: 8px 25px; border: none; border-radius: 5px; background: #007bff; color: white; cursor: pointer;';
                btnNotice.onclick = () => closeModal(false); // คืนค่า false ตามที่คุณต้องการ

                btnContainer.appendChild(btnNotice);
            }
            
            modal.appendChild(msg);
            modal.appendChild(btnContainer);
            overlay.appendChild(modal);
            // 5. นำไปแปะที่ Body เพื่อแสดงผล
            document.body.appendChild(overlay);
        
            // Event: คลิกที่พื้นหลัง (Overlay) -> ถือว่ายกเลิก (ส่งค่า false)
            // overlay.onclick = (e) => { if (e.target === overlay) closeModal(false); };
        });
    }
}