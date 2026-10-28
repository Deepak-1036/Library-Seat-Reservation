// Reservation History - Connected to MongoDB & Express Backend
const currentUser = typeof API !== "undefined" ? API.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser") || localStorage.getItem("loggedInUser"));

if (!currentUser) {
    window.location.href = "login.htm";
}

function loadLoggedInUser() {
    if (!currentUser) return;
    const username = currentUser.name || "User";
    const role = currentUser.role || "Student";

    const navUserName = document.getElementById("navUserName");
    const navUserRole = document.getElementById("navUserRole");
    const userAvatar = document.getElementById("userAvatar");

    if (navUserName) navUserName.textContent = username;
    if (navUserRole) navUserRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    if (userAvatar) userAvatar.textContent = username.trim().charAt(0).toUpperCase();
}

function getResourceIcon(category) {
    const icons = { Seat: "💺", Computer: "💻", Book: "📖", Room: "🏫", Equipment: "📽️" };
    return icons[category] || "📚";
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

function formatMinutesToTime(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function renderHistoryList() {
    const listContainer = document.getElementById("historyList");
    const emptyMessage = document.getElementById("historyEmpty");
    const filter = document.getElementById("historyFilter");
    if (!listContainer) return;

    let historyRecords = [];
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.reservations.getAll({ mine: "true" });
            const list = res.data || [];
            historyRecords = list.filter(r => r.status === "completed" || r.status === "cancelled");
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        const stored = JSON.parse(localStorage.getItem("reservations")) || [];
        const uid = currentUser.id || currentUser._id;
        historyRecords = stored.filter(r => r.userId == uid && (r.status === "completed" || r.status === "cancelled"));
    }

    const selectedFilter = filter ? filter.value : "all";
    const filtered = historyRecords.filter(r => selectedFilter === "all" || r.status === selectedFilter);

    listContainer.innerHTML = "";

    if (filtered.length === 0) {
        if (emptyMessage) {
            emptyMessage.style.display = "block";
            emptyMessage.textContent = historyRecords.length === 0 ? "You do not have any past reservations yet." : "No records match the selected filter.";
        }
        return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    filtered.slice().reverse().forEach(item => {
        const startM = parseTimeToMinutes(item.time);
        const endM = startM + (Number(item.duration) || 1) * 60;
        const timeSpan = `${item.time} – ${formatMinutesToTime(endM)}`;
        const statusClass = item.status === "completed" ? "completed" : "cancelled";
        const statusLabel = item.status === "completed" ? "Completed" : "Cancelled";

        listContainer.innerHTML += `
            <div class="history-item" data-status="${item.status}">
                <div class="history-icon">${getResourceIcon(item.category)}</div>
                <div class="history-details">
                    <h3>${item.resourceName} (${item.location})</h3>
                    <p>📅 ${item.date}</p>
                    <span>🕐 ${timeSpan} (${item.duration || 1} hr)</span>
                </div>
                <span class="history-status ${statusClass}">${statusLabel}</span>
            </div>
        `;
    });
}

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

function logout() {
    if (typeof API !== "undefined") {
        API.logout();
    } else {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.htm";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    loadLoggedInUser();
    renderHistoryList();
    const filter = document.getElementById("historyFilter");
    if (filter) filter.addEventListener("change", renderHistoryList);
});
