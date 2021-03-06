/**
 * Login form.
 *
 * @copyright (c) 2017 Passbolt SARL
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */

$(function () {

  var $loginSubmit = null,
    $username = null,
    $masterPassword = null,
    $loginMessage = null,
    rememberMePlugin = false,
    $rememberMe = null;

  /**
   * Initialize the master password dialog.
   */
  var init = function () {
      // Load the page template.
      loadTemplate()
      // Init the security token.
      .then(initSecurityToken)
      // Steal the focus
      .then(getUser)
      // Init the event listeners.
      .then(initEventsListeners)
      // Mark the iframe container as ready.
      .then(function () {
        passbolt.message.emit('passbolt.auth.remove-class', '#passbolt-iframe-login-form', 'loading');
        passbolt.message.emit('passbolt.auth.add-class', '#passbolt-iframe-login-form', 'ready');
      }, function() {
        console.error('Something went wrong when initializing loginForm.js');
      });
  };

  /**
   * Check rememberMe option in site settings.
   * @returns {Promise}
   */
  var addRememberMeOption = function() {
    passbolt.request('passbolt.site.settings').then(function(settings) {
        if(settings!== undefined && settings.passbolt !== undefined
          && settings.passbolt.plugins !== undefined && settings.passbolt.plugins.rememberMe !== undefined
          && settings.passbolt.plugins.rememberMe.options !== undefined && settings.passbolt.plugins.rememberMe.options['-1'] !== undefined) {
          $rememberMe.parent().removeClass('hidden');
          passbolt.message.emit('passbolt.auth.add-class', '#passbolt-iframe-login-form', 'with-remember-me-option');
        }
      });
  };

  /**
   * Load the page template and initialize the variables relative to it.
   * @returns {Promise}
   */
  var loadTemplate = function () {
    return passbolt.html.loadTemplate('body', 'login/form.ejs', 'html', {rememberMeOption: rememberMePlugin})
      .then(function success() {
        $loginSubmit = $('#loginSubmit');
        $username = $('#UserUsername');
        $masterPassword = $('#js_master_password');
        $loginMessage = $('#loginMessage');
        $rememberMe = $('#rememberMe');
        addRememberMeOption();
      });
  };

  /**
   * Init the security token.
   * @returns {Promise}
   */
  var initSecurityToken = function () {
    return passbolt.security.initSecurityToken('#js_master_password', '.security-token');
  };

  /**
   * Get the user configured in the addon.
   * @returns {Promise}
   */
  var getUser = function () {
    return passbolt.request('passbolt.user.get').then(
      function success(user) {
        // the user should always exist at this point
        $username.val(user.username);
      }
    );
  };

  /**
   * Init the events listeners.
   * The events can come from the following sources : addon, page or DOM.
   */
  var initEventsListeners = function () {
    $loginSubmit.on('click', onLoginSubmit);
    $masterPassword.on('keypress', onMasterPasswordKeypressed);
  };

  /**
   * Passphrase invalid, notify the user.
   * @param msg {string} The error message
   */
  var invalidPassphrase = function (msg) {
    $loginSubmit.removeClass('disabled').removeClass('processing');
    $loginMessage.addClass('error').text(msg);
  };

  /**
   * Login the user
   */
  var login = function (masterPassword, remember) {
    passbolt.request('passbolt.auth.login', masterPassword, remember);
  };

  /**
   * Try to login the user.
   * @param masterPassword {string} The user passphrase
   */
  var loginAttempt = function (masterPassword) {
    if ($loginSubmit.hasClass('processing')) {
      return;
    }

    $('html').removeClass('loaded').addClass('loading');
    $loginMessage.text('Please wait...');
    $loginSubmit.addClass('disabled').addClass('processing');

    // Check the passphrase.
    passbolt.request('passbolt.keyring.private.checkpassphrase', masterPassword).then(
      // If the passphrase is valid, login the user.
      function success() {
        var remember = false;
        if ($rememberMe !== null && $rememberMe.prop('checked')) {
          remember = -1;
        }
        login(masterPassword, remember);
      },
      // If the passphrase is invalid, display an error feedback.
      function fail(msg) {
        invalidPassphrase(msg);
      }
    );
  };

  /* ==================================================================================
   *  DOM events handlers
   * ================================================================================== */

  /**
   * The login form has been submited.
   * Try to login the user.
   *
   * @param ev
   */
  var onLoginSubmit = function () {
    if ($loginSubmit.hasClass('processing')) {
      return false;
    }

    loginAttempt($masterPassword.val());
    return false;
  };

  /**
   * Handle when the user presses a key on the master password field.
   * Handle the scenario :
   *  - Enter pressed : submit the form ;

   * @param ev {HTMLEvent} The event which occurred
   */
  var onMasterPasswordKeypressed = function (ev) {
    if ($loginSubmit.hasClass('processing')) {
      return false;
    }

    // Get keycode.
    var keycode = ev.keyCode || ev.which;

    // The user presses enter.
    if (keycode == 13) {
      loginAttempt($masterPassword.val());
    }
  };

  // Init the login form.
  init();

});
