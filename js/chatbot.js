// ============================================
// CampusConnect - chatbot.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    const publicMode = new URLSearchParams(window.location.search).get("public") === "1";
    const isAuthenticated = !publicMode && localStorage.getItem("isLoggedIn") === "true";

    if (!publicMode && !isAuthenticated) {
        window.location.href = "login.html";
        return;
    }

    const chatBox = document.getElementById("chatBox");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearBtn = document.getElementById("clearChat");
    const modelInput = document.getElementById("ollamaModel");
    const ollamaStatus = document.getElementById("ollamaStatus");

    const OLLAMA_URL = "http://localhost:11434/api/chat";
    const username = isAuthenticated ? (localStorage.getItem("username") || "Student") : "Guest";
    const email = isAuthenticated ? (localStorage.getItem("email") || "") : "";
    const role = isAuthenticated ? (localStorage.getItem("role") || "Student") : "Guest";

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
            console.warn("Chatbot user sync skipped:", error.message);
        }
    };

    syncUserFromDb();
    const chatStorage = publicMode ? sessionStorage : localStorage;
    const chatStorageKey = publicMode ? "publicChatHistory" : "chatHistory_" + (email || username).toLowerCase();

    let chatHistory =
        JSON.parse(chatStorage.getItem(chatStorageKey) || "[]");

    // ---------------------------
    // Escape HTML (prevent XSS)
    // ---------------------------
    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ---------------------------
    // Save Chat
    // ---------------------------
    function saveChat() {
        chatStorage.setItem(chatStorageKey, JSON.stringify(chatHistory));
    }

    function getPortalContext() {
        if (!isAuthenticated) {
            return {
                account: { name: "Guest", role: "Guest" },
                portalCapabilities: [
                    "General campus information",
                    "Events and campus activities"
                ]
            };
        }

        const readJSON = (key, fallback) => {
            try {
                return JSON.parse(localStorage.getItem(key) || "null") || fallback;
            } catch (error) {
                return fallback;
            }
        };

        const users = readJSON("users", []);
        const currentUser = users.find(user =>
            (user.email && user.email.toLowerCase() === email.toLowerCase()) ||
            user.name === username ||
            user.username === username
        ) || {};
        const results = readJSON("resultsData", []);
        const myResults = results.filter(result =>
            (email && result.email && result.email.toLowerCase() === email.toLowerCase()) ||
            (result.rollNumber && result.rollNumber === localStorage.getItem("rollNumber"))
        ).map(result => ({
            semester: result.semester,
            status: result.released ? "Released" : "Pending",
            sgpa: result.released ? result.sgpa : null,
            subjects: result.released ? (result.subjects || []).map(subject => ({
                name: subject.name,
                marks: subject.marks,
                max: subject.max
            })) : []
        }));

        const attendance = readJSON("attendance_" + username, []);
        const notes = readJSON("campusNotes", []);
        const events = readJSON("registeredEvents_" + username, []);
        const placement = readJSON("resumeData_" + username, {});
        const present = attendance.filter(record => record.status === "Present").length;
        const absent = attendance.filter(record => record.status === "Absent").length;
        const attendanceTotal = present + absent;

        return {
            account: {
                name: username,
                email: email,
                role: role,
                branch: currentUser.branch || localStorage.getItem("branch") || "",
                year: currentUser.year || localStorage.getItem("year") || "",
                rollNumber: currentUser.rollNumber || localStorage.getItem("rollNumber") || ""
            },
            attendance: {
                present: present,
                absent: absent,
                totalMarked: attendanceTotal,
                percentage: attendanceTotal ? ((present / attendanceTotal) * 100).toFixed(2) + "%" : "0%",
                records: attendance.slice(-30)
            },
            results: {
                records: myResults,
                releasedCount: myResults.filter(result => result.status === "Released").length,
                pendingCount: myResults.filter(result => result.status === "Pending").length
            },
            notes: notes.map(note => ({
                subject: note.subject,
                title: note.title,
                fileName: note.fileName,
                date: note.date
            })),
            events: events.map(event => ({ name: event.name, date: event.date, status: "Registered" })),
            placementProfile: {
                name: placement.name || username,
                email: placement.email || email,
                skills: placement.skills || "",
                education: placement.education || "",
                experience: placement.experience || ""
            },
            portalCapabilities: [
                "Attendance: mark and review personal attendance records",
                "Results: view personal released and pending semester results",
                "Notes: browse uploaded campus notes",
                "Placement: manage the personal resume profile and practice modules",
                "Events: view events and personal registrations",
                "Bus Tracking: view campus bus routes and live tracking",
                "Analytics: view campus statistics"
            ]
        };
    }

    // ---------------------------
    // Display Chat
    // ---------------------------
    function renderChat() {

        chatBox.innerHTML = "";

        chatHistory.forEach(chat => {

            const div = document.createElement("div");

            div.className = chat.sender;

            div.innerHTML = `
                <strong>${chat.sender === "user" ? "You" : "CampusBot"}:</strong>
                ${escapeHTML(chat.message)}
            `;

            chatBox.appendChild(div);

        });

        chatBox.scrollTop = chatBox.scrollHeight;

    }

    async function getBotResponse(message) {
        const model = modelInput.value.trim() || "llama3.1:8b";
        const messages = chatHistory.slice(-10).map(chat => ({
            role: chat.sender === "user" ? "user" : "assistant",
            content: chat.message
        }));
        const accountInstructions = isAuthenticated
            ? "Use the logged-in user's private portal snapshot for personal portal questions. Never invent records, reveal passwords, or reveal other users' private data."
            : "You are assisting a guest. Answer general campus questions only; do not claim access to student, faculty, or admin records. For private account questions, explain that sign-in is required.";
        const systemPrompt = `You are CampusBot, a friendly conversational assistant inside CampusConnect. Respond naturally to greetings, casual questions, and follow-ups. Keep answers clear and concise. ${accountInstructions}\n\nPORTAL CONTEXT:\n${JSON.stringify(getPortalContext())}`;

        ollamaStatus.textContent = "Thinking with Ollama...";
        ollamaStatus.className = "ollama-status is-thinking";

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            signal: controller.signal,
                body: JSON.stringify({
                    model: model,
                    stream: false,
                    messages: [{ role: "system", content: systemPrompt }, ...messages]
                })
            });

            if (!response.ok) throw new Error("Ollama returned HTTP " + response.status);
            const data = await response.json();
            ollamaStatus.textContent = "Connected to Ollama: " + model;
            ollamaStatus.className = "ollama-status is-connected";
            return data.message && data.message.content
                ? data.message.content.trim()
                : "Ollama returned an empty response.";
        } catch (error) {
            ollamaStatus.textContent = "Ollama unavailable";
            ollamaStatus.className = "ollama-status has-error";
            if (error.name === "AbortError") {
                return "Ollama took longer than 60 seconds to respond. The model may still be loading; please try again.";
            }
            return "I could not connect to Ollama. Confirm that Ollama is running and that `" + model + "` is installed, then try again.";
        } finally {
            clearTimeout(timeout);
        }
    }

    // ---------------------------
    // Send Message
    // ---------------------------
    function sendMessage() {

        const text = messageInput.value.trim();

        if (text === "") return;

        chatHistory.push({
            sender: "user",
            message: text
        });

        renderChat();

        messageInput.value = "";

        // Typing Animation
        const typing = document.createElement("div");

        typing.className = "bot";

        typing.innerHTML =
            "<strong>CampusBot:</strong> Typing...";

        chatBox.appendChild(typing);

        chatBox.scrollTop = chatBox.scrollHeight;

        getBotResponse(text).then(reply => {
            typing.remove();
            chatHistory.push({ sender: "bot", message: reply });
            saveChat();
            renderChat();
            sendBtn.disabled = false;
            messageInput.disabled = false;
            messageInput.focus();
        });

        sendBtn.disabled = true;
        messageInput.disabled = true;

    }

    // ---------------------------
    // Send Button
    // ---------------------------
    if (sendBtn) {

        sendBtn.addEventListener("click", sendMessage);

    }

    // ---------------------------
    // Enter Key
    // ---------------------------
    if (messageInput) {

        messageInput.addEventListener("keypress", e => {

            if (e.key === "Enter") {

                e.preventDefault();

                sendMessage();

            }

        });

    }

    // ---------------------------
    // Clear Chat
    // ---------------------------
    if (clearBtn) {

        clearBtn.addEventListener("click", () => {

            if (confirm("Clear chat history?")) {

                chatHistory = [];

                saveChat();

                renderChat();

            }

        });

    }

    renderChat();

});