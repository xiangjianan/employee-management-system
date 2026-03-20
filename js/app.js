const App = {
    currentPage: 'employees',
    
    init() {
        this.bindNavigation();
        this.bindMobileMenu();
        this.initDefaultDate();
        DataStore.init();
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.switchPage(page);
            });
        });
    },

    switchPage(page) {
        this.currentPage = page;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        document.querySelectorAll('.page').forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });

        const nav = document.getElementById('mainNav');
        if (window.innerWidth <= 768) {
            nav.classList.remove('active');
        }

        if (page === 'attendance') {
            AttendanceModule.loadEmployeeCheckList();
        }
    },

    bindMobileMenu() {
        const toggle = document.getElementById('menuToggle');
        const nav = document.getElementById('mainNav');
        
        toggle.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    },

    initDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const attendanceDate = document.getElementById('attendanceDate');
        if (attendanceDate) {
            attendanceDate.value = today;
        }
    }
};

const DataStore = {
    EMPLOYEES_KEY: 'ems_employees',
    ATTENDANCE_KEY: 'ems_attendance',
    HISTORY_KEY: 'ems_history',

    init() {
        if (!localStorage.getItem(this.EMPLOYEES_KEY)) {
            localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.ATTENDANCE_KEY)) {
            localStorage.setItem(this.ATTENDANCE_KEY, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.HISTORY_KEY)) {
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify([]));
        }
    },

    getEmployees() {
        return JSON.parse(localStorage.getItem(this.EMPLOYEES_KEY) || '[]');
    },

    saveEmployees(employees) {
        localStorage.setItem(this.EMPLOYEES_KEY, JSON.stringify(employees));
    },

    getEmployeeById(id) {
        const employees = this.getEmployees();
        return employees.find(emp => emp.id === id);
    },

    addEmployee(employee) {
        const employees = this.getEmployees();
        employees.push(employee);
        this.saveEmployees(employees);
        this.addHistory({
            type: 'onboard',
            employeeId: employee.id,
            employeeName: employee.name,
            department: employee.department,
            date: employee.hireDate,
            description: `${employee.name} 入职 ${employee.department} 部门，担任 ${employee.position}`
        });
    },

    updateEmployee(id, updates) {
        const employees = this.getEmployees();
        const index = employees.findIndex(emp => emp.id === id);
        if (index !== -1) {
            const oldEmployee = employees[index];
            employees[index] = { ...oldEmployee, ...updates };
            this.saveEmployees(employees);
            
            if (oldEmployee.status === 'active' && updates.status === 'inactive') {
                this.addHistory({
                    type: 'offboard',
                    employeeId: id,
                    employeeName: updates.name || oldEmployee.name,
                    department: updates.department || oldEmployee.department,
                    date: updates.offboardDate || new Date().toISOString().split('T')[0],
                    description: `${updates.name || oldEmployee.name} 离职，原因：${updates.offboardReason || '未填写'}`
                });
            }
        }
    },

    deleteEmployee(id) {
        const employees = this.getEmployees();
        const filtered = employees.filter(emp => emp.id !== id);
        this.saveEmployees(filtered);
    },

    getAttendance() {
        return JSON.parse(localStorage.getItem(this.ATTENDANCE_KEY) || '[]');
    },

    saveAttendance(attendance) {
        localStorage.setItem(this.ATTENDANCE_KEY, JSON.stringify(attendance));
    },

    addAttendanceRecord(record) {
        const attendance = this.getAttendance();
        const existingIndex = attendance.findIndex(
            a => a.employeeId === record.employeeId && a.date === record.date
        );
        if (existingIndex !== -1) {
            attendance[existingIndex] = record;
        } else {
            attendance.push(record);
        }
        this.saveAttendance(attendance);
    },

    batchAddAttendance(records) {
        const attendance = this.getAttendance();
        records.forEach(record => {
            const existingIndex = attendance.findIndex(
                a => a.employeeId === record.employeeId && a.date === record.date
            );
            if (existingIndex !== -1) {
                attendance[existingIndex] = record;
            } else {
                attendance.push(record);
            }
        });
        this.saveAttendance(attendance);
    },

    getAttendanceByDate(date) {
        const attendance = this.getAttendance();
        return attendance.filter(a => a.date === date);
    },

    getHistory() {
        return JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
    },

    addHistory(record) {
        const history = this.getHistory();
        history.unshift({
            ...record,
            id: Date.now().toString()
        });
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    },

    getDepartments() {
        const employees = this.getEmployees();
        const departments = [...new Set(employees.map(emp => emp.department))];
        return departments.filter(d => d);
    },

    getActiveEmployees() {
        const employees = this.getEmployees();
        return employees.filter(emp => emp.status === 'active');
    }
};

const Utils = {
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN');
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    getStatusText(status) {
        const statusMap = {
            'active': '在职',
            'inactive': '离职',
            'normal': '正常',
            'late': '迟到',
            'early': '早退',
            'leave': '请假',
            'absent': '缺勤'
        };
        return statusMap[status] || status;
    },

    getStatusClass(status) {
        return `status-${status}`;
    },

    confirm(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleEl = document.getElementById('confirmTitle');
            const messageEl = document.getElementById('confirmMessage');
            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');
            const closeBtn = document.getElementById('closeConfirm');

            titleEl.textContent = title;
            messageEl.textContent = message;
            modal.classList.add('active');

            const cleanup = () => {
                modal.classList.remove('active');
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
            };

            const handleOk = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
        });
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
