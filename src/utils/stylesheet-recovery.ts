/**
 * @fileoverview Inline bootstrap that loads a failed stylesheet again.
 *
 * The CSS reaches the browser as `<link rel="stylesheet">` files, so a page whose connection
 * drops between the HTML and its stylesheets renders as bare HTML. React settles a failed
 * stylesheet like a loaded one and never asks for it again, and the page stays unstyled after
 * the connection is back, until the user reloads. On a cold cache that is every first visit, and
 * the first visit after a deploy, because a new build renames its CSS.
 *
 * It runs as an inline script because the JavaScript chunks fail with the same drop, so code in
 * the bundle never gets to run. React hoists the stylesheets above everything the layout puts in
 * `<head>`, and the parser holds an inline script until every stylesheet before it has settled:
 * by the time this runs, those either loaded or failed, and a failed one has no rules. Stylesheets
 * that fail later, including the ones React adds on a client navigation, are caught by the
 * `error` listener.
 *
 * Kept as plain ES5 in a string, like the other inline scripts of the layouts, so no compiler or
 * minifier sits between this source and the browser.
 */
export const STYLESHEET_RECOVERY_SCRIPT = `(function () {
  if (window.__stylesheetRecovery) return;
  window.__stylesheetRecovery = true;
  var MAX_ATTEMPTS = 5;
  var attempts = {};
  var pending = {};

  function isOwnStylesheet(node) {
    return !!node && node.tagName === 'LINK' && node.rel === 'stylesheet' &&
      /\\/_next\\/static\\//.test(node.href);
  }

  // Chrome gives a failed stylesheet a sheet whose rules throw a SecurityError, even on the same
  // origin; only same-origin files get here, so a throw means the file did not load
  function hasNoRules(link) {
    try {
      return !link.sheet || link.sheet.cssRules.length === 0;
    } catch (error) {
      return true;
    }
  }

  function retry(href) {
    var failed = pending[href];
    if (!failed) return;
    delete pending[href];
    attempts[href] = (attempts[href] || 0) + 1;
    var next = document.createElement('link');
    next.rel = 'stylesheet';
    next.href = href;
    next.setAttribute('data-retry-of', href);
    if (failed.media) next.media = failed.media;
    if (failed.crossOrigin) next.crossOrigin = failed.crossOrigin;
    if (failed.parentNode) failed.parentNode.insertBefore(next, failed.nextSibling);
    else document.head.appendChild(next);
  }

  function schedule(link) {
    var href = link.getAttribute('data-retry-of') || link.href;
    var made = attempts[href] || 0;
    if (pending[href]) return;
    pending[href] = link;
    // out of attempts: it waits for the next reconnect instead of a timer
    if (made >= MAX_ATTEMPTS) return;
    setTimeout(function () {
      // offline the request would fail again: the online listener takes over
      if (navigator.onLine !== false) retry(href);
    }, 500 * Math.pow(2, made));
  }

  document.addEventListener('error', function (event) {
    if (isOwnStylesheet(event.target)) schedule(event.target);
  }, true);

  window.addEventListener('online', function () {
    // failures while offline say nothing about the file, so each one gets a fresh budget
    for (var href in pending) {
      attempts[href] = 0;
      retry(href);
    }
  });

  var self = document.currentScript;
  if (!self) return;
  var links = document.querySelectorAll('link[rel="stylesheet"]');
  for (var i = 0; i < links.length; i++) {
    var settled = links[i].compareDocumentPosition(self) & Node.DOCUMENT_POSITION_FOLLOWING;
    if (settled && isOwnStylesheet(links[i]) && hasNoRules(links[i])) schedule(links[i]);
  }
})();`;
