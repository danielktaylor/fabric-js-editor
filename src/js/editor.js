global.jQuery = require('jquery');
global.$ = global.jQuery;

$(function() {
  "use strict";
	global.canvas = new fabric.Canvas('c');
	new (require('./app/handlers.js'))();
});
