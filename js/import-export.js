const ImportExportModule = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('exportEmployeesExcel').addEventListener('click', () => this.exportEmployeesExcel());
        document.getElementById('exportEmployeesCSV').addEventListener('click', () => this.exportEmployeesCSV());
        document.getElementById('exportAttendanceExcel').addEventListener('click', () => this.exportAttendanceExcel());
        document.getElementById('exportAttendanceCSV').addEventListener('click', () => this.exportAttendanceCSV());
        document.getElementById('importEmployeesBtn').addEventListener('click', () => {
            document.getElementById('importEmployeeFile').click();
        });
        document.getElementById('importAttendanceBtn').addEventListener('click', () => {
            document.getElementById('importAttendanceFile').click();
        });
        document.getElementById('importEmployeeFile').addEventListener('change', (e) => this.handleEmployeeImport(e));
        document.getElementById('importAttendanceFile').addEventListener('change', (e) => this.handleAttendanceImport(e));
        document.getElementById('downloadEmployeeTemplate').addEventListener('click', () => this.downloadEmployeeTemplate());
        document.getElementById('downloadAttendanceTemplate').addEventListener('click', () => this.downloadAttendanceTemplate());
    },

    exportEmployeesExcel() {
        const employees = DataStore.getEmployees();
        if (employees.length === 0) {
            Utils.showToast('没有员工数据可导出', 'warning');
            return;
        }

        const data = employees.map(emp => ({
            '工号': emp.id,
            '姓名': emp.name,
            '部门': emp.department,
            '职位': emp.position,
            '手机': emp.phone,
            '邮箱': emp.email || '',
            '入职日期': emp.hireDate,
            '状态': emp.status === 'active' ? '在职' : '离职',
            '离职日期': emp.offboardDate || '',
            '离职原因': emp.offboardReason || ''
        }));

        this.exportToExcel(data, '员工数据');
    },

    exportEmployeesCSV() {
        const employees = DataStore.getEmployees();
        if (employees.length === 0) {
            Utils.showToast('没有员工数据可导出', 'warning');
            return;
        }

        const headers = ['工号', '姓名', '部门', '职位', '手机', '邮箱', '入职日期', '状态', '离职日期', '离职原因'];
        const data = employees.map(emp => [
            emp.id,
            emp.name,
            emp.department,
            emp.position,
            emp.phone,
            emp.email || '',
            emp.hireDate,
            emp.status === 'active' ? '在职' : '离职',
            emp.offboardDate || '',
            emp.offboardReason || ''
        ]);

        this.exportToCSV(headers, data, '员工数据');
    },

    exportAttendanceExcel() {
        const attendance = DataStore.getAttendance();
        if (attendance.length === 0) {
            Utils.showToast('没有考勤数据可导出', 'warning');
            return;
        }

        const data = attendance.map(record => ({
            '日期': record.date,
            '工号': record.employeeId,
            '姓名': record.employeeName,
            '部门': record.department,
            '考勤状态': this.getStatusText(record.status)
        }));

        this.exportToExcel(data, '考勤数据');
    },

    exportAttendanceCSV() {
        const attendance = DataStore.getAttendance();
        if (attendance.length === 0) {
            Utils.showToast('没有考勤数据可导出', 'warning');
            return;
        }

        const headers = ['日期', '工号', '姓名', '部门', '考勤状态'];
        const data = attendance.map(record => [
            record.date,
            record.employeeId,
            record.employeeName,
            record.department,
            this.getStatusText(record.status)
        ]);

        this.exportToCSV(headers, data, '考勤数据');
    },

    exportToExcel(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, `${filename}_${this.getDateString()}.xlsx`);
        Utils.showToast('导出成功');
    },

    exportToCSV(headers, data, filename) {
        const csvContent = [headers, ...data]
            .map(row => row.map(cell => this.escapeCSVCell(cell)).join(','))
            .join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${this.getDateString()}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        Utils.showToast('导出成功');
    },

    escapeCSVCell(cell) {
        const str = String(cell || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    },

    getDateString() {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    },

    getStatusText(status) {
        const map = {
            'normal': '正常',
            'late': '迟到',
            'early': '早退',
            'leave': '请假',
            'absent': '缺勤'
        };
        return map[status] || status;
    },

    getStatusValue(text) {
        const map = {
            '正常': 'normal',
            '迟到': 'late',
            '早退': 'early',
            '请假': 'leave',
            '缺勤': 'absent'
        };
        return map[text] || text;
    },

    async handleEmployeeImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const infoEl = document.getElementById('importInfo');
        infoEl.textContent = '正在处理...';

        try {
            const data = await this.readFile(file);
            const parsed = this.parseFile(data, file.name);
            
            if (!parsed || parsed.length === 0) {
                infoEl.textContent = '文件中没有有效数据';
                return;
            }

            let imported = 0;
            let updated = 0;
            const employees = DataStore.getEmployees();

            parsed.forEach(row => {
                const id = row['工号'] || row['id'] || row['ID'];
                const name = row['姓名'] || row['name'] || row['名字'];
                const department = row['部门'] || row['department'] || row['部门名称'];
                const position = row['职位'] || row['position'] || row['岗位'];
                const phone = row['手机'] || row['phone'] || row['电话'];
                const email = row['邮箱'] || row['email'] || row['Email'];
                const hireDate = row['入职日期'] || row['hireDate'] || row['入职时间'];
                const statusText = row['状态'] || row['status'] || '在职';
                const offboardDate = row['离职日期'] || row['offboardDate'] || '';
                const offboardReason = row['离职原因'] || row['offboardReason'] || '';

                if (!id || !name || !department || !position || !phone || !hireDate) {
                    return;
                }

                const employee = {
                    id: String(id).trim(),
                    name: String(name).trim(),
                    department: String(department).trim(),
                    position: String(position).trim(),
                    phone: String(phone).trim(),
                    email: String(email || '').trim(),
                    hireDate: this.formatDateValue(hireDate),
                    status: statusText.includes('离职') ? 'inactive' : 'active',
                    offboardDate: offboardDate ? this.formatDateValue(offboardDate) : '',
                    offboardReason: String(offboardReason || '').trim(),
                    createdAt: new Date().toISOString()
                };

                const existingIndex = employees.findIndex(emp => emp.id === employee.id);
                if (existingIndex !== -1) {
                    employees[existingIndex] = employee;
                    updated++;
                } else {
                    employees.push(employee);
                    imported++;
                }
            });

            DataStore.saveEmployees(employees);
            infoEl.textContent = `导入完成：新增 ${imported} 条，更新 ${updated} 条`;
            Utils.showToast(`成功导入 ${imported + updated} 条员工数据`);
            EmployeeModule.refreshList();
        } catch (error) {
            infoEl.textContent = `导入失败：${error.message}`;
            Utils.showToast('导入失败', 'error');
        }

        e.target.value = '';
    },

    async handleAttendanceImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const infoEl = document.getElementById('importAttendanceInfo');
        infoEl.textContent = '正在处理...';

        try {
            const data = await this.readFile(file);
            const parsed = this.parseFile(data, file.name);
            
            if (!parsed || parsed.length === 0) {
                infoEl.textContent = '文件中没有有效数据';
                return;
            }

            let imported = 0;
            const attendance = DataStore.getAttendance();

            parsed.forEach(row => {
                const date = row['日期'] || row['date'] || row['考勤日期'];
                const employeeId = row['工号'] || row['employeeId'] || row['员工工号'];
                const employeeName = row['姓名'] || row['name'] || row['员工姓名'];
                const department = row['部门'] || row['department'] || '';
                const statusText = row['考勤状态'] || row['status'] || row['状态'] || '正常';

                if (!date || !employeeId || !employeeName) {
                    return;
                }

                const record = {
                    id: Utils.generateId(),
                    employeeId: String(employeeId).trim(),
                    employeeName: String(employeeName).trim(),
                    department: String(department || '').trim(),
                    date: this.formatDateValue(date),
                    status: this.getStatusValue(String(statusText).trim()),
                    createdAt: new Date().toISOString()
                };

                const existingIndex = attendance.findIndex(
                    a => a.employeeId === record.employeeId && a.date === record.date
                );
                if (existingIndex !== -1) {
                    attendance[existingIndex] = record;
                } else {
                    attendance.push(record);
                    imported++;
                }
            });

            DataStore.saveAttendance(attendance);
            infoEl.textContent = `导入完成：新增 ${imported} 条记录`;
            Utils.showToast(`成功导入 ${imported} 条考勤记录`);
        } catch (error) {
            infoEl.textContent = `导入失败：${error.message}`;
            Utils.showToast('导入失败', 'error');
        }

        e.target.value = '';
    },

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;

            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
                reader.readAsText(file, 'UTF-8');
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    },

    parseFile(data, fileName) {
        const lowerName = fileName.toLowerCase();
        
        if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
            return this.parseCSV(typeof data === 'string' ? data : new TextDecoder().decode(data));
        } else {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            return XLSX.utils.sheet_to_json(firstSheet);
        }
    },

    parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]);
        const result = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === 0) continue;

            const obj = {};
            headers.forEach((header, index) => {
                obj[header.trim()] = values[index] || '';
            });
            result.push(obj);
        }

        return result;
    },

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);

        return result;
    },

    formatDateValue(value) {
        if (!value) return '';
        
        if (typeof value === 'number') {
            const date = new Date((value - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }

        const str = String(value).trim();
        const dateMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (dateMatch) {
            return `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
        }

        return str;
    },

    downloadEmployeeTemplate() {
        const headers = ['工号', '姓名', '部门', '职位', '手机', '邮箱', '入职日期', '状态', '离职日期', '离职原因'];
        const sampleData = [
            ['EMP001', '张三', '技术部', '工程师', '13800138001', 'zhangsan@example.com', '2024-01-15', '在职', '', ''],
            ['EMP002', '李四', '市场部', '经理', '13800138002', 'lisi@example.com', '2024-02-01', '在职', '', '']
        ];

        this.exportToCSV(headers, sampleData, '员工数据模板');
        Utils.showToast('模板下载成功');
    },

    downloadAttendanceTemplate() {
        const headers = ['日期', '工号', '姓名', '部门', '考勤状态'];
        const sampleData = [
            ['2024-03-20', 'EMP001', '张三', '技术部', '正常'],
            ['2024-03-20', 'EMP002', '李四', '市场部', '迟到']
        ];

        this.exportToCSV(headers, sampleData, '考勤数据模板');
        Utils.showToast('模板下载成功');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ImportExportModule.init();
});
