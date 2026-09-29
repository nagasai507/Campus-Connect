// =============================================
// CampusConnect - bus.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    const publicMode = new URLSearchParams(window.location.search).get("public") === "1";

    if (!publicMode && localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const username = !publicMode ? (localStorage.getItem("username") || "Student") : "Guest";
    const email = !publicMode ? (localStorage.getItem("email") || "") : "";
    const role = !publicMode ? (localStorage.getItem("role") || "Student") : "Guest";

    const syncUserFromDb = async () => {
        if (publicMode || !email) return;

        try {
            const response = await fetch(`http://localhost:5000/api/user?email=${encodeURIComponent(email)}`);
            if (!response.ok) return;

            const result = await response.json();
            if (!result.user) return;

            const dbUser = result.user;
            localStorage.setItem("username", dbUser.name || username);
            localStorage.setItem("email", dbUser.email || email);
            localStorage.setItem("role", dbUser.role || role);
        } catch (error) {
            console.warn("Bus user sync skipped:", error.message);
        }
    };

    syncUserFromDb();

    const searchBus = document.getElementById("searchBus");
    const busContainer = document.getElementById("busContainer");

    // ----------------------------
    // Search Buses
    // ----------------------------
    if (searchBus && busContainer) {

        searchBus.addEventListener("keyup", function () {

            const value = this.value.toLowerCase();
            const cards = busContainer.querySelectorAll(".dashboard-card");

            cards.forEach(card => {

                const text = card.innerText.toLowerCase();

                card.style.display = text.includes(value) ? "" : "none";

            });

        });

    }

    // ----------------------------
    // Track Bus Buttons
    // ----------------------------
    document.querySelectorAll(".track-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            const card = btn.closest(".dashboard-card");
            const busName = card ? card.querySelector("h3").textContent : "This bus";

            alert(busName + " is currently on route. Check the live map below for its location.");

            const mapSection = document.querySelector("iframe");

            if (mapSection) {
                mapSection.scrollIntoView({ behavior: "smooth", block: "center" });
            }

        });

    });

});
