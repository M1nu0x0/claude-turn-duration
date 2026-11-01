(() => {
  // Runs in <head>, before the page is drawn, so a redirect never shows one page and then another.
  // ?lang= (links to the old single page) goes to that language's page. / goes to the language the
  // visitor chose on this site before, unless they came from another page of this site, which is
  // someone choosing English (also in a new tab, where the link's click handler does not run). A
  // language page opened directly stays as it is, and nothing is guessed from the browser language:
  // runtime.js offers that language at the bottom of the page instead.
  const pages = JSON.parse(document.currentScript.dataset.pages);
  for (const l in pages) pages[l] = new URL(pages[l], location.href).href;
  const known = l => Object.hasOwn(pages, l);
  const here = document.documentElement.lang;
  let want = new URLSearchParams(location.search).get('lang');
  if (!(want && known(want)) && here === 'en') {
    let fromSite = false, saved = null;
    try { fromSite = new URL(document.referrer).href.startsWith(pages.en); } catch {}
    try { saved = localStorage.getItem('lang'); } catch {}
    want = fromSite ? null : saved;
  }
  if (want && known(want) && want !== here) location.replace(pages[want] + location.hash);
})();
