// Notifications - Connected to MongoDB & Express Backend
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

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", function (event) {
    const profile = document.querySelector(".user-profile");
    const menu = document.getElementById("userMenu");

    if (profile && menu && !profile.contains(event.target) && !menu.contains(event.target)) {
        menu.classList.remove("show");
    }
});

function logout() {
    if (typeof API !== "undefined") {
        API.logout();
    } else {
        localStorage.removeItem("currentUser");
        localStorage.removeItem("loggedInUser");
        window.location.href = "login.htm";
    }
}

async function fetchNotifications() {
    const listSection = document.getElementById("notificationsList");
    const emptyState = document.getElementById("notificationsEmpty");
    if (!listSection) return;

    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.users.getNotifications();
            const notifications = res.data || [];

            updateCounts(res.unreadCount);

            if (notifications.length === 0) {
                if (emptyState) emptyState.style.display = "block";
                return;
            }

            if (emptyState) emptyState.style.display = "none";
            listSection.innerHTML = "";

            notifications.forEach(n => {
                const readClass = n.isRead ? "read" : "unread";
                const dot = !n.isRead ? '<span class="unread-dot"></span>' : '';
                const btn = !n.isRead ? `<button class="notification-read-btn" onclick="markAsRead('${n._id || n.id}')">Mark as read</button>` : '';

                listSection.innerHTML += `
                    <div class="notification-item ${readClass}" data-id="${n._id || n.id}">
                        <div class="notification-body">
                            <div class="notification-title-row">
                                <h4>${n.title}</h4>
                                ${dot}
                            </div>
                            <p>${n.message}</p>
                            <small class="notification-time">${new Date(n.createdAt).toLocaleString()}</small>
                        </div>
                        ${btn}
                    </div>
                `;
            });
        }
    } catch (e) {
        console.warn("Notifications fallback:", e.message);
    }
}

async function markAsRead(id) {
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            await API.users.markNotificationRead(id);
        }
    } catch (e) {
        console.warn(e.message);
    }
    fetchNotifications();
}

async function markAllAsRead() {
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            await API.users.markAllNotificationsRead();
        }
    } catch (e) {
        console.warn(e.message);
    }
    fetchNotifications();
}

function updateCounts(unreadCount) {
    const pageCount = document.getElementById("notificationCount");
    const headerCount = document.getElementById("headerNotificationCount");

    if (pageCount) pageCount.textContent = unreadCount || 0;
    if (headerCount) {
        headerCount.textContent = unreadCount || 0;
        headerCount.style.display = (!unreadCount || unreadCount === 0) ? "none" : "flex";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    loadLoggedInUser();
    fetchNotifications();
});
