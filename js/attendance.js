const AttendanceModule = {
    showRecords: false,

    init() {
        this.bindEvents();
        this.loadEmployeeCheckList();
    },

    bindEvents() {
        document.getElementById('batchAttendanceBtn').addEventListener('click', () => this.showBatchPanel());
        document.getElementById('viewAttendanceBtn').addEventListener('click', () => this.showRecordsPanel());
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAll());
        document.getElementById('deselectAllBtn').addEventListener('click', () => this.deselectAll());
        document.getElementById('applyBatchBtn').addEventListener('click', () => this.applyBatchAttendance());
        document.getElementById('filterAttendanceBtn').addEventListener('click', () => this.filterAttendanceRecords());
        document.getElementById('attendanceSearch').addEventListener('input', 
            Utils.debounce(() => this.filterAttendanceRecords(), 300));
    },

    loadEmployeeCheckList() {
        const employees = DataStore.getActiveEmployees();
        const container = document.getElementById('employeeCheckList');
        const selectedDate = document.getElementById('attendanceDate').value;
        const existingAttendance = DataStore.getAttendanceByDate(selectedDate);

        if (employees.length === 0) {
            container.innerHTML = '<p style="padding: 1rem; color: var(--text-secondary);">暂无在职员工</p>';
            return;
        }

        container.innerHTML = employees.map(emp => {
            const attendance = existingAttendance.find(a => a.employeeId === emp.id);
            const statusText = attendance ? Utils.getStatusText(attendance.status) : '未标记';
            const statusClass = attendance ? Utils.getStatusClass(attendance.status) : '';
            
            return `
                <label class="employee-checkbox">
                    <input type="checkbox" value="${emp.id}" ${attendance ? 'checked' : ''}>
                    <div class="emp-info">
                        <span class="emp-name">${this.escapeHtml(emp.name)}</span>
                        <span class="emp-id">${this.escapeHtml(emp.id)}</span>
                    </div>
                    <span class="attendance-status ${statusClass}">${statusText}</span>
                </label>
            `;
        }).join('');
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showBatchPanel() {
        this.showRecords = false;
        document.getElementById('batchPanel').style.display = 'block';
        document.getElementById('recordsPanel').style.display = 'none';
        document.getElementById('batchAttendanceBtn').classList.add('btn-primary');
        document.getElementById('batchAttendanceBtn').classList.remove('btn-secondary');
        document.getElementById('viewAttendanceBtn').classList.remove('btn-primary');
        document.getElementById('viewAttendanceBtn').classList.add('btn-secondary');
        this.loadEmployeeCheckList();
    },

    showRecordsPanel() {
        this.showRecords = true;
        document.getElementById('batchPanel').style.display = 'none';
        document.getElementById('recordsPanel').style.display = 'block';
        document.getElementById('viewAttendanceBtn').classList.add('btn-primary');
        document.getElementById('viewAttendanceBtn').classList.remove('btn-secondary');
        document.getElementById('batchAttendanceBtn').classList.remove('btn-primary');
        document.getElementById('batchAttendanceBtn').classList.add('btn-secondary');
        this.loadAttendanceRecords();
    },

    selectAll() {
        document.querySelectorAll('#employeeCheckList input[type="checkbox"]').forEach(cb => {
            cb.checked = true;
        });
    },

    deselectAll() {
        document.querySelectorAll('#employeeCheckList input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
    },

    applyBatchAttendance() {
        const date = document.getElementById('attendanceDate').value;
        const status = document.getElementById('batchStatus').value;
        const checkboxes = document.querySelectorAll('#employeeCheckList input[type="checkbox"]:checked');

        if (!date) {
            Utils.showToast('请选择日期', 'error');
            return;
        }

        if (checkboxes.length === 0) {
            Utils.showToast('请选择至少一名员工', 'error');
            return;
        }

        const records = [];
        checkboxes.forEach(cb => {
            const employeeId = cb.value;
            const employee = DataStore.getEmployeeById(employeeId);
            if (employee) {
                records.push({
                    id: Utils.generateId(),
                    employeeId: employee.id,
                    employeeName: employee.name,
                    department: employee.department,
                    date: date,
                    status: status,
                    createdAt: new Date().toISOString()
                });
            }
        });

        DataStore.batchAddAttendance(records);
        Utils.showToast(`已为 ${records.length} 名员工标记考勤`);
        this.loadEmployeeCheckList();
    },

    loadAttendanceRecords() {
        const attendance = DataStore.getAttendance();
        const tbody = document.getElementById('attendanceRecordsBody');

        if (attendance.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">暂无考勤记录</td></tr>';
            return;
        }

        const sorted = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));
        this.renderAttendanceRecords(sorted);
    },

    renderAttendanceRecords(records) {
        const tbody = document.getElementById('attendanceRecordsBody');

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">没有符合条件的记录</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(record => `
            <tr>
                <td>${Utils.formatDate(record.date)}</td>
                <td>${this.escapeHtml(record.employeeId)}</td>
                <td>${this.escapeHtml(record.employeeName)}</td>
                <td>${this.escapeHtml(record.department)}</td>
                <td><span class="status-badge ${Utils.getStatusClass(record.status)}">${Utils.getStatusText(record.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn edit" onclick="AttendanceModule.editAttendance('${record.id}')">修改</button>
                        <button class="action-btn delete" onclick="AttendanceModule.deleteAttendance('${record.id}')">删除</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    filterAttendanceRecords() {
        const search = document.getElementById('attendanceSearch').value.toLowerCase();
        const startDate = document.getElementById('filterDateStart').value;
        const endDate = document.getElementById('filterDateEnd').value;

        let records = DataStore.getAttendance();

        if (search) {
            records = records.filter(r => 
                r.employeeName.toLowerCase().includes(search) || 
                r.employeeId.toLowerCase().includes(search)
            );
        }

        if (startDate) {
            records = records.filter(r => r.date >= startDate);
        }

        if (endDate) {
            records = records.filter(r => r.date <= endDate);
        }

        const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
        this.renderAttendanceRecords(sorted);
    },

    async editAttendance(id) {
        const attendance = DataStore.getAttendance();
        const record = attendance.find(a => a.id === id);
        if (!record) return;

        const statuses = ['normal', 'late', 'early', 'leave', 'absent'];
        const currentStatus = record.status;
        const currentIndex = statuses.indexOf(currentStatus);
        const nextIndex = (currentIndex + 1) % statuses.length;
        const newStatus = statuses[nextIndex];

        const confirmed = await Utils.confirm(
            '修改考勤状态',
            `确定将 ${record.employeeName} 的考勤状态从"${Utils.getStatusText(currentStatus)}"改为"${Utils.getStatusText(newStatus)}"吗？`
        );

        if (confirmed) {
            record.status = newStatus;
            DataStore.saveAttendance(attendance);
            Utils.showToast('考勤状态已更新');
            this.filterAttendanceRecords();
        }
    },

    async deleteAttendance(id) {
        const attendance = DataStore.getAttendance();
        const record = attendance.find(a => a.id === id);
        if (!record) return;

        const confirmed = await Utils.confirm(
            '删除考勤记录',
            `确定要删除 ${record.employeeName} 在 ${Utils.formatDate(record.date)} 的考勤记录吗？`
        );

        if (confirmed) {
            const filtered = attendance.filter(a => a.id !== id);
            DataStore.saveAttendance(filtered);
            Utils.showToast('考勤记录已删除');
            this.filterAttendanceRecords();
        }
    }
};

const HistoryModule = {
    init() {
        this.bindEvents();
        this.loadHistory();
    },

    bindEvents() {
        document.getElementById('historyTypeFilter').addEventListener('change', () => this.filterHistory());
        document.getElementById('historySearch').addEventListener('input', 
            Utils.debounce(() => this.filterHistory(), 300));
    },

    loadHistory() {
        const history = DataStore.getHistory();
        this.renderHistory(history);
    },

    renderHistory(history) {
        const container = document.getElementById('historyTimeline');
        const emptyState = document.getElementById('emptyHistory');

        if (history.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';

        container.innerHTML = history.map(item => `
            <div class="timeline-item">
                <div class="timeline-icon ${item.type}">
                    ${item.type === 'onboard' ? '👋' : '👋'}
                </div>
                <div class="timeline-content">
                    <div class="timeline-title">${this.escapeHtml(item.employeeName)}</div>
                    <div class="timeline-date">${Utils.formatDate(item.date)}</div>
                    <div class="timeline-desc">${this.escapeHtml(item.description)}</div>
                </div>
            </div>
        `).join('');
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    filterHistory() {
        const type = document.getElementById('historyTypeFilter').value;
        const search = document.getElementById('historySearch').value.toLowerCase();

        let history = DataStore.getHistory();

        if (type) {
            history = history.filter(h => h.type === type);
        }

        if (search) {
            history = history.filter(h => 
                h.employeeName.toLowerCase().includes(search) ||
                h.department.toLowerCase().includes(search)
            );
        }

        this.renderHistory(history);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AttendanceModule.init();
    HistoryModule.init();
});
