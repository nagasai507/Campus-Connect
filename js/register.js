// ===========================================
// CampusConnect - register.js
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    const registerForm = document.getElementById("registerForm");
    const fullName = document.getElementById("fullName");
    const rollNumber = document.getElementById("rollNumber");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const branch = document.getElementById("branch");
    const year = document.getElementById("year");
    const role = document.getElementById("role");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const togglePassword = document.getElementById("togglePassword");
    const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

    // -----------------------------
    // Show / Hide Password
    // -----------------------------
    if (togglePassword) {
        togglePassword.addEventListener("click", () => {
            if (password.type === "password") {
                password.type = "text";
                togglePassword.textContent = "🙈";
            } else {
                password.type = "password";
                togglePassword.textContent = "👁";
            }
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener("click", () => {
            if (confirmPassword.type === "password") {
                confirmPassword.type = "text";
                toggleConfirmPassword.textContent = "🙈";
            } else {
                confirmPassword.type = "password";
                toggleConfirmPassword.textContent = "👁";
            }
        });
    }

    // -----------------------------
    // Role Selection Cards
    // -----------------------------
    const roleBox = document.getElementById("roleBox");
    const roleInput = document.getElementById("role");

    if (roleBox && roleInput) {

        const roleCards = roleBox.querySelectorAll(".role");

        roleCards.forEach(card => {

            card.addEventListener("click", () => {

                roleCards.forEach(c => c.classList.remove("active"));
                card.classList.add("active");

                roleInput.value = card.dataset.role;

            });

        });

    }

    // -----------------------------
    // Social Register Buttons (demo)
    // -----------------------------
    document.querySelectorAll(".social-register a").forEach(btn => {

        btn.addEventListener("click", () => {
            alert("Social sign-up is not available in this demo.");
        });

    });

    // -----------------------------
    // Register Form Submit
    // -----------------------------
    if (registerForm) {

        registerForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const nameValue = fullName.value.trim();
            const rollValue = rollNumber.value.trim();
            const emailValue = email.value.trim().toLowerCase();
            const phoneValue = phone.value.trim();
            const branchValue = branch ? branch.value : "";
            const yearValue = year ? year.value : "";
            const roleValue = role.value;
            const passwordValue = password.value;
            const confirmValue = confirmPassword.value;

            if (
                nameValue === "" ||
                rollValue === "" ||
                emailValue === "" ||
                phoneValue === "" ||
                roleValue === "" ||
                passwordValue === "" ||
                confirmValue === ""
            ) {
                alert("Please fill all fields.");
                return;
            }

            if (roleValue === "Student" && (branchValue === "" || yearValue === "")) {
                alert("Please select your Branch and Year.");
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(emailValue)) {
                alert("Please enter a valid email address.");
                return;
            }

            const phoneRegex = /^[6-9]\d{9}$/;

            if (!phoneRegex.test(phoneValue)) {
                alert("Please enter a valid 10-digit mobile number.");
                return;
            }

            if (passwordValue.length < 6) {
                alert("Password must contain at least 6 characters.");
                return;
            }

            if (passwordValue !== confirmValue) {
                alert("Passwords do not match.");
                return;
            }

            const payload = {
                name: nameValue,
                rollNumber: rollValue,
                email: emailValue,
                phone: phoneValue,
                branch: branchValue,
                year: yearValue,
                role: roleValue,
                password: passwordValue
            };

            try {
                const response = await fetch("http://localhost:5000/api/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Registration failed.");
                }

                const registeredUser = result.user || payload;
                const existingUsers = JSON.parse(localStorage.getItem("users") || "[]");
                const duplicate = existingUsers.find(user => user.email === emailValue);

                if (!duplicate) {
                    existingUsers.push({
                        id: registeredUser.id || Date.now(),
                        name: registeredUser.name || nameValue,
                        rollNumber: registeredUser.rollNumber || rollValue,
                        email: registeredUser.email || emailValue,
                        phone: registeredUser.phone || phoneValue,
                        branch: registeredUser.branch || branchValue,
                        year: registeredUser.year || yearValue,
                        role: registeredUser.role || roleValue,
                        password: passwordValue
                    });
                    localStorage.setItem("users", JSON.stringify(existingUsers));
                }

                alert("Registration Successful!");
                window.location.href = "login.html";
            } catch (error) {
                console.error(error);
                let users = JSON.parse(localStorage.getItem("users")) || [];

                const exists = users.find(user => user.email === emailValue);
                if (exists) {
                    alert("Email already registered.");
                    return;
                }

                const newUser = {
                    id: Date.now(),
                    name: nameValue,
                    rollNumber: rollValue,
                    email: emailValue,
                    phone: phoneValue,
                    branch: branchValue,
                    year: yearValue,
                    role: roleValue,
                    password: passwordValue
                };

                users.push(newUser);
                localStorage.setItem("users", JSON.stringify(users));
                alert("Registration Successful! (Saved locally)");
                window.location.href = "login.html";
            }

        });

    }

});