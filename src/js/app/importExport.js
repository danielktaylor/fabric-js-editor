"use strict";

var config = require('./config.js');

function importFile(zipData, handler) {
  var zip = new (require('jszip'))();
  zip.load(zipData);
  var content = zip.file("design").asText();
  handler(content);
}

function loadRemoteFile(url, handler) {
  var zipUtils = require('jszip-utils');
  zipUtils.getBinaryContent(url, function(err, data) {
    if (err) {
      handler(null);
      return;
    }
    importFile(data, handler);
  });
}

function exportFile(textData, filename) {
  var filesaver = require('filesaver.js');
  var zip = new (require('jszip'))();
  zip.file("design", textData);
  var content = zip.generate({type: "blob", compression: "DEFLATE"});
  filesaver.saveAs(content, filename);
}

function shareFile(textData, callback) {
  var zip = new (require('jszip'))();
  zip.file("design", textData);
  var content = zip.generate({type: "blob", compression: "DEFLATE"});

  var fd = new FormData();
  fd.append('zip', content);

  var endpoint = config.icons.host;
  $.ajax({
    type: 'POST',
    async: false, // For popup blocker
    url: endpoint + '/save',
    data: fd,
    processData: false,
    contentType: false
  }).done(function(data) {
    callback(data);
  });
}

/* ----- exports ----- */

function ImportExportModule(_getState, _setState) {
  if (!(this instanceof ImportExportModule)) return new ImportExportModule();
}

ImportExportModule.prototype.importFile = importFile;
ImportExportModule.prototype.exportFile = exportFile;
ImportExportModule.prototype.loadRemoteFile = loadRemoteFile;
ImportExportModule.prototype.shareFile = shareFile;

module.exports = ImportExportModule;
