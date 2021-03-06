/**
 * App events.
 *
 * Used to handle the events related to main application page.
 *
 * @copyright (c) 2017 Passbolt SARL
 * @licence GNU Affero General Public License http://www.gnu.org/licenses/agpl-3.0.en.html
 */
var masterPasswordController = require('../controller/masterPasswordController');
var progressDialogController = require('../controller/progressDialogController');
var app = require('../app');
var Worker = require('../model/worker');

var Keyring = require('../model/keyring').Keyring;
var Crypto = require('../model/crypto').Crypto;
var TabStorage = require('../model/tabStorage').TabStorage;
var Secret = require('../model/secret').Secret;
var secret = new Secret();
var Resource = require('../model/resource').Resource;

var listen = function (worker) {

  /*
   * Broadcast the window resize event to all workers.
   *
   * @listens passbolt.app.window-resized
   * @param cssClasses {array} When the window is resized the application
   *  updates the css classes applied to its html tag, these classes are given
   *  as parameter.
   */
  worker.port.on('passbolt.app.window-resized', function (cssClasses) {
    var workersIds = Worker.getAllKeys(worker.tab.id);
    for (var i in workersIds) {
      Worker.get(workersIds[i], worker.tab.id).port.emit('passbolt.app.window-resized', cssClasses);
    }
  });

  /*
   * Give the focus to the secret-edit iframe.
   *
   * @listens passbolt.secret-edit.focus
   */
  worker.port.on('passbolt.secret-edit.focus', function () {
    Worker.get('Secret', worker.tab.id).port.emit('passbolt.secret-edit.focus');
  });

  /* Validate the edited secret.
   *
   * @listens passbolt.secret-edit.validate
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.secret-edit.validate', function (requestId) {
    var editedPassword = TabStorage.get(worker.tab.id, 'editedPassword');

    try {
      // If the secret is decrypted validate it, otherwise it is
      // considered as valid.
      if (editedPassword.secret != null) {
        secret.validate({data: editedPassword.secret});
      }
      Worker.get('Secret', worker.tab.id).port.emit('passbolt.secret-edit.validate-success');
      worker.port.emit(requestId, 'SUCCESS');
    } catch (e) {
      Worker.get('Secret', worker.tab.id).port.emit('passbolt.secret-edit.validate-error', e.message, e.validationErrors);
      worker.port.emit(requestId, 'ERROR', e.message, e.validationErrors);
    }
  });

  /*
   * Encrypt the currently edited secret for all given users. Send the armored
   * secrets in the response to the requester. If the secret hasn't been
   * decrypted send an empty array.
   *
   * @listens passbolt.secret-edit.encrypt
   * @param requestId {uuid} The request identifier
   * @param usersIds {array} The users to encrypt the edited secret for
   */
  worker.port.on('passbolt.secret-edit.encrypt', function (requestId, usersIds) {
    var editedPassword = TabStorage.get(worker.tab.id, 'editedPassword'),
      keyring = new Keyring(),
      crypto = new Crypto(),
      armoreds = {};

    // If the currently edited secret hasn't been decrypted, leave.
    if (editedPassword.secret == null) {
      worker.port.emit(requestId, 'SUCCESS', armoreds);
      return;
    }

    // Open the progress dialog.
    progressDialogController.open(worker, 'Encrypting ...', usersIds.length);

    // Sync the keyring with the server.
    keyring.sync()

      // Once the keyring is synced, encrypt the secret for each user.
      .then(function () {
        var progress = 0;

        // Prepare the data for encryption.
        var encryptAllData = usersIds.map(function(userId) {
          return {
            userId: userId,
            message: editedPassword.secret
          }
        });

        // Encrypt all the messages.
        return crypto.encryptAll(encryptAllData, function () {
          progressDialogController.update(worker, progress++);
        }, function (position) {
          progressDialogController.update(worker, progress, 'Encrypting ' + position + '/' + usersIds.length);
        });
      })

      // Once the secret is encrypted for all users notify the application and
      // close the progress dialog.
      .then(function (data) {
        for (var i in data) {
          armoreds[usersIds[i]] = data[i];
        }
        worker.port.emit(requestId, 'SUCCESS', armoreds);
        progressDialogController.close(worker);
      });
  });

  /*
   * Initialize the password sharing process.
   *
   * @listens passbolt.app.share-password-init
   * @param requestId {uuid} The request identifier
   * @param sharedPassword {array} The password to share
   */
  worker.port.on('passbolt.app.share-password-init', function (requestId, sharedPassword) {
    // Store some variables in the tab storage in order to make it accessible by other workers.
    TabStorage.set(worker.tab.id, 'sharedPassword', sharedPassword);
    TabStorage.set(worker.tab.id, 'shareWith', []);
    worker.port.emit(requestId, 'SUCCESS');
  });

  /*
   * Encrypt the shared password for all the new users it has been shared with.
   *
   * @listens passbolt.share.encrypt
   * @param requestId {uuid} The request identifier
   */
  worker.port.on('passbolt.share.encrypt', function (requestId) {
    var sharedPassword = TabStorage.get(worker.tab.id, 'sharedPassword'),
      aros = TabStorage.get(worker.tab.id, 'shareWith'),
      addedUsers = [],
      keyring = new Keyring(),
      crypto = new Crypto();

    if (!aros.length) {
      worker.port.emit(requestId, 'SUCCESS', {});
      return;
    }

    // Master password required to decrypt a secret before sharing it.
    masterPasswordController.get(worker)

      // Once the master password retrieved, decrypt the secret.
      .then(function (masterPassword) {
        progressDialogController.open(worker, 'Encrypting ...', 100);
        return crypto.decrypt(sharedPassword.armored, masterPassword)
      })

      // Sync the keyring.
      .then(function (secret) {
        sharedPassword.secret = secret;
        // Sync the keyring.
        return keyring.sync();
      })

      // Retrieve the new users the secret will be encrypted for.
      .then(function () {
        var permissions = [];
        aros.forEach(function (aro) {
          var permission = {
            aco: 'Resource',
            aro: aro.User ? 'User' : 'Group',
            aro_foreign_key: aro.User ? aro.User.id : aro.Group.id,
            type: 1
          };
          permissions.push({Permission: permission});
        });
        return Resource.simulateShare(sharedPassword.resourceId, permissions);
      })

      // Once the keyring is synced, encrypt the secret for each user.
      .then(function (response) {
        var progress = 0;
        addedUsers = response.changes.added;
        progressDialogController.updateGoals(worker, addedUsers.length);

        // Prepare the data for encryption.
        var encryptAllData = addedUsers.map(function(addedUser) {
          return {
            userId: addedUser.User.id,
            message: sharedPassword.secret
          }
        });

        // Encrypt all the messages.
        return crypto.encryptAll(encryptAllData, function () {
          progressDialogController.update(worker, progress++);
        }, function (position) {
          progressDialogController.update(worker, progress, 'Encrypting ' + position + '/' + addedUsers.length);
        });
      })

      // Once the secret is encrypted for all users notify the application and
      // close the progress dialog.
      .then(function (data) {
        var armoreds = {};
        for (var i in data) {
          armoreds[addedUsers[i].User.id] = data[i];
        }
        worker.port.emit(requestId, 'SUCCESS', armoreds);
        progressDialogController.close(worker);
      })

      // In case of error, notify the request caller.
      .then(null, function (error) {
        worker.port.emit(requestId, 'ERROR', error);
      });

  });

  /*
   * A permission has been temporary deleted.
   * Remove the aro from the list of aros the password would be shared with.
   *
   * @listens passbolt.share.remove-permission
   * @param removedAroId {string} The aro id to remove.
   */
  worker.port.on('passbolt.share.remove-permission', function (removedAroId) {
    var aros = TabStorage.get(worker.tab.id, 'shareWith') || [];

    for(var i in aros) {
      var aroId = aros[i].User ? aros[i].User.id : aros[i].Group.id;
      if(aroId === removedAroId) {
        aros.splice(i, 1);
      }
    }

    TabStorage.set(worker.tab.id, 'shareWith', aros);
  });

  /*
   * Decrypt a given armored string
   *
   * @listens passbolt.app.decrypt
   * @param requestId {uuid} The request identifier
   * @param armored {string} The armored secret
   */
  worker.port.on('passbolt.app.decrypt-copy', function (requestId, armored) {
    var crypto = new Crypto();

    // Master password required to decrypt a secret.
    masterPasswordController.get(worker)
      .then(function (masterPassword) {
        worker.port.emit('passbolt.progress.open-dialog', 'Decrypting...');
        return crypto.decrypt(armored, masterPassword)
      })
      .then(function (decrypted) {
        var clipboardWorker = Worker.get('ClipboardIframe', worker.tab.id);
        clipboardWorker.port.emit('passbolt.clipboard-iframe.copy', decrypted);
        worker.port.emit('passbolt.progress.close-dialog');
        worker.port.emit(requestId, 'SUCCESS', decrypted);
      })
      .catch(function (error) {
        worker.port.emit('passbolt.progress.close-dialog');
        worker.port.emit(requestId, 'ERROR', error.message);
      });
  });

  /*
   * Initialize the export passwords process.
   *
   * @listens passbolt.app.export-passwords-init
   * @param requestId {uuid} The request identifier
   * @param resources {array} The list of resources to export
   */
  worker.port.on('passbolt.app.export-passwords-init', function (requestId, resources) {
    // Store some variables in the tab storage in order to make it accessible by other workers.
    TabStorage.set(worker.tab.id, 'exportedResources', resources);
    worker.port.emit(requestId, 'SUCCESS');
  });
};

exports.listen = listen;
