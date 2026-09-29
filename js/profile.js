// =============================================
// CampusConnect - profile.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const username = localStorage.getItem("username") || "Student";
    const email = localStorage.getItem("email") || "student@example.com";
    const role = localStorage.getItem("role") || "Student";

    const applyProfileData = (name, userEmail, userRole) => {
        const studentName = document.getElementById("studentName");
        const studentEmail = document.getElementById("studentEmail");
        const studentRole = document.getElementById("studentRole");

        if (studentName) studentName.textContent = name || "Student";
        if (studentEmail) studentEmail.textContent = userEmail || "";
        if (studentRole) studentRole.textContent = userRole || "Student";

        const avatarCircle = document.getElementById("avatarCircleLg");
        if (avatarCircle) {
            avatarCircle.textContent = (name || "Student").trim().charAt(0).toUpperCase() || "S";
        }
    };

    applyProfileData(username, email, role);

    const syncProfileFromDb = async () => {
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
            applyProfileData(dbUser.name || username, dbUser.email || email, dbUser.role || role);
        } catch (error) {
            console.warn("Profile sync skipped:", error.message);
        }
    };

    syncProfileFromDb();

    // ----------------------------
    // Avatar / Profile Photo
    // ----------------------------
    const avatarCircle = document.getElementById("avatarCircleLg");
    const profileImage = document.getElementById("profileImage");
    const imageUpload = document.getElementById("imageUpload");

    const photoKey = "profilePhoto_" + email;

    function showPhoto(dataURL) {

        if (profileImage && avatarCircle) {
            profileImage.src = dataURL;
            profileImage.style.display = "block";
            avatarCircle.style.display = "none";
        }

    }

    if (avatarCircle) {
        avatarCircle.textContent = username.trim().charAt(0).toUpperCase() || "S";
    }

    const savedPhoto = localStorage.getItem(photoKey);

    if (savedPhoto) {
        showPhoto(savedPhoto);
    }

    if (imageUpload) {

        imageUpload.addEventListener("change", () => {

            const file = imageUpload.files[0];

            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file.");
                return;
            }

            const maxSize = 2 * 1024 * 1024; // 2 MB

            if (file.size > maxSize) {
                alert("Image is too large. Please choose one under 2 MB.");
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                localStorage.setItem(photoKey, reader.result);
                showPhoto(reader.result);
            };

            reader.readAsDataURL(file);

        });

    }

    // ----------------------------
    // Edit Profile
    // ----------------------------
    const editProfileBtn = document.getElementById("editProfileBtn");

    if (editProfileBtn) {

        editProfileBtn.addEventListener("click", () => {

            const newName = prompt("Enter your full name:", username);

            if (newName && newName.trim() !== "") {

                localStorage.setItem("username", newName.trim());

                if (studentName) studentName.textContent = newName.trim();

                alert("Profile updated successfully.");

            }

        });

    }

    // ----------------------------
    // Change Password
    // ----------------------------
    const changePasswordBtn = document.getElementById("changePasswordBtn");

    if (changePasswordBtn) {

        changePasswordBtn.addEventListener("click", () => {

            let users = JSON.parse(localStorage.getItem("users")) || [];
            const userIndex = users.findIndex(u => u.email === email);

            if (userIndex === -1) {
                alert("Password changes are only available for registered accounts (demo accounts cannot be changed).");
                return;
            }

            const currentPassword = prompt("Enter your current password:");

            if (currentPassword === null) return;

            if (currentPassword !== users[userIndex].password) {
                alert("Current password is incorrect.");
                return;
            }

            const newPassword = prompt("Enter your new password (min 6 characters):");

            if (newPassword === null) return;

            if (newPassword.length < 6) {
                alert("Password must be at least 6 characters.");
                return;
            }

            users[userIndex].password = newPassword;
            localStorage.setItem("users", JSON.stringify(users));

            alert("Password changed successfully.");

        });

    }

    // ----------------------------
    // Download Profile
    // ----------------------------
    const downloadProfileBtn = document.getElementById("downloadProfileBtn");

    if (downloadProfileBtn) {

        downloadProfileBtn.addEventListener("click", () => {

            const cgpa = document.getElementById("cgpa");
            const attendance = document.getElementById("attendance");
            const credits = document.getElementById("credits");
            const backlogs = document.getElementById("backlogs");

            const lines = [
                "CampusConnect - Student Profile",
                "================================",
                "Name: " + username,
                "Email: " + email,
                "Role: " + role,
                "CGPA: " + (cgpa ? cgpa.textContent : "-"),
                "Attendance: " + (attendance ? attendance.textContent : "-"),
                "Credits Completed: " + (credits ? credits.textContent : "-"),
                "Backlogs: " + (backlogs ? backlogs.textContent : "-")
            ];

            const blob = new Blob([lines.join("\n")], { type: "text/plain" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = username.replace(/\s+/g, "_") + "_profile.txt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);

        });

    }

    // ----------------------------
    // Logout
    // ----------------------------
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {

        logoutBtn.addEventListener("click", () => {

            const confirmLogout = confirm("Are you sure you want to logout?");

            if (confirmLogout) {

                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("username");
                localStorage.removeItem("email");
                localStorage.removeItem("role");

                window.location.href = "login.html";

            }

        });

    }

});
