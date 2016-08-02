"use strict";

var canvas = global.canvas;
var drawing = new (require('./drawing.js'))();

function insertText() {
  canvas.defaultCursor = 'crosshair';

  // Esc key handler
  $(document).keyup(escHandler);

  canvas.selection = false;
  canvas.forEachObject(function(o) {
    o.selectable = false;
  });

  canvas.on('mouse:down', function(o){
    // Unregister escape key handler
    $(document).unbind("keyup", escHandler);

    drawing.disableDraw();

    var pointer = canvas.getPointer(o.e);
    var text = new fabric.IText('', {
      fontFamily: 'arial',
      left: pointer.x,
      top: pointer.y
    });

    text.on('editing:exited', function(o){
      $("#toolbar-text").removeClass("toolbar-item-active ");
      if ($(this)[0].text.length === 0) {
        canvas.remove(text);
      } else {
        // Delete the event listener
        //text.__eventListeners["editing:exited"] = [];

        // Push the canvas state to history
        canvas.trigger("object:statechange");
      }
    });

    text.targetFindTolerance = 4;

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.defaultCursor = 'auto';
    text.enterEditing();
  });
}

function cancelInsert() {
  canvas.defaultCursor = 'auto';
  drawing.disableDraw();
  $("#toolbar-text").removeClass("toolbar-item-active ");
}

// Cancel text insertion
function escHandler(e) {
  if (e.keyCode == 27) {
    cancelInsert();

    // Unregister escape key handler
    $(document).unbind("keyup", escHandler);
  }
}

// Return focus to itext if user was editing text
function returnFocus() {
  var o = canvas.getActiveObject();
  if (o === undefined || o === null || o.type !== "i-text") {
    return;
  }

  if (o.hiddenTextarea) {
    o.hiddenTextarea.focus();
  }
}

// Set object style
function setStyle(object, styleName, value) {
  // Don't allow changing part of the text
  /*
  if (object.setSelectionStyles && object.isEditing) {
    var style = { };
    style[styleName] = value;
    object.setSelectionStyles(style);
  } else {
    object[styleName] = value;
  }
  */

  object[styleName] = value;
}

// Get object style
function getStyle(object, styleName) {
  // Don't allow changing part of the text
  /*
  if (object.getSelectionStyles && object.isEditing) {
    return object.getSelectionStyles()[styleName];
  } else {
    return object[styleName];
  }
  */

  return object[styleName];
}

function isItalics(obj) {
  return (getStyle(obj, 'fontStyle') || '').indexOf('italic') > -1;
}

function toggleItalics() {
  var button = $("#toolbar-italics");
  var obj = canvas.getActiveObject();
  var italics = !isItalics(obj);
  setStyle(obj, 'fontStyle', italics ? 'italic' : 'normal');

  if (italics) {
    button.addClass("toolbar-item-active");
  } else {
    button.removeClass("toolbar-item-active");
  }
  canvas.renderAll();

  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function isBold(obj) {
  return (getStyle(obj, 'fontWeight') || '').indexOf('bold') > -1;
}

function toggleBold() {
  var button = $("#toolbar-bold");
  var obj = canvas.getActiveObject();
  var bold = !isBold(obj);
  setStyle(obj, 'fontWeight', bold ? 'bold' : '');

  if (bold) {
    button.addClass("toolbar-item-active");
  } else {
    button.removeClass("toolbar-item-active");
  }
  canvas.renderAll();

  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function isUnderline(obj) {
  return (getStyle(obj, 'textDecoration') || '').indexOf('underline') > -1;
}

function toggleUnderline() {
  var button = $("#toolbar-underline");
  var obj = canvas.getActiveObject();
  var underlined = !isUnderline(obj);
  setStyle(obj, 'textDecoration', underlined ? 'underline' : '');

  if (underlined) {
    button.addClass("toolbar-item-active");
  } else {
    button.removeClass("toolbar-item-active");
  }
  canvas.renderAll();

  // Push the canvas state to history
  canvas.trigger("object:statechange");
}


/* ----- exports ----- */

function TextModule() {
  if (!(this instanceof TextModule)) return new TextModule();
}

TextModule.prototype.isBold = isBold;
TextModule.prototype.isUnderline = isUnderline;
TextModule.prototype.isItalics = isItalics;
TextModule.prototype.toggleBold = toggleBold;
TextModule.prototype.toggleUnderline = toggleUnderline;
TextModule.prototype.toggleItalics = toggleItalics;
TextModule.prototype.insertText = insertText;
TextModule.prototype.cancelInsert = cancelInsert;
TextModule.prototype.returnFocus = returnFocus;

module.exports = TextModule;
