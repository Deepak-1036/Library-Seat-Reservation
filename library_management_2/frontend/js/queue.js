// Priority Queue Management - Connected to MongoDB & Express Backend
const currentUser = typeof API !== "undefined" ? API.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "login.htm";
}

let queueRequests = [];
let allResources = [];

if (currentUser) {
    const navUserName = document.getElementById("navUserName");
    const userAvatar = document.getElementById("userAvatar");
    if (navUserName) navUserName.textContent = currentUser.name;
    if (userAvatar) userAvatar.textContent = (currentUser.name || "U").charAt(0).toUpperCase();

    // If user is faculty, default priority in dropdown to High
    const prioSelect = document.getElementById("queuePrioritySelect");
    if (prioSelect && currentUser.role === "faculty") {
        prioSelect.value = "3";
    }
}

function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function getCurrentTimeString() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

async function fetchQueue() {
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.queue.getAll();
            queueRequests = res.data || [];
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        queueRequests = JSON.parse(localStorage.getItem("queueRequests")) || [];
    }
}

async function displayQueue() {
    await fetchQueue();
    const container = document.getElementById("queueList");
    if (!container) return;

    const uid = currentUser._id || currentUser.id;
    const myWaitingQueue = queueRequests.filter(r => (r.userId == uid || r.userId == String(uid)) && r.status === "waiting");
    const myServedQueue = queueRequests.filter(r => (r.userId == uid || r.userId == String(uid)) && r.status === "served");

    // Update Statistics Cards
    const totalQueueEl = document.getElementById("totalQueue");
    const highestPosEl = document.getElementById("highestPosition");
    const servedQueueEl = document.getElementById("servedQueue");

    if (totalQueueEl) totalQueueEl.textContent = myWaitingQueue.length;
    if (highestPosEl) highestPosEl.textContent = myWaitingQueue.length > 0 ? "#1" : "—";
    if (servedQueueEl) servedQueueEl.textContent = myServedQueue.length;

    container.innerHTML = "";

    if (myWaitingQueue.length === 0 && myServedQueue.length === 0) {
        container.innerHTML = `
            <div class="empty-queue" style="text-align:center; padding:45px 20px; color:#6b7280; background:white; border-radius:12px; border:1px dashed #d9d5f0;">
                <div style="font-size:38px; margin-bottom:10px;">⏳</div>
                <h3 style="color:#252548; font-size:18px; margin-bottom:6px;">You are not waiting in any queue</h3>
                <p style="max-width:440px; margin:0 auto 18px; font-size:14px; line-height:1.5;">When a seat or computer is currently occupied, you can join the waiting list with your requested date & time slot. When vacated, your booking is confirmed automatically!</p>
                <button type="button" onclick="openJoinQueueModal()" style="background:#5736e8; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer;">+ Join Waiting List Now</button>
            </div>
        `;
        return;
    }

    // 1. Render Active Waiting List
    if (myWaitingQueue.length > 0) {
        container.innerHTML += `<h3 style="color:#252548; margin: 0 0 14px 0; font-size: 17px; display:flex; align-items:center; gap:8px;"><span>⏳</span> Active Waiting List (${myWaitingQueue.length})</h3>`;
        myWaitingQueue.forEach((item, index) => {
            const priorityLabels = { 3: "High (Faculty/Urgent)", 2: "Medium (Exam/Assignment)", 1: "Standard" };
            const priorityColors = { 3: "#dc2626", 2: "#d97706", 1: "#2563eb" };
            const itemId = item._id || item.id;
            const prioColor = priorityColors[item.priority] || "#2563eb";

            const dateTimeDisplay = item.date && item.time ? `📅 ${item.date} &nbsp;|&nbsp; 🕐 ${item.time} (${item.duration || 1} hr)` : "General waitlist";

            container.innerHTML += `
                <div class="queue-item" style="display:flex; justify-content:space-between; align-items:center; padding:18px; margin-bottom:14px; background:white; border-radius:12px; border:1px solid #e2ddf8; box-shadow:0 2px 6px rgba(87,54,232,0.06); flex-wrap:wrap; gap:12px;">
                    <div>
                        <h3 style="margin:0 0 6px 0; color:#1e1b4b; font-size:16px;">${item.resourceName}</h3>
                        <p style="margin:0 0 6px 0; font-size:13px; color:#5736e8; font-weight:600;">${dateTimeDisplay}</p>
                        <p style="margin:0 0 6px 0; font-size:13px; color:#4b5563;">Purpose: <strong>${item.reason || "General Study"}</strong></p>
                        <small style="color:#6b7280;">
                            Priority: <span style="color:${prioColor}; font-weight:bold;">${priorityLabels[item.priority] || "Standard"}</span> &nbsp;|&nbsp; 
                            Requested: ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                    </div>
                    <div style="text-align:right;">
                        <span style="display:inline-block; padding:6px 14px; background:#eff6ff; color:#2563eb; font-weight:800; border-radius:8px; font-size:14px; margin-bottom:8px; border:1px solid #bfdbfe;">Queue Position: #${index + 1}</span><br>
                        <button onclick="leaveQueue('${itemId}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer;">Leave Queue</button>
                    </div>
                </div>
            `;
        });
    }

    // 2. Render Recently Served / Auto-Promoted Bookings
    if (myServedQueue.length > 0) {
        container.innerHTML += `<h3 style="color:#166534; margin: 24px 0 14px 0; font-size: 17px; display:flex; align-items:center; gap:8px;"><span>🎉</span> Auto-Promoted & Booked (${myServedQueue.length})</h3>`;
        myServedQueue.forEach((item) => {
            container.innerHTML += `
                <div class="queue-item served" style="display:flex; justify-content:space-between; align-items:center; padding:16px; margin-bottom:12px; background:#f0fdf4; border-radius:12px; border:1px solid #bbf7d0; flex-wrap:wrap; gap:12px;">
                    <div>
                        <h4 style="margin:0 0 4px 0; color:#14532d; font-size:15px;">${item.resourceName}</h4>
                        <p style="margin:0 0 4px 0; font-size:13px; color:#166534;">Slot Booked: <strong>📅 ${item.date || "Today"} at ${item.time || "Scheduled"} (${item.duration || 1} hr)</strong></p>
                        <small style="color:#15803d;">Status: Promoted from queue & confirmed!</small>
                    </div>
                    <div>
                        <a href="reservations.htm" style="display:inline-block; padding:7px 14px; background:#16a34a; color:white; text-decoration:none; font-weight:bold; font-size:12px; border-radius:6px;">View Reservation →</a>
                    </div>
                </div>
            `;
        });
    }
}

