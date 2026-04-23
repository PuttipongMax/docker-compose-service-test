class Store {
    // กำหนดตัวแปรแบบ Private (มีเครื่องหมาย #) เพื่อป้องกันไม่ให้ภายนอกเข้าถึงหรือแก้ไขค่าเหล่านี้ได้โดยตรง
    #state; // เก็บข้อมูลสถานะปัจจุบัน (State)
    #listeners; // เก็บฟังก์ชันปลายทาง (Callback) ที่รอรับการแจ้งเตือนเมื่อข้อมูลเปลี่ยน
    #reducer; // ฟังก์ชันเงื่อนไขการเปลี่ยนค่า (Logic)

    /**
     * param {function} reducer ฟังก์ชันที่รับ (state, action) แล้วคืนค่า state ใหม่
     */
    constructor(reducer) {
        // DEBUG: ตรวจสอบสอบ class ทำงานได้เมื่อ execute
        // console.log('[Store.js] Store is being constructed.'); 

        // 1. เก็บฟังก์ชัน Reducer ไว้ใช้งาน
        this.#reducer = reducer; 
        // 2. เริ่มต้นอาเรย์สำหรับเก็บ Listeners ให้ว่างเปล่า
        this.#listeners = []; 
        // 3. กำหนดค่า State เริ่มต้น (Initial State)
        // โดยการเรียก Reducer ด้วย state เป็น undefined และ action ปลอม (@@INIT)
        // เพื่อให้ Reducer คืนค่า default ของ state กลับมา บรรทัดนี้คือการเก็บข้อมูลเริ่มต้น
        this.#state = this.#reducer(undefined, { type: '@@INIT' });
        // DEBUG: comment ตรวจสอบความถูกต้องโครงสร้างข้อมูลที่ต้องการเก็บ
        // console.log('[Store.js] Initial state set:', this.#state); 
    }

    /**
     * ฟังก์ชันสำหรับดึงค่า State ปัจจุบันไปใช้งาน
     * returns {Object} ข้อมูล State ล่าสุด จากการทำรายการ
     */
    getState() {
        return this.#state;
    }

    /**
     * ฟังก์ชันหลักสำหรับสั่งแก้ไขข้อมูล (Dispatch Action)
     * param {Object} action ออบเจกต์ที่มี type และ payload (เช่น { type: 'ADD_ITEM', payload: ... })
     */
    dispatch(action) {
        // DEBUG: comment log การทำรายการเพื่อใช้ติดตามการเปลี่่ยนแปลงข้อมูล
        // console.log('[Store.js] Dispatching action:', action); 
  
        // 1. คำนวณ State ใหม่ โดยส่ง state เดิมและ action ไปให้ reducer ประมวลผล
        this.#state = this.#reducer(this.#state, action);
        // DEBUG: comment log แสดงการเปลี่ยนแปลงของข้อมูล ใช้ตรวจสอบหากข้อมูลไม่ถูก่ต้อง
        // console.log('[Store.js] State updated:', this.#state); 
        
        // 2. เมื่อค่าเปลี่ยนแล้ว ให้แจ้งเตือนทุก Component ที่กด Subscribe ไว้
        this.#notifyListeners();
    }

    /**
     * ฟังก์ชันสำหรับลงทะเบียนรับการแจ้งเตือนเมื่อ State เปลี่ยน
     * param {Function} listener ฟังก์ชันที่จะถูกเรียกทำงานเมื่อมีการ update
     * returns {Function} ฟังก์ชันสำหรับยกเลิกการติดตาม (Unsubscribe)
     */
    subscribe(listener) {
        // DEBUG: comment log ตรวจสอบว่าทำงานได้
        // console.log('[Store.js] New listener subscribed.');
        // เพิ่มฟังก์ชัน listener เข้าไปในรายการ
        this.#listeners.push(listener);

        // คืนค่าฟังก์ชันออกไป เพื่อให้ผู้ใช้เรียกใช้เมื่อต้องการเลิกติดตาม
        // (เช่น เมื่อ Component ถูกทำลาย หรือปิดหน้าต่าง)
        return () => {
            this.#listeners = this.#listeners.filter(l => l !== listener);
        };
    }
    
    /**
     * ฟังก์ชันภายใน (Private) สำหรับวนลูปแจ้งเตือน Listeners ทั้งหมด
     */
    #notifyListeners() {
        // DEBUG: comment ตรวจสอบปริมาณรายการที่ action
        // console.log(`[Store.js] Notifying ${this.#listeners.length} listeners.`);

        // วนลูปเรียกทุกฟังก์ชันที่เก็บไว้ในอาเรย์
        for (const listener of this.#listeners) {
            listener();
        }
    }
}