/**
 * ไฟล์: indexMasterData.js
 * หน้าที่: จัดการ State และแสดงผล UI สำหรับหน้าจัดการ Master Data (Dashboard)
 * ระบบ: SPA (Single Page Application) + Dynamic Form Builder
 */

// =========================================================
// 1. Mock Data (จำลองโครงสร้างใหม่ให้มี schema ด้วย เผื่อ API ล่ม)
// =========================================================
const MOCK_MASTER_DATA = [
    { contractID: "MG-SC01-6100008", txs_contractid: "437/2561", conStartDate: "2018-10-16", conType: "MG", contract_amount: "13500000.00" },
    { contractID: "MG-SC01-6700121", txs_contractid: null, conStartDate: "2024-06-14", conType: "MG", contract_amount: "600000.00" }
];
const MOCK_SCHEMA = [
    { element: "select", uniqid: "arrangement_purpose_code", label: "Arrangement Purpose Code *", data_autocomplete: "true", options: [{value: "01", label: "01 : เพื่อที่อยู่อาศัย", selected: true}] }
];

// =========================================================
// 2. กำหนด Initial State และ Reducer
// =========================================================
const initialMasterState = {
    dataList: [],       
    formSchema: [],     // เก็บโครงสร้างฟอร์มที่ได้จาก JSON
    isLoading: true,    
    isSaving: false,
    saveNotification: null,
    error: null,        
    searchTerm: '',
    filterStatus: 'all', // ค่าเริ่มต้นคือ 'all' (ทั้งหมด), 'none' (ไม่มีข้อมูล), 'has' (มีข้อมูลแล้ว)    
    currentPage: 1,     
    itemsPerPage: 5,    
    editingId: null,
    pendingEdits: {}    
};

function masterDataReducer(state = initialMasterState, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, isLoading: true, error: null };
        case 'FETCH_SUCCESS':
            // [NEW] รับทั้ง Data และ Schema มาเก็บใน State
            return { ...state, isLoading: false, dataList: action.payload.data, formSchema: action.payload.schema };
        case 'SET_SEARCH_TERM':
            return { ...state, searchTerm: action.payload, currentPage: 1, editingId: null };
        case 'SET_PAGE':
            return { ...state, currentPage: action.payload };
        case 'SET_EDITING_ID':
            return { ...state, editingId: action.payload, saveNotification: null };
        case 'CLOSE_EDIT_FORM':
            return { ...state, editingId: null, saveNotification: null };
        case 'SAVE_START':
            return { ...state, isSaving: true, saveNotification: { message: '⏳ กำลังส่งข้อมูลบันทึก...', type: 'info' } };
        case 'SAVE_SUCCESS':
            // นำข้อมูลที่อัปเดตไปทับใน dataList เดิม
            return { ...state, isSaving: false, saveNotification: { message: '✅ บันทึกข้อมูลสำเร็จ!', type: 'success' }, dataList: action.payload };
        case 'SAVE_ERROR':
            return { ...state, isSaving: false, saveNotification: { message: `❌ ${action.payload}`, type: 'error' } };
        case 'SET_FILTER_STATUS':
            return { ...state, filterStatus: action.payload, currentPage: 1, editingId: null };
        default:
            return state;
    }
}

const masterStore = new Store(masterDataReducer);

