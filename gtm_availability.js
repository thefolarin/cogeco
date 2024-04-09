(function ($, drupalSettings, sessionStorage, dataLayer) {
  $(document).ready(function () {

    if (!drupalSettings.gtmAvailabilitySettings || !drupalSettings.gtmAvailabilitySettings.scope) {
      return;
    }

    settings = drupalSettings.gtmAvailabilitySettings;
    scope = drupalSettings.gtmAvailabilitySettings.scope;

    initDataLayerSession();
  });

  function getDataLayerSession() {
    return JSON.parse(sessionStorage.getItem(scope));
  }

  function initDataLayerSession() {
    const dataLayerSession = getDataLayerSession();
    if (!dataLayerSession) {
      sessionStorage.setItem(scope, JSON.stringify({}));
    }
  }

})(jQuery, drupalSettings, window.sessionStorage, window.dataLayer);
