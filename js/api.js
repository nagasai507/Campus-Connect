(() => {
    const apiBase = window.location.port === "5000" ? "" : "http://localhost:5000";

    async function request(path, options = {}) {
        const response = await fetch(apiBase + path, {
            headers: { "Content-Type": "application/json", ...(options.headers || {}) },
            ...options
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`);
        return result;
    }

    window.CampusApi = {
        async list(kind, email) {
            const query = email ? `?email=${encodeURIComponent(email)}` : "";
            const result = await request(`/api/records/${encodeURIComponent(kind)}${query}`);
            return result.records || [];
        },
        save(kind, email, key, payload) {
            return request(`/api/records/${encodeURIComponent(kind)}/${encodeURIComponent(key)}`, {
                method: "PUT",
                body: JSON.stringify({ email, payload })
            });
        },
        remove(kind, email, key) {
            return request(`/api/records/${encodeURIComponent(kind)}/${encodeURIComponent(key)}?email=${encodeURIComponent(email)}`, {
                method: "DELETE"
            });
        },
        clear(kind, email) {
            return request(`/api/records/${encodeURIComponent(kind)}?email=${encodeURIComponent(email)}`, {
                method: "DELETE"
            });
        }
    };
})();