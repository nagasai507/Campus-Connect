// =============================================
// CampusConnect - bus.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

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
