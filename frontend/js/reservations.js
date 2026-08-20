const currentUser = JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "login.htm";
}

let resources = JSON.parse(localStorage.getItem("resources")) || [];
let reservations = JSON.parse(localStorage.getItem("reservations")) || [];

if (currentUser) {
    const navUserName = document.getElementById("navUserName");
    const userAvatar = document.getElementById("userAvatar");
    if (navUserName) navUserName.textContent = currentUser.name;
    if (userAvatar) userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
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
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function displayReservations() {
    const container = document.getElementById("reservationsContainer");
    const search = (document.getElementById("reservationSearch")?.value || "").toLowerCase();
    const filter = document.getElementById("reservationFilter")?.value || "all";

    const myReservations = reservations.filter(r => r.userId === currentUser.id);

    const filtered = myReservations.filter(r => {
        const text = `${r.resourceName} ${r.category} ${r.location}`.toLowerCase();
        const matchesSearch = text.includes(search);
        const matchesFilter = filter === "all" || r.status === filter;
        return matchesSearch && matchesFilter;
    });

    updateStatistics(myReservations);
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

    filtered.slice().reverse().forEach(res => {
        container.innerHTML += createReservationCard(res);
    });
}

function updateStatistics(list) {
    const total = list.length;
    const active = list.filter(r => r.status === "active").length;
    const pending = list.filter(r => r.status === "pending").length;
    const completed = list.filter(r => r.status === "completed").length;

    document.getElementById("totalReservations").textContent = total;
    document.getElementById("activeReservations").textContent = active;
    document.getElementById("pendingReservations").textContent = pending;
    document.getElementById("completedReservations").textContent = completed;
}

function createReservationCard(res) {
    const canCancel = res.status === "active" || res.status === "pending";
    return `
        <div class="reservation-card">
            <div class="reservation-icon">${getResourceIcon(res.category)}</div>
            <div class="reservation-main">
                <h2>${res.resourceName}</h2>
                <p class="category">${res.category}</p>
                <div class="reservation-details">
                    <span>📅 ${res.date}</span>
                    <span>🕐 ${res.time}</span>
                    <span>⏱ ${res.duration} hour(s)</span>
                    <span>📍 ${res.location}</span>
                </div>
            </div>
            <div class="reservation-right">
                <span class="reservation-status ${getStatusClass(res.status)}">${capitalize(res.status)}</span>
                ${canCancel ? `<button class="cancel-reservation-btn" onclick="cancelReservation(${res.id})">Cancel</button>` : ""}
            </div>
        </div>
    `;
}

function openReservationModal(resourceId = null) {
    resources = JSON.parse(localStorage.getItem("resources")) || [];
    const select = document.getElementById("reservationResource");
    select.innerHTML = '<option value="">Select a resource</option>';

    resources.forEach(res => {
        if (res.status === "Available") {
            select.innerHTML += `<option value="${res.id}">${res.name} - ${res.location}</option>`;
        }
    });

    if (resourceId) select.value = resourceId;
    document.getElementById("reservationModal").classList.add("show");
}

function closeReservationModal() {
    document.getElementById("reservationModal").classList.remove("show");
    document.getElementById("reservationForm").reset();
}

document.getElementById("reservationForm").addEventListener("submit", function (event) {
    event.preventDefault();

    resources = JSON.parse(localStorage.getItem("resources")) || [];
    reservations = JSON.parse(localStorage.getItem("reservations")) || [];

    const resourceId = Number(document.getElementById("reservationResource").value);
    const date = document.getElementById("reservationDate").value;
    const time = document.getElementById("reservationTime").value;
    const duration = document.getElementById("reservationDuration").value;

    const resource = resources.find(item => item.id === resourceId);
    if (!resource || resource.status !== "Available") {
        alert("Selected resource is unavailable. Please join the queue.");
        closeReservationModal();
        return;
    }

    const newReservation = {
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        resourceId: resource.id,
        resourceName: resource.name,
        category: resource.category,
        location: resource.location,
        date: date,
        time: time,
        duration: duration,
        status: "active",
        createdAt: new Date().toISOString()
    };

    reservations.push(newReservation);
    localStorage.setItem("reservations", JSON.stringify(reservations));

    const resIdx = resources.findIndex(item => item.id === resourceId);
    if (resIdx !== -1) {
        resources[resIdx].status = "Reserved";
        localStorage.setItem("resources", JSON.stringify(resources));
    }

    closeReservationModal();
    displayReservations();
    alert("Reservation created successfully!");
});

function cancelReservation(id) {
    const reservation = reservations.find(item => item.id === id);
    if (!reservation || reservation.userId !== currentUser.id) return;

    if (!confirm("Are you sure you want to cancel this reservation?")) return;

    reservation.status = "cancelled";
    let queueRequests = JSON.parse(localStorage.getItem("queueRequests")) || [];
    const waitingUsers = queueRequests.filter(q => q.resourceId === reservation.resourceId && q.status === "waiting");

    if (waitingUsers.length === 0) {
        const resIdx = resources.findIndex(r => r.id === reservation.resourceId);
        if (resIdx !== -1) resources[resIdx].status = "Available";
    } else {
        waitingUsers.sort((a, b) => (a.priority !== b.priority ? b.priority - a.priority : a.createdAt - b.createdAt));
        const nextUser = waitingUsers[0];

        reservations.push({
            id: Date.now(),
            userId: nextUser.userId,
            userName: nextUser.userName,
            resourceId: reservation.resourceId,
            resourceName: reservation.resourceName,
            category: reservation.category,
            location: reservation.location,
            date: nextUser.requestedDate,
            time: nextUser.requestedTime,
            duration: 1,
            status: "active",
            createdAt: new Date().toISOString(),
            fromQueue: true
        });

        const qIdx = queueRequests.findIndex(q => q.id === nextUser.id);
        if (qIdx !== -1) queueRequests[qIdx].status = "served";
    }

    localStorage.setItem("reservations", JSON.stringify(reservations));
    localStorage.setItem("resources", JSON.stringify(resources));
    localStorage.setItem("queueRequests", JSON.stringify(queueRequests));

    displayReservations();
    alert("Reservation cancelled successfully.");
}

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.htm";
}

const urlParams = new URLSearchParams(window.location.search);
const selectedRes = urlParams.get("resource");
if (selectedRes) openReservationModal(Number(selectedRes));

displayReservations();