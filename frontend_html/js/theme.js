window.initializeTheme = function () {

    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    const saved = localStorage.getItem("theme");

    if (saved === "light") {
        document.body.classList.add("light-theme");
        toggle.innerHTML = '<i data-lucide="sun"></i>';
    } else {
        toggle.innerHTML = '<i data-lucide="moon"></i>';
    }

    if (window.lucide) lucide.createIcons();

    toggle.onclick = () => {

        document.body.classList.toggle("light-theme");

        if (document.body.classList.contains("light-theme")) {
            localStorage.setItem("theme", "light");
            toggle.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            localStorage.setItem("theme", "dark");
            toggle.innerHTML = '<i data-lucide="moon"></i>';
        }

        if (window.lucide) lucide.createIcons();
    };
};
