// =============================================
// CampusConnect - results.js
// Role-based Results Portal
//   Admin   -> release / manage results
//   Faculty -> view all, filter by branch/year/sem
//   Student -> view only own released results
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const role = localStorage.getItem("role") || "Student";
    const username = localStorage.getItem("username") || "Student";
    const email = (localStorage.getItem("email") || "").toLowerCase();
    const rollNumber = localStorage.getItem("rollNumber") || "";
    let registeredUsers = JSON.parse(localStorage.getItem("users") || "[]");
    let databaseResults = [];
    let shouldMigrateResults = false;

    const resultsTitle = document.getElementById("resultsTitle");
    const resultsSubtitle = document.getElementById("resultsSubtitle");
    const resultsContent = document.getElementById("resultsContent");

    const BRANCHES = ["CSE", "ECE", "EEE", "MECH", "CIVIL"];
    const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const SEMESTERS = ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];

    // ----------------------------
    // Escape HTML (prevent XSS)
    // ----------------------------
    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = String(str);
        return div.innerHTML;
    }

    // ----------------------------
    // Data helpers
    // ----------------------------
    function getResults() {
        return JSON.parse(localStorage.getItem("resultsData") || "[]");
    }

    function saveResults(data) {
        const previous = databaseResults;
        databaseResults = data;
        localStorage.setItem("resultsData", JSON.stringify(data));
        if (!window.CampusApi) return;

        const nextIds = new Set(data.map(record => String(record.id)));
        const pending = data.map(record => CampusApi.save(
            "result",
            record.email || email,
            record.id,
            record
        ));
        previous.filter(record => !nextIds.has(String(record.id))).forEach(record => {
            pending.push(CampusApi.remove("result", record.email || email, record.id));
        });
        Promise.all(pending).catch(error => console.warn("Results database save skipped:", error.message));
    }

    function getRegisteredStudents() {
        return registeredUsers.filter(user => user.role === "Student");
    }

    function isRegisteredStudent(result) {
        return getRegisteredStudents().some(student =>
            (result.email && student.email && result.email.toLowerCase() === student.email.toLowerCase()) ||
            (result.rollNumber && student.rollNumber && result.rollNumber === student.rollNumber)
        );
    }

    function calcSGPA(subjects) {

        const totalObtained = subjects.reduce((sum, s) => sum + Number(s.marks || 0), 0);
        const totalMax = subjects.reduce((sum, s) => sum + Number(s.max || 0), 0);

        if (totalMax === 0) return "0.00";

        return ((totalObtained / totalMax) * 10).toFixed(2);

    }

    // ----------------------------
    // Remove legacy demo results so only registered students appear.
    // ----------------------------
    function seedResultsIfNeeded() {
        const existingResults = getResults();
        const validResults = existingResults.filter(isRegisteredStudent);
        if (validResults.length !== existingResults.length || shouldMigrateResults) {
            shouldMigrateResults = false;
            saveResults(validResults);
        }
    }

    // ==================================================
    // Shared: dropdown builder
    // ==================================================
    function options(list, placeholder) {
        return `<option value="">${placeholder}</option>` +
            list.map(v => `<option value="${v}">${v}</option>`).join("");
    }

    // ==================================================
    // STUDENT VIEW — only own, only released
    // ==================================================
    function renderStudentPortal() {

        resultsTitle.textContent = "🎓 My Results";
        resultsSubtitle.textContent = "View your semester-wise results as they are released by the administration.";

        const all = getResults().filter(isRegisteredStudent);

        const mine = all.filter(r =>
            (email && r.email === email) ||
            (rollNumber && r.rollNumber === rollNumber)
        );

        if (mine.length === 0) {

            resultsContent.innerHTML = `
                <div class="card" style="text-align:center;">
                    <h3>No results found</h3>
                    <p>We couldn't find any result records linked to your account yet. Once your institution publishes results, they'll appear here.</p>
                </div>
            `;
            return;

        }

        // Sort by semester number
        mine.sort((a, b) => SEMESTERS.indexOf(a.semester) - SEMESTERS.indexOf(b.semester));

        const releasedOnes = mine.filter(r => r.released);

        const overallCgpa = releasedOnes.length
            ? (releasedOnes.reduce((sum, r) => sum + parseFloat(r.sgpa), 0) / releasedOnes.length).toFixed(2)
            : "-";

        let html = `
            <div class="cgpa-summary">
                <div class="stat-box"><h3>Roll Number</h3><h2 style="font-size:20px;">${escapeHTML(mine[0].rollNumber)}</h2></div>
                <div class="stat-box"><h3>Branch</h3><h2 style="font-size:20px;">${escapeHTML(mine[0].branch)}</h2></div>
                <div class="stat-box"><h3>Semesters Released</h3><h2>${releasedOnes.length} / ${mine.length}</h2></div>
                <div class="stat-box"><h3>Overall CGPA</h3><h2>${overallCgpa}</h2></div>
            </div>
        `;

        mine.forEach(record => {

            if (!record.released) {

                html += `
                    <div class="semester-card locked">
                        <h3>${escapeHTML(record.semester)}</h3>
                        <p>🔒 Results not released yet. Please check back later.</p>
                    </div>
                `;
                return;

            }

            html += `
                <div class="semester-card">
                    <div class="semester-card-header">
                        <h3>${escapeHTML(record.semester)}</h3>
                        <span class="sgpa-badge">SGPA: ${record.sgpa}</span>
                    </div>
                    <div class="results-table-wrap">
                        <table class="notes-table">
                            <thead>
                                <tr><th>Subject</th><th>Marks Obtained</th><th>Max Marks</th></tr>
                            </thead>
                            <tbody>
                                ${record.subjects.map(s => `
                                    <tr>
                                        <td>${escapeHTML(s.name)}</td>
                                        <td>${escapeHTML(s.marks)}</td>
                                        <td>${escapeHTML(s.max)}</td>
                                    </tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

        });

        resultsContent.innerHTML = html;

    }

    // ==================================================
    // FACULTY VIEW — read-only, filter by branch/year/sem
    // ==================================================
    function renderFacultyPortal() {

        resultsTitle.textContent = "📋 Student Results (Faculty View)";
        resultsSubtitle.textContent = "Browse student results classified by branch, year, and semester.";

        resultsContent.innerHTML = `
            <div class="filter-bar">
                <div class="form-group">
                    <label>Branch</label>
                    <select id="filterBranch">${options(BRANCHES, "All Branches")}</select>
                </div>
                <div class="form-group">
                    <label>Year</label>
                    <select id="filterYear">${options(YEARS, "All Years")}</select>
                </div>
                <div class="form-group">
                    <label>Semester</label>
                    <select id="filterSem">${options(SEMESTERS, "All Semesters")}</select>
                </div>
                <button class="btn" id="applyFacultyFilter">Filter</button>
            </div>
            <div class="results-table-wrap">
                <table class="notes-table">
                    <thead>
                        <tr>
                            <th>Roll No</th><th>Name</th><th>Branch</th><th>Year</th><th>Semester</th><th>SGPA</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="facultyResultsBody"></tbody>
                </table>
            </div>
        `;

        function render() {

            const branch = document.getElementById("filterBranch").value;
            const year = document.getElementById("filterYear").value;
            const sem = document.getElementById("filterSem").value;

            let data = getResults().filter(isRegisteredStudent);

            if (branch) data = data.filter(r => r.branch === branch);
            if (year) data = data.filter(r => r.year === year);
            if (sem) data = data.filter(r => r.semester === sem);

            const body = document.getElementById("facultyResultsBody");

            if (data.length === 0) {
                body.innerHTML = '<tr><td colspan="7">No matching results found.</td></tr>';
                return;
            }

            body.innerHTML = data.map(r => `
                <tr>
                    <td>${escapeHTML(r.rollNumber)}</td>
                    <td>${escapeHTML(r.studentName)}</td>
                    <td>${escapeHTML(r.branch)}</td>
                    <td>${escapeHTML(r.year)}</td>
                    <td>${escapeHTML(r.semester)}</td>
                    <td>${r.released ? escapeHTML(r.sgpa) : "-"}</td>
                    <td><span class="status ${r.released ? 'running' : 'delayed'}">${r.released ? "Released" : "Pending"}</span></td>
                </tr>
            `).join("");

        }

        document.getElementById("applyFacultyFilter").addEventListener("click", render);

        render();

    }

    // ==================================================
    // ADMIN VIEW — full CRUD + release control
    // ==================================================
    function renderAdminPortal() {

        resultsTitle.textContent = "🛠️ Results Management (Admin)";
        resultsSubtitle.textContent = "Add student results, and release them so students can view their scores.";

        resultsContent.innerHTML = `
            <div class="card bulk-results-card">
                <div class="bulk-results-header">
                    <div>
                        <h3>📥 Bulk Result Import</h3>
                        <p>Upload one CSV containing multiple registered students and semesters.</p>
                    </div>
                    <button class="reset-btn" id="downloadResultsTemplate" type="button">Download Template</button>
                </div>
                <div class="bulk-results-actions">
                    <input type="file" id="bulkResultsFile" accept=".csv,text/csv">
                    <button class="btn" id="previewBulkResults" type="button">Preview CSV</button>
                    <button class="reset-btn" id="importBulkResults" type="button" disabled>Import Results</button>
                </div>
                <p class="bulk-results-hint">Format: rollNumber, studentName, email, branch, year, semester, subjects. Use subjects like <strong>Math:85|Physics:90</strong>.</p>
                <div id="bulkResultsStatus" class="bulk-results-status" aria-live="polite"></div>
                <div id="bulkResultsPreview" class="results-table-wrap"></div>
            </div>

            <div class="card" style="margin-bottom:30px;">
                <h3 id="formHeading">➕ Add / Update Result</h3>

                <div class="input-row" style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px;">
                    <div class="form-group"><label>Roll Number</label><input type="text" id="fRoll" placeholder="e.g. CS2023099"></div>
                    <div class="form-group"><label>Student Name</label><input type="text" id="fName" placeholder="Full Name"></div>
                    <div class="form-group"><label>Email</label><input type="email" id="fEmail" placeholder="student@example.com"></div>
                    <div class="form-group"><label>Branch</label><select id="fBranch">${options(BRANCHES, "Select Branch")}</select></div>
                    <div class="form-group"><label>Year</label><select id="fYear">${options(YEARS, "Select Year")}</select></div>
                    <div class="form-group"><label>Semester</label><select id="fSem">${options(SEMESTERS, "Select Semester")}</select></div>
                </div>

                <h4 style="margin:20px 0 10px;">Subjects</h4>
                <div id="subjectRows"></div>
                <button class="reset-btn" id="addSubjectRow" type="button">+ Add Subject</button>

                <br><br>
                <button class="btn" id="saveResultBtn">Save Result</button>
                <button class="reset-btn" id="clearFormBtn" style="margin-left:10px;">Clear Form</button>
            </div>

            <div class="filter-bar">
                <div class="form-group">
                    <label>Branch</label>
                    <select id="filterBranch">${options(BRANCHES, "All Branches")}</select>
                </div>
                <div class="form-group">
                    <label>Year</label>
                    <select id="filterYear">${options(YEARS, "All Years")}</select>
                </div>
                <div class="form-group">
                    <label>Semester</label>
                    <select id="filterSem">${options(SEMESTERS, "All Semesters")}</select>
                </div>
                <button class="btn" id="applyAdminFilter">Filter</button>
                <button class="reset-btn" id="releaseAllBtn">Release All Filtered</button>
            </div>

            <div class="results-table-wrap">
                <table class="notes-table">
                    <thead>
                        <tr>
                            <th>Roll No</th><th>Name</th><th>Branch</th><th>Year</th><th>Semester</th><th>SGPA</th><th>Status</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="adminResultsBody"></tbody>
                </table>
            </div>
        `;

        let editingId = null;
        let bulkRecords = [];

        function parseCSVLine(line) {
            const values = [];
            let value = "";
            let quoted = false;

            for (let index = 0; index < line.length; index++) {
                const character = line[index];

                if (character === '"') {
                    if (quoted && line[index + 1] === '"') {
                        value += '"';
                        index++;
                    } else {
                        quoted = !quoted;
                    }
                } else if (character === "," && !quoted) {
                    values.push(value.trim());
                    value = "";
                } else {
                    value += character;
                }
            }

            values.push(value.trim());
            return values;
        }

        function parseBulkCSV(csv) {
            const lines = csv.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) throw new Error("The CSV must include a header and at least one result row.");

            const headers = parseCSVLine(lines[0]).map(header => header.toLowerCase());
            const requiredHeaders = ["rollnumber", "studentname", "email", "branch", "year", "semester", "subjects"];

            if (!requiredHeaders.every(header => headers.includes(header))) {
                throw new Error("CSV headers must be: rollNumber, studentName, email, branch, year, semester, subjects.");
            }

            const registeredStudents = getRegisteredStudents();
            const records = [];
            const errors = [];

            lines.slice(1).forEach((line, index) => {
                const row = parseCSVLine(line);
                const value = name => row[headers.indexOf(name)] || "";
                const rowNumber = index + 2;
                const rollNumber = value("rollnumber");
                const email = value("email").toLowerCase();
                const semester = value("semester");
                const student = registeredStudents.find(item =>
                    (rollNumber && item.rollNumber === rollNumber) ||
                    (email && item.email && item.email.toLowerCase() === email)
                );

                if (!student) {
                    errors.push(`Row ${rowNumber}: student is not registered.`);
                    return;
                }

                if (!SEMESTERS.includes(semester)) {
                    errors.push(`Row ${rowNumber}: invalid semester.`);
                    return;
                }

                const subjects = value("subjects").split("|").map(subject => {
                    const separator = subject.lastIndexOf(":");
                    const name = subject.slice(0, separator).trim();
                    const marks = Number(subject.slice(separator + 1).trim());
                    return { name: name, marks: marks, max: 100 };
                }).filter(subject => subject.name && Number.isFinite(subject.marks));

                if (!subjects.length || subjects.some(subject => subject.marks < 0 || subject.marks > subject.max)) {
                    errors.push(`Row ${rowNumber}: subjects must use Name:Marks and marks must be 0-100.`);
                    return;
                }

                records.push({
                    id: student.rollNumber + "_" + semester.replace(/\s+/g, ""),
                    rollNumber: student.rollNumber,
                    studentName: student.name,
                    email: student.email.toLowerCase(),
                    branch: student.branch,
                    year: student.year,
                    semester: semester,
                    subjects: subjects,
                    sgpa: calcSGPA(subjects),
                    released: false
                });
            });

            return { records: records, errors: errors };
        }

        function renderBulkPreview(parsed) {
            bulkRecords = parsed.records;
            const status = document.getElementById("bulkResultsStatus");
            const preview = document.getElementById("bulkResultsPreview");
            const importButton = document.getElementById("importBulkResults");
            const errorText = parsed.errors.length ? ` ${parsed.errors.length} row(s) skipped.` : "";

            status.textContent = `${parsed.records.length} valid result(s) ready to import.${errorText}`;
            status.className = parsed.errors.length ? "bulk-results-status has-errors" : "bulk-results-status is-ready";
            if (parsed.errors.length) status.textContent += " " + parsed.errors.join(" ");
            importButton.disabled = !parsed.records.length;

            preview.innerHTML = parsed.records.length ? `
                <table class="notes-table bulk-preview-table">
                    <thead><tr><th>Student</th><th>Roll No</th><th>Semester</th><th>Subjects</th><th>SGPA</th></tr></thead>
                    <tbody>${parsed.records.map(record => `
                        <tr>
                            <td>${escapeHTML(record.studentName)}</td>
                            <td>${escapeHTML(record.rollNumber)}</td>
                            <td>${escapeHTML(record.semester)}</td>
                            <td>${record.subjects.length}</td>
                            <td>${escapeHTML(record.sgpa)}</td>
                        </tr>
                    `).join("")}</tbody>
                </table>
            ` : "";
        }

        document.getElementById("downloadResultsTemplate").addEventListener("click", () => {
            const csv = "rollNumber,studentName,email,branch,year,semester,subjects\n";
            const blob = new Blob([csv], { type: "text/csv" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "campusconnect-results-template.csv";
            link.click();
            URL.revokeObjectURL(link.href);
        });

        document.getElementById("previewBulkResults").addEventListener("click", () => {
            const file = document.getElementById("bulkResultsFile").files[0];
            if (!file) {
                document.getElementById("bulkResultsStatus").textContent = "Choose a CSV file first.";
                return;
            }

            const reader = new FileReader();
            reader.onload = event => {
                try {
                    renderBulkPreview(parseBulkCSV(event.target.result));
                } catch (error) {
                    bulkRecords = [];
                    document.getElementById("importBulkResults").disabled = true;
                    document.getElementById("bulkResultsStatus").textContent = error.message;
                    document.getElementById("bulkResultsStatus").className = "bulk-results-status has-errors";
                }
            };
            reader.readAsText(file);
        });

        document.getElementById("importBulkResults").addEventListener("click", () => {
            const existing = getResults().filter(isRegisteredStudent);
            const byId = new Map(existing.map(record => [record.id, record]));

            bulkRecords.forEach(record => {
                const previous = byId.get(record.id);
                byId.set(record.id, { ...record, released: previous ? previous.released : false });
            });

            saveResults(Array.from(byId.values()));
            bulkRecords = [];
            document.getElementById("importBulkResults").disabled = true;
            document.getElementById("bulkResultsStatus").textContent = "Results imported successfully. Use Release Filtered below when they are ready.";
            document.getElementById("bulkResultsPreview").innerHTML = "";
            document.getElementById("bulkResultsFile").value = "";
            renderTable();
        });

        // ---------- Subject Rows ----------
        function addSubjectRow(name, marks, max) {

            const container = document.getElementById("subjectRows");
            const row = document.createElement("div");
            row.className = "subject-row";

            row.innerHTML = `
                <input type="text" class="subjName" placeholder="Subject Name" value="${name ? escapeHTML(name) : ''}">
                <input type="number" class="subjMarks" placeholder="Marks" min="0" value="${marks !== undefined ? marks : ''}">
                <input type="number" class="subjMax" placeholder="Max Marks" min="1" value="${max !== undefined ? max : 100}">
                <button type="button" class="subject-row-remove">&times;</button>
            `;

            row.querySelector(".subject-row-remove").addEventListener("click", () => row.remove());

            container.appendChild(row);

        }

        document.getElementById("addSubjectRow").addEventListener("click", () => addSubjectRow());

        function resetForm() {

            editingId = null;
            document.getElementById("formHeading").textContent = "➕ Add / Update Result";
            document.getElementById("fRoll").value = "";
            document.getElementById("fName").value = "";
            document.getElementById("fEmail").value = "";
            document.getElementById("fBranch").value = "";
            document.getElementById("fYear").value = "";
            document.getElementById("fSem").value = "";
            document.getElementById("subjectRows").innerHTML = "";

            for (let i = 0; i < 5; i++) addSubjectRow();

        }

        resetForm();

        document.getElementById("clearFormBtn").addEventListener("click", resetForm);

        // ---------- Save (create or update) ----------
        document.getElementById("saveResultBtn").addEventListener("click", () => {

            const rollVal = document.getElementById("fRoll").value.trim();
            const nameVal = document.getElementById("fName").value.trim();
            const emailVal = document.getElementById("fEmail").value.trim().toLowerCase();
            const branchVal = document.getElementById("fBranch").value;
            const yearVal = document.getElementById("fYear").value;
            const semVal = document.getElementById("fSem").value;

            if (!rollVal || !nameVal || !branchVal || !yearVal || !semVal) {
                alert("Please fill Roll Number, Name, Branch, Year and Semester.");
                return;
            }

            const registeredStudent = getRegisteredStudents().find(student =>
                (emailVal && student.email && emailVal === student.email.toLowerCase()) ||
                (rollVal && student.rollNumber && rollVal === student.rollNumber)
            );

            if (!registeredStudent) {
                alert("Results can only be added for a registered student.");
                return;
            }

            const subjectRows = document.querySelectorAll("#subjectRows .subject-row");
            const subjects = [];

            subjectRows.forEach(row => {

                const name = row.querySelector(".subjName").value.trim();
                const marks = row.querySelector(".subjMarks").value;
                const max = row.querySelector(".subjMax").value;

                if (name && marks !== "" && max !== "") {
                    subjects.push({ name: name, marks: Number(marks), max: Number(max) });
                }

            });

            if (subjects.length === 0) {
                alert("Please add at least one subject with marks.");
                return;
            }

            let data = getResults().filter(isRegisteredStudent);

            const recordId = editingId || (rollVal + "_" + semVal.replace(/\s+/g, ""));

            const existingIndex = data.findIndex(r => r.id === recordId);

            const record = {
                id: recordId,
                rollNumber: rollVal,
                studentName: nameVal,
                email: emailVal || registeredStudent.email,
                branch: branchVal,
                year: yearVal,
                semester: semVal,
                subjects: subjects,
                sgpa: calcSGPA(subjects),
                released: existingIndex > -1 ? data[existingIndex].released : false
            };

            if (existingIndex > -1) {
                data[existingIndex] = record;
                alert("Result updated successfully.");
            } else {
                data.push(record);
                alert("Result added successfully. Remember to release it once ready.");
            }

            saveResults(data);
            resetForm();
            renderTable();

        });

        // ---------- Table ----------
        function renderTable() {

            const branch = document.getElementById("filterBranch").value;
            const year = document.getElementById("filterYear").value;
            const sem = document.getElementById("filterSem").value;

            let data = getResults().filter(isRegisteredStudent);

            if (branch) data = data.filter(r => r.branch === branch);
            if (year) data = data.filter(r => r.year === year);
            if (sem) data = data.filter(r => r.semester === sem);

            const body = document.getElementById("adminResultsBody");

            if (data.length === 0) {
                body.innerHTML = '<tr><td colspan="8">No matching results found.</td></tr>';
                return;
            }

            body.innerHTML = data.map(r => `
                <tr>
                    <td>${escapeHTML(r.rollNumber)}</td>
                    <td>${escapeHTML(r.studentName)}</td>
                    <td>${escapeHTML(r.branch)}</td>
                    <td>${escapeHTML(r.year)}</td>
                    <td>${escapeHTML(r.semester)}</td>
                    <td>${escapeHTML(r.sgpa)}</td>
                    <td>
                        <button class="released-toggle ${r.released ? 'is-released' : 'is-pending'}" data-id="${r.id}">
                            ${r.released ? "Released" : "Release"}
                        </button>
                    </td>
                    <td>
                        <button class="action-icon-btn" data-edit="${r.id}" title="Edit">✎</button>
                        <button class="action-icon-btn" data-delete="${r.id}" title="Delete">🗑</button>
                    </td>
                </tr>
            `).join("");

            // Release toggle
            body.querySelectorAll(".released-toggle").forEach(btn => {

                btn.addEventListener("click", () => {

                    let all = getResults().filter(isRegisteredStudent);
                    const idx = all.findIndex(r => r.id === btn.dataset.id);

                    if (idx > -1) {
                        all[idx].released = !all[idx].released;
                        saveResults(all);
                        renderTable();
                    }

                });

            });

            // Edit
            body.querySelectorAll("[data-edit]").forEach(btn => {

                btn.addEventListener("click", () => {

                    const all = getResults().filter(isRegisteredStudent);
                    const record = all.find(r => r.id === btn.dataset.edit);

                    if (!record) return;

                    editingId = record.id;
                    document.getElementById("formHeading").textContent = "✎ Editing: " + record.rollNumber + " — " + record.semester;
                    document.getElementById("fRoll").value = record.rollNumber;
                    document.getElementById("fName").value = record.studentName;
                    document.getElementById("fEmail").value = record.email;
                    document.getElementById("fBranch").value = record.branch;
                    document.getElementById("fYear").value = record.year;
                    document.getElementById("fSem").value = record.semester;

                    document.getElementById("subjectRows").innerHTML = "";
                    record.subjects.forEach(s => addSubjectRow(s.name, s.marks, s.max));

                    window.scrollTo({ top: 0, behavior: "smooth" });

                });

            });

            // Delete
            body.querySelectorAll("[data-delete]").forEach(btn => {

                btn.addEventListener("click", () => {

                    if (!confirm("Delete this result record? This cannot be undone.")) return;

                    let all = getResults().filter(isRegisteredStudent);
                    all = all.filter(r => r.id !== btn.dataset.delete);
                    saveResults(all);
                    renderTable();

                });

            });

        }

        document.getElementById("applyAdminFilter").addEventListener("click", renderTable);

        document.getElementById("releaseAllBtn").addEventListener("click", () => {

            const branch = document.getElementById("filterBranch").value;
            const year = document.getElementById("filterYear").value;
            const sem = document.getElementById("filterSem").value;

            let all = getResults().filter(isRegisteredStudent);
            let count = 0;

            all = all.map(r => {

                const matches =
                    (!branch || r.branch === branch) &&
                    (!year || r.year === year) &&
                    (!sem || r.semester === sem);

                if (matches && !r.released) {
                    count++;
                    return { ...r, released: true };
                }

                return r;

            });

            saveResults(all);
            renderTable();

            alert(count + " result(s) released to students.");

        });

        renderTable();

    }

    async function initializeResults() {
        try {
            const response = await fetch("http://localhost:5000/api/users");
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.users)) {
                    registeredUsers = data.users;
                    localStorage.setItem("users", JSON.stringify(registeredUsers));
                }
            }
        } catch (error) {
            console.warn("Results roster sync skipped:", error.message);
        }

        if (window.CampusApi) {
            try {
                const records = await CampusApi.list("result", role === "Student" ? email : "");
                if (records.length) {
                    databaseResults = records.map(record => record.payload);
                    localStorage.setItem("resultsData", JSON.stringify(databaseResults));
                } else {
                    shouldMigrateResults = true;
                    const cachedResults = getResults();
                    databaseResults = role === "Student"
                        ? cachedResults.filter(record =>
                            (email && record.email && record.email.toLowerCase() === email) ||
                            (rollNumber && record.rollNumber === rollNumber)
                        )
                        : cachedResults;
                    localStorage.setItem("resultsData", JSON.stringify(databaseResults));
                }
            } catch (error) {
                console.warn("Results database load skipped:", error.message);
                databaseResults = getResults();
            }
        } else {
            databaseResults = getResults();
        }

        seedResultsIfNeeded();

        if (role === "Admin") {
            renderAdminPortal();
        } else if (role === "Faculty") {
            renderFacultyPortal();
        } else {
            renderStudentPortal();
        }
    }

    initializeResults();

});
