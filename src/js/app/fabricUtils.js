"use strict";

/* -----------------
Good references:
  https://github.com/michaeljcalkins/angular-fabric/blob/master/assets/fabric.js
  http://fabricjs.com/js/kitchensink/controller.js
----------------- */

var canvas = global.canvas;
var filesaver = require('../lib/filesaver.min.js');

function selectAll(objs) {
  canvas.deactivateAll();

  if (objs === undefined) {
    objs = canvas.getObjects();
  }

  objs.map(function(o) {
    return o.set('active', true);
  });
  var group = new fabric.Group(objs, {
    originX: 'center',
    originY: 'center'
  });

  canvas.setActiveGroup(group.setCoords());
}

function sendForward() {
  if (canvas.getActiveGroup() !== null) {
    sendGroupForward(canvas.getActiveGroup(), false);
  } else if (canvas.getActiveObject() !== null) {
    canvas.bringForward(canvas.getActiveObject());
  }
  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function sendBackward() {
  if (canvas.getActiveGroup() !== null) {
    sendGroupBackward(canvas.getActiveGroup(), false);
  } else if (canvas.getActiveObject() !== null) {
    canvas.sendBackwards(canvas.getActiveObject());
  }
  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function sendToFront() {
  if (canvas.getActiveGroup() !== null) {
    sendGroupForward(canvas.getActiveGroup(), true);
  } else if (canvas.getActiveObject() !== null) {
    canvas.bringToFront(canvas.getActiveObject());
  }
  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function sendToBack() {
  if (canvas.getActiveGroup() !== null) {
    sendGroupBackward(canvas.getActiveGroup(), true);
  } else if (canvas.getActiveObject() !== null) {
    canvas.sendToBack(canvas.getActiveObject());
  }
  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function clone() {
  var object = null;
  if (canvas.getActiveGroup() !== null) {
    var objects = canvas.getActiveGroup().objects;

    // Fabric.js bug getting an object's coordinates when a group is selected
    canvas.deactivateAll();

    var cloned = [];
    for (var i = 0; i < objects.length; i++) {
      object = objects[i].clone();
      object.set("top", object.top + 20);
      object.set("left", object.left + 20);
      canvas.add(object);
      cloned.push(object);
    }

    selectAll(cloned);
  } else if (canvas.getActiveObject() !== null) {
    object = canvas.getActiveObject().clone();
    object.set("top", object.top + 20);
    object.set("left", object.left + 20);
    canvas.add(object);

    // select new object
    canvas.deactivateAll();
    canvas.setActiveObject(object);
  }

  canvas.renderAll();

  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

// TODO Fabric.js might do this for us now that we've on version >1.5
function sendGroupBackward(group, bottom) {
  // Copy object references
  var sorted = group.objects.slice();

  // Sort the array
  var objects = canvas.getObjects();
  sorted.sort(function(a, b){
    var z1 = objects.indexOf(a);
    var z2 = objects.indexOf(b);
    return a-b;
  });

  // Change layer of objects one-by-one
  var obj;
  if (bottom === true) {
    for (var i = 0; i < sorted.length; i++) {
      obj = sorted[i];
      canvas.sendToBack(obj);
    }
  } else {
    for (var j = sorted.length - 1; j >= 0; j--) {
      obj = sorted[j];
      canvas.sendBackwards(obj);
    }
  }
}

// TODO Fabric.js might do this for us now that we've on version >1.5
function sendGroupForward(group, top) {
  // Copy object references
  var sorted = group.objects.slice();

  // Sort the array
  var objects = canvas.getObjects();
  sorted.sort(function(a, b){
    var z1 = objects.indexOf(a);
    var z2 = objects.indexOf(b);
    return a-b;
  });

  // Change layer of objects one-by-one
  var obj;
  if (top === true) {
    for (var i = sorted.length - 1; i >= 0; i--) {
      obj = sorted[i];
      canvas.bringToFront(obj);
    }
  } else {
    for (var j = 0; j < sorted.length; j++) {
      obj = sorted[j];
      canvas.bringForward(obj);
    }
  }
}

// This is the shadow-less version
/*
function getImageBounds() {
  selectAll();
  var rect = canvas.getActiveGroup().getBoundingRect();
  canvas.deactivateAll();
  canvas.renderAll();
  return rect;
}
*/

// inludes shadows
function getImageBounds(fitToCanvas) {
  var objs = canvas.getObjects();

  if (objs.length === 0) {
    return {
      top: 0, left: 0, height: 0, width: 0
    };
  }

  // Fabric.js bug getting an objects bounds when all objects are selected
  canvas.deactivateAll();
  var bounds = objs[0].getBoundingRect();

  // Find maximum bounds
  for (var i = 0; i < objs.length; i++) {
    var obj = objs[i];
    var rect = getObjBounds(obj);

    if (rect.left < bounds.left) {
      bounds.width += bounds.left - rect.left;
      bounds.left = rect.left;
    }

    if (rect.top < bounds.top) {
      bounds.height += bounds.top - rect.top;
      bounds.top = rect.top;
    }

    var right = rect.left + rect.width;
    var bottom = rect.top + rect.height;

    if (right > bounds.left + bounds.width) {
      bounds.width = right - bounds.left;
    }

    if (bottom > bounds.top + bounds.height) {
      bounds.height = bottom - bounds.top;
    }
  }

  if (fitToCanvas) {
    // Fit to canvas
    if (bounds.left < 0) {
      bounds.width -= Math.abs(bounds.left);
      bounds.left = 0;
    }

    if (bounds.top < 0) {
      bounds.height -= Math.abs(bounds.top);
      bounds.top = 0;
    }

    if (bounds.left + bounds.width > canvas.width) {
      bounds.width = canvas.width - bounds.left;
    }

    if (bounds.top + bounds.height > canvas.height) {
      bounds.height = canvas.height - bounds.top;
    }
  }

  // Don't show selection tools
  selectAll();
  canvas.deactivateAll();
  canvas.renderAll();

  return bounds;
}

// includes shadows
function getObjBounds(obj) {
  var bounds = obj.getBoundingRect();
  var shadow = obj.getShadow();

  if (shadow !== null) {
    var blur = shadow.blur;
    var mBlur = blur * Math.abs(obj.scaleX + obj.scaleY) / 4;
    var signX = shadow.offsetX >= 0.0 ? 1.0 : -1.0;
    var signY = shadow.offsetY >= 0.0 ? 1.0 : -1.0;
    var mOffsetX = shadow.offsetX * Math.abs(obj.scaleX);
    var mOffsetY = shadow.offsetY * Math.abs(obj.scaleY);
    var offsetX = mOffsetX + (signX * mBlur);
    var offsetY = mOffsetY + (signY * mBlur);

    if (mOffsetX > mBlur) {
      bounds.width += offsetX;
    } else if (mOffsetX  < -mBlur) {
      bounds.width -= offsetX;
      bounds.left += offsetX;
    } else {
      bounds.width += mBlur * 2;
      bounds.left -= mBlur - mOffsetX;
    }

    if (mOffsetY > mBlur) {
      bounds.height += offsetY;
    } else if (mOffsetY < -mBlur) {
      bounds.height -= offsetY;
      bounds.top += offsetY;
    } else {
      bounds.height += mBlur * 2;
      bounds.top -= mBlur - mOffsetY;
    }
  }

  return bounds;
}

// fileType should be "png", "jpeg", or "svg"
function exportFile(fileType) {
  // Get bounds of image
  var bounds = getImageBounds(true);
  var blob = null;

  // Get image data
  if (fileType === "svg") {
    var svg = canvas.toSVG({
      viewBox: {
        x: bounds.left,
        y: bounds.top,
        width: bounds.width,
        height: bounds.height
      }
    });
    blob = new Blob([svg], {type: "image/svg+xml"});
  } else {
    var dataURL = canvas.toDataURL({
        format: fileType,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        quality: 1.0
    });

    var data = atob(dataURL.replace(/^.*?base64,/, ''));
    var asArray = new Uint8Array(data.length);
    for( var i = 0, len = data.length; i < len; ++i ) {
      asArray[i] = data.charCodeAt(i);
    }
    blob = new Blob([asArray.buffer], {type: "image/" + fileType});
  }

  // Save file
  filesaver.saveAs(blob, "design." + fileType);
}

function deleteSelected() {
  // Delete the current object(s)
  if(canvas.getActiveGroup() !== null && canvas.getActiveGroup() !== undefined){
    canvas.getActiveGroup().forEachObject(function(o){ canvas.remove(o); });
    canvas.discardActiveGroup().renderAll();
  } else if (canvas.getActiveObject() !== null && canvas.getActiveObject() !== undefined) {
    canvas.remove(canvas.getActiveObject());
  }
}

function insertSvg(url, loader) {
  loader.removeClass("noshow");
  fabric.loadSVGFromURL(url, function(objects, options) {
    var obj = fabric.util.groupSVGElements(objects, options);

    var scaleFactor = 1;
    if (obj.width > obj.height) {
      scaleFactor = (canvas.width / 3) / obj.width;
    } else {
      scaleFactor = (canvas.height / 3) / obj.height;
    }

    obj.set({
      top: Math.floor(canvas.height / 5),
      left: Math.floor(canvas.width / 5),
      scaleY: scaleFactor,
      scaleX: scaleFactor
    });

    canvas.add(obj);
    obj.perPixelTargetFind = true;
    obj.targetFindTolerance = 4;
    canvas.deactivateAll();
    canvas.setActiveObject(obj);
    canvas.renderAll();

    // Push the canvas state to history
    canvas.trigger("object:statechange");

    loader.addClass("noshow");
  });
}

function getActiveStyle(styleName, object) {
  object = object || canvas.getActiveObject();

  if (typeof object !== 'object' || object === null) {
    return '';
  }

  // Don't change part of text
  /*
  return (object.getSelectionStyles && object.isEditing) ? (object.getSelectionStyles()[styleName] || '') : (object[styleName] || '');
  */

  return (object[styleName] || '');
}

function setActiveStyle(styleName, value, object) {
  object = object || canvas.getActiveObject();

  // Don't change part of text
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

function getFillColor() {
  var object = canvas.getActiveObject();
  if (object.customFillColor !== undefined) {
    return object.customFillColor;
  } else if (object.type === 'line') {
    return getActiveStyle("stroke");
  } else {
    return getActiveStyle("fill");
  }
}

function setFillColor(hex) {
  var object = canvas.getActiveObject();
  if (object) {
    if (object.type === 'i-text') {
      setActiveStyle('fill', hex);
    } else if (object.type === 'line') {
      setActiveStyle('stroke', hex);
    } else {
      if (!object.paths) {
        object.setFill(hex);
      } else if (object.paths) {
        for (var i = 0; i < object.paths.length; i++) {
          object.paths[i].setFill(hex);
        }
      }
    }

    object.customFillColor = hex;
  }
}

function getOutlineColor() {
  var object = canvas.getActiveObject();
  if (object.customOutlineColor !== undefined) {
    return object.customOutlineColor;
  }

  return getActiveStyle("stroke");
}

function setOutlineColor(hex) {
  var object = canvas.getActiveObject();
  if (object) {
    if (object.type === 'i-text' || object.type === 'line') {
      setActiveStyle('stroke', hex);
    } else {
      if (!object.paths) {
        object.setStroke(hex);
      } else if (object.paths) {
        for (var i = 0; i < object.paths.length; i++) {
          object.paths[i].setStroke(hex);
        }
      }
    }

    object.customOutlineColor = hex;
  }
}

function getFontSize() {
  return getActiveStyle('fontSize');
}

function setFontSize(value) {
  setActiveStyle('fontSize', parseInt(value, 10));
  canvas.renderAll();
}

function getFont() {
  var fontFamily = canvas.getActiveObject().fontFamily;
  return fontFamily ? fontFamily.toLowerCase() : '';
}

function setFont(font) {
  canvas.getActiveObject().fontFamily = font.toLowerCase();
  canvas.renderAll();
}


/* ----- shadow and glow ----- */

function setShadow(_color, _blur, _offsetX, _offsetY, object) {
  object = object || canvas.getActiveObject();
  object.setShadow({
      color: _color,
      blur: _blur,
      offsetX: _offsetX,
      offsetY: _offsetY
  });
  canvas.renderAll();

  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function changeShadowColor(color, object) {
  object = object || canvas.getActiveObject();
  var shadow = object.getShadow();
  if (shadow === null) {
    return null;
  }
  setShadow(color, shadow.blur, shadow.offsetX, shadow.offsetY, object);
}

function clearShadow(object) {
  object = object || canvas.getActiveObject();
  object.setShadow(null);
  canvas.renderAll();

  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

function isShadow(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.getShadow();
  return (shadow !== null && (shadow.offsetX !== 0 || shadow.offsetY !== 0));
}

// Glow is just a shadow with an offset of zero
function isGlow(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.getShadow();
  return (shadow !== null && shadow.offsetX === 0 && shadow.offsetY === 0);
}

function getShadowBlur(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.getShadow();
  if (shadow === null) {
    return null;
  }

  return parseInt(shadow.blur);
}

function getShadowColor(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.getShadow();
  if (shadow === null) {
    return null;
  }

  return shadow.color;
}

function getShadowOffset(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.getShadow();
  if (shadow === null) {
    return null;
  }

  var x = parseInt(shadow.offsetX);
  var y = parseInt(shadow.offsetY);
  return {"x": x, "y": y};
}

function changeImageOffset(left, top) {
  var objs = canvas.getObjects();
  for (var i = 0; i < objs.length; i++) {
    objs[i].left += left;
    objs[i].top += top;
  }
}

function centerContent() {
  var bounds = getImageBounds(false);

  var canvasMidpointLeft = Math.round(canvas.width / 2);
  var canvasMidpointTop = Math.round(canvas.height / 2);
  var imageMidpointLeft = Math.round((bounds.width / 2) + bounds.left);
  var imageMidpointTop = Math.round((bounds.height / 2) + bounds.top);
  var diffLeft = canvasMidpointLeft - imageMidpointLeft;
  var diffTop = canvasMidpointTop - imageMidpointTop;

  changeImageOffset(diffLeft, diffTop);

  // Work around bug where you can't select objects after they have been added
  selectAll();
  canvas.deactivateAll();

  canvas.renderAll();
}


/* ----- exports ----- */

function UtilsModule() {
  if (!(this instanceof UtilsModule)) return new UtilsModule();
  // constructor
}

UtilsModule.prototype.selectAll = selectAll;
UtilsModule.prototype.sendGroupBackward = sendGroupBackward;
UtilsModule.prototype.sendGroupForward = sendGroupForward;
UtilsModule.prototype.exportFile = exportFile;
UtilsModule.prototype.getImageBounds = getImageBounds;
UtilsModule.prototype.deleteSelected = deleteSelected;
UtilsModule.prototype.insertSvg = insertSvg;
UtilsModule.prototype.sendToFront = sendToFront;
UtilsModule.prototype.sendToBack = sendToBack;
UtilsModule.prototype.sendBackward = sendBackward;
UtilsModule.prototype.sendForward = sendForward;
UtilsModule.prototype.clone = clone;
UtilsModule.prototype.getFillColor = getFillColor;
UtilsModule.prototype.setFillColor = setFillColor;
UtilsModule.prototype.getOutlineColor = getOutlineColor;
UtilsModule.prototype.setOutlineColor = setOutlineColor;
UtilsModule.prototype.getFontSize = getFontSize;
UtilsModule.prototype.setFontSize = setFontSize;
UtilsModule.prototype.getFont = getFont;
UtilsModule.prototype.setFont = setFont;
UtilsModule.prototype.setShadow = setShadow;
UtilsModule.prototype.clearShadow = clearShadow;
UtilsModule.prototype.isShadow = isShadow;
UtilsModule.prototype.isGlow = isGlow;
UtilsModule.prototype.getShadowBlur = getShadowBlur;
UtilsModule.prototype.getShadowOffset = getShadowOffset;
UtilsModule.prototype.changeShadowColor = changeShadowColor;
UtilsModule.prototype.getShadowColor = getShadowColor;
UtilsModule.prototype.centerContent = centerContent;

module.exports = UtilsModule;
