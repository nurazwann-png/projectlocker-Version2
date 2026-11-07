export const APPEARANCE_STORAGE_KEY = "locker-appearance";
export const THEME_IDS = ["daylight", "neon", "traditional", "nature", "ocean", "sunset"] as const;

// Inlined in the root layout <head>: applies the saved theme before first paint so it never flashes.
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var a=JSON.parse(localStorage.getItem("${APPEARANCE_STORAGE_KEY}")||"null");var t=${JSON.stringify(THEME_IDS)};var e=document.documentElement;e.setAttribute("data-vtheme",a&&t.indexOf(a.theme)>-1?a.theme:"daylight");if(a&&typeof a.accent==="string"){var m=/^#?([0-9a-f]{6})$/i.exec(a.accent);if(m){var n=parseInt(m[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;e.style.setProperty("--v-c1",a.accent);e.style.setProperty("--v-c1-rgb",r+","+g+","+b);var f=function(c){c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};e.style.setProperty("--v-on-accent",0.2126*f(r)+0.7152*f(g)+0.0722*f(b)>0.45?"#0a0a0f":"#ffffff")}}}catch(x){}})();`;
