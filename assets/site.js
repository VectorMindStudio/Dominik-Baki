const navigationToggle = document.querySelector("[data-nav-toggle]");
const mobileNavigation = document.querySelector("[data-mobile-nav]");

function setNavigation(open) {
  if (!navigationToggle || !mobileNavigation) return;
  navigationToggle.setAttribute("aria-expanded", String(open));
  mobileNavigation.classList.toggle("is-open", open);
  mobileNavigation.setAttribute("aria-hidden", String(!open));
  document.body.classList.toggle("nav-open", open);
}

navigationToggle?.addEventListener("click", () => {
  setNavigation(navigationToggle.getAttribute("aria-expanded") !== "true");
});

mobileNavigation?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setNavigation(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setNavigation(false);
});

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});
