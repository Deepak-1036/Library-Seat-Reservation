// Reservations Management - Connected to MongoDB & Express Backend
const currentUser = typeof API !== "undefined" ? API.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "login.htm";
}

let resources = [];
let reservations = [];

// Update User Header Info
if (currentUser) {
    const navUserName = document.getElementById("navUserName");
    const navUserRole = document.getElementById("navUserRole");
    const userAvatar = document.getElementById("userAvatar");
    if (navUserName) navUserName.textContent = currentUser.name;
    if (navUserRole) navUserRole.textContent = (currentUser.role || "student").toUpperCase();
    if (userAvatar) userAvatar.textContent = (currentUser.name || "U").charAt(0).toUpperCase();
}

// Date & Time Utility Functions
function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getCurrentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

function formatMinutesToTime(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getResourceIcon(category) {
    const icons = { Seat: "💺", Computer: "💻", Book: "📖", Room: "🏫", Equipment: "📽️" };
    return icons[category] || "📚";
}

function getStatusClass(status) {
    if (status === "active") return "status-active";
    if (status === "pending") return "status-pending";
    if (status === "completed") return "status-completed";
    return "status-cancelled";
}

function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Display user's reservations from MongoDB API
async function displayReservations() {
    const container = document.getElementById("reservationsContainer");
    const search = (document.getElementById("reservationSearch")?.value || "").toLowerCase();
    const filter = document.getElementById("reservationFilter")?.value || "all";

    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.reservations.getAll({ mine: "true" });
            reservations = res.data || [];
        } else {
            throw new Error("No token");
        }
    } catch (e) {
        reservations = JSON.parse(localStorage.getItem("reservations")) || [];
        const uid = currentUser.id || currentUser._id;
        reservations = reservations.filter(r => r.userId == uid);
    }

    const filtered = reservations.filter(r => {
        const text = `${r.resourceName} ${r.category} ${r.location}`.toLowerCase();
        const matchesSearch = text.includes(search);
        const matchesFilter = filter === "all" || r.status === filter;
        return matchesSearch && matchesFilter;
    });

    updateStatistics(reservations);
    if (!container) return;
    container.innerHTML = "";

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-reservations">
                <div class="empty-icon">📅</div>
                <h2>No reservations found</h2>
                <p>You don't have any reservations matching your search.</p>
                <a href="resources.htm">Browse Resources</a>
            </div>
        `;
        return;
    }

    filtered.forEach(res => {
        container.innerHTML += createReservationCard(res);
    });
}

function updateStatistics(list) {
    const total = list.length;
    const active = list.filter(r => r.status === "active").length;
    const pending = list.filter(r => r.status === "pending").length;
    const completed = list.filter(r => r.status === "completed").length;

    const totalEl = document.getElementById("totalReservations");
    const activeEl = document.getElementById("activeReservations");
    const pendingEl = document.getElementById("pendingReservations");
    const completedEl = document.getElementById("completedReservations");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;
}

function createReservationCard(res) {
    const canCancel = res.status === "active" || res.status === "pending";
    const startM = parseTimeToMinutes(res.time);
    const endM = startM + Number(res.duration) * 60;
    const timeDisplay = `${res.time} – ${formatMinutesToTime(endM)}`;
    const resId = res._id || res.id;

    return `
        <div class="reservation-card">
            <div class="reservation-icon">${getResourceIcon(res.category)}</div>
            <div class="reservation-main">
                <h2>${res.resourceName}</h2>
                <p class="category">${res.category}</p>
                <div class="reservation-details">
                    <span>📅 ${res.date}</span>
                    <span>🕐 ${timeDisplay}</span>
                    <span>⏱ ${res.duration} hour(s)</span>
                    <span>📍 ${res.location}</span>
                </div>
            </div>
            <div class="reservation-right">
                <span class="reservation-status ${getStatusClass(res.status)}">${capitalize(res.status)}</span>
                ${canCancel ? `<button class="cancel-reservation-btn" onclick="cancelReservation('${resId}')">Cancel</button>` : ""}
            </div>
        </div>
    `;
}

function showModalMessage(msg, type = "error") {
    const box = document.getElementById("reservationModalMessage");
    if (!box) {
        alert(msg);
        return;
    }
    box.textContent = msg;
    box.className = `modal-alert ${type}`;
    box.style.display = "block";
}

function hideModalMessage() {
    const box = document.getElementById("reservationModalMessage");
    if (box) {
        box.textContent = "";
        box.style.display = "none";
    }
}

// Dynamic Slot Availability Indicator (hits API or local cache)
async function updateResourceSlotsInfo() {
    const resourceId = document.getElementById("reservationResource")?.value;
    const date = document.getElementById("reservationDate")?.value;
    const infoDiv = document.getElementById("resourceSlotsInfo");
    if (!infoDiv) return;

    if (!resourceId || !date) {
        infoDiv.style.display = "none";
        infoDiv.innerHTML = "";
        return;
    }

    let activeSlots = [];
    try {
        if (typeof API !== "undefined") {
            const res = await API.reservations.getOccupiedSlots(resourceId, date);
            activeSlots = res.data || [];
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        const allRes = JSON.parse(localStorage.getItem("reservations")) || [];
        activeSlots = allRes.filter(r => (r.resourceId == resourceId || r.resourceId == Number(resourceId)) && r.date === date && r.status === "active");
    }

    if (activeSlots.length === 0) {
        infoDiv.className = "slots-info available";
        infoDiv.innerHTML = "<span>✓</span> All time slots are open for this resource on this date.";
        infoDiv.style.display = "block";
    } else {
        const slotsText = activeSlots.map(r => {
            const startM = parseTimeToMinutes(r.time);
            const endM = startM + Number(r.duration) * 60;
            return `<strong>${r.time} – ${formatMinutesToTime(endM)}</strong>`;
        }).join(", ");

        infoDiv.className = "slots-info occupied";
        infoDiv.innerHTML = `<span>ℹ</span> Already booked slots on this date: ${slotsText}. You can book any other hour!`;
        infoDiv.style.display = "block";
    }
}

function setupDateTimeInputs() {
    const dateInput = document.getElementById("reservationDate");
    const timeInput = document.getElementById("reservationTime");
    if (!dateInput || !timeInput) return;

    const todayStr = getTodayDateString();
    dateInput.min = todayStr;

    if (!dateInput.value || dateInput.value < todayStr) {
        dateInput.value = todayStr;
    }

    function syncTimeConstraints() {
        if (dateInput.value === todayStr) {
            const currentT = getCurrentTimeString();
            timeInput.min = currentT;
            if (timeInput.value && timeInput.value < currentT) {
                timeInput.value = currentT;
            }
        } else {
            timeInput.removeAttribute("min");
        }
        updateResourceSlotsInfo();
    }

    dateInput.onchange = syncTimeConstraints;
    timeInput.onchange = updateResourceSlotsInfo;

    const resSelect = document.getElementById("reservationResource");
    if (resSelect) resSelect.onchange = updateResourceSlotsInfo;

    const durSelect = document.getElementById("reservationDuration");
    if (durSelect) durSelect.onchange = updateResourceSlotsInfo;

    syncTimeConstraints();
}

async function openReservationModal(resourceId = null) {
    try {
        if (typeof API !== "undefined") {
            const res = await API.resources.getAll();
            resources = res.data || [];
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        resources = JSON.parse(localStorage.getItem("resources")) || [];
    }

    const select = document.getElementById("reservationResource");
    select.innerHTML = '<option value="">Select a resource</option>';

    resources.forEach(res => {
        if (res.status !== "Maintenance") {
            const idVal = res._id || res.id;
            select.innerHTML += `<option value="${idVal}">${res.name} (${res.category}) - ${res.location}</option>`;
        }
    });

    if (resourceId) {
        select.value = String(resourceId);
    }

    hideModalMessage();
    setupDateTimeInputs();
    document.getElementById("reservationModal").classList.add("show");
    updateResourceSlotsInfo();
}

function closeReservationModal() {
    document.getElementById("reservationModal").classList.remove("show");
    document.getElementById("reservationForm").reset();
    hideModalMessage();
    const infoDiv = document.getElementById("resourceSlotsInfo");
    if (infoDiv) infoDiv.style.display = "none";
}

// Handle Reservation Form Submit with MongoDB & Express
const reservationForm = document.getElementById("reservationForm");
if (reservationForm) {
    reservationForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const resourceId = document.getElementById("reservationResource").value;
        const date = document.getElementById("reservationDate").value;
        const time = document.getElementById("reservationTime").value;
        const duration = Number(document.getElementById("reservationDuration").value);
        const submitBtn = reservationForm.querySelector("button[type='submit']");

        if (!resourceId) {
            showModalMessage("Please select a resource or seat.", "error");
            return;
        }

        if (!date || !time) {
            showModalMessage("Please select both a date and start time.", "error");
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Confirming...";
        }

        try {
            if (typeof API !== "undefined" && API.getToken()) {
                await API.reservations.create({
                    resourceId,
                    date,
                    time,
                    duration
                });
            } else {
                throw new Error("Offline mode");
            }

            showModalMessage("Reservation confirmed successfully in MongoDB!", "success");
            await displayReservations();

            setTimeout(() => {
                closeReservationModal();
            }, 700);
        } catch (error) {
            const errorMsg = error.message || "Failed to make reservation.";
            const isConflict = error.status === 409 ||
                errorMsg.toLowerCase().includes("conflict") ||
                errorMsg.toLowerCase().includes("already reserved") ||
                errorMsg.toLowerCase().includes("overlap");

            if (isConflict) {
                const resObj = resources.find(r => (r._id == resourceId || r.legacyId == resourceId || r.id == resourceId));
                openConflictModal({
                    resourceId,
                    resourceName: resObj ? resObj.name : `Resource #${resourceId}`,
                    date,
                    time,
                    duration,
                    message: errorMsg
                });
            } else {
                showModalMessage(errorMsg, "error");
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = "Confirm Reservation";
            }
        }
    });
}

