// Minimal SCORM 1.2 API wrapper.
// Walks parent and opener windows to find an LMS-provided API object.
(function () {
  function findAPI(win) {
    let depth = 0;
    while (win && win.API == null && win.parent && win.parent !== win && depth < 20) {
      depth++;
      win = win.parent;
    }
    return win ? win.API : null;
  }

  function getAPI() {
    let api = findAPI(window);
    if (!api && window.opener) api = findAPI(window.opener);
    return api;
  }

  const api = getAPI();
  let initialized = false;

  function noop() { return ""; }
  function ok() { return "true"; }

  window.SCORM = {
    available: !!api,
    init() {
      if (!api) return false;
      const r = api.LMSInitialize("");
      initialized = r === "true" || r === true;
      return initialized;
    },
    get(key) {
      if (!api || !initialized) return "";
      return api.LMSGetValue(key);
    },
    set(key, value) {
      if (!api || !initialized) return false;
      return api.LMSSetValue(key, String(value)) === "true";
    },
    commit() {
      if (!api || !initialized) return false;
      return api.LMSCommit("") === "true";
    },
    finish() {
      if (!api || !initialized) return false;
      const r = api.LMSFinish("") === "true";
      initialized = false;
      return r;
    },
  };

  // Surface in case there's no API (standalone preview)
  if (!api) {
    window.SCORM.init = function () { return false; };
    window.SCORM.get = noop;
    window.SCORM.set = function () { return true; };
    window.SCORM.commit = ok;
    window.SCORM.finish = ok;
  }
})();
