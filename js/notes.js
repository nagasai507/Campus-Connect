// ===========================================
// CampusConnect - notes.js
// ===========================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const noteForm = document.getElementById("noteForm");
    const subject = document.getElementById("subject");
    const title = document.getElementById("title");
    const noteFile = document.getElementById("noteFile");
    const notesTable = document.getElementById("notesTable");
    const search = document.getElementById("searchNotes");
    const clearBtn = document.getElementById("clearNotes");

    let notes = JSON.parse(localStorage.getItem("campusNotes")) || [];

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
        localStorage.setItem("campusNotes", JSON.stringify(notes));
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

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHTML(note.subject)}</td>
                <td>${escapeHTML(note.title)}</td>
                <td>${escapeHTML(note.fileName)}</td>
                <td>${escapeHTML(note.date)}</td>
                <td>
                    <a href="${note.fileURL}" target="_blank">View</a>
                    &nbsp;
                    <a href="${note.fileURL}" download="${escapeHTML(note.fileName)}">
                        Download
                    </a>
                    &nbsp;
                    <button class="deleteBtn" data-id="${note.id}">
                        Delete
                    </button>
                </td>
            `;

            notesTable.appendChild(row);

        });

        // Delete Buttons
        document.querySelectorAll(".deleteBtn").forEach(btn => {

            btn.addEventListener("click", () => {

                const id = Number(btn.dataset.id);

                notes = notes.filter(note => note.id !== id);

                saveNotes();
                displayNotes(search ? search.value : "");

            });

        });

    }

    // -------------------------
    // Upload Note
    // -------------------------
    if (noteForm) {

        noteForm.addEventListener("submit", e => {

            e.preventDefault();

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

            reader.onload = function () {

                const newNote = {

                    id: Date.now(),
                    subject: subjectValue,
                    title: titleValue,
                    fileName: file.name,
                    fileURL: reader.result,
                    date: new Date().toLocaleDateString()

                };

                notes.push(newNote);

                saveNotes();

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

        clearBtn.addEventListener("click", () => {

            if (confirm("Delete all notes?")) {

                notes = [];

                saveNotes();

                displayNotes();

            }

        });

    }

    // Initial Load
    displayNotes();

});