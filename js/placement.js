// =============================================
// CampusConnect - placement.js
// Real, working placement-prep modules
// =============================================

document.addEventListener("DOMContentLoaded", () => {

    // Check Login
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
        return;
    }

    const username = localStorage.getItem("username") || "Student";
    const email = localStorage.getItem("email") || "";
    const role = localStorage.getItem("role") || "Student";
    const OLLAMA_URL = "http://localhost:11434/api/chat";
    const OLLAMA_MODEL = "llama3.1:8b";

    const syncUserFromDb = async () => {
        if (!email) return;

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
            console.warn("Placement user sync skipped:", error.message);
        }
    };

    syncUserFromDb();

    const overlay = document.getElementById("moduleOverlay");
    const moduleContent = document.getElementById("moduleContent");
    const moduleClose = document.getElementById("moduleClose");

    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function openOverlay() {
        overlay.classList.add("show");
    }

    function closeOverlay() {
        overlay.classList.remove("show");
        moduleContent.innerHTML = "";
    }

    if (moduleClose) moduleClose.addEventListener("click", closeOverlay);

    if (overlay) {
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeOverlay();
        });
    }

    // ==================================================
    // 1. APTITUDE PRACTICE (real scored MCQ quiz)
    // ==================================================

    const aptitudeBank = [
        { q: "A train 120m long is running at 60 km/hr. How long does it take to pass a pole?", options: ["7.2 sec", "6 sec", "8 sec", "9.6 sec"], answer: 0 },
        { q: "If 20% of a number is 50, what is the number?", options: ["100", "200", "250", "300"], answer: 2 },
        { q: "Find the next number: 2, 6, 12, 20, 30, ?", options: ["36", "40", "42", "48"], answer: 2 },
        { q: "Choose the word that is opposite in meaning to 'Optimistic'.", options: ["Hopeful", "Pessimistic", "Confident", "Cheerful"], answer: 1 },
        { q: "A can do a job in 10 days, B in 15 days. Working together, how many days will they take?", options: ["5", "6", "7", "8"], answer: 1 },
        { q: "Simplify: 15% of 200 + 10% of 150", options: ["45", "50", "55", "60"], answer: 0 },
        { q: "Pick the odd one out: Apple, Mango, Carrot, Banana", options: ["Apple", "Mango", "Carrot", "Banana"], answer: 2 },
        { q: "If CAR is coded as DBS, how is DOG coded?", options: ["EPH", "EPI", "FQI", "EQH"], answer: 0 },
        { q: "A sum of money doubles itself in 8 years at simple interest. Find the rate of interest.", options: ["10%", "12.5%", "8%", "15%"], answer: 1 },
        { q: "Complete the analogy: Pen is to Write as Knife is to ____", options: ["Sharp", "Cut", "Kitchen", "Metal"], answer: 1 }
    ];

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    async function generatePlacementContent(type, fallback) {
        const prompts = {
            aptitude: `Generate exactly 5 original placement aptitude multiple-choice questions. Mix quantitative, logical reasoning, and verbal ability. Return only valid JSON as an array. Each item must have this shape: {"q":"question","options":["option 1","option 2","option 3","option 4"],"answer":0}. answer must be the zero-based index of the correct option. Ensure every answer is mathematically and factually correct.`,
            coding: `Generate exactly 5 original JavaScript coding practice problems for placement preparation. Return only valid JSON as an array. Each item must have this shape: {"title":"short title","difficulty":"Easy|Medium|Hard","description":"clear task","starter":"function functionName(...) {\\n  // your code here\\n}","tests":[{"args":[...],"expected":...},{"args":[...],"expected":...},{"args":[...],"expected":...}]}. Use JSON-safe primitive or array arguments and expected values. The function name in starter must be callable with the test args. Do not use external libraries or DOM APIs.`,
            interview: `Generate exactly 5 original placement mock interview questions mixing technical and HR topics. Return only valid JSON as an array. Each item must have this shape: {"type":"Technical or HR","q":"question"}. Do not include answers.`
        };

        try {
            const response = await fetch(OLLAMA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    stream: false,
                    format: "json",
                    messages: [{
                        role: "system",
                        content: "You create safe, accurate placement practice content. " + prompts[type]
                    }]
                })
            });

            if (!response.ok) throw new Error("Ollama HTTP " + response.status);
            const data = await response.json();
            const content = data.message && data.message.content ? data.message.content : "";
            const parsed = JSON.parse(content);
            const items = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.problems || []);

            if (!Array.isArray(items) || items.length < 5) throw new Error("Invalid generated content");

            const validItems = items.filter(item => {
                if (type === "aptitude") {
                    return item && typeof item.q === "string" && Array.isArray(item.options) &&
                        item.options.length === 4 && item.options.every(option => typeof option === "string") &&
                        Number.isInteger(item.answer) && item.answer >= 0 && item.answer < 4;
                }

                if (type === "coding") {
                    return item && typeof item.title === "string" && typeof item.description === "string" &&
                        typeof item.starter === "string" && extractFunctionName(item.starter) && Array.isArray(item.tests) &&
                        item.tests.length >= 3 && item.tests.every(test => Array.isArray(test.args) && Object.prototype.hasOwnProperty.call(test, "expected"));
                }

                return item && typeof item.q === "string" && typeof item.type === "string";
            });

            if (validItems.length < 5) throw new Error("Generated content failed validation");
            return validItems.slice(0, 5);
        } catch (error) {
            return shuffle(fallback).slice(0, 5);
        }
    }

    async function startAptitude() {

        moduleContent.innerHTML = "<h2>📝 Generating a fresh aptitude test...</h2><p class=\"module-sub\">Ollama is preparing new questions.</p>";
        const questions = await generatePlacementContent("aptitude", aptitudeBank);
        let current = 0;
        let score = 0;
        let selected = null;

        function renderQuestion() {

            selected = null;
            const item = questions[current];

            moduleContent.innerHTML = `
                <h2>📝 Aptitude Practice</h2>
                <p class="module-sub">Quantitative • Logical • Verbal</p>
                <div class="quiz-progress">Question ${current + 1} of ${questions.length} &nbsp;|&nbsp; Score: ${score}</div>
                <div class="quiz-question">${escapeHTML(item.q)}</div>
                <div class="quiz-options" id="quizOptions">
                    ${item.options.map((opt, i) => `
                        <div class="quiz-option" data-index="${i}">${escapeHTML(opt)}</div>
                    `).join("")}
                </div>
                <button class="btn" id="quizNextBtn">
                    ${current === questions.length - 1 ? "Finish" : "Next Question"}
                </button>
            `;

            const optionEls = moduleContent.querySelectorAll(".quiz-option");

            optionEls.forEach(el => {
                el.addEventListener("click", () => {
                    optionEls.forEach(o => o.classList.remove("selected"));
                    el.classList.add("selected");
                    selected = parseInt(el.dataset.index, 10);
                });
            });

            document.getElementById("quizNextBtn").addEventListener("click", () => {

                if (selected === null) {
                    alert("Please select an answer to continue.");
                    return;
                }

                if (selected === item.answer) score++;

                current++;

                if (current < questions.length) {
                    renderQuestion();
                } else {
                    renderResult();
                }

            });

        }

        function renderResult() {

            const percent = Math.round((score / questions.length) * 100);

            moduleContent.innerHTML = `
                <div class="quiz-result">
                    <p class="module-sub">Aptitude Practice Complete</p>
                    <h2>${score} / ${questions.length}</h2>
                    <p>You scored ${percent}%.</p>
                    <button class="btn" id="retryAptitude">Try Again</button>
                </div>
            `;

            document.getElementById("retryAptitude").addEventListener("click", startAptitude);

        }

        renderQuestion();

    }

    // ==================================================
    // 2. CODING PRACTICE (real in-browser JS test runner)
    // ==================================================

    const codingProblems = [
        {
            title: "Reverse a String",
            difficulty: "Easy",
            description: "Write a function reverseString(str) that returns the input string reversed.",
            starter: "function reverseString(str) {\n  // your code here\n}",
            tests: [
                { args: ["hello"], expected: "olleh" },
                { args: ["Campus"], expected: "supmaC" },
                { args: [""], expected: "" }
            ]
        },
        {
            title: "Check Palindrome",
            difficulty: "Easy",
            description: "Write a function isPalindrome(str) that returns true if the string reads the same forwards and backwards (case-insensitive).",
            starter: "function isPalindrome(str) {\n  // your code here\n}",
            tests: [
                { args: ["madam"], expected: true },
                { args: ["Level"], expected: true },
                { args: ["hello"], expected: false }
            ]
        },
        {
            title: "Two Sum",
            difficulty: "Medium",
            description: "Write a function twoSum(nums, target) that returns the indices [i, j] of the two numbers that add up to target.",
            starter: "function twoSum(nums, target) {\n  // your code here\n}",
            tests: [
                { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
                { args: [[3, 2, 4], 6], expected: [1, 2] },
                { args: [[1, 5, 3, 8], 11], expected: [2, 3] }
            ]
        },
        {
            title: "Find the Largest Number",
            difficulty: "Easy",
            description: "Write a function findLargest(arr) that returns the largest number in an array.",
            starter: "function findLargest(arr) {\n  // your code here\n}",
            tests: [
                { args: [[3, 7, 2, 9, 4]], expected: 9 },
                { args: [[-5, -1, -9]], expected: -1 },
                { args: [[1]], expected: 1 }
            ]
        },
        {
            title: "Count Vowels",
            difficulty: "Medium",
            description: "Write a function countVowels(str) that returns the number of vowels (a, e, i, o, u) in a string, case-insensitive.",
            starter: "function countVowels(str) {\n  // your code here\n}",
            tests: [
                { args: ["CampusConnect"], expected: 4 },
                { args: ["xyz"], expected: 0 },
                { args: ["AEIOUaeiou"], expected: 10 }
            ]
        }
    ];

    function deepEqual(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function extractFunctionName(code) {
        const match = code.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
        return match ? match[1] : null;
    }

    async function startCoding() {

        moduleContent.innerHTML = "<h2>💻 Generating fresh coding problems...</h2><p class=\"module-sub\">Ollama is preparing a new test set.</p>";
        activeCodingProblems = await generatePlacementContent("coding", codingProblems);
        renderProblemList();

    }

    let activeCodingProblems = codingProblems;

    function renderProblemList() {

        moduleContent.innerHTML = `
            <h2>💻 Coding Practice</h2>
            <p class="module-sub">Pick a problem and run it against real test cases, right in your browser.</p>
            <div class="code-problem-list" id="codeProblemList">
                ${activeCodingProblems.map((p, i) => `
                    <div class="code-problem-item" data-index="${i}">
                        <span>${escapeHTML(p.title)}</span>
                        <span class="difficulty ${p.difficulty}">${p.difficulty}</span>
                    </div>
                `).join("")}
            </div>
        `;

        moduleContent.querySelectorAll(".code-problem-item").forEach(item => {
            item.addEventListener("click", () => {
                renderProblem(parseInt(item.dataset.index, 10));
            });
        });

    }

    function renderProblem(index) {

        const problem = activeCodingProblems[index];

        moduleContent.innerHTML = `
            <h2>${escapeHTML(problem.title)}
                <span class="difficulty ${problem.difficulty}" style="margin-left:10px;">${problem.difficulty}</span>
            </h2>
            <p class="module-sub">${escapeHTML(problem.description)}</p>
            <textarea class="code-editor" id="codeEditor" spellcheck="false">${escapeHTML(problem.starter)}</textarea>
            <button class="btn" id="runCodeBtn">Run Tests</button>
            <button class="reset-btn" id="backToProblems" style="margin-left:10px;">Back to Problems</button>
            <div class="code-output" id="codeOutput" style="display:none;"></div>
        `;

        document.getElementById("backToProblems").addEventListener("click", renderProblemList);

        document.getElementById("runCodeBtn").addEventListener("click", () => {

            const code = document.getElementById("codeEditor").value;
            const output = document.getElementById("codeOutput");
            output.style.display = "block";

            const fnName = extractFunctionName(code);

            if (!fnName) {
                output.innerHTML = '<span class="test-fail">Could not find a function declaration. Make sure you define it as "function name(...) { }".</span>';
                return;
            }

            let userFn;

            try {
                userFn = new Function(code + `; return ${fnName};`)();
            } catch (err) {
                output.innerHTML = `<span class="test-fail">Syntax Error: ${escapeHTML(err.message)}</span>`;
                return;
            }

            if (typeof userFn !== "function") {
                output.innerHTML = '<span class="test-fail">Your code did not produce a callable function.</span>';
                return;
            }

            let passCount = 0;
            let lines = [];

            problem.tests.forEach((test, i) => {

                try {

                    const result = userFn.apply(null, test.args);
                    const pass = deepEqual(result, test.expected);

                    if (pass) passCount++;

                    lines.push(
                        `Test ${i + 1}: ${pass ? '<span class="test-pass">PASS</span>' : '<span class="test-fail">FAIL</span>'}  ` +
                        `input=${JSON.stringify(test.args)}  expected=${JSON.stringify(test.expected)}  got=${JSON.stringify(result)}`
                    );

                } catch (err) {

                    lines.push(`Test ${i + 1}: <span class="test-fail">ERROR</span> ${escapeHTML(err.message)}`);

                }

            });

            const summary = `${passCount} / ${problem.tests.length} tests passed`;

            output.innerHTML =
                `<strong>${summary}</strong>\n\n` + lines.join("\n");

            if (passCount === problem.tests.length) {
                output.innerHTML += `\n\n🎉 All tests passed! Great job.`;
            }

        });

    }

    // ==================================================
    // 3. MOCK INTERVIEW (real Q&A flow with review)
    // ==================================================

    const interviewQuestions = [
        { type: "HR", q: "Tell me about yourself." },
        { type: "HR", q: "What are your strengths and weaknesses?" },
        { type: "HR", q: "Why should we hire you?" },
        { type: "HR", q: "Where do you see yourself in 5 years?" },
        { type: "Technical", q: "Explain the difference between a stack and a queue." },
        { type: "Technical", q: "What is the time complexity of binary search, and why?" },
        { type: "Technical", q: "What is the difference between SQL and NoSQL databases?" },
        { type: "Technical", q: "Explain OOP concepts with an example." }
    ];

    async function startInterview() {

        moduleContent.innerHTML = "<h2>🎤 Generating a fresh interview round...</h2><p class=\"module-sub\">Ollama is preparing new HR and technical questions.</p>";
        const questions = await generatePlacementContent("interview", interviewQuestions);
        let current = 0;
        const answers = [];

        function renderQuestion() {

            const item = questions[current];

            moduleContent.innerHTML = `
                <h2>🎤 Mock Interview</h2>
                <p class="module-sub">${escapeHTML(item.type)} Round &nbsp;|&nbsp; Question ${current + 1} of ${questions.length}</p>
                <div class="quiz-question">${escapeHTML(item.q)}</div>
                <textarea class="interview-answer" id="interviewAnswer" placeholder="Type your answer here..."></textarea>
                <button class="btn" id="interviewNextBtn">
                    ${current === questions.length - 1 ? "Finish Interview" : "Next Question"}
                </button>
            `;

            document.getElementById("interviewNextBtn").addEventListener("click", () => {

                const answerText = document.getElementById("interviewAnswer").value.trim();

                answers.push({
                    question: item.q,
                    type: item.type,
                    answered: answerText.length > 0
                });

                current++;

                if (current < questions.length) {
                    renderQuestion();
                } else {
                    renderSummary();
                }

            });

        }

        function renderSummary() {

            const answeredCount = answers.filter(a => a.answered).length;

            moduleContent.innerHTML = `
                <h2>🎤 Interview Complete</h2>
                <p class="module-sub">Here's your summary</p>
                <p style="margin-bottom:15px;">You answered ${answeredCount} out of ${answers.length} questions.</p>
                <div class="code-problem-list">
                    ${answers.map(a => `
                        <div class="code-problem-item" style="cursor:default;">
                            <span>${escapeHTML(a.question)}</span>
                            <span class="difficulty ${a.answered ? 'Easy' : 'Hard'}">${a.answered ? "Answered" : "Skipped"}</span>
                        </div>
                    `).join("")}
                </div>
                <button class="btn" id="retryInterview" style="margin-top:15px;">Start Another Round</button>
            `;

            document.getElementById("retryInterview").addEventListener("click", startInterview);

        }

        renderQuestion();

    }

    // ==================================================
    // 4. RESUME BUILDER (real live preview + download)
    // ==================================================

    async function startResume() {

        let savedData = JSON.parse(localStorage.getItem("resumeData_" + username) || "{}");
        if (window.CampusApi && email) {
            try {
                const records = await CampusApi.list("resume", email);
                if (records.length) {
                    savedData = records[0].payload;
                    localStorage.setItem("resumeData_" + username, JSON.stringify(savedData));
                } else if (Object.keys(savedData).length) {
                    await CampusApi.save("resume", email, "profile", savedData);
                }
            } catch (error) {
                console.warn("Resume database load skipped:", error.message);
            }
        }

        moduleContent.innerHTML = `
            <h2>📄 Resume Builder</h2>
            <p class="module-sub">Fill in your details — the preview updates live.</p>
            <div class="resume-builder">
                <div>
                    <div class="form-group"><label>Full Name</label><input id="rName" value="${escapeHTML(savedData.name || username)}"></div>
                    <div class="form-group"><label>Email</label><input id="rEmail" value="${escapeHTML(savedData.email || localStorage.getItem('email') || '')}"></div>
                    <div class="form-group"><label>Phone</label><input id="rPhone" value="${escapeHTML(savedData.phone || '')}"></div>
                    <div class="form-group"><label>Objective</label><textarea id="rObjective" rows="3">${escapeHTML(savedData.objective || '')}</textarea></div>
                    <div class="form-group"><label>Education</label><textarea id="rEducation" rows="2" placeholder="e.g. B.Tech CSE, XYZ College, 2026">${escapeHTML(savedData.education || '')}</textarea></div>
                    <div class="form-group"><label>Skills (comma separated)</label><input id="rSkills" value="${escapeHTML(savedData.skills || '')}"></div>
                    <div class="form-group"><label>Experience / Projects</label><textarea id="rExperience" rows="3">${escapeHTML(savedData.experience || '')}</textarea></div>
                    <button class="btn" id="downloadResumeBtn">Download Resume</button>
                    <button class="reset-btn" id="printResumeBtn" style="margin-left:10px;">Print / Save as PDF</button>
                </div>
                <div class="resume-preview" id="resumePreview"></div>
            </div>
        `;

        const fields = ["rName", "rEmail", "rPhone", "rObjective", "rEducation", "rSkills", "rExperience"];

        function getData() {
            return {
                name: document.getElementById("rName").value.trim(),
                email: document.getElementById("rEmail").value.trim(),
                phone: document.getElementById("rPhone").value.trim(),
                objective: document.getElementById("rObjective").value.trim(),
                education: document.getElementById("rEducation").value.trim(),
                skills: document.getElementById("rSkills").value.trim(),
                experience: document.getElementById("rExperience").value.trim()
            };
        }

        let saveTimer;
        function renderPreview() {

            const d = getData();

            document.getElementById("resumePreview").innerHTML = `
                <h2>${escapeHTML(d.name || "Your Name")}</h2>
                <p>${escapeHTML(d.email)} ${d.phone ? " | " + escapeHTML(d.phone) : ""}</p>
                ${d.objective ? `<div class="r-section"><h4>Objective</h4><p>${escapeHTML(d.objective)}</p></div>` : ""}
                ${d.education ? `<div class="r-section"><h4>Education</h4><p>${escapeHTML(d.education)}</p></div>` : ""}
                ${d.skills ? `<div class="r-section"><h4>Skills</h4><p>${escapeHTML(d.skills)}</p></div>` : ""}
                ${d.experience ? `<div class="r-section"><h4>Experience / Projects</h4><p>${escapeHTML(d.experience)}</p></div>` : ""}
            `;

            localStorage.setItem("resumeData_" + username, JSON.stringify(d));

            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                if (window.CampusApi && email) {
                    CampusApi.save("resume", email, "profile", d)
                        .catch(error => console.warn("Resume database save skipped:", error.message));
                }
            }, 300);

        }

        fields.forEach(id => {
            document.getElementById(id).addEventListener("input", renderPreview);
        });

        document.getElementById("downloadResumeBtn").addEventListener("click", () => {

            const d = getData();

            const lines = [
                d.name || "Your Name",
                d.email + (d.phone ? "  |  " + d.phone : ""),
                "",
                "OBJECTIVE",
                d.objective || "-",
                "",
                "EDUCATION",
                d.education || "-",
                "",
                "SKILLS",
                d.skills || "-",
                "",
                "EXPERIENCE / PROJECTS",
                d.experience || "-"
            ];

            const blob = new Blob([lines.join("\n")], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = (d.name || "resume").replace(/\s+/g, "_") + "_resume.txt";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        });

        document.getElementById("printResumeBtn").addEventListener("click", () => {

            const preview = document.getElementById("resumePreview").innerHTML;
            const printWindow = window.open("", "_blank");

            printWindow.document.write(`
                <html>
                <head>
                    <title>Resume</title>
                    <style>
                        body{ font-family: Arial, sans-serif; color:#08162d; padding:30px; }
                        h4{ color:#0057ff; border-bottom:1px solid #ddd; padding-bottom:4px; }
                        .r-section{ margin-top:16px; }
                    </style>
                </head>
                <body>${preview}</body>
                </html>
            `);

            printWindow.document.close();
            printWindow.focus();
            printWindow.print();

        });

        renderPreview();

    }

    // ==================================================
    // 5. COMPANY PREPARATION (real curated content)
    // ==================================================

    const companyPrepData = [
        { name: "TCS", rounds: "Online Aptitude Test → Technical Interview → HR Interview", tips: "Focus on quantitative aptitude, verbal ability, and basic programming (arrays, strings, OOP). TCS NQT also includes a coding round with 1-2 problems." },
        { name: "Infosys", rounds: "Online Test (Aptitude + Pseudocode) → Technical Interview → HR Interview", tips: "Practice pseudocode-based questions and logical reasoning. Be ready to explain projects from your resume in depth." },
        { name: "Wipro", rounds: "Online Assessment (Aptitude + Coding) → Technical Interview → HR Interview", tips: "Wipro NLTH focuses heavily on coding (2 problems) plus verbal and logical sections. Practice basic DSA problems." },
        { name: "Accenture", rounds: "Cognitive & Technical Assessment → Coding Round → Interview", tips: "Expect situational judgement questions along with aptitude. Communication skills are evaluated closely in the interview." },
        { name: "Amazon", rounds: "Online Coding Test (2 problems) → Technical Interviews (DSA + LP) → Bar Raiser Round", tips: "Strong DSA is a must (arrays, trees, graphs, DP). Prepare STAR-format answers for Amazon's Leadership Principles." },
        { name: "Capgemini", rounds: "Game-based Aptitude Test → Coding Test → Interview", tips: "Practice the pseudocode round and basic logical games. Interview often covers resume projects and basic CS fundamentals." }
    ];

    function startCompanies() {

        moduleContent.innerHTML = `
            <h2>🏢 Company Preparation</h2>
            <p class="module-sub">Recruitment process & preparation tips for top recruiters.</p>
            <div id="companyAccordion">
                ${companyPrepData.map((c, i) => `
                    <div class="accordion-item" data-index="${i}">
                        <div class="accordion-header">
                            <span>${escapeHTML(c.name)}</span>
                            <span class="accordion-arrow">▾</span>
                        </div>
                        <div class="accordion-body">
                            <p><strong>Rounds:</strong> ${escapeHTML(c.rounds)}</p>
                            <p style="margin-top:8px;"><strong>Tips:</strong> ${escapeHTML(c.tips)}</p>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

        setupAccordion("companyAccordion");

    }

    // ==================================================
    // 6. INTERVIEW QUESTIONS (real Q&A accordion)
    // ==================================================

    const interviewQABank = [
        { q: "What is the difference between a stack and a queue?", a: "A stack follows LIFO (Last In, First Out) order, while a queue follows FIFO (First In, First Out) order. Stacks are used in function calls/undo operations; queues are used in scheduling/task processing." },
        { q: "What is time complexity and why does it matter?", a: "Time complexity describes how an algorithm's running time grows with input size. It matters because it helps predict performance and scalability of code on large inputs." },
        { q: "Explain the 4 pillars of OOP.", a: "Encapsulation (bundling data and methods), Abstraction (hiding complexity), Inheritance (reusing code across classes), and Polymorphism (same interface, different implementations)." },
        { q: "What is normalization in databases?", a: "Normalization is the process of organizing database tables to reduce redundancy and improve data integrity, typically done through a series of normal forms (1NF, 2NF, 3NF, etc.)." },
        { q: "What is the difference between == and === in JavaScript?", a: "== compares values with type coercion, while === compares both value and type without coercion. === is generally the safer choice." },
        { q: "What is a REST API?", a: "REST (Representational State Transfer) is an architectural style for web services using standard HTTP methods (GET, POST, PUT, DELETE) to perform operations on resources." },
        { q: "Tell me about yourself.", a: "Keep it structured: a brief intro, your academic background, key skills/projects, and why you're interested in this role — in under 90 seconds." },
        { q: "Why do you want to work here?", a: "Research the company's products, culture, and recent news. Connect your skills and goals to what the company specifically offers." },
        { q: "What is your biggest weakness?", a: "Pick a real, minor weakness and describe concrete steps you're taking to improve it. Avoid cliché answers like 'I work too hard.'" },
        { q: "Where do you see yourself in 5 years?", a: "Show ambition tied to growth within the field/company — e.g. taking on more technical ownership or leadership, while staying realistic." }
    ];

    function startQuestions() {

        moduleContent.innerHTML = `
            <h2>📚 Interview Questions</h2>
            <p class="module-sub">Click a question to reveal the answer.</p>
            <div id="questionsAccordion">
                ${interviewQABank.map((item, i) => `
                    <div class="accordion-item" data-index="${i}">
                        <div class="accordion-header">
                            <span>${escapeHTML(item.q)}</span>
                            <span class="accordion-arrow">▾</span>
                        </div>
                        <div class="accordion-body">
                            <p>${escapeHTML(item.a)}</p>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

        setupAccordion("questionsAccordion");

    }

    // ----------------------------
    // Shared accordion behaviour
    // ----------------------------
    function setupAccordion(containerId) {

        const container = document.getElementById(containerId);
        if (!container) return;

        container.querySelectorAll(".accordion-item").forEach(item => {

            item.querySelector(".accordion-header").addEventListener("click", () => {
                item.classList.toggle("open");
            });

        });

    }

    // ==================================================
    // Wire up feature card buttons
    // ==================================================

    const moduleHandlers = {
        aptitude: startAptitude,
        coding: startCoding,
        interview: startInterview,
        resume: startResume,
        companies: startCompanies,
        questions: startQuestions
    };

    document.querySelectorAll("[data-module]").forEach(btn => {

        btn.addEventListener("click", () => {

            const key = btn.dataset.module;

            if (moduleHandlers[key]) {
                moduleHandlers[key]();
                openOverlay();
            }

        });

    });

    // ----------------------------
    // Job Table Apply Buttons
    // ----------------------------
    const jobTable = document.getElementById("jobTable");
    const applicationsTable = document.getElementById("applicationsTable");
    const applicationCount = document.getElementById("applicationCount");
    const applicationsKey = "jobApplications_" + (localStorage.getItem("email") || username).toLowerCase();
    let applications = JSON.parse(localStorage.getItem(applicationsKey) || "[]");

    async function loadApplications() {
        if (!window.CampusApi || !email) return;
        try {
            const records = await CampusApi.list("application", email);
            if (records.length) {
                applications = records.map(record => record.payload);
            } else if (applications.length) {
                await Promise.all(applications.map(application =>
                    CampusApi.save("application", email, application.id, application)
                ));
            }
            localStorage.setItem(applicationsKey, JSON.stringify(applications));
            renderApplications();
            updateApplyButtons();
        } catch (error) {
            console.warn("Job applications database load skipped:", error.message);
        }
    }

    function saveApplications() {
        localStorage.setItem(applicationsKey, JSON.stringify(applications));
        if (window.CampusApi && email) {
            applications.forEach(application => {
                CampusApi.save("application", email, application.id, application)
                    .catch(error => console.warn("Job application database save skipped:", error.message));
            });
        }
    }

    function applicationKey(company, role) {
        return company.toLowerCase().replace(/\s+/g, "-") + "-" + role.toLowerCase().replace(/\s+/g, "-");
    }

    function renderApplications() {
        if (!applicationsTable) return;

        if (applicationCount) {
            applicationCount.textContent = applications.length + (applications.length === 1 ? " application" : " applications");
        }

        if (!applications.length) {
            applicationsTable.innerHTML = '<tr><td colspan="6">No applications submitted yet.</td></tr>';
            return;
        }

        applicationsTable.innerHTML = applications.slice().reverse().map(application => `
            <tr>
                <td>${escapeHTML(application.company)}</td>
                <td>${escapeHTML(application.role)}</td>
                <td>${escapeHTML(application.location)}</td>
                <td>${escapeHTML(new Date(application.appliedAt).toLocaleString())}</td>
                <td><span class="application-status ${application.status.toLowerCase()}">${escapeHTML(application.status)}</span></td>
                <td><button class="application-withdraw" data-application-id="${escapeHTML(application.id)}" type="button">Withdraw</button></td>
            </tr>
        `).join("");

        applicationsTable.querySelectorAll("[data-application-id]").forEach(button => {
            button.addEventListener("click", () => {
                const application = applications.find(item => item.id === button.dataset.applicationId);
                if (!application || application.status === "Withdrawn") return;
                if (!confirm("Withdraw your application for " + application.role + " at " + application.company + "?")) return;
                application.status = "Withdrawn";
                application.withdrawnAt = new Date().toISOString();
                saveApplications();
                renderApplications();
                updateApplyButtons();
            });
        });
    }

    function updateApplyButtons() {
        if (!jobTable) return;

        jobTable.querySelectorAll(".quick-btn").forEach(button => {
            const row = button.closest("tr");
            if (!row) return;
            const company = row.children[0].textContent.trim();
            const role = row.children[1].textContent.trim();
            const activeApplication = applications.find(application =>
                application.id === applicationKey(company, role) && application.status !== "Withdrawn"
            );
            button.textContent = activeApplication ? "Applied" : "Apply Now";
            button.classList.toggle("is-applied", Boolean(activeApplication));
            button.disabled = Boolean(activeApplication);
        });
    }

    if (jobTable) {

        jobTable.querySelectorAll(".quick-btn").forEach(btn => {

            btn.addEventListener("click", () => {

                const row = btn.closest("tr");
                const company = row ? row.children[0].textContent : "this company";
                const role = row ? row.children[1].textContent : "this role";

                const applicationId = applicationKey(company, role);
                const existingApplication = applications.find(application =>
                    application.id === applicationId && application.status !== "Withdrawn"
                );

                if (existingApplication) {
                    return;
                }

                applications.push({
                    id: applicationId,
                    company: company,
                    role: role,
                    package: row.children[2].textContent.trim(),
                    location: row.children[3].textContent.trim(),
                    status: "Submitted",
                    appliedAt: new Date().toISOString()
                });
                saveApplications();
                renderApplications();
                updateApplyButtons();
                alert("Application submitted to " + company + " for " + role + ".");

            });

        });

    }

    renderApplications();
    updateApplyButtons();
    loadApplications();

});
