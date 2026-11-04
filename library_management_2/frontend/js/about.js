const currentUser = JSON.parse(localStorage.getItem("currentUser"));

function toggleUserMenu() {
    const menu = document.getElementById("userMenu");
    if (menu) menu.classList.toggle("show");
}

function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.htm";
}
