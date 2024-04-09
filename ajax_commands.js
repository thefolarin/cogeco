(function ($, Drupal) {
  Drupal.AjaxCommands.prototype.addGAEvent = function(ajax, response, status){
    if (dataLayer !== undefined) {

      // Set string undefined to type undefined
      for (var key in response.data) {
        if (response.data.hasOwnProperty(key)) {
            if (response.data[key] === 'undefined') {
              response.data[key] = undefined;
            }
        }
      }

      dataLayer.push(response.data);
    }
  };

  Drupal.AjaxCommands.prototype.fancyBox = function (ajax, response, status) {
    let fancyboxSettings = response.fancybox_settings;
    
    fancyboxSettings.afterLoad = function (instance, current) {
      let modalTitle = current.title;
      let modalId = modalTitle.replace(/ /g,"-").toLowerCase();
    
      instance.$refs.container.attr('aria-labelledby', 'modal-' + modalId);
      instance.$refs.container.find('.title').attr('id', 'modal-' + modalId);
    };
    
    fancyboxSettings.afterShow = function () {
      $('.close-button').focus();
    };

    fancyboxSettings.beforeShow = function() {
      response.command = 'insert';
      response.method = 'html';
      ajax.commands.insert(ajax, response, status);
    };

    fancyboxSettings.content = '-';

    $.fancybox.open(fancyboxSettings);
  }

})(jQuery, Drupal);
