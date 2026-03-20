const EmployeeModule = {
    editingId: null,

    init() {
        this.bindEvents();
        this.loadEmployees();
        this.updateDepartmentFilter();
    },

    bindEvents() {
        document.getElementById('addEmployeeBtn').addEventListener('click', () => this.openModal());
        document.getElementById('addFirstEmployee').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelForm').addEventListener('click', () => this.closeModal());
        document.getElementById('employeeForm').addEventListener('submit', (e) => this.handleSubmit(e));
        document.getElementById('empStatus').addEventListener('change', (e) => this.toggleOffboardFields(e.target.value));
        document.getElementById('closeDetail').addEventListener('click', () => this.closeDetailModal());
        
        document.getElementById('employeeSearch').addEventListener('input', 
            Utils.debounce(() => this.filterEmployees(), 300));
        document.getElementById('departmentFilter').addEventListener('change', () => this.filterEmployees());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterEmployees());

        document.getElementById('employeeModal').addEventListener('click', (e) => {
            if (e.target.id === 'employeeModal') this.closeModal();
        });
        document.getElementById('detailModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailModal') this.closeDetailModal();
        });
    },

    loadEmployees() {
        const employees = DataStore.getEmployees();
        this.renderEmployees(employees);
        this.updateDepartmentFilter();
        this.updateDepartmentDatalist();
    },

    renderEmployees(employees) {
        const tbody = document.getElementById('employeeTableBody');
        const emptyState = document.getElementById('emptyEmployees');
        const tableContainer = document.querySelector('#page-employees .table-container');

        if (employees.length === 0) {
            tableContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';

        tbody.innerHTML = employees.map(emp => `
            <tr>
                <td>${this.escapeHtml(emp.id)}</td>
                <td>${this.escapeHtml(emp.name)}</td>
                <td>${this.escapeHtml(emp.department)}</td>
                <td>${this.escapeHtml(emp.position)}</td>
                <td>${this.escapeHtml(emp.phone)}</td>
                <td>${this.escapeHtml(emp.email || '-')}</td>
                <td>${Utils.formatDate(emp.hireDate)}</td>
                <td><span class="status-badge ${Utils.getStatusClass(emp.status)}">${Utils.getStatusText(emp.status)}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn view" onclick="EmployeeModule.viewEmployee('${emp.id}')">查看</button>
                        <button class="action-btn edit" onclick="EmployeeModule.editEmployee('${emp.id}')">编辑</button>
                        <button class="action-btn delete" onclick="EmployeeModule.deleteEmployee('${emp.id}')">删除</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    filterEmployees() {
        const search = document.getElementById('employeeSearch').value.toLowerCase();
        const department = document.getElementById('departmentFilter').value;
        const status = document.getElementById('statusFilter').value;

        let employees = DataStore.getEmployees();

        if (search) {
            employees = employees.filter(emp => 
                emp.name.toLowerCase().includes(search) || 
                emp.id.toLowerCase().includes(search)
            );
        }

        if (department) {
            employees = employees.filter(emp => emp.department === department);
        }

        if (status) {
            employees = employees.filter(emp => emp.status === status);
        }

        this.renderEmployees(employees);
    },

    updateDepartmentFilter() {
        const departments = DataStore.getDepartments();
        const select = document.getElementById('departmentFilter');
        const currentValue = select.value;

        select.innerHTML = '<option value="">所有部门</option>' + 
            departments.map(d => `<option value="${this.escapeHtml(d)}">${this.escapeHtml(d)}</option>`).join('');
        
        if (departments.includes(currentValue)) {
            select.value = currentValue;
        }
    },

    updateDepartmentDatalist() {
        const departments = DataStore.getDepartments();
        const datalist = document.getElementById('departmentList');
        datalist.innerHTML = departments.map(d => `<option value="${this.escapeHtml(d)}">`).join('');
    },

    openModal(employee = null) {
        const modal = document.getElementById('employeeModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('employeeForm');

        if (employee) {
            this.editingId = employee.id;
            title.textContent = '编辑员工';
            document.getElementById('empId').value = employee.id;
            document.getElementById('empId').readOnly = true;
            document.getElementById('empName').value = employee.name;
            document.getElementById('empDepartment').value = employee.department;
            document.getElementById('empPosition').value = employee.position;
            document.getElementById('empPhone').value = employee.phone;
            document.getElementById('empEmail').value = employee.email || '';
            document.getElementById('empHireDate').value = employee.hireDate;
            document.getElementById('empStatus').value = employee.status;
            document.getElementById('empOffboardDate').value = employee.offboardDate || '';
            document.getElementById('empOffboardReason').value = employee.offboardReason || '';
            this.toggleOffboardFields(employee.status);
        } else {
            this.editingId = null;
            title.textContent = '添加员工';
            form.reset();
            document.getElementById('empId').readOnly = false;
            document.getElementById('empStatus').value = 'active';
            this.toggleOffboardFields('active');
        }

        modal.classList.add('active');
    },

    closeModal() {
        document.getElementById('employeeModal').classList.remove('active');
        this.editingId = null;
    },

    toggleOffboardFields(status) {
        const offboardFields = document.getElementById('offboardFields');
        const offboardReasonField = document.getElementById('offboardReasonField');
        
        if (status === 'inactive') {
            offboardFields.style.display = 'block';
            offboardReasonField.style.display = 'block';
        } else {
            offboardFields.style.display = 'none';
            offboardReasonField.style.display = 'none';
        }
    },

    handleSubmit(e) {
        e.preventDefault();

        const employee = {
            id: document.getElementById('empId').value.trim(),
            name: document.getElementById('empName').value.trim(),
            department: document.getElementById('empDepartment').value.trim(),
            position: document.getElementById('empPosition').value.trim(),
            phone: document.getElementById('empPhone').value.trim(),
            email: document.getElementById('empEmail').value.trim(),
            hireDate: document.getElementById('empHireDate').value,
            status: document.getElementById('empStatus').value,
            offboardDate: document.getElementById('empOffboardDate').value,
            offboardReason: document.getElementById('empOffboardReason').value.trim(),
            createdAt: new Date().toISOString()
        };

        if (!employee.id || !employee.name || !employee.department || 
            !employee.position || !employee.phone || !employee.hireDate) {
            Utils.showToast('请填写所有必填字段', 'error');
            return;
        }

        if (this.editingId) {
            DataStore.updateEmployee(this.editingId, employee);
            Utils.showToast('员工信息已更新');
        } else {
            const existing = DataStore.getEmployeeById(employee.id);
            if (existing) {
                Utils.showToast('工号已存在', 'error');
                return;
            }
            DataStore.addEmployee(employee);
            Utils.showToast('员工添加成功');
        }

        this.closeModal();
        this.loadEmployees();
        AttendanceModule.loadEmployeeCheckList();
    },

    viewEmployee(id) {
        const employee = DataStore.getEmployeeById(id);
        if (!employee) return;

        const modal = document.getElementById('detailModal');
        const detail = document.getElementById('employeeDetail');

        detail.innerHTML = `
            <div class="employee-detail-grid">
                <div class="detail-item">
                    <label>工号</label>
                    <span>${this.escapeHtml(employee.id)}</span>
                </div>
                <div class="detail-item">
                    <label>姓名</label>
                    <span>${this.escapeHtml(employee.name)}</span>
                </div>
                <div class="detail-item">
                    <label>部门</label>
                    <span>${this.escapeHtml(employee.department)}</span>
                </div>
                <div class="detail-item">
                    <label>职位</label>
                    <span>${this.escapeHtml(employee.position)}</span>
                </div>
                <div class="detail-item">
                    <label>手机</label>
                    <span>${this.escapeHtml(employee.phone)}</span>
                </div>
                <div class="detail-item">
                    <label>邮箱</label>
                    <span>${this.escapeHtml(employee.email || '-')}</span>
                </div>
                <div class="detail-item">
                    <label>入职日期</label>
                    <span>${Utils.formatDate(employee.hireDate)}</span>
                </div>
                <div class="detail-item">
                    <label>状态</label>
                    <span class="status-badge ${Utils.getStatusClass(employee.status)}">${Utils.getStatusText(employee.status)}</span>
                </div>
                ${employee.status === 'inactive' ? `
                    <div class="detail-item">
                        <label>离职日期</label>
                        <span>${Utils.formatDate(employee.offboardDate)}</span>
                    </div>
                    <div class="detail-item">
                        <label>离职原因</label>
                        <span>${this.escapeHtml(employee.offboardReason || '-')}</span>
                    </div>
                ` : ''}
            </div>
        `;

        modal.classList.add('active');
    },

    closeDetailModal() {
        document.getElementById('detailModal').classList.remove('active');
    },

    editEmployee(id) {
        const employee = DataStore.getEmployeeById(id);
        if (employee) {
            this.openModal(employee);
        }
    },

    async deleteEmployee(id) {
        const employee = DataStore.getEmployeeById(id);
        if (!employee) return;

        const confirmed = await Utils.confirm(
            '确认删除',
            `确定要删除员工 "${employee.name}" 吗？此操作不可撤销。`
        );

        if (confirmed) {
            DataStore.deleteEmployee(id);
            Utils.showToast('员工已删除');
            this.loadEmployees();
            AttendanceModule.loadEmployeeCheckList();
        }
    },

    refreshList() {
        this.loadEmployees();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    EmployeeModule.init();
});
