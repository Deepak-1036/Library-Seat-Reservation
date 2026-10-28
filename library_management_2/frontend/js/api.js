/**
 * Library Seat & Resource Reservation - API Client
 * Centralized service to connect Frontend with Express & MongoDB Backend
 */

// ============================================================================
// DEPLOYMENT CONFIGURATION:
// For Continuous Evaluation #2:
// When deploying your backend (e.g. on Render, Railway, Vercel), paste your
// deployed backend URL below (e.g., "https://library-backend.onrender.com").
// Leave empty ("") when running locally with Express or auto-detection.
// ============================================================================
const CUSTOM_DEPLOYED_URL = "";

// Auto-detect base URL:
// - If CUSTOM_DEPLOYED_URL is set, use it.
// - If served from Express backend directly (port 5000 or production domain), use relative path "".
// - If opened via Live Server (port 5500, 5501, etc.), use "http://localhost:5000".
const API_BASE_URL = CUSTOM_DEPLOYED_URL || (
    typeof window !== "undefined" && window.location.origin.includes(":5000")
        ? ""
        : (typeof window !== "undefined" && window.location.protocol.startsWith("http")
            ? (window.location.port === "5500" || window.location.port === "5501" || window.location.port === "3000"
                ? "http://localhost:5000"
                : "")
            : "http://localhost:5000")
);

const API = {
    BASE_URL: API_BASE_URL,

    // Token & Auth Storage
    getToken() {
        return localStorage.getItem("authToken");
    },

    setToken(token) {
        if (token) {
            localStorage.setItem("authToken", token);
        } else {
            localStorage.removeItem("authToken");
        }
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem("currentUser"));
        } catch (e) {
            return null;
        }
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem("currentUser", JSON.stringify(user));
            localStorage.setItem("loggedInUser", JSON.stringify(user));
        } else {
            localStorage.removeItem("currentUser");
            localStorage.removeItem("loggedInUser");
        }
    },

    logout() {
        this.setToken(null);
        this.setCurrentUser(null);
        window.location.href = "login.htm";
    },

    // Generic HTTP Request Wrapper
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const headers = {
            "Content-Type": "application/json",
            ...(this.getToken() ? { "Authorization": `Bearer ${this.getToken()}` } : {}),
            ...(options.headers || {})
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorMsg = data.message || `Request failed with status ${response.status}`;
                const error = new Error(errorMsg);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            console.error(`API Error [${endpoint}]:`, err.message);
            throw err;
        }
    },

    // Auth Endpoints
    auth: {
        async register(userData) {
            const res = await API.request("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(userData)
            });
            if (res.token) {
                API.setToken(res.token);
                API.setCurrentUser(res.user);
            }
            return res;
        },

        async login(credentials) {
            const res = await API.request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(credentials)
            });
            if (res.token) {
                API.setToken(res.token);
                API.setCurrentUser(res.user);
            }
            return res;
        },

        async googleLogin(payload) {
            const res = await API.request("/api/auth/google", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            if (res.token) {
                API.setToken(res.token);
                API.setCurrentUser(res.user);
            }
            return res;
        },

        async forgotPassword(email) {
            return await API.request("/api/auth/forgot-password", {
                method: "POST",
                body: JSON.stringify({ email })
            });
        },

        async resetPassword({ email, otp, newPassword }) {
            return await API.request("/api/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({ email, otp, newPassword })
            });
        },

        async getMe() {
            return await API.request("/api/auth/me");
        }
    },

    // Resources Endpoints
    resources: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return await API.request(`/api/resources${query ? `?${query}` : ""}`);
        },

        async getById(id) {
            return await API.request(`/api/resources/${id}`);
        },

        async create(resourceData) {
            return await API.request("/api/resources", {
                method: "POST",
                body: JSON.stringify(resourceData)
            });
        },

        async update(id, resourceData) {
            return await API.request(`/api/resources/${id}`, {
                method: "PUT",
                body: JSON.stringify(resourceData)
            });
        },

        async delete(id) {
            return await API.request(`/api/resources/${id}`, {
                method: "DELETE"
            });
        }
    },

    // Reservations Endpoints
    reservations: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return await API.request(`/api/reservations${query ? `?${query}` : ""}`);
        },

        async getOccupiedSlots(resourceId, date) {
            return await API.request(`/api/reservations/slots?resourceId=${encodeURIComponent(resourceId)}&date=${encodeURIComponent(date)}`);
        },

        async create(reservationData) {
            return await API.request("/api/reservations", {
                method: "POST",
                body: JSON.stringify(reservationData)
            });
        },

        async cancel(id) {
            return await API.request(`/api/reservations/${id}/cancel`, {
                method: "PUT"
            });
        }
    },

    // Queue Endpoints
    queue: {
        async getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return await API.request(`/api/queue${query ? `?${query}` : ""}`);
        },

        async join(queueData) {
            return await API.request("/api/queue", {
                method: "POST",
                body: JSON.stringify(queueData)
            });
        },

        async cancel(id) {
            return await API.request(`/api/queue/${id}`, {
                method: "DELETE"
            });
        }
    },

    // User & Profile Endpoints
    users: {
        async getProfile() {
            return await API.request("/api/users/profile");
        },

        async updateProfile(profileData) {
            const res = await API.request("/api/users/profile", {
                method: "PUT",
                body: JSON.stringify(profileData)
            });
            if (res.data) {
                API.setCurrentUser(res.data);
            }
            return res;
        },

        async getNotifications() {
            return await API.request("/api/users/notifications");
        },

        async markNotificationRead(id) {
            return await API.request(`/api/users/notifications/${id}/read`, {
                method: "PUT"
            });
        },

        async markAllNotificationsRead() {
            return await API.request("/api/users/notifications/read-all", {
                method: "PUT"
            });
        }
    }
};

// Make API globally available on window
if (typeof window !== "undefined") {
    window.API = API;
}
