// Resources Management - Connected to MongoDB & Express Backend
const currentUser = typeof API !== "undefined" ? API.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser"));
if (!currentUser) {
    window.location.href = "login.htm";
}

function isAdmin() {
    return currentUser && currentUser.role === "admin";
}

const defaultResources = [
    { id: 1, name: "Study Seat A-101", category: "Seat", location: "Floor 1", description: "Individual study seat near the window.", status: "Available" },
    { id: 2, name: "Study Seat B-204", category: "Seat", location: "Floor 2", description: "Quiet study seat in the silent zone.", status: "Available" },
    { id: 3, name: "Computer PC-05", category: "Computer", location: "Computer Lab", description: "Desktop computer with internet access.", status: "Available" },
    { id: 4, name: "Reference Book - DBMS", category: "Book", location: "Floor 2", description: "Database Management Systems reference book.", status: "Available" },
    { id: 5, name: "Study Room R-03", category: "Room", location: "Floor 3", description: "Private study room suitable for group study.", status: "Available" },
    { id: 6, name: "Projector P-02", category: "Equipment", location: "Floor 3", description: "Projector available for academic presentations.", status: "Available" }
];

let resources = [];

if (currentUser) {
    const navUserName = document.getElementById("navUserName");
    const navUserRole = document.getElementById("navUserRole");
    const userAvatar = document.getElementById("userAvatar");
    if (navUserName) navUserName.textContent = currentUser.name;
    if (navUserRole) navUserRole.textContent = (currentUser.role || "student").toUpperCase();
    if (userAvatar) userAvatar.textContent = (currentUser.name || "U").charAt(0).toUpperCase();
}

function getResourceIcon(category) {
    const icons = { Seat: "💺", Computer: "💻", Book: "📖", Room: "🏫", Equipment: "📽️" };
    return icons[category] || "📚";
}

async function fetchResources() {
    try {
        if (typeof API !== "undefined") {
            const res = await API.resources.getAll();
            resources = res.data || [];
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        resources = JSON.parse(localStorage.getItem("resources")) || defaultResources;
    }
}

async function displayResources() {
    await fetchResources();
    const grid = document.getElementById("resourceGrid");
    if (!grid) return;

    const search = (document.getElementById("searchInput")?.value || "").toLowerCase();
    const category = document.getElementById("categoryFilter")?.value || "all";
    const status = document.getElementById("statusFilter")?.value || "all";

    const filtered = resources.filter(res => {
        const inUse = res.inUse;
        const currentEffectiveStatus = res.status === "Maintenance" ? "Maintenance" : (inUse ? "In Use" : "Available");

        const text = `${res.name} ${res.description || ""} ${res.location}`.toLowerCase();
        const matchesSearch = text.includes(search);
        const matchesCategory = category === "all" || res.category === category;
        const matchesStatus = status === "all" ||
            (status === "Available" && currentEffectiveStatus === "Available") ||
            (status === "Reserved" && currentEffectiveStatus === "In Use") ||
            (status === "Maintenance" && currentEffectiveStatus === "Maintenance");

        return matchesSearch && matchesCategory && matchesStatus;
    });

    const countEl = document.getElementById("resourceCount");
    if (countEl) countEl.textContent = filtered.length;
    grid.innerHTML = "";

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-resources">
                <div class="no-resources-icon">🔎</div>
                <h2>No resources found</h2>
                <p>Try changing your search or filters.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(res => {
        grid.innerHTML += createResourceCard(res);
    });
}

function createResourceCard(res) {
    const isMaintenance = res.status === "Maintenance";
    const inUse = !isMaintenance && res.inUse;
    const resId = res._id || res.id;

    let displayStatus = "Available";
    let statusClass = "available";
    let actionBtn = `<button class="reserve-btn" onclick="reserveResource('${resId}')">Reserve</button>`;

    if (isMaintenance) {
        displayStatus = "Maintenance";
        statusClass = "maintenance";
        actionBtn = `<button class="reserve-btn disabled" disabled style="opacity:0.6; cursor:not-allowed;">Under Maintenance</button>`;
    } else if (inUse) {
        displayStatus = "In Use";
        statusClass = "reserved";
        actionBtn = `<button class="reserve-btn" onclick="reserveResource('${resId}')">Reserve Next Slot</button>
                     <button class="reserve-btn" style="background:#f3f0ff; color:#5736e8; border:1px solid #c4b5fd; margin-top:6px;" onclick="joinWaitingList('${resId}')">⏳ Join Waitlist</button>`;
    }

    const adminBtns = isAdmin()
        ? `<button class="edit-btn" onclick="editResource('${resId}')">Edit</button>
           <button class="delete-btn" onclick="deleteResource('${resId}')">Delete</button>`
        : "";

    return `
        <div class="resource-card">
            <div class="resource-card-top">
                <div class="resource-icon">${getResourceIcon(res.category)}</div>
                <span class="resource-status ${statusClass}">${displayStatus}</span>
            </div>
            <h2>${res.name}</h2>
            <p class="resource-category">${res.category}</p>
            <p class="resource-description">${res.description || ""}</p>
            <div class="resource-details">
                <div class="resource-detail"><span>Location</span><strong>${res.location}</strong></div>
                <div class="resource-detail"><span>Resource ID</span><strong>RES-${res.legacyId || res.id || "0"}</strong></div>
            </div>
            <div class="resource-actions">${actionBtn}${adminBtns}</div>
        </div>
    `;
}

function reserveResource(id) {
    window.location.href = `reservations.htm?resource=${encodeURIComponent(id)}`;
}

function joinWaitingList(id) {
    window.location.href = `queue.htm?resource=${encodeURIComponent(id)}`;
}

window.reserveResource = reserveResource;
window.joinWaitingList = joinWaitingList;

async function deleteResource(id) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
        if (typeof API !== "undefined" && API.getToken()) {
            await API.resources.delete(id);
            alert("Resource deleted successfully from MongoDB.");
            displayResources();
        }
    } catch (e) {
        alert(e.message || "Failed to delete resource.");
    }
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

// Search and filter listeners
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");

if (searchInput) searchInput.addEventListener("input", displayResources);
if (categoryFilter) categoryFilter.addEventListener("change", displayResources);
if (statusFilter) statusFilter.addEventListener("change", displayResources);

// Initial Load
displayResources();
