"use strict";

var canvas = global.canvas;
var utils = new (require('./fabricUtils.js'))();

function noBackspace() {
  // Prevent the backspace key from navigating back
  $(document).unbind('keydown').bind('keydown', function (event) {
    var doPrevent = false;
    if (event.keyCode === 8) {
      var d = event.srcElement || event.target;
      if ((d.tagName.toUpperCase() === 'INPUT' &&
           (
               d.type.toUpperCase() === 'TEXT' ||
               d.type.toUpperCase() === 'PASSWORD' ||
               d.type.toUpperCase() === 'FILE' ||
               d.type.toUpperCase() === 'EMAIL' ||
               d.type.toUpperCase() === 'SEARCH' ||
               d.type.toUpperCase() === 'TEL' ||
               d.type.toUpperCase() === 'DATE' )
           ) ||
           d.tagName.toUpperCase() === 'TEXTAREA') {
        doPrevent = d.readOnly || d.disabled;
      }
      else {
        doPrevent = true;
      }
    }

    if (doPrevent) {
      event.preventDefault();
    }
  });
}

function arrowKeys() {
  $(document).bind("keydown", function(evt) {
    // Block the functionality if user is not on canvas
    // This is terrible
    var active = $(document.activeElement);
    if (active.is('input,textarea,text,password,file,email,search,tel,date')) {
      return;
    } else if (document.activeElement.tagName !== 'BODY') {
      return;
    }

    evt = evt || window.event;
    var movementDelta = 2;
    if (evt.shiftKey) {
      movementDelta = 10;
    }

    var activeObject = canvas.getActiveObject();
    var activeGroup = canvas.getActiveGroup();

    var a;
    if (evt.keyCode === 37) {
      evt.preventDefault(); // Prevent the default action
      if (activeObject) {
        a = activeObject.get('left') - movementDelta;
        activeObject.set('left', a);
      } else if (activeGroup) {
        a = activeGroup.get('left') - movementDelta;
        activeGroup.set('left', a);
      }

    } else if (evt.keyCode === 39) {
      evt.preventDefault(); // Prevent the default action
      if (activeObject) {
        a = activeObject.get('left') + movementDelta;
        activeObject.set('left', a);
      } else if (activeGroup) {
        a = activeGroup.get('left') + movementDelta;
        activeGroup.set('left', a);
      }

    } else if (evt.keyCode === 38) {
      evt.preventDefault(); // Prevent the default action
      if (activeObject) {
        a = activeObject.get('top') - movementDelta;
        activeObject.set('top', a);
      } else if (activeGroup) {
        a = activeGroup.get('top') - movementDelta;
        activeGroup.set('top', a);
      }

    } else if (evt.keyCode === 40) {
      evt.preventDefault(); // Prevent the default action
      if (activeObject) {
        a = activeObject.get('top') + movementDelta;
        activeObject.set('top', a);
      } else if (activeGroup) {
        a = activeGroup.get('top') + movementDelta;
        activeGroup.set('top', a);
      }
    }

    if (activeObject) {
      activeObject.setCoords();
      canvas.renderAll();
    } else if (activeGroup) {
      activeGroup.setCoords();
      canvas.renderAll();
    }
  });
}

function showPreview() {
  var preview = $("#preview");

  // Get a cropped PNG
  var bounds = utils.getImageBounds(true);
  var url = canvas.toDataURL({
    format: 'png',
    left: bounds.left,
    top: bounds.top,
    width: bounds.width,
    height: bounds.height
  });
  $("#dynamic-preview").remove();
  var dynamic = preview.append("<img id='dynamic-preview' src='" + url + "'/>");
  var shirt = $("#preview-image");
  var design = $("#dynamic-preview");

  // Set width of image so that it fits in the tshirt
  design.width("18%");

  // Show shirt
  preview.removeClass("noshow");

  // Set image coordinates
  var shirtTop = shirt.position().top + parseInt(shirt.css("padding-top"));
  var shirtLeft = shirt.position().left;
  var shirtWidth = shirt.width();
  var shirtHeight = shirt.height();

  var top = shirtTop + Math.floor(shirtHeight * 0.32);
  var left = shirtLeft + Math.floor(shirtWidth * 0.32);
  design.css({top: top, left: left});

  // Set event listener
  $(document).bind("click.preview", function(event) {
    preview.addClass("noshow");
    $(document).unbind("click.preview");
  });
}

/* --- Color Pickers --- */

var changedFillColor;
var changedOutlineColor;

function handleFillColorChangeEvent(color) {
  if (canvas.getActiveObject() === null || canvas.getActiveObject() === undefined) {
    // no object selected
    return;
  }

  var hex = color;
  if (typeof(hex) === "object") {
    hex = color.toHexString();
  }

  if (hex === utils.getFillColor()) {
    // same color
    return;
  }

  utils.setFillColor(hex);
  canvas.renderAll();
  changedFillColor = true;
}