// =========================================================
// 3. คลาส UI Renderer (MasterDataDashboard)
// =========================================================
class MasterDataDashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        masterStore.subscribe(() => this.render());
        this._attachEventListeners();
        this.loadData();
    }

    // --- ดึงข้อมูลจาก API ---
    async loadData() {
        masterStore.dispatch({ type: 'FETCH_START' });
        try {
            const response = await fetch('api/check_master_data.php?action=get'); 
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                masterStore.dispatch({ 
                    type: 'FETCH_SUCCESS', 
                    // key ชื่อ 'column'
                    payload: { data: result.data, schema: result.column || [] } 
                });
            } else {
                throw new Error(result.message || 'ดึงข้อมูลไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Load Data Error:', error);
            masterStore.dispatch({ type: 'FETCH_ERROR', payload: error.message });
            
            console.warn("Using Mock Data as fallback.");
            masterStore.dispatch({ type: 'FETCH_SUCCESS', payload: { data: MOCK_MASTER_DATA, schema: MOCK_SCHEMA }});
        }
    }

    render() {
        // จำตำแหน่ง ScrollBar ของตารางเอาไว้ก่อนที่ HTML จะโดนลบทิ้ง
        const tableContainer = this.container.querySelector('.table-scroll-container');
        const currentScrollTop = tableContainer ? tableContainer.scrollTop : 0;

        const activeEl = document.activeElement;
        const focusedId = activeEl ? activeEl.id : null;
        let selStart = null, selEnd = null;
        
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
            selStart = activeEl.selectionStart;
            selEnd = activeEl.selectionEnd;
        }

        const state = masterStore.getState();

        if (state.isLoading) {
            this.container.innerHTML = `<div style="text-align:center; padding:50px; color:#666;">กำลังโหลดข้อมูล Master Data...</div>`;
            return;
        }

        const searchTerm = state.searchTerm.toLowerCase();
        const filteredData = state.dataList.filter(item => {
            // 1. กรองตามสถานะ (มี/ไม่มีข้อมูล)
            const hasData = item.has_master_data === true || item.has_master_data === "1" || item.has_master_data === 1;
            let matchStatus = true;
            if (state.filterStatus === 'none') matchStatus = !hasData;
            if (state.filterStatus === 'has') matchStatus = hasData;

            // 2. Smart Search Logic
            const searchStr = state.searchTerm.trim().toLowerCase();
            if (searchStr === '') return matchStatus; // ถ้าไม่พิมพ์อะไร ให้ผ่านแค่เงื่อนไขสถานะ

            // --- ส่วนที่ 2.1: เช็คจากรหัสสัญญาหลัก/เก่า ---
            const matchContract = (item.contractID && item.contractID.toLowerCase().includes(searchStr)) || 
                                  (item.txs_contractid && item.txs_contractid.toLowerCase().includes(searchStr));

            // --- ส่วนที่ 2.2: เช็คจากทุกฟิลด์ BOT (วนลูปจาก Schema หรือ List ที่เรามี) ---
            const botFields = [
                'purpose_type', 'lending_business_type', 'arrangement_purpose_code', 
                'operation_progress', 'collateral_type', 'loan_type', 'movement_type',
                'tdr_method_type', 'tdr_type', 'asset_and_contingent_classification_type'
            ];
            
            const matchBotCode = botFields.some(field => 
                item[field] && String(item[field]).toLowerCase().includes(searchStr)
            );

            // ถ้าเจอที่ไหนสักแห่ง (สัญญา หรือ รหัส BOT) ให้แสดงแถวนั้น
            return matchStatus && (matchContract || matchBotCode);
        });

        const totalItems = filteredData.length;

        // ==========================================
        // วาดแถวในตาราง
        // ==========================================
        let tableRows = '';
        if (filteredData.length === 0) {
            tableRows = `<tr><td colspan="7" style="text-align:center; padding:20px;">ไม่พบข้อมูลที่ค้นหา</td></tr>`;
        } else {
            filteredData.forEach((item, index) => {
                const rowNo = index + 1;
                const isEditing = state.editingId === item.contractID; 
                const formattedAmt = item.contract_amount ? parseFloat(item.contract_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
                
                const startDate = item.conStartDate || '-';

                // Logic ควบรวมรหัสสัญญาหลัก + สัญญาอ้างอิงเก่า
                let displayContract = item.contractID;
                if (item.txs_contractid && item.txs_contractid.trim() !== '' && item.txs_contractid !== '-') {
                    displayContract += `<span style="color:red; font-size: 12px; font-weight: normal;">(${item.txs_contractid})</span>`;
                }

                let rowStyle = isEditing ? 'background-color: #fff3cd; border-left: 4px solid #ffc107;' : '';
                const btnStyle = isEditing ? 'background-color:#ffc107; color:#000; border:none;' : 'cursor:pointer;';

                const hasData = item.has_master_data === true || item.has_master_data === "1" || item.has_master_data === 1;
                const statusText = hasData ? 'มีข้อมูลแล้ว' : 'ไม่มีข้อมูล';
                const statusStyle = hasData 
                    ? 'background-color: #d4edda; color: #155724; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid #c3e6cb;'
                    : 'background-color: #f8d7da; color: #721c24; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid #f5c6cb;';

                tableRows += `
                    <tr style="${rowStyle}">
                        <td style="text-align:center;">${rowNo}</td>
                        <td style="font-weight:bold; color:#007bff;">${displayContract}</td>
                        <td style="text-align:center;">${item.conType}</td>
                        <td style="text-align:center;">${startDate}</td>
                        <td style="text-align:right; font-weight:bold;">${formattedAmt}</td>
                        <td style="text-align:center;">
                            <span style="${statusStyle}">${statusText}</span>
                        </td>
                        <td style="text-align:center;">
                            <button class="btn-edit-master" data-id="${item.contractID}" style="${btnStyle} padding:5px 10px; border-radius:3px;">
                                ${isEditing ? 'กำลังแก้ไข 🔽' : 'แก้ไข'}
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        // ==========================================
        // SPA Modal (Dynamic Form Builder)
        // ==========================================
        let editFormHtml = '';
        if (state.editingId !== null) {
            const currentIndex = filteredData.findIndex(item => item.contractID === state.editingId);
            if (currentIndex !== -1) {
                const currentItem = filteredData[currentIndex];

                const hasPrev = currentIndex > 0;
                const hasNext = currentIndex < filteredData.length - 1;
                const prevId = hasPrev ? filteredData[currentIndex - 1].contractID : null;
                const nextId = hasNext ? filteredData[currentIndex + 1].contractID : null;

                // 1. ปั้นฟอร์มจาก Schema (แบบ Grid 2 คอลัมน์)
                let dynamicFieldsHtml = '';
                if (state.formSchema && state.formSchema.length > 0) {
                    dynamicFieldsHtml = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; padding-right: 10px; max-height: 400px; overflow-y: auto;">`;                    
                    state.formSchema.forEach(field => {
                        const savedValue = currentItem[field.uniqid];
                        const hasSavedValue = savedValue !== undefined && savedValue !== null && savedValue !== '';

                        if (field.element === 'select') {
                            let optionsHtml = '';
                            if (field.options) {
                                field.options.forEach(opt => {
                                    let isSelected = false;
                                    if (hasSavedValue) {
                                        isSelected = (opt.value === savedValue);
                                    } else {
                                        isSelected = opt.selected;
                                    }                                    
                                    const selectedAttr = isSelected ? 'selected' : '';
                                    optionsHtml += `<option value="${opt.value}" ${selectedAttr}>${opt.label}</option>`;
                                });
                            }

                            const autoCompleteAttr = field.data_autocomplete ? 'data-autocomplete="true"' : '';
                            
                            dynamicFieldsHtml += `
                                <div class="form-group" style="margin-bottom: 5px;">
                                    <label for="${field.uniqid}" style="display:block; font-weight:bold; font-size:13px; margin-bottom:5px;">${field.label}</label>
                                    <select id="${field.uniqid}" name="${field.uniqid}" ${autoCompleteAttr} style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius:4px; font-size: 13px;">
                                        ${optionsHtml}
                                    </select>
                                </div>
                            `;
                        }
                    });
                    dynamicFieldsHtml += `</div>`;
                }

                // =========================================
                // 2. ปั้น HTML สำหรับ Notification Banner
                // =========================================
                let notificationHtml = '';
                if (state.saveNotification) {
                    const bg = state.saveNotification.type === 'success' ? '#d4edda' : (state.saveNotification.type === 'error' ? '#f8d7da' : '#e2e3e5');
                    const color = state.saveNotification.type === 'success' ? '#155724' : (state.saveNotification.type === 'error' ? '#721c24' : '#383d41');
                    const border = state.saveNotification.type === 'success' ? '#c3e6cb' : (state.saveNotification.type === 'error' ? '#f5c6cb' : '#d6d8db');
                    
                    notificationHtml = `
                        <div style="padding: 10px 15px; margin-bottom: 15px; border-radius: 4px; background-color: ${bg}; color: ${color}; border: 1px solid ${border}; font-size: 14px; font-weight: bold; animation: fadeIn 0.3s;">
                            ${state.saveNotification.message}
                        </div>
                    `;
                }

                // 3. โครงสร้าง Modal ตัวเต็ม
                editFormHtml = `
                    <div id="spa-edit-backdrop" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0,0,0,0.5); z-index: 999; display: flex; justify-content: center; align-items: center; animation: fadeIn 0.2s;">
                        
                        <div id="spa-edit-modal" style="background: #fff; padding: 25px; border-radius: 8px; width: 800px; max-width: 95%; box-shadow: 0 10px 30px rgba(0,0,0,0.2); position: relative;">
                            
                            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; margin-bottom: 15px;">
                                <h3 style="margin: 0; color:#333;">📝 แก้ไขข้อมูล Dataset <span style="font-size:14px; color:#6c757d; font-weight:normal;">(รายการที่ ${currentIndex + 1} / ${totalItems})</span></h3>
                                <button class="btn-close-edit" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #dc3545; line-height: 1;">&times;</button>
                            </div>

                            ${notificationHtml}

                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; border: 1px solid #e9ecef;">
                                <label style="display:block; font-weight:bold; font-size:14px; margin-bottom:5px;">เลขสัญญา (ContractID)</label>
                                <input type="text" value="${currentItem.contractID} (${currentItem.txs_contractid})" disabled style="width: 100%; padding: 10px; background-color: #e2e3e5; border: 1px solid #ced4da; border-radius:4px; font-weight:bold; color:red;">
                            </div>

                            ${dynamicFieldsHtml}
                            
                            <div style="display: flex; justify-content: space-between; align-items:center; border-top: 1px solid #e9ecef; padding-top: 15px; margin-top: 20px;">
                                <div>
                                    <button class="btn-nav-edit" data-target-id="${prevId}" ${!hasPrev ? 'disabled style="opacity:0.3; cursor:not-allowed; background:none; border:none;"' : 'style="cursor:pointer; background:none; border:none; color:#007bff; font-weight:bold;"'}>
                                        ◀ รายการก่อนหน้า
                                    </button>
                                    <button class="btn-nav-edit" data-target-id="${nextId}" ${!hasNext ? 'disabled style="opacity:0.3; cursor:not-allowed; background:none; border:none;"' : 'style="cursor:pointer; background:none; border:none; color:#007bff; font-weight:bold; margin-left:15px;"'}>
                                        รายการถัดไป ▶
                                    </button>
                                </div>
                                
                                <div>
                                    <button class="btn-close-edit" data-id="${currentItem.contractID}" style="padding: 10px 15px; background:none; border:1px solid #dc3545; color:#dc3545; border-radius:4px; cursor:pointer; margin-right: 10px;">
                                        ปิด
                                    </button>
                                    <button class="btn-save-single" data-id="${currentItem.contractID}" 
                                            ${state.isSaving ? 'disabled' : ''} 
                                            style="padding: 10px 20px; background-color: ${state.isSaving ? '#6c757d' : '#28a745'}; color: #fff; border:none; border-radius:4px; cursor: ${state.isSaving ? 'not-allowed' : 'pointer'}; font-weight:bold; transition: 0.2s;">
                                        ${state.isSaving ? '⏳ กำลังบันทึก...' : `บันทึกการแก้ไข`}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                `;
            }
        }

        // ==========================================
        // ประกอบร่าง HTML ทั้งก้อน
        // ==========================================
        this.container.innerHTML = `
            <style>@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }</style>
            
            <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items:center;">
                <input type="text" id="searchInput" placeholder="พิมพ์เพื่อค้นหา เลขที่สัญญา ..." value="${state.searchTerm}" autocomplete="off" style="width: 350px; padding: 10px; border:1px solid #ccc; border-radius:4px;">              
                <select id="filterStatus" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor:pointer;">
                    <option value="all" ${state.filterStatus === 'all' ? 'selected' : ''}>🔍 แสดงสถานะทั้งหมด</option>
                    <option value="none" ${state.filterStatus === 'none' ? 'selected' : ''}>🔴 เฉพาะ: ไม่มีข้อมูล</option>
                    <option value="has" ${state.filterStatus === 'has' ? 'selected' : ''}>🟢 เฉพาะ: มีข้อมูลแล้ว</option>
                </select>
                <div style="font-size: 14px; color: #666;">
                    พบข้อมูล: <strong>${filteredData.length}</strong> รายการ
                </div>
            </div>
            
            <div class="table-scroll-container" style="max-height: 600px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; box-shadow: inset 0 0 5px rgba(0,0,0,0.05);">
                <table class="report-table" style="width: 100%; border-collapse: collapse; background:#fff; position: relative;">
                    <thead style="background-color: #7cb3f5; color: #000; position: sticky; top: 0; z-index: 10; outline: 1px solid #ddd;">
                        <tr>
                            <th style="padding:10px; border:1px solid #ddd; width: 50px;">ลำดับ</th>
                            <th style="padding:10px; border:1px solid #ddd;">เลขสัญญา</th>
                            <th style="padding:10px; border:1px solid #ddd;">ประเภท</th>
                            <th style="padding:10px; border:1px solid #ddd;">วันที่เริ่มสัญญา</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:right;">วงเงินกู้ (บาท)</th>
                            <th style="padding:10px; border:1px solid #ddd; text-align:center; width: 120px;">สถานะข้อมูล</th>
                            <th style="padding:10px; border:1px solid #ddd; width: 100px;">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
            ${editFormHtml} 
        `;

        if (focusedId) {
            const newEl = document.getElementById(focusedId);
            if (newEl) {
                newEl.focus();
                if (selStart !== null && selEnd !== null) newEl.setSelectionRange(selStart, selEnd);
            }
        }
    }

    _attachEventListeners() {
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-edit-master')) {
                const id = e.target.dataset.id;
                masterStore.dispatch({ type: 'SET_EDITING_ID', payload: id });
                setTimeout(() => {
                    const btn = this.container.querySelector(`.btn-edit-master[data-id="${id}"]`);
                    if (btn) {
                        const activeRow = btn.closest('tr');
                        if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 50);
            }

            if (e.target.classList.contains('btn-nav-edit')) {
                const targetId = e.target.dataset.targetId;
                if (targetId && targetId !== "null") {
                    masterStore.dispatch({ type: 'SET_EDITING_ID', payload: targetId });
                    setTimeout(() => {
                        const btn = this.container.querySelector(`.btn-edit-master[data-id="${targetId}"]`);
                        if (btn) {
                            const activeRow = btn.closest('tr');
                            if (activeRow) activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 50); 
                }
            }

            if (e.target.classList.contains('btn-close-edit') || e.target.id === 'spa-edit-backdrop') {
                masterStore.dispatch({ type: 'CLOSE_EDIT_FORM' });
            }

            if (e.target.classList.contains('btn-save-single')) {
                const saveBtn = e.target.closest('.btn-save-single');
                if (saveBtn) {
                    const id = saveBtn.dataset.id;
                    this.saveContractData(id);
                }
            }
        });

        this.container.addEventListener('input', (e) => {
            if (e.target.id === 'searchInput') {
                masterStore.dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value });
            }
        });

        this.container.addEventListener('change', (e) => {
            if (e.target.id === 'filterStatus') {
                masterStore.dispatch({ type: 'SET_FILTER_STATUS', payload: e.target.value });
            }
        });
    }

    // --- ฟังก์ชันส่งข้อมูลบันทึกแบบ Async ---
    async saveContractData(contractID) {
        if (masterStore.getState().isSaving) return;
        const modalScope = document.getElementById('spa-edit-modal');
        if (!modalScope) return;

        // 1. ดึงค่าจากฟอร์มทั้งหมดใน Popup
        const formData = new FormData();
        formData.append('contractID', contractID);
        const inputs = modalScope.querySelectorAll('input, select');
        const payload = { contractID: contractID };
        inputs.forEach(el => {
            if (el.name) {
                formData.append(el.name, el.value);
                payload[el.name] = el.value;
            }
        });

        // 2. เปลียน State เป็นกำลังบันทึก
        masterStore.dispatch({ type: 'SAVE_START' });

        try {
            // 3. ส่งข้อมูลไปที่ Server-Side          
            const response = await fetch('api/process_master_data.php', {
                method: 'POST',
                body: formData
            });
            const textResult = await response.text();
            let result;
            try {
                result = JSON.parse(textResult);
            } catch (err) {
                console.error("Raw PHP Response:", textResult);
                throw new Error("ระบบตอบกลับข้อมูลผิดพลาด (อาจมี Error ฝั่ง PHP)");
            }
            if (result.status !== 'success') throw new Error(result.message);
            
            await new Promise(r => setTimeout(r, 800));

            // 4. บันทึกสำเร็จ: ทำการอัปเดตข้อมูลแถวนั้นใน State ทันที
            const state = masterStore.getState();
            const updatedList = state.dataList.map(item => {
                if (item.contractID === contractID) {
                    return { ...item, ...payload, has_master_data: true };
                }
                return item;
            });

            masterStore.dispatch({ type: 'SAVE_SUCCESS', payload: updatedList });

        } catch (error) {
            console.error('Save Error:', error);
            masterStore.dispatch({ type: 'SAVE_ERROR', payload: error.message || 'เกิดข้อผิดพลาดในการบันทึก' });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MasterDataDashboard('master-data-container');
});

// =========================================================
// ตัวช่วย Debug: Log ค่า State ทุกครั้งที่มีการเปลี่ยนแปลง
// =========================================================
masterStore.subscribe(() => {
    const currentState = masterStore.getState();
    const pendingCount = Object.keys(currentState.pendingEdits).length;
    
    console.group('%c🔄 State Updated', 'color: #007bff; font-weight: bold;');
    
    console.log(`Loading: %c${currentState.isLoading}`, currentState.isLoading ? 'color: red;' : 'color: green;');
    console.log(`Saving: %c${currentState.isSaving}`, currentState.isSaving ? 'color: red;' : 'color: green;');
    console.log(`Editing ID: %c${currentState.editingId}`, 'color: purple; font-weight: bold;');
    
    if (pendingCount > 0) {
        console.log(`%c Pending Edits (${pendingCount}):`, 'color: #ff9800; font-weight: bold;', currentState.pendingEdits);
    }
    
    console.groupCollapsed('📦 Full Data List');
    console.table(currentState.dataList);
    console.groupEnd();
    
    console.groupEnd();
});