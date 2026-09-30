document.addEventListener("DOMContentLoaded", () => {
    const nav = document.querySelector(".header nav");
    if (!nav) return;

    const isAuthenticated = localStorage.getItem("isLoggedIn") === "true";
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    const publicPages = ["chatbot.html", "events.html", "bus.html", "notes.html"];
    const isPublicGuestPage = !isAuthenticated && publicPages.includes(currentPage) &&
        new URLSearchParams(window.location.search).get("public") === "1";

    if (!isAuthenticated && !isPublicGuestPage) return;

    const authenticatedLinks = [
        ["Dashboard", "dashboard.html"],
        ["Attendance", "attendance.html"],
        ["Notes", "notes.html"],
        ["Placement", "placement.html"],
        ["Results", "results.html"],
        ["AI Chatbot", "chatbot.html"],
        ["Events", "events.html"],
        ["Bus Tracking", "bus.html"],
        ["Analytics", "analytics.html"],
        ["Profile", "profile.html"]
    ];
    const guestLinks = [
        ["Home", "index.html"],
        ["AI Chatbot", "chatbot.html?public=1"],
        ["Events", "events.html?public=1"],
        ["Bus Tracking", "bus.html?public=1"],
        ["Notes Sharing", "notes.html?public=1"],
        ["Login", "login.html"]
    ];
    const links = isAuthenticated ? authenticatedLinks : guestLinks;

    nav.innerHTML = links.map(([label, href]) =>
        `<a href="${href}"${href.split("?")[0] === currentPage ? ' class="active"' : ""}>${label}</a>`
    ).join("");

    if (!isAuthenticated) return;

    nav.insertAdjacentHTML("beforeend", '<a href="login.html" id="navLogout">Logout</a>');

    document.getElementById("navLogout").addEventListener("click", event => {
        event.preventDefault();
        if (!confirm("Are you sure you want to logout?")) return;

        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("username");
        localStorage.removeItem("email");
        localStorage.removeItem("role");
        window.location.href = "login.html";
    });
});