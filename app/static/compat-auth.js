(function(){
  // Compatibility helper to ensure the login inputs are inside a form.
  // Some browsers warn when a password input isn't inside a form — this wraps
  // the injected auth markup in a <form id="login-form"> and hooks submit.
  function attach() {
    const area = document.getElementById('auth-form-area');
    if (!area) return false;
    // If already wrapped, attach the handler and stop
    if (area.querySelector('#login-form')) {
      const existing = document.getElementById('login-form');
      if (existing && !existing._authHandlerAttached) {
        existing.addEventListener('submit', function(e){
          e.preventDefault();
          if (typeof window.__doLogin === 'function') window.__doLogin();
        });
        existing._authHandlerAttached = true;
      }
      return true;
    }
    // If the login inputs are present, wrap them in a form
    if (area.querySelector('#login-password') || area.querySelector('#login-email')) {
      area.innerHTML = '<form id="login-form">' + area.innerHTML + '</form>';
      const form = document.getElementById('login-form');
      if (form) {
        form.addEventListener('submit', function(e){
          e.preventDefault();
          if (typeof window.__doLogin === 'function') window.__doLogin();
        });
        form._authHandlerAttached = true;
      }
      return true;
    }
    return false;
  }

  // Try immediately in case the auth UI is already rendered
  attach();

  // Observe DOM changes and attach when the auth area appears/changes
  const observer = new MutationObserver(() => {
    attach();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
