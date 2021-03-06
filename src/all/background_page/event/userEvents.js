/**
 * User events
 *
 * Used to handle the events related to the current user
 *
 * @copyright (c) 2017 Passbolt SARL
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */
var app = require('../app');
var User = require('../model/user').User;
var user = User.getInstance();
var __ = require('../sdk/l10n').get;

var listen = function (worker) {

  /* ==================================================================================
   *  Getters for user
   * ================================================================================== */

  /*
   * Get the current user as stored in the plugin.
   *
   * @listens passbolt.user.get
   * @param requestId {uuid} The request identifier
   * @param data {array} The user filter
   */
  worker.port.on('passbolt.user.get', function (requestId, data) {
    try {
      var u = user.get(data);
      worker.port.emit(requestId, 'SUCCESS', u);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Get the current user name (firstname and lastname) as stored in the plugin
   *
   * @listens passbolt.user.get.name
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.user.get.name', function (requestId) {
    try {
      var name = user.getName();
      worker.port.emit(requestId, 'SUCCESS', name);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Get the current username as stored in the plugin
   *
   * @listens passbolt.user.get.username
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.user.get.username', function (requestId) {
    try {
      var username = user.getUsername();
      worker.port.emit(requestId, 'SUCCESS', username);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Get all the user settings as stored in the plugin
   *
   * @listens passbolt.user.settings.get
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.user.settings.get', function (requestId) {
    try {
      var settings = user.settings.get();
      worker.port.emit(requestId, 'SUCCESS', settings);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Get the user security token as stored in the plugin
   *
   * @listens passbolt.user.settings.get.securityToken
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.user.settings.get.securityToken', function (requestId) {
    try {
      var securityToken = user.settings.getSecurityToken();
      worker.port.emit(requestId, 'SUCCESS', securityToken);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Get the user domain trust as stored in the plugin
   *
   * @listens passbolt.user.settings.get.domain
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.user.settings.get.domain', function (requestId) {
    try {
      var domain = user.settings.getDomain();
      worker.port.emit(requestId, 'SUCCESS', domain);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Validate the user object given and return errors if any.
   *
   * @listens passbolt.user.validate
   * @param requestId {uuid} The request identifier
   * @param u {array} The user object to validate
   * @param fields {array} The fields to validate
   */
  worker.port.on('passbolt.user.validate', function (requestId, u, fields) {
    try {
      var validatedUser = user.validate(u, fields);
      worker.port.emit(requestId, 'SUCCESS', validatedUser);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message, e.validationErrors);
    }
  });

  /* ==================================================================================
   *  Setters for user
   * ================================================================================== */

  /*
   * Set the user in the plugin local storage
   *
   * @listens passbolt.user.set
   * @param requestId {uuid} The request identifier
   * @param u {array} The user object
   */
  worker.port.on('passbolt.user.set', function (requestId, u) {
    try {
      user.set(u);
      app.pageMods.PassboltAuth.init();
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Set the user name in the plugin local storage
   *
   * @listens passbolt.user.set.name
   * @param requestId {uuid} The request identifier
   * @param firstname {string} The user firstname
   * @param lastname {string} The user lastname
   */
  worker.port.on('passbolt.user.set.name', function (requestId, firstname, lastname) {
    try {
      user.setName(firstname, lastname);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.validationErrors);
    }
  });

  /*
   * Set the user username in the plugin local storage
   *
   * @listens passbolt.user.set.username
   * @param requestId {uuid} The request identifier
   * @param username {string} The user username
   */
  worker.port.on('passbolt.user.set.username', function (requestId, username) {
    try {
      user.setUsername(username);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Set the user identifier in the plugin local storage
   *
   * @listens passbolt.user.setId
   * @param requestId {uuid} The request identifier
   * @param userid {string} The user identifier
   */
  worker.port.on('passbolt.user.setId', function (requestId, userid) {
    try {
      user.setId(userid);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Set the user security token in the plugin local storage
   *
   * @listens passbolt.user.settings.set.securityToken
   * @param requestId {uuid} The request identifier
   * @param securityToken {array} The security token
   */
  worker.port.on('passbolt.user.settings.set.securityToken', function (requestId, securityToken) {
    try {
      user.settings.setSecurityToken(securityToken);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Set the user domain trust in the plugin local storage
   *
   * @listens passbolt.user.settings.set.domain
   * @param requestId {uuid} The request identifier
   * @param domain {string} The domain trust
   */
  worker.port.on('passbolt.user.settings.set.domain', function (requestId, domain) {
    try {
      user.settings.setDomain(domain);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * Validate the user settings object given and return errors if any.
   *
   * @listens passbolt.user.settings.validate
   * @param requestId {uuid} The request identifier
   * @param settingsData {array} The user settings object to validate
   * @param fields {array} The fields to validate
   */
  worker.port.on('passbolt.user.settings.validate', function (requestId, settingsData, fields) {
    try {
      user.settings.validate(settingsData, fields);
      worker.port.emit(requestId, 'SUCCESS', settingsData);
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message, e.validationErrors);
    }
  });

  /*
   * Remember the master password for some time
   *
   * @listens passbolt.user.rememberMasterPassword
   * @param requestId {uuid} The request identifier
   * @param masterPassword {string} The master password to remember
   * @param seconds {int} The time to remember the secret password
   */
  worker.port.on('passbolt.user.rememberMasterPassword', function (requestId, masterPassword, seconds) {
    try {
      user.storeMasterPasswordTemporarily(masterPassword, seconds);
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      worker.port.emit(requestId, 'ERROR', e.message);
    }
  });

  /*
   * User logout is requested
   *
   * @listens passbolt.user.logout
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.user.logout', function (requestId) {
    user.logout();
    worker.port.emit(requestId, 'SUCCESS');
  });
};
exports.listen = listen;