function fillColorPicker() {
  $("#toolbar-fill-color").spectrum({
    preferredFormat: "hex",
    showInput: true,
    color: 'white',
    showButtons: false,
    clickoutFiresChange: false,
    show: function(color) {
      changedFillColor = false;
    },
    hide: function(color) {
      if (changedFillColor === true) {
        // Push the canvas state to history
        canvas.trigger("object:statechange");
      }
      $("#toolbar-fill-color").removeClass("toolbar-item-active");
      $(".mdl-tooltip").removeClass("noshow");
    }
  });

  $("#toolbar-fill-color").unbind("dragstop.spectrum");
  $("#toolbar-fill-color").bind("dragstop.spectrum", function(e, color) {
    handleFillColorChangeEvent(color);
    return false;
  });

  $("#toolbar-fill-color").spectrum("container").find(".sp-input").on('keydown', function(evt) {
    var key = evt.keyCode || evt.which;
    if (key === 13) {
      handleFillColorChangeEvent($(this).val());
    }
  });
}

function handleOutlineColorChangeEvent(color) {
  if (canvas.getActiveObject() === null || canvas.getActiveObject() === undefined) {
    // no object selected
    return;
  }

  if (color === null) {
    // Transparent outline color
    utils.setOutlineColor(null);
    canvas.renderAll();
    changedOutlineColor = true;
    return;
  }

  var hex = color;
  if (typeof(hex) === "object") {
    hex = color.toHexString();
  }

  if (hex === utils.getOutlineColor()) {
    // same color
    return;
  }

  utils.setOutlineColor(hex);
  canvas.renderAll();
  changedOutlineColor = true;
}

function outlineColorPicker() {
  $("#toolbar-outline-color").spectrum({
    preferredFormat: "hex",
    showInput: true,
    color: 'white',
    showButtons: false,
    clickoutFiresChange: false,
    show: function(color) {
      changedOutlineColor = false;
    },
    hide: function(color) {
      if (changedOutlineColor === true) {
        // Push the canvas state to history
        canvas.trigger("object:statechange");
      }
      $("#toolbar-outline-color").removeClass("toolbar-item-active");
      $(".mdl-tooltip").removeClass("noshow");
    },
    move: function(color) {
      if (color === null) {
        // User selected transparent option
        handleOutlineColorChangeEvent(color);
      }
    },
    allowEmpty:true
  });

  $("#toolbar-outline-color").unbind("dragstop.spectrum");
  $("#toolbar-outline-color").bind("dragstop.spectrum", function(e, color) {
    handleOutlineColorChangeEvent(color);
    return false;
  });

  $("#toolbar-outline-color").spectrum("container").find(".sp-input").on('keydown', function(evt) {
    var key = evt.keyCode || evt.which;
    if (key === 13) {
      handleOutlineColorChangeEvent($(this).val());
    }
  });
}

/* --- shadow color pickers --- */

function shadowColorPicker() {
  $("#shadow-color-picker").spectrum({
    showAlpha: true,
    preferredFormat: "hex",
    showInput: true,
    color: '#000000',
    replacerClassName: 'spectrum-box',
    showButtons: false,
    clickoutFiresChange: false
  });

  $("#shadow-color-picker").unbind("dragstop.spectrum");
  $("#shadow-color-picker").bind("dragstop.spectrum", function(e, color) {
    var hex = color.toHexString();
    var rgba = color.toRgbString();
    $("#shadow-color-hex").val(hex);
    utils.changeShadowColor(rgba);
    return false;
  });

  $("#shadow-color-picker").spectrum("container").find(".sp-input").on('keydown', function(evt) {
    var key = evt.keyCode || evt.which;
    if (key === 13) {
      $("#shadow-color-hex").val($(this).val());
      utils.changeShadowColor($(this).val());
    }
  });
}

function glowColorPicker() {
  $("#glow-color-picker").spectrum({
    preferredFormat: "hex",
    showInput: true,
    color: '#000000',
    replacerClassName: 'spectrum-box',
    showButtons: false,
    clickoutFiresChange: false
  });

  $("#glow-color-picker").unbind("dragstop.spectrum");
  $("#glow-color-picker").bind("dragstop.spectrum", function(e, color) {
    var hex = color.toHexString();
    $("#glow-color-hex").val(hex);
    utils.changeShadowColor(hex);
    return false;
  });

  $("#glow-color-picker").spectrum("container").find(".sp-input").on('keydown', function(evt) {
    var key = evt.keyCode || evt.which;
    if (key === 13) {
      $("#glow-color-hex").val($(this).val());
      utils.changeShadowColor($(this).val());
    }
  });
}


/* --- Sidebar --- */

