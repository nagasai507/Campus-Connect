// =============================================
// CampusConnect - events.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const username = localStorage.getItem("username") || "Student";
    const storageKey = "registeredEvents_" + username;

    const searchEvent = document.getElementById("searchEvent");
    const eventContainer = document.getElementById("eventContainer");
    const registeredEventsTable = document.getElementById("registeredEvents");

    let registeredEvents =
        JSON.parse(localStorage.getItem(storageKey)) || [];

    // ----------------------------
    // Escape HTML (prevent XSS)
    // ----------------------------
    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ----------------------------
    // Save Registered Events
    // ----------------------------
    function saveRegistered() {
        localStorage.setItem(storageKey, JSON.stringify(registeredEvents));
    }

    // ----------------------------
    // Render Registered Events Table
    // ----------------------------
    function renderRegistered() {

        if (!registeredEventsTable) return;

        registeredEventsTable.innerHTML = "";

        if (registeredEvents.length === 0) {

            registeredEventsTable.innerHTML =
                '<tr><td colspan="4">No events registered yet.</td></tr>';
            return;

        }

        registeredEvents.forEach((event, index) => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(event.name)}</td>
                <td>${escapeHTML(event.date)}</td>
                <td>Confirmed</td>
            `;

            registeredEventsTable.appendChild(row);

        });

    }

    // ----------------------------
    // Sync Register Buttons With Saved State
    // ----------------------------
    function syncButtons() {

        if (!eventContainer) return;

        eventContainer.querySelectorAll(".dashboard-card").forEach(card => {

            const nameEl = card.querySelector("h3");
            const btn = card.querySelector(".register-btn");

            if (!nameEl || !btn) return;

            const isRegistered = registeredEvents.some(
                event => event.name === nameEl.textContent.trim()
            );

            if (isRegistered) {
                btn.textContent = "Registered";
                btn.disabled = true;
            }

        });

    }

    // ----------------------------
    // Register Buttons
    // ----------------------------
    if (eventContainer) {

        eventContainer.querySelectorAll(".dashboard-card").forEach(card => {

            const btn = card.querySelector(".register-btn");
            const nameEl = card.querySelector("h3");
            const dateEl = card.querySelector("p");

            if (!btn || !nameEl) return;

            btn.addEventListener("click", () => {

                const eventName = nameEl.textContent.trim();

                const alreadyRegistered = registeredEvents.some(
                    event => event.name === eventName
                );

                if (alreadyRegistered) {
                    alert("You're already registered for this event.");
                    return;
                }

                registeredEvents.push({
                    name: eventName,
                    date: dateEl ? dateEl.textContent.replace("Date:", "").trim() : ""
                });

                saveRegistered();
                renderRegistered();

                btn.textContent = "Registered";
                btn.disabled = true;

                alert("You have successfully registered for " + eventName + "!");

            });

        });

    }

    // ----------------------------
    // Search Events
    // ----------------------------
    if (searchEvent && eventContainer) {

        searchEvent.addEventListener("keyup", function () {

            const value = this.value.toLowerCase();
            const cards = eventContainer.querySelectorAll(".dashboard-card");

            cards.forEach(card => {

                const text = card.innerText.toLowerCase();

                card.style.display = text.includes(value) ? "" : "none";

            });

        });

    }

    // Initial Load
    syncButtons();
    renderRegistered();

});
