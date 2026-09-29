// ============================================
// CampusConnect - dashboard.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    // ===========================
    // Check Login
    // ===========================
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn !== "true") {
        window.location.href = "login.html";
        return;
    }

    // ===========================
    // Load User Details
    // ===========================
    const username = localStorage.getItem("username") || "Student";
    const email = localStorage.getItem("email") || "";
    const role = localStorage.getItem("role") || "Student";

    const usernameElement = document.getElementById("username");
    const emailElement = document.getElementById("userEmail");
    const roleElement = document.getElementById("userRole");

    const applyUserDetails = (userName, userEmail, userRole) => {
        if (usernameElement) usernameElement.textContent = userName || "Student";
        if (emailElement) emailElement.textContent = userEmail || "";
        if (roleElement) roleElement.textContent = userRole || "Student";

        const avatarCircle = document.getElementById("avatarCircle");
        if (avatarCircle) {
            avatarCircle.textContent = (userName || "Student").trim().charAt(0).toUpperCase() || "S";
        }

        const welcome = document.getElementById("welcomeMessage");
        if (welcome) {
            welcome.textContent = `Welcome, ${userName || "Student"}!`;
        }
    };

    applyUserDetails(username, email, role);

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
            applyUserDetails(dbUser.name || username, dbUser.email || email, dbUser.role || role);
        } catch (error) {
            console.warn("Dashboard user sync skipped:", error.message);
        }
    };

    syncUserFromDb();

    // ===========================
    // Current Date
    // ===========================
    const currentDate = document.getElementById("currentDate");

    if (currentDate) {
        currentDate.textContent = new Date().toDateString();
    }

    // ===========================
    // Digital Clock
    // ===========================
    const clock = document.getElementById("clock");

    function updateClock() {

        if (!clock) return;

        const now = new Date();

        clock.textContent =
            now.toLocaleTimeString();

    }

    updateClock();

    setInterval(updateClock, 1000);

    // ===========================
    // Dashboard Statistics
    // ===========================
    const loadStats = async () => {
        let registeredUsers = JSON.parse(localStorage.getItem("users") || "[]");

        try {
            const response = await fetch("http://localhost:5000/api/users");
            if (response.ok) {
                const result = await response.json();
                if (Array.isArray(result.users)) {
                    registeredUsers = result.users;
                    localStorage.setItem("users", JSON.stringify(registeredUsers));
                }
            }
        } catch (error) {
            console.warn("Dashboard stats fallback to local storage:", error.message);
        }

        const stats = {
            students: registeredUsers.filter(user => user.role === "Student").length,
            faculty: registeredUsers.filter(user => user.role === "Faculty").length,
            attendance: 94,
            notes: 620,
            placements: 180,
            events: 16
        };

        setStat("studentsCount", stats.students);
        setStat("facultyCount", stats.faculty);
        setStat("attendanceCount", stats.attendance + "%");
        setStat("notesCount", stats.notes);
        setStat("placementCount", stats.placements);
        setStat("eventCount", stats.events);
    };

    loadStats();

    function setStat(id, value) {

        const element = document.getElementById(id);

        if (element) {

            element.textContent = value;

        }

    }

    // ===========================
    // Attendance Progress
    // ===========================
    const attendanceBar =
        document.querySelector(".attendance-progress");

    if (attendanceBar) {

        attendanceBar.style.width = "94%";

        attendanceBar.textContent = "94%";

    }

    // ===========================
    // Notification List
    // ===========================
    const notificationList =
        document.getElementById("notificationList");

    const notifications = [

        { icon: "fa-calendar-check", message: "Attendance updated successfully." },
        { icon: "fa-book-open", message: "New Notes Uploaded." },
        { icon: "fa-briefcase", message: "Campus Drive starts tomorrow." },
        { icon: "fa-robot", message: "AI Workshop on Friday." },
        { icon: "fa-bell", message: "Semester Exam Schedule Released." }

    ];

    if (notificationList) {

        notifications.forEach(item => {

            const li = document.createElement("li");
            li.className = "notification-item";

            const icon = document.createElement("i");
            icon.className = "fa-solid " + item.icon;

            const text = document.createElement("p");
            text.textContent = item.message;

            li.appendChild(icon);
            li.appendChild(text);

            notificationList.appendChild(li);

        });

    }

    // ===========================
    // Search Dashboard Cards
    // ===========================
    const searchInput =
        document.getElementById("search");

    if (searchInput) {

        searchInput.addEventListener("keyup", function () {

            const value =
                this.value.toLowerCase();

            const cards =
                document.querySelectorAll(".dashboard-card");

            cards.forEach(card => {

                const text =
                    card.innerText.toLowerCase();

                if (text.includes(value)) {

                    card.style.display = "";

                } else {

                    card.style.display = "none";

                }

            });

        });

    }

    // ===========================
    // Sidebar Active Menu
    // ===========================
    const menuItems =
        document.querySelectorAll(".sidebar a");

    menuItems.forEach(item => {

        item.addEventListener("click", function () {

            menuItems.forEach(link =>
                link.classList.remove("active")
            );

            this.classList.add("active");

        });

    });

    // ===========================
    // Sidebar Toggle
    // ===========================
    const menuButton =
        document.getElementById("menuToggle");

    const sidebar =
        document.querySelector(".sidebar");

    if (menuButton && sidebar) {

        menuButton.addEventListener("click", () => {

            sidebar.classList.toggle("show");

        });

    }

    // ===========================
    // Dark Mode
    // ===========================
    const darkButton =
        document.getElementById("darkMode");

    if (localStorage.getItem("theme") === "dark") {

        document.body.classList.add("dark");

    }

    if (darkButton) {

        darkButton.addEventListener("click", () => {

            document.body.classList.toggle("dark");

            if (document.body.classList.contains("dark")) {

                localStorage.setItem("theme", "dark");

            } else {

                localStorage.setItem("theme", "light");

            }

        });

    }

    // ===========================
    // Logout
    // ===========================
    const logout =
        document.getElementById("logout");

    if (logout) {

        logout.addEventListener("click", () => {

            const confirmLogout =
                confirm("Are you sure you want to logout?");

            if (confirmLogout) {

                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("username");
                localStorage.removeItem("email");
                localStorage.removeItem("role");

                window.location.href = "login.html";

            }

        });

    }

    // ===========================
    // Quick Buttons
    // ===========================
    const quickButtons =
        document.querySelectorAll(".quick-btn");

    quickButtons.forEach(button => {

        button.addEventListener("click", () => {

            const action = button.dataset.action;

            if (action === "navigate" && button.dataset.target) {

                window.location.href = button.dataset.target;

            } else if (action === "report") {

                downloadDashboardReport();

            } else {

                alert(button.innerText + " feature coming soon.");

            }

        });

    });

    // ===========================
    // Download Report
    // ===========================
    function downloadDashboardReport() {

        const get = id => {
            const el = document.getElementById(id);
            return el ? el.textContent : "-";
        };

        const lines = [
            "CampusConnect - Dashboard Report",
            "=================================",
            "Generated: " + new Date().toLocaleString(),
            "Student: " + username,
            "Email: " + email,
            "Role: " + role,
            "",
            "SNAPSHOT",
            "--------",
            "Students: " + get("studentsCount"),
            "Faculty: " + get("facultyCount"),
            "Attendance: " + get("attendanceCount"),
            "Notes Shared: " + get("notesCount"),
            "Placements: " + get("placementCount"),
            "Upcoming Events: " + get("eventCount")
        ];

        const blob = new Blob([lines.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "CampusConnect_Dashboard_Report.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);

    }

});