// =============================================
// CampusConnect - analytics.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("Chart.js failed to load.");
        return;
    }

    Chart.defaults.color = "#dce9ff";
    Chart.defaults.font.family = "Poppins";

    const accent = "#00e5ff";
    const primary = "#0057ff";
    const secondary = "#00c6ff";

    const gridColor = "rgba(255,255,255,.10)";

    const totalStudents = document.getElementById("totalStudents");
    const totalFaculty = document.getElementById("totalFaculty");

    const updateUserCounts = async () => {
        let registeredUsers = JSON.parse(localStorage.getItem("users") || "[]");

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
            console.warn("Analytics roster sync skipped:", error.message);
        }

        if (totalStudents) {
            totalStudents.textContent = registeredUsers.filter(user => user.role === "Student").length;
        }

        if (totalFaculty) {
            totalFaculty.textContent = registeredUsers.filter(user => user.role === "Faculty").length;
        }
    };

    updateUserCounts();

    // ----------------------------
    // Attendance Analysis (Line)
    // ----------------------------
    const attendanceCtx = document.getElementById("attendanceChart");

    if (attendanceCtx) {

        new Chart(attendanceCtx, {
            type: "line",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                    label: "Attendance %",
                    data: [88, 91, 89, 94, 92, 95],
                    borderColor: accent,
                    backgroundColor: "rgba(0,229,255,.15)",
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                scales: {
                    x: { grid: { color: gridColor } },
                    y: { grid: { color: gridColor }, suggestedMin: 70, suggestedMax: 100 }
                }
            }
        });

    }

    // ----------------------------
    // Placement Statistics (Doughnut)
    // ----------------------------
    const placementCtx = document.getElementById("placementChart");

    if (placementCtx) {

        new Chart(placementCtx, {
            type: "doughnut",
            data: {
                labels: ["Placed", "In Process", "Not Placed"],
                datasets: [{
                    data: [65, 20, 15],
                    backgroundColor: [accent, primary, "rgba(255,255,255,.15)"]
                }]
            },
            options: {
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });

    }

    // ----------------------------
    // Department Performance (Bar)
    // ----------------------------
    const departmentCtx = document.getElementById("departmentChart");

    if (departmentCtx) {

        new Chart(departmentCtx, {
            type: "bar",
            data: {
                labels: ["CSE", "ECE", "EEE", "Mech", "Civil"],
                datasets: [{
                    label: "Performance %",
                    data: [92, 87, 84, 80, 78],
                    backgroundColor: secondary,
                    borderRadius: 8
                }]
            },
            options: {
                scales: {
                    x: { grid: { display: false } },
                    y: { grid: { color: gridColor }, suggestedMax: 100 }
                }
            }
        });

    }

    // ----------------------------
    // Events Participation (Line)
    // ----------------------------
    const eventsCtx = document.getElementById("eventsChart");

    if (eventsCtx) {

        new Chart(eventsCtx, {
            type: "line",
            data: {
                labels: ["Hackathon", "Workshop", "Cultural Fest", "Sports Meet", "Seminar"],
                datasets: [{
                    label: "Participants",
                    data: [220, 180, 340, 260, 150],
                    borderColor: primary,
                    backgroundColor: "rgba(0,87,255,.15)",
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                scales: {
                    x: { grid: { color: gridColor } },
                    y: { grid: { color: gridColor } }
                }
            }
        });

    }

});
