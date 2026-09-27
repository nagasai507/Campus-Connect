// ==============================
// CampusConnect - home.js
// (Landing page: index.html)
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    // -----------------------------
    // Animated Stat Counters
    // -----------------------------
    const counters = document.querySelectorAll(".counter");

    function animateCounter(el) {

        const target = parseInt(el.dataset.target, 10) || 0;
        const duration = 1500;
        const start = performance.now();

        function step(now) {

            const progress = Math.min((now - start) / duration, 1);
            const value = Math.floor(progress * target);

            el.textContent = value;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                el.textContent = target;
            }

        }

        requestAnimationFrame(step);

    }

    if (counters.length) {

        const observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    animateCounter(entry.target);
                    observer.unobserve(entry.target);

                }

            });

        }, { threshold: 0.4 });

        counters.forEach(counter => observer.observe(counter));

    }

    // -----------------------------
    // Light / Dark Theme Toggle
    // -----------------------------
    const themeToggle = document.getElementById("themeToggle");

    function applyTheme(theme) {

        if (theme === "light") {
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
        }

        const icon = themeToggle ? themeToggle.querySelector("i") : null;

        if (icon) {
            icon.className = theme === "light"
                ? "fa-solid fa-sun"
                : "fa-solid fa-moon";
        }

    }

    applyTheme(localStorage.getItem("siteTheme") || "dark");

    if (themeToggle) {

        themeToggle.addEventListener("click", () => {

            const isLight = document.body.classList.contains("light-theme");
            const nextTheme = isLight ? "dark" : "light";

            applyTheme(nextTheme);
            localStorage.setItem("siteTheme", nextTheme);

        });

    }

    // -----------------------------
    // Contact Form (demo submit)
    // -----------------------------
    const contactForm = document.getElementById("contactForm");

    if (contactForm) {

        contactForm.addEventListener("submit", (e) => {

            e.preventDefault();

            alert("Thank you! Your message has been received. Our team will get back to you soon.");

            contactForm.reset();

        });

    }

});
