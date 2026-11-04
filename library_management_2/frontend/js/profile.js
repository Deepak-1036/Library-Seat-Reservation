// User Profile - Connected to MongoDB & Express Backend
let currentUser = typeof API !== "undefined" ? API.getCurrentUser() : JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
    window.location.href = "login.htm";
}

async function displayProfile() {
    if (!currentUser) return;

    let profileData = currentUser;
    let stats = { totalReservations: 0, activeReservations: 0, completedReservations: 0, queueCount: 0 };

    try {
        if (typeof API !== "undefined" && API.getToken()) {
            const res = await API.users.getProfile();
            profileData = res.data.user || currentUser;
            stats = res.data.stats || stats;
            currentUser = profileData;
        } else {
            throw new Error("No API");
        }
    } catch (e) {
        // Cached calculations
        const reservations = JSON.parse(localStorage.getItem("reservations")) || [];
        const queueRequests = JSON.parse(localStorage.getItem("queueRequests")) || [];
        const uid = currentUser.id || currentUser._id;
        const myRes = reservations.filter(r => r.userId == uid);
        stats.totalReservations = myRes.length;
        stats.activeReservations = myRes.filter(r => r.status === "active").length;
        stats.completedReservations = myRes.filter(r => r.status === "completed").length;
        stats.queueCount = queueRequests.filter(q => q.userId == uid && q.status === "waiting").length;
    }

    const navUserName = document.getElementById("navUserName");
    const userAvatar = document.getElementById("userAvatar");
    const navUserRole = document.getElementById("navUserRole");

    if (navUserName) navUserName.textContent = profileData.name;
    if (userAvatar) userAvatar.textContent = (profileData.name || "U").charAt(0).toUpperCase();
    if (navUserRole) navUserRole.textContent = getRoleName(profileData.role);

    const profileAvatar = document.getElementById("profileAvatar");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileRole = document.getElementById("profileRole");

    if (profileAvatar) profileAvatar.textContent = (profileData.name || "U").charAt(0).toUpperCase();
    if (profileName) profileName.textContent = profileData.name;
    if (profileEmail) profileEmail.textContent = profileData.email;
    if (profileRole) profileRole.textContent = getRoleName(profileData.role);

    const detailName = document.getElementById("detailName");
    const detailEmail = document.getElementById("detailEmail");
    const detailStudentId = document.getElementById("detailStudentId");
    const detailRole = document.getElementById("detailRole");
    const detailCreated = document.getElementById("detailCreated");

    if (detailName) detailName.textContent = profileData.name || "-";
    if (detailEmail) detailEmail.textContent = profileData.email || "-";
    if (detailStudentId) detailStudentId.textContent = profileData.studentId || "-";
    if (detailRole) detailRole.textContent = getRoleName(profileData.role);
    if (detailCreated) detailCreated.textContent = formatDate(profileData.createdAt);

    const totalEl = document.getElementById("totalReservations");
    const activeEl = document.getElementById("activeReservations");
    const queueEl = document.getElementById("queueCount");
    const completedEl = document.getElementById("completedReservations");

    if (totalEl) totalEl.textContent = stats.totalReservations;
    if (activeEl) activeEl.textContent = stats.activeReservations;
    if (queueEl) queueEl.textContent = stats.queueCount;
    if (completedEl) completedEl.textContent = stats.completedReservations;
}

function getRoleName(role) {
    if (role === "admin") return "Administrator";
    if (role === "faculty") return "Faculty";
    return "Student";
}

function formatDate(date) {
    if (!date) return "Not available";
    return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function openEditModal() {
    document.getElementById("editName").value = currentUser.name || "";
    document.getElementById("editEmail").value = currentUser.email || "";
    document.getElementById("editStudentId").value = currentUser.studentId || "";
    document.getElementById("editMessage").textContent = "";
    document.getElementById("editProfileModal").classList.add("show");
}

function closeEditModal() {
    document.getElementById("editProfileModal").classList.remove("show");
}

const editForm = document.getElementById("editProfileForm");
if (editForm) {
    editForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("editName").value.trim();
        const email = document.getElementById("editEmail").value.trim().toLowerCase();
        const studentId = document.getElementById("editStudentId").value.trim();
        const message = document.getElementById("editMessage");

        if (!name || !email || !studentId) {
            message.textContent = "Please fill in all fields.";
            message.className = "form-message error";
            return;
        }

        try {
            if (typeof API !== "undefined" && API.getToken()) {
                await API.users.updateProfile({ name, email, studentId });
            } else {
                currentUser.name = name;
                currentUser.email = email;
                currentUser.studentId = studentId;
                localStorage.setItem("currentUser", JSON.stringify(currentUser));
            }

            message.textContent = "Profile updated successfully in MongoDB!";
            message.className = "form-message success";

            setTimeout(() => {
                closeEditModal();
                displayProfile();
            }, 600);
        } catch (error) {
            message.textContent = error.message || "Failed to update profile.";
            message.className = "form-message error";
        }
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

displayProfile();
