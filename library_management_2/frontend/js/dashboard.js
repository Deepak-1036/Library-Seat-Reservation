// Dashboard Manager - Connected to MongoDB & Express Backend
const currentUser = typeof API !== "undefined" ? API.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
    window.location.href = "login.htm";
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

if (currentUser) {
    const welcomeName = document.getElementById("welcomeName");
    const navUserName = document.getElementById("navUserName");
    const userAvatar = document.getElementById("userAvatar");

    if (welcomeName) welcomeName.textContent = currentUser.name;
    if (navUserName) navUserName.textContent = currentUser.name;
    if (userAvatar) userAvatar.textContent = (currentUser.name || "U").charAt(0).toUpperCase();

    loadDashboardData();
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

async function loadDashboardData() {
    let myReservations = [];
    let myQueue = [];

    // Fetch live data from Express + MongoDB backend
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const resData = await API.reservations.getAll({ mine: "true" });
            myReservations = resData.data || [];

            const queueData = await API.queue.getAll({ mine: "true" });
            myQueue = queueData.data || [];
        } else {
            throw new Error("No token");
        }
    } catch (e) {
        // Fallback to localStorage cache
        const allReservations = JSON.parse(localStorage.getItem("reservations")) || [];
        const allQueue = JSON.parse(localStorage.getItem("queueRequests")) || [];
        const uid = currentUser ? currentUser.id || currentUser._id : null;
        myReservations = allReservations.filter(r => r.userId == uid);
        myQueue = allQueue.filter(q => q.userId == uid && q.status === "waiting");
    }

    const active = myReservations.filter(r => r.status === "active");
    const completed = myReservations.filter(r => r.status === "completed");

    const activeEl = document.getElementById("activeReservations");
    const reservedEl = document.getElementById("resourcesReserved");
    const completedEl = document.getElementById("completedReservations");
    const queuePosEl = document.getElementById("queuePosition");

    if (activeEl) activeEl.textContent = active.length;
    if (reservedEl) reservedEl.textContent = myReservations.length;
    if (completedEl) completedEl.textContent = completed.length;
    if (queuePosEl) queuePosEl.textContent = myQueue.length > 0 ? `#${myQueue.length}` : "—";

    // Populate Upcoming Reservations dynamically
    const upcomingContainer = document.getElementById("upcomingReservations");
    if (upcomingContainer) {
        if (active.length === 0) {
            upcomingContainer.innerHTML = `
                <div class="empty-state">
                    <div>📅</div>
                    <h3>No upcoming reservations</h3>
                    <p>Reserve a seat or resource to see it here.</p>
                    <a href="resources.htm" class="small-button">Browse Resources</a>
                </div>
            `;
        } else {
            upcomingContainer.innerHTML = "";
            active.slice().reverse().forEach(res => {
                const startM = parseTimeToMinutes(res.time);
                const endM = startM + Number(res.duration) * 60;
                const timeSpan = `${res.time} – ${formatMinutesToTime(endM)}`;

                upcomingContainer.innerHTML += `
                    <div class="dashboard-reservation-item" style="display:flex; align-items:center; justify-content:space-between; padding:12px 14px; margin-bottom:10px; background:#f9f8fe; border-radius:8px; border:1px solid #ebe7f7;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="font-size:24px;">${getResourceIcon(res.category)}</span>
                            <div>
                                <strong style="display:block; color:#252548; font-size:14px;">${res.resourceName}</strong>
                                <small style="color:#77778c; font-size:12px;">📅 ${res.date} &nbsp;|&nbsp; 🕐 ${timeSpan} &nbsp;|&nbsp; 📍 ${res.location}</small>
                            </div>
                        </div>
                        <a href="reservations.htm" style="color:#5736e8; text-decoration:none; font-size:12px; font-weight:bold;">Manage →</a>
                    </div>
                `;
            });
        }
    }
}
