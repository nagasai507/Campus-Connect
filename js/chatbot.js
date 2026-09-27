// ============================================
// CampusConnect - chatbot.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
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
    const username = localStorage.getItem("username") || "Student";
    const email = localStorage.getItem("email") || "";
    const role = localStorage.getItem("role") || "Student";
    const chatStorageKey = "chatHistory_" + (email || username).toLowerCase();

    let chatHistory =
        JSON.parse(localStorage.getItem(chatStorageKey) || "[]");

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
        localStorage.setItem(chatStorageKey, JSON.stringify(chatHistory));
    }

    function getPortalContext() {
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
        const systemPrompt = `You are CampusBot, a friendly, natural conversational assistant inside CampusConnect. Respond normally to greetings, casual questions, and follow-up questions. Keep answers clear and concise. You have access to the logged-in user's private portal snapshot below. For portal questions, use the snapshot instead of guessing: for attendance, state present, absent, total marked, and percentage; for results, list semester status, SGPA, and subject marks; for notes, events, placement, and account questions, use the supplied details. If a requested value is empty or unavailable, say that plainly and name the relevant portal section. Never invent records, never reveal passwords, and never reveal other users' private data.\n\nPORTAL SNAPSHOT:\n${JSON.stringify(getPortalContext())}`;

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