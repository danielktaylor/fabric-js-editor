"use strict";

var canvas = global.canvas;
var utils = new (require('./fabricUtils.js'))();

var drawnObj, isMouseDown;

function disableDraw() {
  canvas.off('mouse:down');
  canvas.off('mouse:move');
  canvas.off('mouse:up');

  canvas.selection = true;
  canvas.forEachObject(function(o) {
    o.selectable = true;
  });
}

function drawObj(objType) {
  // Esc key handler
  $(document).keyup(escHandler);

  canvas.selection = false;
  canvas.forEachObject(function(o) {
    o.selectable = false;
  });

  canvas.on('mouse:down', function(o){
    // Unregister escape key handler
    $(document).unbind("keyup", escHandler);

    isMouseDown = true;
    var pointer = canvas.getPointer(o.e);

    if (objType === 'line') {
      var points = [ pointer.x, pointer.y, pointer.x, pointer.y ];
      drawnObj = new fabric.Line(points, {
        strokeWidth: 5,
        fill: 'blue',
        stroke: 'blue',
        originX: 'center',
        originY: 'center'
      });
    } else if (objType === 'square') {
      drawnObj = new fabric.Rect({
        width: 0,
        height: 0,
        top: pointer.y,
        left: pointer.x,
        fill: 'green'
      });
    } else if (objType === 'rounded-rect') {
      drawnObj = new fabric.Rect({
        width: 0,
        height: 0,
        top: pointer.y,
        left: pointer.x,
        rx: 10,
        ry: 10,
        fill: 'red'
      });
    } else if (objType === 'circle') {
      drawnObj = new fabric.Circle({
        radius: 0,
        top: pointer.y,
        left: pointer.x,
        fill: 'yellow'
      });
    }

    canvas.add(drawnObj);
  });

  canvas.on('mouse:move', function(o){
    if (!isMouseDown) return;
    var shift = o.e.shiftKey;
    var pointer = canvas.getPointer(o.e);

    if (objType === 'line') {
      if (shift) {
        // TODO rotate towards closest angle
        drawnObj.set({ x2: pointer.x, y2: pointer.y });
      } else {
        drawnObj.set({ x2: pointer.x, y2: pointer.y });
      }
    } else if (objType === 'square' || objType === 'rounded-rect') {
      var newWidth = (drawnObj.left - pointer.x) * -1;
      var newHeight = (drawnObj.top - pointer.y) * -1;
      drawnObj.set({width: newWidth, height: newHeight});
    } else if (objType === 'circle') {
      var x = drawnObj.left - pointer.x;
      var y = drawnObj.top - pointer.y;
      var diff = Math.sqrt(x*x + y*y);
      drawnObj.set({radius: diff/2.3});
    }

    canvas.renderAll();
  });

  canvas.on('mouse:up', function(o){
    isMouseDown = false;

    // Fix upside-down square
    if (objType === 'square' || objType === 'rounded-rect') {
      if (drawnObj.width < 0) {
        var newLeft = drawnObj.left + drawnObj.width;
        var newWidth = Math.abs(drawnObj.width);
        drawnObj.set({left: newLeft, width: newWidth});
      }

      if (drawnObj.height < 0) {
        var newTop = drawnObj.top + drawnObj.height;
        var newHeight = Math.abs(drawnObj.height);
        drawnObj.set({top: newTop, height: newHeight});
      }
    }

    // Delete the object if it's tiny, otherwise select it
    if (drawnObj.height !== 0 || drawnObj.width !== 0) {
      canvas.defaultCursor = 'auto';

      // Fix selection bug by selecting and deselecting all objects
      utils.selectAll();
      canvas.deactivateAll();

      // Select the object
      canvas.setActiveObject(drawnObj).renderAll();

      // Set per-pixel dragging rather than bounding-box dragging
      drawnObj.perPixelTargetFind = true;
      drawnObj.targetFindTolerance = 4;

      // Disable drawing
      disableDraw();

      // Push the canvas state to history
      canvas.trigger( "object:statechange");
    } else {
      canvas.remove(drawnObj);
    }
  });

}

function cancelInsert() {
  canvas.defaultCursor = 'auto';
  disableDraw();
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

/* ----- exports ----- */

function DrawingModule() {
  if (!(this instanceof DrawingModule)) return new DrawingModule();
  // constructor
}

DrawingModule.prototype.drawObj = drawObj;
DrawingModule.prototype.disableDraw = disableDraw;

module.exports = DrawingModule;
