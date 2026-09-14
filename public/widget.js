(function() {
  // Prevent duplicate execution
  if (window.__stavbacore_widget_loaded) return;
  window.__stavbacore_widget_loaded = true;

  // 1. Identify the loader script tag to read attributes
  var script = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i];
      if (s.src && (s.src.indexOf('widget.js') !== -1 || s.getAttribute('data-org'))) {
        return s;
      }
    }
  })();

  if (!script) {
    console.error('StavbaCore Widget: Loader script not found.');
    return;
  }

  // 2. Parse multi-tenant arguments
  var orgId = script.getAttribute('data-org');
  if (!orgId) {
    console.error('StavbaCore Widget: Missing data-org attribute.');
    return;
  }

  var btnColor = script.getAttribute('data-color') || '#2563eb';
  var btnText = script.getAttribute('data-btn-text') || 'Poptat nabídku';
  var position = script.getAttribute('data-position') || 'bottom-right';

  // Determine root host URL dynamically from script source
  var scriptSrc = script.src;
  var rootUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  // Ensure we fall back to window.location.origin if script src is relative or missing origin
  if (!rootUrl || rootUrl.indexOf('http') === -1) {
    rootUrl = window.location.origin;
  }

  // 3. Create the iframe element (hidden by default)
  var iframe = document.createElement('iframe');
  iframe.src = rootUrl + '/widget-iframe?org=' + encodeURIComponent(orgId) + '&color=' + encodeURIComponent(btnColor);
  iframe.id = 'stavbacore-widget-iframe';
  iframe.style.position = 'fixed';
  iframe.style.zIndex = '2147483647'; // Maximum possible z-index
  iframe.style.border = 'none';
  iframe.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.15)';
  iframe.style.display = 'none';
  iframe.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  iframe.style.opacity = '0';
  iframe.style.transform = 'translateY(15px)';

  // Responsive styling calculation
  function resizeIframe() {
    if (window.innerWidth < 640) {
      // Mobile full screen
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100vh';
      iframe.style.borderRadius = '0';
    } else {
      // Desktop compact overlay
      iframe.style.top = 'auto';
      iframe.style.bottom = '94px';
      iframe.style.height = '600px';
      iframe.style.width = '420px';
      iframe.style.borderRadius = '20px';
      if (position === 'bottom-left') {
        iframe.style.left = '24px';
        iframe.style.right = 'auto';
      } else {
        iframe.style.right = '24px';
        iframe.style.left = 'auto';
      }
    }
  }

  resizeIframe();
  window.addEventListener('resize', resizeIframe);
  document.body.appendChild(iframe);

  // 4. Create floating action button container & button
  var btnContainer = document.createElement('div');
  btnContainer.id = 'demofactory-widget-button-container';
  btnContainer.style.position = 'fixed';
  btnContainer.style.zIndex = '2147483647';
  btnContainer.style.bottom = '24px';
  if (position === 'bottom-left') {
    btnContainer.style.left = '24px';
    btnContainer.style.right = 'auto';
  } else {
    btnContainer.style.right = '24px';
    btnContainer.style.left = 'auto';
  }

  var button = document.createElement('button');
  button.style.backgroundColor = btnColor;
  button.style.color = '#ffffff';
  button.style.border = '1px solid rgba(255, 255, 255, 0.1)';
  button.style.borderRadius = '9999px';
  button.style.padding = '12px 24px';
  button.style.fontSize = '13px';
  button.style.fontWeight = '800';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '8px';
  button.style.transition = 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s';
  button.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  button.style.outline = 'none';

  // SVG Sparkles Icon & Label
  var sparklesIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>';
  var closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12/></svg>';

  button.innerHTML = sparklesIcon + '<span>' + btnText + '</span>';

  button.onmouseover = function() { button.style.transform = 'scale(1.04)'; };
  button.onmouseout = function() { button.style.transform = 'scale(1)'; };

  btnContainer.appendChild(button);
  document.body.appendChild(btnContainer);

  // 5. Open & Close state management
  var isOpen = false;

  function toggleWidget() {
    isOpen = !isOpen;
    if (isOpen) {
      // Open Widget
      iframe.style.display = 'block';
      // Force trigger DOM reflow for animations to compile nicely
      iframe.offsetHeight;
      iframe.style.opacity = '1';
      iframe.style.transform = 'translateY(0)';
      button.innerHTML = closeIcon + '<span>Zavřít</span>';
      button.style.backgroundColor = '#1e293b'; // Slate 800 dark mode fallback
    } else {
      // Close Widget
      iframe.style.opacity = '0';
      iframe.style.transform = 'translateY(15px)';
      button.innerHTML = sparklesIcon + '<span>' + btnText + '</span>';
      button.style.backgroundColor = btnColor;
      setTimeout(function() {
        if (!isOpen) iframe.style.display = 'none';
      }, 250);
    }
  }

  button.onclick = toggleWidget;

  // 6. Listen for iframe postMessage callbacks
  window.addEventListener('message', function(event) {
    if (event.data === 'demofactory-widget-close') {
      if (isOpen) toggleWidget();
    }
  });

})();
