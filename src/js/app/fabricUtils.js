"use strict";

/* -----------------
Good references:
  https://github.com/michaeljcalkins/angular-fabric/blob/master/assets/fabric.js
  http://fabricjs.com/js/kitchensink/controller.js
----------------- */

var canvas = global.canvas;
var filesaver = require('../lib/filesaver.min.js');

function selectAll() {
  canvas.discardActiveObject();
  var sel = new fabric.ActiveSelection(canvas.getObjects(), {
    canvas: canvas,
  });
  canvas.setActiveObject(sel);
  canvas.requestRenderAll();
}

function sendForward() {
  var activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.bringForward(activeObject);
    // Push the canvas state to history
    canvas.trigger("object:statechange");
  }
}

function sendBackward() {
  var activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.sendBackwards(activeObject);
    // Push the canvas state to history
    canvas.trigger("object:statechange");
  }
}

function sendToFront() {
  var activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.bringToFront(activeObject);
    // Push the canvas state to history
    canvas.trigger("object:statechange");
  }
}

function sendToBack() {
  var activeObject = canvas.getActiveObject();
  if (activeObject) {
    canvas.sendToBack(activeObject);
    // Push the canvas state to history
    canvas.trigger("object:statechange");
  }
}

function clone() {
  // clone what are you copying since you
  // may want copy and paste on different moment.
  // and you do not want the changes happened
  // later to reflect on the copy.
  canvas.getActiveObject().clone(function(cloned) {
    canvas.discardActiveObject();
    cloned.set({
      left: cloned.left + 10,
      top: cloned.top + 10,
      evented: true,
    });
    if (cloned.type === 'activeSelection') {
      // active selection needs a reference to the canvas.
      cloned.canvas = canvas;
      cloned.forEachObject(function(obj) {
        canvas.add(obj);
        obj.perPixelTargetFind = true;
        obj.targetFindTolerance = 4;
      });
      // this should solve the unselectability
      cloned.setCoords();
    } else {
      canvas.add(cloned);
      cloned.perPixelTargetFind = true;
      cloned.targetFindTolerance = 4;
    }

    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
  });
 
  // Push the canvas state to history
  canvas.trigger("object:statechange");
}

// This is the shadow-less version
/*
function getImageBounds() {
  selectAll();
  var rect = canvas.getActiveObjects().getBoundingRect();
  canvas.discardActiveObject() ;
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
  canvas.discardActiveObject() ;
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
  canvas.discardActiveObject() ;
  canvas.renderAll();

  return bounds;
}

// includes shadows
function getObjBounds(obj) {
  var bounds = obj.getBoundingRect();
  var shadow = obj.Shadow;

  if (shadow != null) {
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
  var activeObjects = canvas.getActiveObjects();
  canvas.discardActiveObject() ;
  if (activeObjects.length) {
    canvas.remove.apply(canvas, activeObjects);
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
    canvas.discardActiveObject() ;
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

  return (object[styleName] || '');
}

function setActiveStyle(styleName, value, object) {
  object = object || canvas.getActiveObject();
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
function setActiveStyle(styleName, value, object) {
  object = object || canvas.getActiveObject();
  if (!object) return;

  if (object.setSelectionStyles && object.isEditing) {
    var style = { };
    style[styleName] = value;
    object.setSelectionStyles(style);
    object.setCoords();
  }
  else {
    object.set(styleName, value);
  }

  object.setCoords();
  canvas.renderAll();
}

function setFillColor(hex) {
  var object = canvas.getActiveObject();
  if (object) {
    setActiveStyle('fill',hex);  // transparency
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
    setActiveStyle('stroke',hex);
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
  var shadow = object.shadow;
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
  var shadow = object.shadow ;
  return (shadow !== null && (shadow.offsetX !== 0 || shadow.offsetY !== 0));
}

// Glow is just a shadow with an offset of zero
function isGlow(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.shadow;
  return (shadow !== null && shadow.offsetX === 0 && shadow.offsetY === 0);
}

function getShadowBlur(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.shadow;
  if (shadow === null) {
    return null;
  }

  return parseInt(shadow.blur);
}

function getShadowColor(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.shadow;
  if (shadow === null) {
    return null;
  }

  return shadow.color;
}

function getShadowOffset(object) {
  object = object || canvas.getActiveObject();
  var shadow = object.shadow;
  if (shadow == null) {
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
  canvas.renderAll();
}


/* ----- exports ----- */

function UtilsModule() {
  if (!(this instanceof UtilsModule)) return new UtilsModule();
  // constructor
}

UtilsModule.prototype.selectAll = selectAll;
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
