document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("isLoggedIn") !== "true") return;

    const nav = document.querySelector(".header nav");
    if (!nav) return;

    const links = [
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
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();

    nav.innerHTML = links.map(([label, href]) =>
        `<a href="${href}"${href === currentPage ? ' class="active"' : ""}>${label}</a>`
    ).join("") + '<a href="login.html" id="navLogout">Logout</a>';

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