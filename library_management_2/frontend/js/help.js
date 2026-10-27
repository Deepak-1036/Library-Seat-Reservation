document.addEventListener("DOMContentLoaded", function () {

    const userData = localStorage.getItem("currentUser") || localStorage.getItem("loggedInUser");
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const name = user.name || user.fullName || user.username || "User";
            const role = user.role || "Student";

            const navUserName = document.getElementById("navUserName");
            const navUserRole = document.getElementById("navUserRole");
            const userAvatar = document.getElementById("userAvatar");

            if (navUserName) navUserName.textContent = name;
            if (navUserRole) navUserRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            if (userAvatar) userAvatar.textContent = name.charAt(0).toUpperCase();
        } catch (e) {
            console.error("Error loading user:", e);
        }
    }
});

function toggleFAQ(button) {
    const item = button.parentElement;
    const arrow = button.querySelector(".faq-arrow");
    const isOpen = item.classList.contains("open");

    document.querySelectorAll(".faq-item").forEach(faq => {
        faq.classList.remove("open");
        const faqArrow = faq.querySelector(".faq-arrow");
        if (faqArrow) faqArrow.textContent = "+";
    });

    if (!isOpen) {
        item.classList.add("open");
        if (arrow) arrow.textContent = "−";
    }
}

function searchFAQ() {
    const searchInput = document.getElementById("helpSearch");
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    const items = document.querySelectorAll(".faq-item");

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = query === "" || text.includes(query) ? "block" : "none";
    });
}

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.htm";
}

document.addEventListener("click", function (event) {
    const userProfile = document.querySelector(".user-profile");
    const userMenu = document.getElementById("userMenu");

    if (userMenu && userProfile && !userProfile.contains(event.target) && !userMenu.contains(event.target)) {
        userMenu.classList.remove("show");
    }
});
