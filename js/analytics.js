/**
 * Messung der Profilseite. Geladen wird diese Datei erst nach der Einwilligung:
 * BaseHead bindet sie mit type="text/plain" und data-usercentrics ein.
 *
 * Bewusst klein. Die Unternehmensseite misst Termine, Produkte, Suche, Formular
 * und Artikel - nichts davon gibt es hier. Geblieben sind drei Ereignisse:
 * campaign_landing, site_link_click und contact_click.
 *
 * Der Einwilligungsblock bis einschliesslich gtag("config", ...) ist zeichengleich
 * mit dem der Unternehmensseite. tests/analytics.test.mjs haelt beide gleich.
 */
window.dataLayer = window.dataLayer || [];
const currentPagePath = window.location.pathname || "/";
const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
const canonicalPath = new URL(canonicalUrl, window.location.origin).pathname || currentPagePath;
const pagePath = canonicalPath;

function gtag() {
  window.dataLayer.push(arguments);
}

gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
});

gtag("consent", "update", {
  analytics_storage: "granted",
});

// Die Mess-ID steht nur in site.config.mjs. Von dort schreibt BaseHead sie in den
// gtag-Loader daneben; hier wird sie ausgelesen, damit sie nicht doppelt gepflegt wird.
const gtagLoader = document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
const measurementId = gtagLoader ? new URL(gtagLoader.src, window.location.origin).searchParams.get("id") : null;

if (measurementId) {
  gtag("js", new Date());
  gtag("config", measurementId, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: canonicalUrl,
    page_path: pagePath,
  });
}

function conciseText(value, maximumLength = 100) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maximumLength);
}

function trackEvent(name, parameters = {}) {
  gtag("event", name, {
    page_path: pagePath,
    ...parameters,
  });
}

const campaignParameters = new URLSearchParams(window.location.search);
const campaignSource = conciseText(campaignParameters.get("utm_source"));
const campaignMedium = conciseText(campaignParameters.get("utm_medium"));
const campaignName = conciseText(campaignParameters.get("utm_campaign"));
const campaignContent = conciseText(campaignParameters.get("utm_content"));

if (campaignSource && campaignMedium && campaignName) {
  trackEvent("campaign_landing", {
    campaign_source: campaignSource,
    campaign_medium: campaignMedium,
    campaign_name: campaignName,
    campaign_content: campaignContent,
  });
}

// Wo auf der Seite der Link stand. Die Haken sind dieselben wie auf der
// Unternehmensseite, nur ohne die dort eigenen Bereiche (Suche, Artikel, Teilen).
function linkLocation(link) {
  if (link.closest(".cta, .hero-actions")) return "cta";
  if (link.closest(".desktop-nav")) return "desktop_navigation";
  if (link.closest(".mobile-nav")) return "mobile_navigation";
  if (link.closest(".site-header")) return "header";
  if (link.closest(".site-footer")) return "footer";
  return "content";
}

function linkType(link, targetUrl) {
  const rawHref = link.getAttribute("href") || "";
  const isSamePageAnchor = targetUrl.origin === window.location.origin
    && targetUrl.pathname === window.location.pathname
    && targetUrl.search === window.location.search
    && Boolean(targetUrl.hash);

  if (rawHref.startsWith("#") || isSamePageAnchor) return "anchor";
  if (targetUrl.protocol === "mailto:") return "email";
  if (targetUrl.protocol === "tel:") return "phone";
  if (link.hasAttribute("download") || /\.(pdf|docx?|xlsx?|csv|zip)$/i.test(targetUrl.pathname)) return "download";
  if (targetUrl.origin === window.location.origin) return "internal";
  if (["http:", "https:"].includes(targetUrl.protocol)) return "outbound";
  return "other";
}

// E-Mail-Adressen und Telefonnummern landen nie in einem Parameter.
function reportableLinkUrl(targetUrl, type) {
  if (type === "email") return "mailto:";
  if (type === "phone") return "tel:";
  if (["http:", "https:"].includes(targetUrl.protocol)) {
    return `${targetUrl.origin}${targetUrl.pathname}${targetUrl.hash}`;
  }
  return targetUrl.protocol;
}

function reportableLinkText(link, type) {
  if (type === "email") return "email_link";
  if (type === "phone") return "phone_link";

  return conciseText(
    link.dataset.analyticsLabel
      || link.getAttribute("aria-label")
      || link.textContent
      || link.querySelector("img")?.alt
      || link.title
      || "unlabeled_link",
    150,
  );
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const target = event.target.closest("a");
  if (!(target instanceof HTMLAnchorElement)) return;

  const href = target.getAttribute("href") || "";
  const location = linkLocation(target);

  let linkUrl;
  try {
    linkUrl = new URL(target.href, window.location.href);
  } catch {
    return;
  }

  const type = linkType(target, linkUrl);

  // site_link_domain traegt die eigentliche Frage dieser Seite: Wie viele
  // Besucher gehen von hier auf byteundhandwerk.de weiter?
  trackEvent("site_link_click", {
    site_link_url: reportableLinkUrl(linkUrl, type),
    site_link_text: reportableLinkText(target, type),
    site_link_domain: linkUrl.hostname || linkUrl.protocol.replace(":", ""),
    site_link_type: type,
    site_link_location: location,
  });

  if (href.startsWith("tel:")) {
    trackEvent("contact_click", { contact_method: "phone", link_location: location });
    return;
  }

  if (href.startsWith("mailto:")) {
    trackEvent("contact_click", { contact_method: "email", link_location: location });
  }
});
