const currentUser = JSON.parse(localStorage.getItem("currentUser"));
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
    { id: 4, name: "Reference Book - DBMS", category: "Book", location: "Floor 2", description: "Database Management Systems reference book.", status: "Reserved" },
    { id: 5, name: "Study Room R-03", category: "Room", location: "Floor 3", description: "Private study room suitable for group study.", status: "Available" },
    { id: 6, name: "Projector P-02", category: "Equipment", location: "Floor 3", description: "Projector available for academic presentations.", status: "Available" }
];

let resources = JSON.parse(localStorage.getItem("resources"));
if (!resources || resources.length === 0) {
    resources = defaultResources;
    localStorage.setItem("resources", JSON.stringify(resources));
}

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

function displayResources() {
    const grid = document.getElementById("resourceGrid");
    if (!grid) return;

    const search = document.getElementById("searchInput").value.toLowerCase();
    const category = document.getElementById("categoryFilter").value;
    const status = document.getElementById("statusFilter").value;

    const filtered = resources.filter(res => {
        const text = `${res.name} ${res.description} ${res.location}`.toLowerCase();
        const matchesSearch = text.includes(search);
        const matchesCategory = category === "all" || res.category === category;
        const matchesStatus = status === "all" || res.status === status;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    document.getElementById("resourceCount").textContent = filtered.length;
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
    const isAvail = res.status === "Available";
    const statusClass = isAvail ? "available" : "reserved";
    const actionBtn = isAvail
        ? `<button class="reserve-btn" onclick="reserveResource(${res.id})">Reserve</button>`
        : `<button class="reserve-btn" onclick="reserveResource(${res.id})">Join Queue</button>`;

    const adminBtns = isAdmin()
        ? `<button class="edit-btn" onclick="editResource(${res.id})">Edit</button>
           <button class="delete-btn" onclick="deleteResource(${res.id})">Delete</button>`
        : "";

    return `
        <div class="resource-card">
            <div class="resource-card-top">
                <div class="resource-icon">${getResourceIcon(res.category)}</div>
                <span class="resource-status ${statusClass}">${res.status}</span>
            </div>
            <h2>${res.name}</h2>
            <p class="resource-category">${res.category}</p>
            <p class="resource-description">${res.description}</p>
            <div class="resource-details">
                <div class="resource-detail"><span>Location</span><strong>${res.location}</strong></div>
                <div class="resource-detail"><span>Resource ID</span><strong>RES-${res.id}</strong></div>
            </div>
            <div class="resource-actions">${actionBtn}${adminBtns}</div>
        </div>
    `;
}

function openAddModal() {
    if (!isAdmin()) return alert("Only administrators can add resources.");
    document.getElementById("modalTitle").textContent = "Add Resource";
    document.getElementById("resourceForm").reset();
    document.getElementById("resourceId").value = "";
    document.getElementById("resourceModal").classList.add("show");
}

function closeModal() {
    document.getElementById("resourceModal").classList.remove("show");
}

function editResource(id) {
    if (!isAdmin()) return alert("Only administrators can edit resources.");
    const res = resources.find(r => r.id === id);
    if (!res) return;

    document.getElementById("modalTitle").textContent = "Edit Resource";
    document.getElementById("resourceId").value = res.id;
    document.getElementById("resourceName").value = res.name;
    document.getElementById("resourceCategory").value = res.category;
    document.getElementById("resourceLocation").value = res.location;
    document.getElementById("resourceDescription").value = res.description;
    document.getElementById("resourceStatus").value = res.status;
    document.getElementById("resourceModal").classList.add("show");
}

document.getElementById("resourceForm").addEventListener("submit", function (event) {
    event.preventDefault();
    if (!isAdmin()) return closeModal();

    const id = document.getElementById("resourceId").value;
    const name = document.getElementById("resourceName").value.trim();
    const category = document.getElementById("resourceCategory").value;
    const location = document.getElementById("resourceLocation").value.trim();
    const description = document.getElementById("resourceDescription").value.trim();
    const status = document.getElementById("resourceStatus").value;

    if (id) {
        const index = resources.findIndex(r => r.id == id);
        if (index !== -1) {
            resources[index] = { ...resources[index], name, category, location, description, status };
        }
    } else {
        resources.push({ id: Date.now(), name, category, location, description, status });
    }

    localStorage.setItem("resources", JSON.stringify(resources));
    closeModal();
    displayResources();
});

function deleteResource(id) {
    if (!isAdmin()) return alert("Only administrators can delete resources.");
    const res = resources.find(r => r.id === id);
    if (!res || !confirm(`Are you sure you want to delete "${res.name}"?`)) return;

    resources = resources.filter(r => r.id !== id);
    localStorage.setItem("resources", JSON.stringify(resources));
    displayResources();
}

function reserveResource(id) {
    const res = resources.find(r => r.id === id);
    if (!res) return;

    if (res.status === "Available") {
        window.location.href = "reservations.htm?resource=" + id;
        return;
    }

    if (!confirm(`${res.name} is currently reserved.\n\nWould you like to join the priority queue?`)) return;

    const date = prompt("Enter requested date (YYYY-MM-DD):");
    const time = prompt("Enter requested time (HH:MM):");
    if (!date || !time) return;

    let queueRequests = JSON.parse(localStorage.getItem("queueRequests")) || [];
    const alreadyWaiting = queueRequests.some(q => q.userId === currentUser.id && q.resourceId === res.id && q.status === "waiting");

    if (alreadyWaiting) {
        alert("You are already waiting for this resource.");
        return;
    }

    const priority = (currentUser.role === "faculty" || currentUser.role === "admin") ? 3 : 1;
    queueRequests.push({
        id: Date.now(),
        userId: currentUser.id,
        userName: currentUser.name,
        resourceId: res.id,
        resourceName: res.name,
        category: res.category,
        location: res.location,
        requestedDate: date,
        requestedTime: time,
        priority: priority,
        createdAt: Date.now(),
        status: "waiting"
    });

    localStorage.setItem("queueRequests", JSON.stringify(queueRequests));
    alert("You have joined the priority queue!");
    window.location.href = "queue.htm";
}

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

function logout() {
    localStorage.removeItem("currentUser");
    window.location.href = "index.htm";
}

displayResources();

const addBtn = document.getElementById("addResourceBtn");
if (addBtn && !isAdmin()) addBtn.style.display = "none";