// Close an open panel with the ESC key
function escHandler(e) {
  if (e.keyCode == 27) {
    var open = $("div.sidebar-item-selected");
    closePanel(open, true);

    // Unregister escape key handler
    $(document).unbind("keyup", escHandler);
  }
}

function openPanel(button, animate) {
  // Register escape key handler
  $(document).keyup(escHandler);

  // Change button style
  button.addClass("sidebar-item-selected");
  $('.inactive', button).addClass("noshow");
  $('.active', button).removeClass("noshow");

  // Swap panels
  var pname = button.attr("id").split("-")[1];
  $('#drawer .slideout-body').addClass("noshow");
  $('#drawer #' + pname + "-panel").removeClass("noshow");

  // Open panel
  if (animate) {
    if ($("#drawer.is-visible").length === 0) {
      $(".mdl-layout__drawer-button").click();
    }
  }

  // Set artwork search results height
  // so that scrolling handler works correctly
  fitArtworkResultsHeight();

  // Register click event handler
  $(document).bind("click.menu", function(event) {
    if (!( $(event.target).closest($("#drawer")).length )) {
      if ($(event.target)[0].id === "sidebar") {
        closePanel(null, true);
      } else {
        closePanel(null, false);
      }
    }
  });

  // Panel-specific logic
  if (pname === "artwork") {
    $("#drawer #artwork-search").select();
  }
}

function closePanel(button, animate) {
  // Unregister escape key handler
  $(document).unbind("keyup", escHandler);

  // Find open panel
  if (button === null) {
    button = $(".sidebar-item-selected");
  }

  // Error catching
  if (button === null || button === []) return;

  // Change button style
  $('.inactive', button).removeClass("noshow");
  $('.active', button).addClass("noshow");
  button.removeClass("sidebar-item-selected");

  // Close panel
  if (animate === true) {
    if ($("#drawer.is-visible").length === 1) {
      $(".mdl-layout__drawer-button").click();
    }
  }

  // Unregister click event handler
  $(document).unbind("click.menu");
}

function closeSubmenu(menu, noTooltips) {
  menu.removeClass("toolbar-item-active");
  menu.children(".toolbar-submenu").addClass("noshow");

  if (noTooltips !== true) {
    // Delay showing of tooltips to prevent flashing behavior
    setTimeout(function(){ $(".mdl-tooltip").removeClass("noshow"); }, 200);
  }
}

/* --- artwork search --- */

function toggleArtworkSearchSpinner(show) {
  if (show === true) {
    $("#no-results").addClass("noshow");
    var parent = $("#artwork-panel > .search-results");
    parent.append($("#artwork-spinner").remove());
    $("#artwork-spinner").removeClass("noshow");
  } else {
    $("#artwork-spinner").addClass("noshow");
  }
}

function toggleArtworkNoResults(show) {
  if (show === true) {
    $("#no-results").removeClass("noshow");
  } else {
    $("#no-results").addClass("noshow");
  }
}

function fitArtworkResultsHeight() {
  if ($("#drawer.is-visible").length !== 0) {
    // Set artwork search results height
    // so that scrolling handler works correctly
    var height = window.innerHeight - ($("#artwork-panel > .mdl-layout-title").height() + $("#artwork-panel > form").height() + 85);
    $("#artwork-panel > .search-results").height(height);
  }
}

/* ----- exports ----- */

function PageModule() {
  if (!(this instanceof PageModule)) return new PageModule();

  // handlers
  noBackspace();
  arrowKeys();

  // fix broken MDL sliders in IE Edge Browser
  var user_agent = navigator.userAgent;
  var edge = /(edge)\/((\d+)?[\w\.]+)/i;
  if (edge.test(user_agent)) {
    $("input.mdl-slider.mdl-js-slider").removeClass("mdl-slider mdl-js-slider");
  }

  // Fix broken sidebar in Safari
  var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
               navigator.userAgent && !navigator.userAgent.match('CriOS');
  if (isSafari === true) {
    $(".mdl-navigation").css("height", "100%");
  }
}

PageModule.prototype.showPreview = showPreview;
PageModule.prototype.openPanel = openPanel;
PageModule.prototype.closePanel = closePanel;
PageModule.prototype.closeSubmenu = closeSubmenu;
PageModule.prototype.fillColorPicker = fillColorPicker;
PageModule.prototype.outlineColorPicker = outlineColorPicker;
PageModule.prototype.toggleArtworkSearchSpinner = toggleArtworkSearchSpinner;
PageModule.prototype.toggleArtworkNoResults = toggleArtworkNoResults;
PageModule.prototype.fitArtworkResultsHeight = fitArtworkResultsHeight;
PageModule.prototype.shadowColorPicker = shadowColorPicker;
PageModule.prototype.glowColorPicker = glowColorPicker;

module.exports = PageModule;
