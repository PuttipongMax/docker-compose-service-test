/**
 * คลาสสำหรับจัดการการแสดงผล "ตารางข้อมูล" (Table View)
 * หน้าที่: รับข้อมูล (Data State) เข้ามา แล้ววาดเป็น HTML Table ที่สวยงาม
 * รองรับการแสดงผลทั้งแบบ:
 * 1. List View (ตารางรายการทั่วไป)
 * 2. Group View (ตารางแบบจัดกลุ่มฟอร์ม)
 */
class ReportRenderer {
    /**
     * param {HTMLElement} containerElement - DOM Element ที่จะให้วาดตารางใส่เข้าไป รับมาจาก index.js
     */
    constructor(containerElement) {
        // 1. Validation: ตรวจสอบว่ามี Container จริงหรือไม่
        if (!containerElement) {
            throw new Error('ReportRenderer needs a container element!');
        }
        // DEBUG: comment log ตรวจสอบ constructor ทำงานได้หรือไม่
        // console.log('[ReportRenderer.js] Constructed.');

        // 2. เก็บ Element หลักไว้ใช้งานตลอดทั้ง Class
        this.container = containerElement;

        // 3. ใช้สำหรับ รายงานประเภท group
        // --- Config สำหรับการเลื่อนดูข้อมูลทีละ Record ---
        // (ตัวแปรนี้อาจใช้ในกรณี Form Type แบบ 'Single View' หรือการกดดูทีละใบ)
        this.currentDataIndex = 0; // เริ่มต้นที่ข้อมูลตัวแรก (Index 0)
    }