// Open Join Waiting List Modal
async function openJoinQueueModal(preselectedResourceId = null) {
    const modal = document.getElementById("joinQueueModal");
    if (!modal) return;

    const select = document.getElementById("queueResourceSelect");
    select.innerHTML = '<option value="">Loading resources...</option>';

    // Setup date & time defaults
    const dateInput = document.getElementById("queueDateInput");
    const timeInput = document.getElementById("queueTimeInput");
    if (dateInput) {
        const todayStr = getTodayString();
        dateInput.min = todayStr;
        if (!dateInput.value) dateInput.value = todayStr;
    }
    if (timeInput && !timeInput.value) {
        timeInput.value = getCurrentTimeString();
    }

    try {
        if (typeof API !== "undefined") {
            const res = await API.resources.getAll();
            allResources = res.data || [];
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        allResources = JSON.parse(localStorage.getItem("resources")) || [];
    }

    select.innerHTML = '<option value="">-- Choose a resource / seat --</option>';
    allResources.forEach(r => {
        if (r.status !== "Maintenance") {
            const resId = r._id || r.legacyId || r.id;
            const statusLabel = r.inUse ? " (Currently In Use)" : " (Available)";
            select.innerHTML += `<option value="${resId}">${r.name} - ${r.location}${statusLabel}</option>`;
        }
    });

    if (preselectedResourceId) {
        select.value = String(preselectedResourceId);
    }

    const alertBox = document.getElementById("joinQueueAlert");
    if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
    }

    modal.style.display = "flex";
}

function closeJoinQueueModal() {
    const modal = document.getElementById("joinQueueModal");
    if (modal) modal.style.display = "none";
}

// Join Queue Form Submission
const joinQueueForm = document.getElementById("joinQueueForm");
if (joinQueueForm) {
    joinQueueForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const resourceId = document.getElementById("queueResourceSelect").value;
        const date = document.getElementById("queueDateInput")?.value || getTodayString();
        const time = document.getElementById("queueTimeInput")?.value || "12:00";
        const duration = Number(document.getElementById("queueDurationSelect")?.value) || 1;
        const reason = document.getElementById("queueReasonInput").value.trim();
        const priority = Number(document.getElementById("queuePrioritySelect").value) || 1;
        const alertBox = document.getElementById("joinQueueAlert");
        const submitBtn = document.getElementById("submitJoinQueueBtn");

        if (!resourceId) {
            if (alertBox) {
                alertBox.textContent = "Please select a resource.";
                alertBox.style.background = "#fef2f2";
                alertBox.style.color = "#b91c1c";
                alertBox.style.display = "block";
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Joining Queue...";
        }

        try {
            if (typeof API !== "undefined" && API.getToken()) {
                const res = await API.queue.join({
                    resourceId,
                    date,
                    time,
                    duration,
                    reason,
                    priority
                });

                if (alertBox) {
                    alertBox.textContent = res.message || "Successfully joined the queue!";
                    alertBox.style.background = "#f0fdf4";
                    alertBox.style.color = "#15803d";
                    alertBox.style.display = "block";
                }

                setTimeout(() => {
                    closeJoinQueueModal();
                    joinQueueForm.reset();
                    displayQueue();
                }, 900);
            } else {
                throw new Error("Please log in to join the queue.");
            }
        } catch (error) {
            if (alertBox) {
                alertBox.textContent = error.message || "Failed to join queue.";
                alertBox.style.background = "#fef2f2";
                alertBox.style.color = "#b91c1c";
                alertBox.style.display = "block";
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Confirm & Join Queue →";
            }
        }
    });
}

async function leaveQueue(id) {
    if (!confirm("Are you sure you want to leave this queue?")) return;
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            await API.queue.cancel(id);
            alert("Removed from queue successfully.");
        }
    } catch (e) {
        alert(e.message || "Failed to leave queue.");
    }
    displayQueue();
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

// Window functions
window.openJoinQueueModal = openJoinQueueModal;
window.closeJoinQueueModal = closeJoinQueueModal;
window.leaveQueue = leaveQueue;

// Check query param (e.g. queue.htm?resource=1)
const urlParams = new URLSearchParams(window.location.search);
const resParam = urlParams.get("resource");
if (resParam) {
    openJoinQueueModal(resParam);
}

// Initial display
displayQueue();

// Auto-refresh every 3.5 seconds to reflect live promotions without page reload
setInterval(displayQueue, 3500);
