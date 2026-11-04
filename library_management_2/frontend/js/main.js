function toggleMenu() {
    const nav = document.querySelector(".nav-links");
    if (nav) nav.classList.toggle("show");
}

function togglemenu() {
    toggleMenu();
}

function logoutMain() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("loggedInUser");
    window.location.reload();
}

// Update public navbar and action buttons if already logged in
document.addEventListener("DOMContentLoaded", function () {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || localStorage.getItem("loggedInUser"));
    if (!currentUser) return;

    const navAuth = document.getElementById("navAuthButtons");
    if (navAuth) {
        navAuth.innerHTML = `
            <a href="dashboard.htm" class="login-btn">Dashboard</a>
            <button onclick="logoutMain()" class="register-btn" style="background:#5736e8; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">Logout</button>
        `;
    }

    const heroAuth = document.getElementById("heroAuthButtons");
    if (heroAuth) {
        heroAuth.innerHTML = `
            <a href="dashboard.htm" class="primary-btn">Go to Dashboard →</a>
            <a href="resources.htm" class="secondary-btn">Reserve a Seat</a>
        `;
    }

    const ctaAuth = document.getElementById("ctaAuthButtons");
    if (ctaAuth) {
        ctaAuth.innerHTML = `
            <a href="dashboard.htm" class="primary-btn">Go to Dashboard</a>
            <a href="reservations.htm" class="secondary-btn">My Reservations</a>
        `;
    }
});
