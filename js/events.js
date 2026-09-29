// =============================================
// CampusConnect - events.js
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    const publicMode = new URLSearchParams(window.location.search).get("public") === "1";
    const isAuthenticated = !publicMode && localStorage.getItem("isLoggedIn") === "true";

    if (!publicMode && !isAuthenticated) {
        window.location.href = "login.html";
        return;
    }

    const username = isAuthenticated ? (localStorage.getItem("username") || "Student") : "Guest";
    const email = isAuthenticated ? (localStorage.getItem("email") || "") : "";
    const role = isAuthenticated ? (localStorage.getItem("role") || "Student") : "Guest";
    const storageKey = isAuthenticated ? "registeredEvents_" + username : null;

    const syncUserFromDb = async () => {
        if (!isAuthenticated || !email) return;

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
            console.warn("Events user sync skipped:", error.message);
        }
    };

    syncUserFromDb();

    const searchEvent = document.getElementById("searchEvent");
    const eventContainer = document.getElementById("eventContainer");
    const registeredEventsTable = document.getElementById("registeredEvents");
    const registrationSection = document.getElementById("registrationSection");
    const upcomingEvents = document.getElementById("upcomingEvents");
    const pastEvents = document.getElementById("pastEvents");

    let registeredEvents = isAuthenticated
        ? JSON.parse(localStorage.getItem(storageKey) || "[]")
        : [];

    if (registrationSection && !isAuthenticated) {
        registrationSection.hidden = true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventContainer && upcomingEvents && pastEvents) {
        eventContainer.querySelectorAll(".dashboard-card").forEach(card => {
            const date = card.querySelector("time[datetime]");
            const eventDate = date ? new Date(date.dateTime + "T00:00:00") : null;
            const destination = eventDate && eventDate >= today ? upcomingEvents : pastEvents;
            destination.appendChild(card);
        });
    }

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
        if (!isAuthenticated) return;
        localStorage.setItem(storageKey, JSON.stringify(registeredEvents));
    }

    async function loadRegistered() {
        if (!isAuthenticated || !email || !window.CampusApi) return;
        try {
            const records = await CampusApi.list("event", email);
            if (records.length) {
                registeredEvents = records.map(record => record.payload);
            } else if (registeredEvents.length) {
                registeredEvents = registeredEvents.map(event => ({ ...event, email }));
                await Promise.all(registeredEvents.map(event => CampusApi.save("event", email, event.name, event)));
            }
            saveRegistered();
            syncButtons();
            renderRegistered();
        } catch (error) {
            console.warn("Event registrations database load skipped:", error.message);
        }
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
            const dateEl = card.querySelector("time[datetime]");

            if (!btn || !nameEl) return;

            btn.addEventListener("click", async () => {

                if (!isAuthenticated) {
                    alert("Sign in to register for this event.");
                    return;
                }

                const eventName = nameEl.textContent.trim();

                const alreadyRegistered = registeredEvents.some(
                    event => event.name === eventName
                );

                if (alreadyRegistered) {
                    alert("You're already registered for this event.");
                    return;
                }

                const registration = {
                    name: eventName,
                    date: dateEl ? dateEl.textContent.trim() : "",
                    email: email
                };
                registeredEvents.push(registration);

                if (window.CampusApi && email) {
                    try {
                        await CampusApi.save("event", email, eventName, registration);
                    } catch (error) {
                        console.warn("Event registration database save skipped:", error.message);
                    }
                }

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
    loadRegistered();

});
