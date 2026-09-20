// Security headers (helmet) with a CSP that fits both public/index.html and
// public/admin.html. Every allowance below is required by something on a page:
//
//   script-src   'self'                     /js/main.js, /js/admin.js
//                SORTABLE                   admin drag-and-drop (exact file, SRI-pinned)
//   style-src    'self'                     /css/style.css, /css/admin.css
//                fonts.googleapis.com       Inter + Fira Code stylesheets
//                FONT_AWESOME               Font Awesome stylesheet (icons on both pages)
//   style-src-attr 'unsafe-inline'          ~23 style="…" attributes in index.html
//                                           (layering/z-index + link markup). Inline <style>
//                                           blocks and scripts stay blocked; these attributes
//                                           are the only inline CSS left and should become
//                                           classes later.
//   font-src     'self', fonts.gstatic.com, FONT_AWESOME webfonts
//   img-src      'self' data:               no images yet; data: keeps favicons/inline SVG safe
//   connect-src  'self'                     fetch() to our own API only
//   frame-ancestors 'none', object-src 'none', base-uri 'self', form-action 'self'
//   script-src-attr 'none'                  no inline event handlers anywhere
//
// upgrade-insecure-requests and HSTS are production-only: on http://localhost they
// would break local development.
const helmet = require('helmet');

const SORTABLE     = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.7/Sortable.min.js';
const FONT_AWESOME = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/';
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com';

function cspDirectives(isProduction) {
  const directives = {
    defaultSrc:     ["'self'"],
    scriptSrc:      ["'self'", SORTABLE],
    scriptSrcAttr:  ["'none'"],
    styleSrc:       ["'self'", GOOGLE_FONTS_CSS, FONT_AWESOME],
    styleSrcAttr:   ["'unsafe-inline'"],
    fontSrc:        ["'self'", GOOGLE_FONTS_FILES, `${FONT_AWESOME}webfonts/`],
    imgSrc:         ["'self'", 'data:'],
    connectSrc:     ["'self'"],
    objectSrc:      ["'none'"],
    baseUri:        ["'self'"],
    formAction:     ["'self'"],
    frameAncestors: ["'none'"]
  };
  if (isProduction) directives.upgradeInsecureRequests = [];
  return directives;
}

module.exports = function securityHeaders() {
  const isProduction = process.env.NODE_ENV === 'production';
  return helmet({
    contentSecurityPolicy: { useDefaults: false, directives: cspDirectives(isProduction) },
    // Keep same-origin Referer so the CSRF check has a fallback when Origin is absent.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false   // would block the CDN stylesheet/script
  });
};

module.exports.SOURCES = { SORTABLE, FONT_AWESOME, GOOGLE_FONTS_CSS, GOOGLE_FONTS_FILES };
module.exports.cspDirectives = cspDirectives;