    /**
     * วาดตารางใหม่ทั้งหมดจาก State (Main Render Function)
     * param {Object} state - ข้อมูล State ทั้งหมดที่มาจาก Store
     */
    render(state) {
        const { columns, data, formType, popup, revision } = state;

        if (!columns) {
            console.warn('[ReportRenderer.js] Render aborted, state is missing columns.');
            return;
        }
        // DEBUG: comment log ตรวจสอบข้อมูล formType และ data
        // console.log(`[ReportRenderer.js] Rendering table. FormType: "${formType}". Data rows: ${data ? data.length : 0}`);

        // Reset: ล้างของเก่าทิ้งก่อนวาดใหม่ (เพื่อไม่ให้ตารางซ้อนกัน)
        this.container.innerHTML = '';

        // 1. สร้าง Wrapper
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-scroll-wrapper';
        
        tableWrapper.style.cssText = `
            height: calc(100vh - 320px);
            width: 100%; 
            overflow: auto;
        `;

        // สร้างหัวตาราง HTML Table พื้นฐาน
        const table = document.createElement('table');
        table.className = 'report-table';        
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // =========================================================
        // 2. Header Rendering (สร้างแถวตาราง)
        // =========================================================
        const headerRow = document.createElement('tr');
        // ตรวจสอบ config ของแต่ละรายงานเพื่อแสดงผล
        const visibleColumns = columns.filter(col => {
            const field = col.fieldData;        
            // 1. กรอง ID/autoID ออกเสมอ (บังคับซ่อน)
            if (field === 'autoID' || field === 'id') {
                return false;
            }
            // 2. ตรวจสอบ Key: visibility (ถ้าระบุมา ให้ยึดตามนี้เป็นหลัก)
            if (col.visibility === true || col.visibility === "true") {
                return true; // บังคับแสดง (ผ่านฉลุย แม้จะลงท้ายด้วย _des)
            }
            if (col.visibility === false || col.visibility === "false") {
                return false; // บังคับซ่อน
            }
            // 3. กรณีไม่มี Key visibility (Default Behavior)
            // ให้แสดงทุกคอลัมน์ ยกเว้นตัวที่ลงท้ายด้วย _des
            return !(typeof field === 'string' && field.endsWith('_des'));
        });

        // 1. ตั้งค่า CSS สำหรับคอลัมน์ "ปกติ" (ติดแค่ด้านบน top: 0 อย่างเดียว)
        // แนะนำให้ใส่ background-color สีพื้นฐานไว้ด้วย กันข้อมูลด้านล่างเลื่อนมาทะลุหัวตาราง
        const baseStickyStyle = `
            position: sticky; 
            top: 0; 
            z-index: 10; 
            background-color: #7cb3f5; /* สีเทาอ่อนๆ ของหัวตารางปกติ */
            box-shadow: 0 2px 2px -1px rgba(0,0,0,0.2);
        `;

        // วนลูปสร้างหัวตารางปกติ
        visibleColumns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.header;        
            let currentThStyle = baseStickyStyle;
            th.style.cssText = currentThStyle;
            headerRow.appendChild(th);
        });

        // 2. สร้าง Header สำหรับ "Actions" โดยเฉพาะ เพื่อ Freeze column "Actions"
        const thActions = document.createElement('th');
        thActions.textContent = 'Actions';
        thActions.style.cssText = `
            position: sticky; 
            top: 0;
            right: 0;       
            z-index: 11;
            background-color: #7cb3f5; 
            border-left: 1px solid #5a9aec; 
            box-shadow: -3px 2px 5px -2px rgba(0,0,0,0.15);
        `;

        headerRow.appendChild(thActions);        
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // =========================================================
        // 1. Data Preparation (เตรียมข้อมูล)
        // =========================================================
        // สร้าง "Type Map" เพื่อให้รู้ว่า field ไหนต้องจัด Format เป็นตัวเลข (number)
        // (แปลงจาก Array เป็น Object { typeData: 'number' } เพื่อให้ค้นหาเร็ว O(1))
        const typeDataMap = {};
        if (popup) {
            popup.forEach(field => {
                if (field.typeData) typeDataMap[field.uniqid] = field.typeData.toLowerCase();
            });
        }

        // =========================================================
        // 3. Status & Logic Checking (ตรวจสอบสถานะ)
        // =========================================================
        // หา Revision ที่กำลังเลือกอยู่ (Selected)
        let currentRevStatus = '0'; 
        let currentRevValue = '';
        if (revision && Array.isArray(revision)) {
            const activeItem = revision.find(r => r.selected === true || r.selected === 'true');
            if (activeItem) {
                currentRevStatus = String(activeItem.status_appv); // '0'=รอ, '1'=ผ่าน, '2'=ไม่ผ่าน
                currentRevValue = activeItem.value;
            }
        }
         // ตรวจสอบ Global Lock: "ห้ามแก้" ถ้ามี Rev ใดๆ ค้างสถานะ '0' (รออนุมัติ) อยู่
        const isGlobalLocked = revision && revision.some(rev => String(rev.status_appv) === '0');

        // =========================================================
        // 4. Body Rendering (สร้างเนื้อหาตาราง) append data form database
        // =========================================================
        if (data && data.length > 0) {
            data.forEach((row, rowIndex) => {
                const tr = document.createElement('tr');
                // Styling: ขีดฆ่า (Strikethrough) สำหรับแถวที่ถูกลบ
                if (row._status === 'deleted') tr.style.textDecoration = 'line-through';

                // 4.1 วาดเซลล์ข้อมูล (Data Cells)
                visibleColumns.forEach((col) => {
                    const td = document.createElement('td');
                    const fieldName = col.fieldData; // เช่น unique_id_types                    
                    // ดึงค่าปกติก่อน Logic พิเศษสำหรับคอลัมน์ลำดับที่ (No.)
                    let cellValue = (fieldName === '') ? rowIndex + 1 : row[fieldName];
                    const typeData = typeDataMap[fieldName]; // ประเภทข้อมูล (integer, decimal, etc.)
                    // ---  Dynamic Nested Array Detection ---
                    let foundArrayData = null; // เก็บ Array ที่ค้นเจอ (ถ้ามี)
                    // 1. ถ้าค่าใน Root เป็น Array อยู่แล้ว (กรณีชื่อ column ตรงกับชื่อ array)
                    if (Array.isArray(row[fieldName])) {
                        foundArrayData = row[fieldName];
                    } 
                    // 2. ถ้าไม่มีค่าใน Root หรือต้องการค้นหาใน Child Arrays
                    else {
                        // วนลูปหาว่า fieldName นี้ ไปซ่อนอยู่ใน Array ตัวไหนของ row บ้าง
                        const rowKeys = Object.keys(row);
                        for (const key of rowKeys) {
                            const possibleArray = row[key];
                            // เช็คว่าเป็น Array และมีข้อมูลอย่างน้อย 1 ตัว และในตัวแรกมี key ที่เราตามหา
                            if (Array.isArray(possibleArray) && possibleArray.length > 0) {
                                // เช็คว่า item ใน array มี property ชื่อเดียวกับ column นี้หรือไม่?
                                if (possibleArray[0].hasOwnProperty(fieldName)) {
                                    foundArrayData = possibleArray;
                                    break; // เจอแล้ว หยุดหา
                                }
                            }
                        }
                    }

                    // --- Render Logic ---
                    if (foundArrayData) {
                        // A. เจอข้อมูลแบบ Array -> Render เป็น List รายการ
                        td.classList.add('has-nested-data');                        
                        let innerHtml = '<div class="nested-cell-container">';                        
                        foundArrayData.forEach(item => {
                            // ดึงค่า: ถ้า fieldName ตรงกับชื่อ Array ให้ดึงตัวเอง หรือถ้าไม่ตรงให้ดึง property ข้างใน
                            let val = item[fieldName];
                            
                            // Handle กรณีค่าว่าง
                            if (val === undefined || val === null || val === '') {
                                // val = '-';
                                val = '';
                            } else {
                                // Format Number (ถ้ามี config)
                                if ((typeData === 'integer' || typeData === 'numeric') && !isNaN(parseFloat(val))) {
                                    val = this._formatNumber(val, typeData);
                                }
                            }           
                            // ========================================================
                            // ดึงค่าคำอธิบาย (_des) จากใน Object ของ Array
                            // ========================================================
                            let desVal = item[`${fieldName}_des`];
                            // ========================================================
                            // กำหนด Tooltip และ Cursor
                            // ถ้ามี _des ให้โชว์ _des และเปลี่ยนเมาส์เป็นรูป ?
                            // ถ้าไม่มี _des ก็ให้โชว์แค่ค่า val ธรรมดา
                            // ========================================================
                            // จัดการ Double Quote (") ในข้อความเพื่อไม่ให้ HTML พัง
                            let safeDes = desVal ? desVal.replace(/"/g, '&quot;') : '';
                            let safeVal = val ? String(val).replace(/"/g, '&quot;') : '';
                            
                            let tooltipAttr = desVal 
                                ? `title="${safeDes}" style="cursor: help;"` 
                                : `title="${safeVal}"`;

                            // สร้าง div ย่อย (ใช้ class nested-list-item เพื่อบังคับความสูงให้เท่ากัน)
                            innerHtml += `<div class="nested-list-item" ${tooltipAttr}>${val}</div>`;
                        });
                        innerHtml += '</div>';
                        td.innerHTML = innerHtml;

                    } else {
                        // B. ไม่ใช่ Array (Standard Field) -> Render ปกติ
                        let cellValue = (fieldName === '') ? rowIndex + 1 : row[fieldName];
                        
                        if ((typeData === 'integer' || typeData === 'numeric') && !isNaN(parseFloat(cellValue))) {
                            cellValue = this._formatNumber(cellValue, typeData);
                            td.style.textAlign = 'right';
                        }
                        
                        td.textContent = (cellValue !== null && cellValue !== undefined) ? cellValue : '';
                        td.style.padding = '8px'; // คืนค่า padding ปกติ

                        // ========================================================
                        // สร้าง Tooltip จากฟิลด์ _des
                        // ========================================================
                        if (fieldName !== '') {
                            const desValue = row[`${fieldName}_des`];
                            if (desValue) {
                                // ถ้ามีคำอธิบาย ให้เอาไปใส่ใน attribute 'title'
                                td.title = desValue;
                                // (Optional) เปลี่ยนเมาส์ให้เป็นรูป ? เพื่อบอก User ว่าชี้ดูรายละเอียดได้
                                td.style.cursor = 'help'; 
                            }
                        }
                    }                

                    // สีพื้นหลังตามสถานะ
                    if (row._status === 'deleted') td.style.backgroundColor = '#f8d7da';
                    else if(row._status === 'edited') td.style.backgroundColor = '#fff3cd';
                    else if(row._status === 'new') td.style.backgroundColor = '#d4edda';

                    tr.appendChild(td);
                });

                // --- Action Buttons ---
                const tdActions = document.createElement('td');
                const rowId = row.id || row.autoID;
                 if (rowId) {
                    tr.id = `row_${rowId}`;
                    tr.dataset.id = rowId;
                }
                const isDisabled = (!rowId || isGlobalLocked);
                const disabledAttr = isDisabled ? 'disabled' : '';
                const disabledStyle = isDisabled ? 'cursor: not-allowed; opacity: 0.6;' : 'cursor: pointer;';

                if (row._status === 'deleted') {
                    tdActions.innerHTML = `<div style="display:flex; justify-content:center;"><button class="btn-undo" data-id="${rowId||''}" ${disabledAttr} style="color:red; background-color:#f8d7da; border-color:red; cursor:pointer;">ยกเลิกการลบ</button></div>`;
                } else {
                    tdActions.innerHTML = `<div class="btnContainer" style="display:flex; justify-content:center;">
                                                <button class="btn-edit" data-id="${rowId||''}" ${disabledAttr} style="${disabledStyle}">แก้ไข</button>
                                                ${formType == 'row' ? `<button class="btn-delete" data-id="${rowId||''}" data-index="${rowIndex+1}" ${disabledAttr} style="${disabledStyle}">ลบ</button>` : ''}
                                            </div>`;
                }
                
                tdActions.style.position = 'sticky';
                tdActions.style.right = '0';
                tdActions.style.zIndex = '5'; // ให้ลอยอยู่เหนือข้อมูลคอลัมน์อื่น 
                tdActions.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.05)'; // สร้างเงาบางๆ ให้ดูมีมิติว่าลอยอยู่
                
                // ควรกำหนดสี Default เสมอ เพื่อไม่ให้พื้นหลังใสจนข้อมูลที่เลื่อนผ่านซ้อนทับกัน
                // tdActions.style.backgroundColor = '#e8f5e9'; // สีเขียวอ่อนแบบในรูป (เปลี่ยนได้ตามต้องการ)

                if (row._status === 'new') tdActions.style.backgroundColor = '#d4edda';
                else if (row._status === 'edited') tdActions.style.backgroundColor = '#fff3cd';
                else if (row._status === 'deleted') tdActions.style.backgroundColor = '#f8d7da';

                tr.appendChild(tdActions);
                tbody.appendChild(tr);
            });
        } else {
            // กรณีไม่มีข้อมูล
            const urlParams = new URLSearchParams(window.location.search);
            const displayDate = urlParams.get('search_date') || state.search_date || 'N/A';
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            // 1. ให้ td กินพื้นที่ทุกคอลัมน์ และเอา padding ออกเพื่อไม่ให้กวนการลอยของข้อความ
            td.colSpan = visibleColumns.length + 1;
            td.style.padding = '0'; 
            td.style.borderBottom = '1px solid #ccc'; // ใส่เส้นขอบล่างให้ดูเรียบร้อย
            // 2. สร้าง div มาครอบข้อความ
            const msgWrapper = document.createElement('div');
            msgWrapper.textContent = `ไม่พบข้อมูล ณ วันที่ ${displayDate}`;       
            // 3. ใช้ CSS Magic ทำให้ข้อความลอยอยู่กึ่งกลางหน้าจอที่มองเห็นเสมอ
            msgWrapper.style.cssText = `
                position: sticky;
                left: 50%;
                transform: translateX(-50%);
                display: inline-block;
                padding: 20px;
                color: red;
                font-weight: bold;
                white-space: nowrap; /* ป้องกันข้อความตกบรรทัด */
            `;            
            td.appendChild(msgWrapper);
            tr.appendChild(td);
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        tableWrapper.appendChild(table);

        // --- 6. Final Assembly ---
        const fieldset = document.createElement('fieldset');
        fieldset.style.cssText = `
            width: 95%; 
            max-width: 96vw;
            margin: auto; 
            border: 1px solid #D7EEFF; 
            padding: 10px; 
            background-color: #D7EEFF; 
            border-radius: 5px; 
            margin-bottom: 0;
            box-sizing: border-box;
            min-width: 0;
        `;

        if (isGlobalLocked) {
            table.style.opacity = '0.7'; 
            const pendingRev = revision.find(rev => String(rev.status_appv) === '0');
            const pendingText = pendingRev ? ` "Revision ${pendingRev.value}"` : "";
            const warning = document.createElement('div');
            warning.innerHTML = `ระบบถูกล็อคเนื่องจากพบ${pendingText} อยู่ในสถานะ <b>"รออนุมัติ"</b><br>(กรุณารอการอนุมัติก่อนทำรายการต่อ)`;
            warning.style.cssText = 'color: red; text-align: center; margin-bottom: 10px;';
            fieldset.appendChild(warning); 
            if(currentRevStatus === '2') fieldset.style.backgroundColor = '#ffe6e6';
        } else if(currentRevStatus === '2') {
            table.style.opacity = '0.8';
            fieldset.style.backgroundColor = '#ffe6e6';
            const warning = document.createElement('div');
            warning.innerHTML = `Revision ${currentRevValue} มีสถานะ <b>"ไม่ผ่านการอนุมัติ"</b><br>( สามารถเพิ่ม, แก้ไข, ลบ และนำส่งใหม่ได้ )`;
            warning.style.cssText = 'color: #dc3545; text-align: center; margin-bottom: 10px;';
            fieldset.appendChild(warning);
        } else {
            table.style.opacity = '1';
        }

        fieldset.appendChild(tableWrapper);
        this.container.appendChild(fieldset);
    }

    _renderNestedCell(data) {
        if (!data) return '';
        if (Array.isArray(data) && data.length === 0) return '-';
        const items = Array.isArray(data) ? data : [data];
        const htmlItems = items.map(item => {
            if (typeof item !== 'object' || item === null) {
                return `<div style="padding: 2px 0; border-bottom: 1px dashed #eee;">• ${item}</div>`;
            }
            const fields = Object.entries(item).map(([key, value]) => {
                if (value === null || value === "") return "";
                return `
                    <div style="margin-bottom: 4px;">
                        <div style="font-weight: 600; color: #555; font-size: 0.85em;">${key}</div>
                        <div style="color: #000; word-break: break-word; margin-left: 12px; font-size: 0.95em;">- ${value}</div>
                    </div>
                `;
            }).join('');
            return `<div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #ccc; font-size: 12px;">${fields}</div>`;
        }).join('');

        // ไม่มี Scrollbar ซ้อน
        return `<div>${htmlItems}</div>`;
    }

    /**
     * [Util] Helper Method: สำหรับจัดรูปแบบตัวเลขเพื่อแสดงผล
     * หน้าที่: รับค่าดิบ (เช่น 1234.567) แล้วแปลงเป็น String ที่มีลูกน้ำและทศนิยมตามต้องการ (เช่น "1,234.57")
     * param {number|string} value - ค่าที่จะนำมา Format
     * param {string} formatType - รูปแบบที่ต้องการ: 'integer' (จำนวนเต็ม) หรือ 'numeric' (ทศนิยม 2 ตำแหน่ง)
     * returns {string} - ค่าที่ Format แล้ว (พร้อมนำไปแสดงผล)
     */
    _formatNumber(value, formatType = 'numeric') {
        // 1. Pre-processing: เตรียมข้อมูล (Unformat)
        // บางครั้งค่าที่ส่งมาอาจเป็น String ที่มีลูกน้ำติดมาแล้ว (เช่น "1,000.00")
        // เราต้องลบลูกน้ำออกก่อน ไม่งั้น parseFloat จะทำงานผิดพลาด (ตัดค่าทิ้งหลังลูกน้ำ)
        // Regex: /[^\d.-]/g หมายถึง "ลบทุกตัวอักษรที่ไม่ใช่ตัวเลข, จุด, หรือเครื่องหมายลบ"
        const cleanedValue = parseFloat(String(value).replace(/[^\d.-]/g, ''));
        // 2. Validation: ตรวจสอบว่าเป็นตัวเลขจริงไหม?
        // กรณีเป็น Text หัวข้อ, ค่าว่าง, หรือ null -> ให้คืนค่าเดิมกลับไปเลย
        if (isNaN(cleanedValue)) {
            return value; // (ถ้าค่าที่มาเป็น Text "เงินให้สินเชื่อ..." หรือค่าว่าง)
        }
        // 3. Configuration: ตั้งค่าการแสดงผลตามประเภท
        let options = {};
        let valueToFormat = cleanedValue;
        if (formatType === 'integer') {
            // CASE: จำนวนเต็ม (Integer)
            // ใช้ Math.trunc เพื่อตัดเศษทิ้ง (ไม่ปัดเศษ) -> เช่น 10.99 กลายเป็น 10
            valueToFormat = Math.trunc(cleanedValue);
            options = {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            };
        } else { // (numeric)
            // CASE: ตัวเลขทศนิยม (Numeric/Float)
            // ใช้ค่าเดิม (Cleaned)
            valueToFormat = cleanedValue;
            options = {
                minimumFractionDigits: 2, // บังคับแสดงทศนิยมอย่างน้อย 2 ตำแหน่ง (เช่น 10 -> 10.00)
                maximumFractionDigits: 2
            };
        }
        // 4. Formatting: ใช้ Intl API (มาตรฐาน Browser)
        // 'en-US' จะใส่ลูกน้ำ (Thousands Separator) ให้เองอัตโนมัติ
        return new Intl.NumberFormat('en-US', options).format(valueToFormat);
    }
}