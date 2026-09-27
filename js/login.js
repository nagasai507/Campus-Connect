// =========================================
// CampusConnect - login.js
// =========================================

document.addEventListener("DOMContentLoaded", function () {

    // Get Elements
    const loginForm = document.getElementById("loginForm");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberCheckbox = document.getElementById("remember");
    const togglePassword = document.getElementById("togglePassword");

    const campusStudents = [
        ["CSE001", "Aarav Kumar"], ["CSE002", "Priya Sharma"], ["CSE003", "Rahul Reddy"],
        ["CSE004", "Sneha Patel"], ["CSE005", "Vikram Singh"], ["CSE006", "Ananya Rao"],
        ["CSE007", "Kiran Teja"], ["CSE008", "Meghana Devi"], ["CSE009", "Arjun Varma"],
        ["CSE010", "Sravani Lakshmi"], ["CSE011", "Rohit Naidu"], ["CSE012", "Harika Rani"],
        ["CSE013", "Sai Kiran"], ["CSE014", "Pooja Reddy"], ["CSE015", "Nikhil Kumar"],
        ["CSE016", "Divya Sri"], ["CSE017", "Manoj Kumar"], ["CSE018", "Keerthana Devi"],
        ["CSE019", "Tarun Teja"], ["CSE020", "Lakshmi Priya"]
    ];

    const storedUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const existingRollNumbers = new Set(storedUsers.map(user => user.rollNumber));
    const newCampusStudents = campusStudents
        .filter(([rollNumber]) => !existingRollNumbers.has(rollNumber))
        .map(([rollNumber, name]) => ({
            id: "campus-" + rollNumber,
            name: name,
            username: rollNumber,
            email: rollNumber.toLowerCase() + "@campusconnect.com",
            password: rollNumber + "@123",
            role: "Student",
            rollNumber: rollNumber,
            branch: "CSE",
            year: "3rd Year",
            semester: "Semester 1"
        }));

    if (newCampusStudents.length) {
        localStorage.setItem("users", JSON.stringify(storedUsers.concat(newCampusStudents)));
    }

    // Check if required elements exist
    if (!loginForm || !emailInput || !passwordInput) {
        console.error("Required form elements not found.");
        return;
    }

    // Load remembered email
    const rememberedEmail = localStorage.getItem("rememberEmail");

    if (rememberedEmail) {
        emailInput.value = rememberedEmail;

        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }

    // Show / Hide Password
    if (togglePassword) {

        togglePassword.addEventListener("click", function () {

            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                togglePassword.textContent = "🙈";
            } else {
                passwordInput.type = "password";
                togglePassword.textContent = "👁";
            }

        });

    }

    // Forgot Password (demo)
    const forgotPassword = document.getElementById("forgotPassword");

    if (forgotPassword) {

        forgotPassword.addEventListener("click", () => {
            alert("Please contact your campus administrator to reset your password.");
        });

    }

    // Social Login Buttons (demo)
    document.querySelectorAll(".social-login button").forEach(btn => {

        btn.addEventListener("click", () => {
            alert("Social login is not available in this demo.");
        });

    });

    // Login Submit
    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Validation
        if (email === "" || password === "") {
            alert("Please enter email and password.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const usernameRegex = /^[A-Za-z0-9._-]+$/;

        if (!emailRegex.test(email) && !usernameRegex.test(email)) {
            alert("Please enter a valid username or email.");
            return;
        }

        // Demo Users
        const demoUsers = [
            {
                name: "Student",
                email: "student@campusconnect.com",
                password: "123456",
                role: "Student",
                rollNumber: "CS2023001",
                branch: "CSE",
                year: "3rd Year"
            },
            {
                name: "Faculty",
                email: "faculty@campusconnect.com",
                password: "123456",
                role: "Faculty"
            },
            {
                name: "Admin",
                email: "admin@campusconnect.com",
                password: "admin123",
                role: "Admin"
            }
        ];

        // Registered Users (from register.html)
        const registeredUsers =
            JSON.parse(localStorage.getItem("users")) || [];

        const users = demoUsers.concat(registeredUsers);

        const user = users.find(function (u) {
            return (
                ((u.email && u.email.toLowerCase() === email.toLowerCase()) ||
                    (u.username && u.username.toLowerCase() === email.toLowerCase())) &&
                u.password === password
            );
        });

        if (!user) {
            alert("Invalid email or password.");
            return;
        }

        // Save Login
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("username", user.name);
        localStorage.setItem("email", user.email);
        localStorage.setItem("role", user.role);
        localStorage.setItem("rollNumber", user.rollNumber || "");
        localStorage.setItem("branch", user.branch || "");
        localStorage.setItem("year", user.year || "");

        // Remember Email
        if (rememberCheckbox && rememberCheckbox.checked) {
            localStorage.setItem("rememberEmail", email);
        } else {
            localStorage.removeItem("rememberEmail");
        }

        alert("Login Successful!");

        // Redirect
        window.location.href = "dashboard.html";

    });

});