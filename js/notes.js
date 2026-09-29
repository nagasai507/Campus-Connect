// ===========================================
// CampusConnect - notes.js
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    const isAuthenticated = localStorage.getItem("isLoggedIn") === "true";
    const publicMode = !isAuthenticated && new URLSearchParams(window.location.search).get("public") === "1";

    if (!publicMode && !isAuthenticated) {
        window.location.href = "login.html";
        return;
    }

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
            console.warn("Notes user sync skipped:", error.message);
        }
    };

    syncUserFromDb();

    const noteForm = document.getElementById("noteForm");
    const subject = document.getElementById("subject");
    const title = document.getElementById("title");
    const noteFile = document.getElementById("noteFile");
    const notesTable = document.getElementById("notesTable");
    const search = document.getElementById("searchNotes");
    const clearBtn = document.getElementById("clearNotes");
    const uploadSection = document.getElementById("uploadSection");

    if (!isAuthenticated) {
        if (uploadSection) {
            uploadSection.hidden = true;
            uploadSection.style.display = "none";
        }
        if (clearBtn) clearBtn.hidden = true;
    }

    let notes = JSON.parse(localStorage.getItem("campusNotes") || "[]");

    // -------------------------
    // Escape HTML (prevent XSS)
    // -------------------------
    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // -------------------------
    // Save Notes
    // -------------------------
    function saveNotes() {
        if (!isAuthenticated) return;
        localStorage.setItem("campusNotes", JSON.stringify(notes));
    }

    async function loadNotes() {
        if (!window.CampusApi) return;
        try {
            const records = await CampusApi.list("note");
            if (records.length) {
                notes = records.map(record => ({ ...record.payload, ownerEmail: record.email }));
            } else if (isAuthenticated && email && notes.length) {
                notes = notes.map(note => ({ ...note, ownerEmail: note.ownerEmail || email }));
                await Promise.all(notes
                    .filter(note => !note.ownerEmail || note.ownerEmail.toLowerCase() === email.toLowerCase())
                    .map(note => CampusApi.save("note", email, note.id, note)));
            }
            saveNotes();
        } catch (error) {
            console.warn("Notes database load skipped:", error.message);
        }
        displayNotes(search ? search.value : "");
    }

    // -------------------------
    // Display Notes
    // -------------------------
    function displayNotes(filter = "") {

        if (!notesTable) return;

        notesTable.innerHTML = "";

        const filtered = notes.filter(note =>
            note.subject.toLowerCase().includes(filter.toLowerCase()) ||
            note.title.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {

            notesTable.innerHTML = `
                <tr>
                    <td colspan="6">No Notes Found</td>
                </tr>
            `;
            return;
        }

        filtered.forEach((note, index) => {

            const row = document.createElement("tr");

            const actions = `
                <a href="${escapeHTML(note.fileURL)}" target="_blank" rel="noopener">View</a>
                &nbsp;
                <a href="${escapeHTML(note.fileURL)}" download="${escapeHTML(note.fileName)}">
                    Download
                </a>
                ${isAuthenticated && (!note.ownerEmail || note.ownerEmail.toLowerCase() === email.toLowerCase() || role === "Admin") ? `&nbsp;<button class="deleteBtn" data-id="${note.id}">Delete</button>` : ""}
            `;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(note.subject)}</td>
                <td>${escapeHTML(note.title)}</td>
                <td>${escapeHTML(note.fileName)}</td>
                <td>${escapeHTML(note.date)}</td>
                <td>${actions}</td>
            `;

            notesTable.appendChild(row);

        });

        // Delete Buttons
        document.querySelectorAll(".deleteBtn").forEach(btn => {

            btn.addEventListener("click", async () => {

                if (!isAuthenticated) return;

                const id = Number(btn.dataset.id);

                const deletedNote = notes.find(note => String(note.id) === String(id));
                notes = notes.filter(note => String(note.id) !== String(id));

                if (deletedNote && deletedNote.ownerEmail && deletedNote.ownerEmail.toLowerCase() !== email.toLowerCase()) return;

                if (window.CampusApi) {
                    try {
                        await CampusApi.remove("note", email, id);
                    } catch (error) {
                        console.warn("Note database delete skipped:", error.message);
                    }
                }

                saveNotes();
                displayNotes(search ? search.value : "");

            });

        });

    }

    // -------------------------
    // Upload Note
    // -------------------------
    if (noteForm) {

        noteForm.addEventListener("submit", async e => {

            e.preventDefault();

            if (!isAuthenticated) return;

            const subjectValue = subject.value.trim();
            const titleValue = title.value.trim();
            const file = noteFile.files[0];

            if (!subjectValue || !titleValue || !file) {
                alert("Please fill all fields.");
                return;
            }

            const allowed = [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            ];

            if (!allowed.includes(file.type)) {
                alert("Only PDF, DOC, DOCX, PPT, PPTX files are allowed.");
                return;
            }

            const maxSize = 4 * 1024 * 1024; // 4 MB (localStorage-safe limit)

            if (file.size > maxSize) {
                alert("File is too large. Please upload a file smaller than 4 MB.");
                return;
            }

            const reader = new FileReader();

            reader.onload = async function () {

                const newNote = {

                    id: Date.now(),
                    subject: subjectValue,
                    title: titleValue,
                    fileName: file.name,
                    fileURL: reader.result,
                    date: new Date().toLocaleDateString(),
                    ownerEmail: email

                };

                notes.push(newNote);

                saveNotes();

                if (window.CampusApi) {
                    try {
                        await CampusApi.save("note", email, newNote.id, newNote);
                    } catch (error) {
                        console.warn("Note database save skipped:", error.message);
                    }
                }

                noteForm.reset();

                alert("Note Uploaded Successfully.");

                displayNotes();

            };

            reader.onerror = function () {
                alert("Could not read the selected file. Please try again.");
            };

            reader.readAsDataURL(file);

        });

    }

    // -------------------------
    // Search
    // -------------------------
    if (search) {

        search.addEventListener("keyup", () => {

            displayNotes(search.value);

        });

    }

    // -------------------------
    // Clear All Notes
    // -------------------------
    if (clearBtn) {

        clearBtn.addEventListener("click", async () => {

            if (!isAuthenticated) return;

            if (confirm("Delete all notes?")) {

                notes = notes.filter(note => note.ownerEmail && note.ownerEmail.toLowerCase() !== email.toLowerCase());

                if (window.CampusApi) {
                    try {
                        await CampusApi.clear("note", email);
                    } catch (error) {
                        console.warn("Notes database clear skipped:", error.message);
                    }
                }

                saveNotes();

                displayNotes();

            }

        });

    }

    // Initial Load
    displayNotes();
    loadNotes();

});