// Conflict Modal Logic
let lastConflictData = null;

function openConflictModal(data) {
    lastConflictData = data;
    const modal = document.getElementById("conflictQueueModal");
    if (!modal) return;

    const detailsEl = document.getElementById("conflictModalDetails");
    const nameEl = document.getElementById("conflictResName");
    const timeEl = document.getElementById("conflictDateTime");
    const alertBox = document.getElementById("conflictActionAlert");

    if (detailsEl) detailsEl.textContent = data.message || "This time slot is already reserved by another student.";
    if (nameEl) nameEl.textContent = data.resourceName;
    if (timeEl) timeEl.textContent = `${data.date} at ${data.time} (${data.duration} hr)`;
    if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
    }

    modal.style.display = "flex";
}

function closeConflictModal() {
    const modal = document.getElementById("conflictQueueModal");
    if (modal) modal.style.display = "none";
}

async function confirmJoinQueueFromConflict() {
    if (!lastConflictData) return;
    const btn = document.getElementById("joinConflictQueueBtn");
    const alertBox = document.getElementById("conflictActionAlert");

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Joining Queue...";
    }

    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.queue.join({
                resourceId: lastConflictData.resourceId,
                date: lastConflictData.date,
                time: lastConflictData.time,
                duration: lastConflictData.duration,
                reason: `Conflict on ${lastConflictData.date} slot`,
                priority: currentUser.role === "faculty" ? 3 : 1
            });

            if (alertBox) {
                alertBox.textContent = res.message || `✓ Joined! You are #${res.position} in line.`;
                alertBox.style.background = "#f0fdf4";
                alertBox.style.color = "#15803d";
                alertBox.style.display = "block";
            }

            setTimeout(() => {
                closeConflictModal();
                closeReservationModal();
                window.location.href = "queue.htm";
            }, 1000);
        } else {
            throw new Error("Please log in to join the waiting list.");
        }
    } catch (e) {
        if (alertBox) {
            alertBox.textContent = e.message || "Failed to join queue.";
            alertBox.style.background = "#fef2f2";
            alertBox.style.color = "#b91c1c";
            alertBox.style.display = "block";
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "⚡ Join Waiting List";
        }
    }
}

window.openConflictModal = openConflictModal;
window.closeConflictModal = closeConflictModal;
window.confirmJoinQueueFromConflict = confirmJoinQueueFromConflict;

// Cancel Reservation with MongoDB API
async function cancelReservation(id) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;

    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.reservations.cancel(id);
            alert(res.message || "Reservation cancelled successfully.");
        } else {
            throw new Error("Offline cancel");
        }
    } catch (e) {
        alert(e.message || "Reservation cancelled.");
    }

    displayReservations();
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

// Check URL query parameters (e.g. ?resource=1)
const urlParams = new URLSearchParams(window.location.search);
const selectedRes = urlParams.get("resource");
if (selectedRes) {
    openReservationModal(selectedRes);
}

// Initial render
displayReservations();
