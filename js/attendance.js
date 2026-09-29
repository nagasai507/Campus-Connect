// =============================================
// CampusConnect - attendance.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    // Elements
    const studentName = document.getElementById("studentName");
    const currentDate = document.getElementById("currentDate");

    const presentBtn = document.getElementById("presentBtn");
    const absentBtn = document.getElementById("absentBtn");
    const resetBtn = document.getElementById("resetAttendance");

    const presentCount = document.getElementById("presentCount");
    const absentCount = document.getElementById("absentCount");
    const attendancePercentage = document.getElementById("attendancePercentage");

    const attendanceTable = document.getElementById("attendanceTable");
    const buttonGroup = document.querySelector(".button-group");

    // User Details
    const username = localStorage.getItem("username") || "Student";
    const email = localStorage.getItem("email") || "";
    const role = localStorage.getItem("role") || "Student";
    const isFaculty = role === "Faculty";
    const isStaff = isFaculty || role === "Admin";

    const syncUserFromDb = async () => {
        if (!email) return;

        try {
            const response = await fetch(`http://localhost:5000/api/user?email=${encodeURIComponent(email)}`);
            if (!response.ok) return;

            const result = await response.json();
            if (!result.user) return;

            const dbUser = result.user;
            localStorage.setItem("username", dbUser.name || username);
            localStorage.setItem("email", dbUser.email || email);
            localStorage.setItem("role", dbUser.role || role);
            if (studentName) studentName.textContent = dbUser.name || username;
        } catch (error) {
            console.warn("Attendance user sync skipped:", error.message);
        }
    };

    if (studentName) {
        studentName.textContent = username;
    }

    syncUserFromDb();

    if (isStaff) {
        const title = document.querySelector(".attendance-card h2");
        const nameLabel = studentName ? studentName.parentElement.querySelector("strong") : null;
        const historyTitle = document.querySelector(".table-section h2");
        const tableHead = document.querySelector(".attendance-table thead tr");

        if (title) title.textContent = role + " Attendance Overview";
        if (nameLabel) nameLabel.textContent = "Signed in as :";
        if (studentName) studentName.textContent = username + " (" + role + ")";
        if (buttonGroup) buttonGroup.style.display = isFaculty ? "flex" : "none";
        if (historyTitle) historyTitle.textContent = "Registered Student Attendance";
        if (tableHead) {
            tableHead.innerHTML = "<th>S.No</th><th>Student</th><th>Roll Number</th><th>Present</th><th>Absent</th><th>Attendance</th><th>Mark Status</th>";
        }
    }

    if (buttonGroup && !isFaculty) {
        buttonGroup.style.display = "none";
    }

    // Today's Date
    const today = new Date().toLocaleDateString();

    if (currentDate) {
        currentDate.textContent = today;
    }

    // Attendance Storage Key
    let storageKey = "attendance_" + username;

    let attendance =
        JSON.parse(localStorage.getItem(storageKey)) || [];

    let facultyDate = new Date().toISOString().slice(0, 10);
    let facultySearch = "";

    if (isFaculty) {
        if (buttonGroup) buttonGroup.style.display = "none";

        const facultyControls = document.createElement("div");
        facultyControls.className = "faculty-attendance-controls";
        facultyControls.innerHTML = `
            <div class="attendance-control-field">
                <label for="facultyAttendanceDate">Attendance date</label>
                <input id="facultyAttendanceDate" type="date" value="${facultyDate}">
            </div>
            <div class="attendance-control-field attendance-search-field">
                <label for="facultyStudentSearch">Find student</label>
                <input id="facultyStudentSearch" type="search" placeholder="Name or roll number">
            </div>
            <div class="attendance-control-actions">
                <button id="markAllPresent" class="present-btn" type="button">Mark All Present</button>
                <button id="markAllAbsent" class="absent-btn" type="button">Mark All Absent</button>
                <button id="saveFacultyAttendance" class="btn" type="button">Save Attendance</button>
            </div>
            <p id="facultyAttendanceStatus" class="attendance-control-status">Select a date, set statuses, and save the roster.</p>
        `;
        const attendanceCard = document.querySelector(".attendance-card");
        if (attendanceCard) attendanceCard.appendChild(facultyControls);

        document.getElementById("facultyAttendanceDate").addEventListener("change", event => {
            facultyDate = event.target.value;
            loadStaffAttendance();
        });
        document.getElementById("facultyStudentSearch").addEventListener("input", event => {
            facultySearch = event.target.value.toLowerCase().trim();
            loadStaffAttendance();
        });
        document.getElementById("markAllPresent").addEventListener("click", () => setVisibleStatuses("Present"));
        document.getElementById("markAllAbsent").addEventListener("click", () => setVisibleStatuses("Absent"));
        document.getElementById("saveFacultyAttendance").addEventListener("click", saveFacultyAttendance);
    }

    // ----------------------------
    // Save Attendance
    // ----------------------------
    async function saveAttendance(status) {

        const alreadyMarked = attendance.find(item => item.date === today);

        if (alreadyMarked) {
            alert("Attendance already marked for today.");
            return;
        }

        attendance.push({
            date: today,
            status: status
        });

        localStorage.setItem(storageKey, JSON.stringify(attendance));

        if (window.CampusApi && email) {
            try {
                await CampusApi.save("attendance", email, today, { date: today, status: status });
            } catch (error) {
                console.warn("Attendance database save skipped:", error.message);
            }
        }

        alert("Attendance Marked Successfully.");

        loadAttendance();

    }

    // ----------------------------
    // Load Attendance
    // ----------------------------
    function loadAttendance() {

        if (isStaff) {
            loadStaffAttendance();
            return;
        }

        if (attendanceTable) {

            attendanceTable.innerHTML = "";

            attendance.forEach((record, index) => {

                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${record.date}</td>
                    <td>${record.status}</td>
                `;

                attendanceTable.appendChild(row);

            });

        }

        updateStatistics();

    }

    async function loadStaffAttendance() {
        let users = JSON.parse(localStorage.getItem("users") || "[]").filter(user => user.role === "Student");
        let attendanceRecords = [];

        try {
            const response = await fetch("http://localhost:5000/api/users");
            if (response.ok) {
                const result = await response.json();
                if (Array.isArray(result.users)) {
                    users = result.users.filter(user => user.role === "Student");
                    localStorage.setItem("users", JSON.stringify(result.users));
                }
            }
        } catch (error) {
            console.warn("Faculty roster fallback to local storage:", error.message);
        }

        if (window.CampusApi) {
            try {
                attendanceRecords = await CampusApi.list("attendance");
            } catch (error) {
                console.warn("Faculty attendance fallback to local storage:", error.message);
            }
        }

        const visibleUsers = users.filter(student => {
            const searchText = (student.name + " " + (student.rollNumber || "")).toLowerCase();
            return !facultySearch || searchText.includes(facultySearch);
        });
        let totalPresent = 0;
        let totalAbsent = 0;

        if (attendanceTable) {
            attendanceTable.innerHTML = "";

            if (!users.length) {
                attendanceTable.innerHTML = '<tr><td colspan="7">No registered students found.</td></tr>';
            }

            users.forEach((student, index) => {
                const databaseRecords = attendanceRecords
                    .filter(record => record.email === (student.email || "").toLowerCase())
                    .map(record => record.payload);
                const records = databaseRecords.length
                    ? databaseRecords
                    : JSON.parse(localStorage.getItem("attendance_" + student.name) || "[]");
                localStorage.setItem("attendance_" + student.name, JSON.stringify(records));
                const present = records.filter(record => record.status === "Present").length;
                const absent = records.filter(record => record.status === "Absent").length;
                const total = present + absent;
                const percentage = total ? ((present / total) * 100).toFixed(2) + "%" : "0%";
                totalPresent += present;
                totalAbsent += absent;

                if (!visibleUsers.includes(student)) return;

                const todayRecord = records.find(record => record.date === facultyDate);

                const row = document.createElement("tr");
                [index + 1, student.name, student.rollNumber || "-", present, absent, percentage].forEach(value => {
                    const cell = document.createElement("td");
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                const statusCell = document.createElement("td");
                const statusSelect = document.createElement("select");
                statusSelect.className = "faculty-status-select";
                statusSelect.dataset.student = student.name;
                statusSelect.innerHTML = `<option value="">Not marked</option><option value="Present">Present</option><option value="Absent">Absent</option>`;
                statusSelect.value = todayRecord ? todayRecord.status : "";
                statusSelect.addEventListener("change", () => {
                    statusSelect.dataset.changed = "true";
                });
                statusCell.appendChild(statusSelect);
                row.appendChild(statusCell);
                attendanceTable.appendChild(row);
            });
        }

        const total = totalPresent + totalAbsent;
        if (presentCount) presentCount.textContent = totalPresent;
        if (absentCount) absentCount.textContent = totalAbsent;
        if (attendancePercentage) {
            attendancePercentage.textContent = total ? ((totalPresent / total) * 100).toFixed(2) + "%" : "0%";
        }
    }

    function setVisibleStatuses(status) {
        document.querySelectorAll(".faculty-status-select").forEach(select => {
            select.value = status;
            select.dataset.changed = "true";
        });
        const statusMessage = document.getElementById("facultyAttendanceStatus");
        if (statusMessage) statusMessage.textContent = "Statuses updated on screen. Click Save Attendance to apply them.";
    }

    async function saveFacultyAttendance() {
        const users = JSON.parse(localStorage.getItem("users") || "[]")
            .filter(user => user.role === "Student");
        let savedCount = 0;
        const pendingSaves = [];

        document.querySelectorAll(".faculty-status-select").forEach(select => {
            if (!select.dataset.changed || !select.value) return;

            const student = users.find(user => user.name === select.dataset.student);
            if (!student) return;

            const key = "attendance_" + student.name;
            const records = JSON.parse(localStorage.getItem(key) || "[]")
                .filter(record => record.date !== facultyDate);
            records.push({ date: facultyDate, status: select.value });
            localStorage.setItem(key, JSON.stringify(records));
            if (window.CampusApi && student.email) {
                pendingSaves.push(CampusApi.save("attendance", student.email, facultyDate, {
                    date: facultyDate,
                    status: select.value,
                    studentName: student.name,
                    rollNumber: student.rollNumber || "",
                    markedBy: email
                }).catch(error => console.warn("Faculty attendance database save skipped:", error.message)));
            }
            savedCount++;
        });

        await Promise.all(pendingSaves);

        const statusMessage = document.getElementById("facultyAttendanceStatus");
        if (statusMessage) statusMessage.textContent = savedCount + " student attendance record(s) saved for " + facultyDate + ".";
        loadStaffAttendance();
    }

    // ----------------------------
    // Statistics
    // ----------------------------
    function updateStatistics() {

        let present = attendance.filter(
            item => item.status === "Present"
        ).length;

        let absent = attendance.filter(
            item => item.status === "Absent"
        ).length;

        let total = attendance.length;

        let percentage =
            total === 0
                ? 0
                : ((present / total) * 100).toFixed(2);

        if (presentCount)
            presentCount.textContent = present;

        if (absentCount)
            absentCount.textContent = absent;

        if (attendancePercentage)
            attendancePercentage.textContent =
                percentage + "%";

    }

    // ----------------------------
    // Buttons
    // ----------------------------
    if (presentBtn && isFaculty) {

        presentBtn.addEventListener("click", () => {

            saveAttendance("Present");

        });

    }

    if (absentBtn && isFaculty) {

        absentBtn.addEventListener("click", () => {

            saveAttendance("Absent");

        });

    }

    if (resetBtn && isFaculty) {

        resetBtn.addEventListener("click", async () => {

            const confirmReset =
                confirm("Reset all attendance records?");

            if (confirmReset) {

                attendance = [];

                localStorage.removeItem(storageKey);

                if (window.CampusApi && email) {
                    try {
                        await CampusApi.clear("attendance", email);
                    } catch (error) {
                        console.warn("Attendance database clear skipped:", error.message);
                    }
                }

                loadAttendance();

            }

        });

    }

    // Initial Load
    async function loadPersonalAttendance() {
        if (isStaff || !window.CampusApi || !email) return loadAttendance();
        try {
            const records = await CampusApi.list("attendance", email);
            if (records.length) {
                attendance = records.map(record => record.payload).sort((a, b) => new Date(a.date) - new Date(b.date));
            } else if (attendance.length) {
                await Promise.all(attendance.map(record => CampusApi.save("attendance", email, record.date, record)));
            }
            localStorage.setItem(storageKey, JSON.stringify(attendance));
        } catch (error) {
            console.warn("Attendance database load skipped:", error.message);
        }
        loadAttendance();
    }

    loadPersonalAttendance();

});