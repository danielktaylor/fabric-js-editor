"use strict";

var canvas = global.canvas;

require('../lib/jquery.ui.position.min.js');
require('../lib/jquery.contextMenu.min.js');
require('../lib/jquery.tooltipster.min.js');

var config = require('./config.js');
var utils = new (require('./fabricUtils.js'))();
var page = new (require('./page.js'))();
var drawing = new (require('./drawing.js'))();
var text = new (require('./text.js'))();
var fetchApi = new (require('./fetchApi.js'))();
var importExport = new (require('./importExport.js'))();
var isAppLoading = true;

// Initialize state
var state = new (require('./state.js'))(
  function() {
    // get state
    return JSON.stringify(canvas);
  },
  function(newState) {
    // set state
    canvas.clear();
    canvas.loadFromJSON(newState);
    canvas.renderAll();
  }
);

function deleteHandler() {
  // Handler for the delete and backspace keys
  $(document).keyup(function(e) {
    if(e.which == 46 || e.which == 8) {
      // Block the functionality if user is entering text
      var active = $(document.activeElement);
      if (active.is('input,textarea,text,password,file,email,search,tel,date')) {
        return;
      }

      utils.deleteSelected();
      e.preventDefault();
    }
  });
}

function rightClick() {
  // Setup right-click context menu
  $.contextMenu({
    selector: '#content',
    trigger: 'right',
    animation: { duration: 0 },
    callback: function(itemKey, opt){
      if (itemKey === "delete") {
        utils.deleteSelected();
      } else if (itemKey === "forward") {
        utils.sendForward();
      } else if (itemKey === "front") {
        utils.sendToFront();
      } else if (itemKey === "backward") {
        utils.sendBackward();
      } else if (itemKey === "back") {
        utils.sendToBack();
      } else if (itemKey === "clone") {
        utils.clone();
      }
    },
    items: {
      "forward": {name: "Bring Forward"},
      "front": {name: "Bring to Front"},
      "backward": {name: "Send Backward"},
      "back": {name: "Send to Back"},
      "sep1": "---------",
      "clone": {name: "Clone"},
      "sep2": "---------",
      "delete": {name: "Delete"}
    }
  });

  // Bind right-click menu
  $('#content').bind('contextmenu.custom', function (e) {
    var target = canvas.findTarget(e.e);
    if (target !== null && target !== undefined) {
      canvas.setActiveObject(target);
      return true;
    }
    return false;
  });
}

function toggle(button) {
  var open = $("div.sidebar-item-selected");

  if (open.length === 0) {
    page.openPanel(button, true);
    return;
  }

  if (open.attr("id") == button.attr("id")) {
    // Same button clicked
    page.closePanel(open, true);
  } else {
    // Different button clicked
    page.closePanel(open, false);
    page.openPanel(button, false);
  }
}

function hideActiveTools() {
  $("#active-tools").addClass("noshow");
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function showCurrentFont() {
  var font = toTitleCase(utils.getFont());
  if (font.length > 9) {
    font = font.substring(0,10) + "...";
  }
  $("#current-font").text(font);
}

function showActiveTools() {
  if (isAppLoading === true) {
    return;
  }

  var tools = $("#active-tools");
  var obj = canvas.getActiveObject();

  if (canvas.getActiveGroup() !== null && canvas.getActiveGroup() !== undefined) {
    $("#active-tools > div").addClass("noshow");
    tools.removeClass("noshow");
    $("div.group", tools).removeClass("noshow");
  } else if (obj !== null && obj !== undefined) {
    $("#active-tools > div").addClass("noshow");
    tools.removeClass("noshow");

    var type = canvas.getActiveObject().type;
    if (type === "i-text") {
      $("div.text", tools).removeClass("noshow");

      if (text.isBold(obj)) {
        $("#toolbar-bold").addClass("toolbar-item-active");
      } else {
        $("#toolbar-bold").removeClass("toolbar-item-active");
      }

      if (text.isItalics(obj)) {
        $("#toolbar-italics").addClass("toolbar-item-active");
      } else {
        $("#toolbar-italics").removeClass("toolbar-item-active");
      }

      if (text.isUnderline(obj)) {
        $("#toolbar-underline").addClass("toolbar-item-active");
      } else {
        $("#toolbar-underline").removeClass("toolbar-item-active");
      }

      /*
      $("#font-size").val(utils.getFontSize());
      $("#font-size").change(function(value) {
        utils.setFontSize($("#font-size").val());
      });
      */

      showCurrentFont();

    } else if (type === "svg") {
      $("div.svg", tools).removeClass("noshow");
    } else {
      $("div.shape", tools).removeClass("noshow");
    }

    // Init fill color picker
    page.fillColorPicker();
    var color = utils.getFillColor();
    if (color && color !== "") {
      $("#toolbar-fill-color").spectrum("set", color);
    }

    // Init outline color picker
    page.outlineColorPicker();
    var outlineColor = utils.getOutlineColor();
    if (outlineColor && outlineColor !== "") {
      $("#toolbar-outline-color").spectrum("set", outlineColor);
    }

    // Shadow and glow
    setCurrentShadowValues();
    page.glowColorPicker();
    page.shadowColorPicker();

  } else {
    hideActiveTools();
  }
}

function fitSearchResults() {
  var results = $("#slideout-artwork > .slideout-body > .search-results");
  var padding = $("#top").height() + 175;
  results.css("height", window.innerHeight - padding);
}

function resetFormElement(e) {
  e.wrap('<form>').closest('form').get(0).reset();
  e.unwrap();

  // Prevent form submission
  e.stopPropagation();
  e.preventDefault();
}

function listeners() {
  // font selection
  var fontClickHandler = function() {
    var fontName = $(this).text();
    utils.setFont(fontName);
    showCurrentFont();
    text.returnFocus();
  };

  $(window).on("fontLoadedEvent", function(event, family) {
    var familyId = "font-family-" + family.replace(/\s+/g, '');

    var str = '';
    str += '<div class="submenu-item" id="' + familyId;
    str += '"><span style="font-family: ';
    str += "'" + family + "'";
    str += '">' + family;
    str += "</span></div>";

    $("#toolbar-font-family > .toolbar-submenu").append(str);

    var element = $("#" + familyId);
    element.click(fontClickHandler);
  });

  $(window).on("allFontsLoadedEvent", function(event, family) {
    // Is the menu being used?
    if ($("#toolbar-font-family").hasClass("toolbar-item-active") === true) {
      return;
    }

    // Sort the fonts
    var sorted = $("#toolbar-font-family .submenu-item").sort(function (a, b) {
      var contentA = $(a)[0].id;
      var contentB = $(b)[0].id;
      return (contentA < contentB) ? -1 : (contentA > contentB) ? 1 : 0;
    });
    $("#toolbar-font-family .toolbar-submenu").html(sorted);

    // Set new event listeners
    $("#toolbar-font-family .submenu-item").click(fontClickHandler);
  });

  $("#font-arial").click(function() {
    utils.setFont("Arial");
    showCurrentFont();
    text.returnFocus();
  });

  // Set event listeners
  canvas.on({
    "object:selected": function() {
      showActiveTools();
    },
    "selection:cleared": function() {
      showActiveTools();
    }
  });

  window.addEventListener('resize', fitSearchResults, false);
  fitSearchResults();

  $(".sidebar-item").click(function() {
    toggle($(this));
    return false;
  }).hover(function() {
    if (!$(this).hasClass("sidebar-item-active")) {
      $(this).addClass("sidebar-item-hover");
    }
  }, function() {
    $(this).removeClass("sidebar-item-hover");
  });

  $("#toolbar-undo").click(function() {
    state.undo();
  });

  $("#toolbar-redo").click(function() {
    state.redo();
  });

  $("#toolbar-text").click(function() {
    $(document).trigger("click.submenu"); // Make sure all submenus are closed
    if ($("#toolbar-text").hasClass("toolbar-item-active")) {
      $("#toolbar-text").removeClass("toolbar-item-active");
      text.cancelInsert();
    } else {
      $("#toolbar-text").addClass("toolbar-item-active");
      text.insertText();
    }
  });

  // toolbar submenus
  $('.toolbar-dropdown').each(function(i, obj) {
    $(obj).click(function(event) {
      var button = $(this);
      var popup = $(".toolbar-submenu", button);
      var visible = popup.is(":visible");

      if (visible) {
        // We're closing the submenu
        var clickedButton = event.target.id === button.attr('id');
        var noAutoClose = $(".toolbar-submenu", button).hasClass("no-auto-close");
        if (!clickedButton && noAutoClose) {
          return;
        }

        page.closeSubmenu(button);
        $(document).unbind("click.submenu");
      } else {
        // We're opening the submenu
        $(document).trigger("click.submenu", true);

        button.addClass("toolbar-item-active");
        $(".mdl-tooltip").addClass("noshow");

        var x = button.offset().top + 27;
        var y = button.offset().left;
        popup.css({top: x, left: y});
        popup.removeClass("noshow");

        $(document).bind("click.submenu", function(event, noTooltips) {
          if (event.target.id === button.attr('id')) {
            return;
          }

          page.closeSubmenu(button, noTooltips);
          $(document).unbind("click.submenu");
        });

        // Hack to get spectrum color pickers to redraw
        if (popup[0] && popup[0].id === "shadow-submenu") {
          var shadowColor = utils.getShadowColor();
          $("#shadow-color-picker").spectrum("set", shadowColor);
          $("#shadow-color-hex").val($("#shadow-color-picker").spectrum("get").toHexString());

          $("#glow-color-hex").val(shadowColor);
          $("#glow-color-picker").spectrum("set", shadowColor);
        }
      }
    });
  });

  $("#shapes-line").click(function() {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("line");
    canvas.defaultCursor = 'crosshair';
  });

  $("#shapes-circle").click(function() {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("circle");
    canvas.defaultCursor = 'crosshair';
  });

  $("#shapes-rectangle").click(function() {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("square");
    canvas.defaultCursor = 'crosshair';
  });

  $("#shapes-rounded").click(function() {
    canvas.deactivateAllWithDispatch();
    canvas.renderAll();
    drawing.drawObj("rounded-rect");
    canvas.defaultCursor = 'crosshair';
  });

  $("#download-button").click(function() {
    toggle($("#sidebar-export"));
    return false;
  });

  $("#preview-button").click(function() {
    page.showPreview();
    hideActiveTools();
    return false;
  });

  // Export panel

  $("#download-image-button").click(function() {
    var type = $("input[name=file-type]:checked").val();
    var background = $("input[name=background-color]:checked").val();

    var rect;
    if (background === 'white' || type === 'jpeg') {
      if (type === 'png' || type === 'jpeg') {
        canvas.setBackgroundColor("#FFFFFF");
        canvas.renderAll();
      } else {
        rect = new fabric.Rect({
          left: 0,
          top: 0,
          fill: 'white',
          width: canvas.width,
          height: canvas.height
        });
        canvas.add(rect);
        canvas.sendToBack(rect);
        canvas.renderAll();
      }
    }

    utils.exportFile(type);
    hideActiveTools();

    // Cleanup background
    if (background === 'white' || type === 'jpeg') {
      if (type === 'png' || type === 'jpeg') {
        canvas.setBackgroundColor("");
      } else {
        canvas.remove(rect);
      }
      canvas.renderAll();
    }
  });

  $("#export-file-button").click(function() {
    // Broken in Safari
    var isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
                 navigator.userAgent && !navigator.userAgent.match('CriOS');
    if (isSafari === true) {
      window.alert("Sorry, Safari does not support exporting your work. You can still use the sharing tool instead!");
      return;
    }

    var data = JSON.stringify(canvas);
    importExport.exportFile(data, 'design.logo');
  });

  $("#import-file-button").on("change", function(e) {
    $("#loading-spinner").removeClass("noshow");
    page.closePanel(null, true);

    var files = e.target.files;
    var reader = new FileReader();

    reader.onload = function(e) {
      try {
        var data = reader.result;
        importExport.importFile(data, function(data) {
          canvas.clear();
          canvas.loadFromJSON(data);
          utils.centerContent();
          $("#loading-spinner").addClass("noshow");
        });

        // Clear the form so you can load another file
        resetFormElement($("#import-wrapper"));
      } catch (err) {
        $("#loading-spinner").addClass("noshow");
      }
    };

    reader.readAsArrayBuffer(files[0]);
  });

  // Search panel

  $("#artwork-search-form").submit(function(e) {
    // Prevent form submission
    e.preventDefault();

    // Fetch artwork
    var term = $("#artwork-search").val().trim();
    var resultsDiv = $("#artwork-panel > .search-results");

    var isClipart = $("input[name=search-type]:checked").val() === "clipart";
    fetchApi.search(term,
      page.toggleArtworkSearchSpinner,
      page.toggleArtworkNoResults,
      resultsDiv,
      function(url) {
        utils.insertSvg(url, $("#loading-spinner"));
        page.closePanel(null, true);
      },
      isClipart);
  });

  $("#search-submit").click(function(){
    $('form[name=artwork-search-form]').submit();
  });

  // Search again if user changes search type
  $('input[type=radio][name=search-type]').change(function() {
    if ($("#artwork-search").val() !== "") {
      $('form[name=artwork-search-form]').submit();
    }
  });

  /* ----- Active Selection Tools ------- */

  $("#toolbar-bold").click(function() {
    text.toggleBold();
    text.returnFocus();
  });

  $("#toolbar-italics").click(function() {
    text.toggleItalics();
    text.returnFocus();
  });

  $("#toolbar-underline").click(function() {
    text.toggleUnderline();
    text.returnFocus();
  });

  $("#toolbar-send-back").click(function() {
    utils.sendToBack();
  });

  $("#toolbar-send-backward").click(function() {
    utils.sendBackward();
  });

  $("#toolbar-bring-forward").click(function() {
    utils.sendForward();
  });

  $("#toolbar-bring-front").click(function() {
    utils.sendToFront();
  });

  $("#shadow-switch").change(function() {
    if($(this).is(":checked")) {
      $("#glow-switch-label")[0].MaterialSwitch.off();
      $("#shadow-options").slideToggle(200);

      // Close other options
      if ($("#glow-options").css("display") !== "none") {
        $("#glow-options").slideToggle(200);
      }

      setShadow();

      var shadowColor = utils.getShadowColor();
      $("#shadow-color-hex").val(shadowColor);
    } else {
      utils.clearShadow();
      $("#shadow-options").slideToggle(200);
    }
  });

  $("#glow-switch").change(function() {
    if($(this).is(":checked")) {
      $("#shadow-switch-label")[0].MaterialSwitch.off();
      $("#glow-options").slideToggle(200);

      // Close other options
      if ($("#shadow-options").css("display") !== "none") {
        $("#shadow-options").slideToggle(200);
      }

      setShadow();

      var shadowColor = utils.getShadowColor();
      $("#glow-color-hex").val(shadowColor);
    } else {
      utils.clearShadow();
      $("#glow-options").slideToggle(200);
    }
  });

  $("#shadow-blur-slider").change(function() {
    setShadow();
  });

  $("#shadow-offset-slider").change(function() {
    setShadow();
  });

  $("#glow-size-slider").change(function() {
    setShadow();
  });
}

function setCurrentShadowValues() {
  var shadowColor;
  if (utils.isShadow()) {
    $("#shadow-switch-label")[0].MaterialSwitch.on();
    $("#glow-switch-label")[0].MaterialSwitch.off();

    $("#shadow-offset-slider")[0].MaterialSlider.change(utils.getShadowOffset().x);
    $("#shadow-blur-slider")[0].MaterialSlider.change(utils.getShadowBlur());

    shadowColor = utils.getShadowColor();
    $("#shadow-color-picker").spectrum("set", shadowColor);
    $("#shadow-color-hex").val($("#shadow-color-picker").spectrum("get").toHexString());

    $("#shadow-options").show();
    $("#glow-options").hide();
  } else if (utils.isGlow()) {
    $("#shadow-switch-label")[0].MaterialSwitch.off();
    $("#glow-switch-label")[0].MaterialSwitch.on();

    $("#glow-size-slider")[0].MaterialSlider.change(utils.getShadowBlur());

    shadowColor = utils.getShadowColor();
    $("#glow-color-hex").val(shadowColor);
    $("#glow-color-picker").spectrum("set", shadowColor);

    $("#shadow-options").hide();
    $("#glow-options").show();
  } else {
    $("#glow-switch-label")[0].MaterialSwitch.off();
    $("#shadow-switch-label")[0].MaterialSwitch.off();
    $("#shadow-options").hide();
    $("#glow-options").hide();
  }
}

function setShadow() {
  var blur, color, offset;

  if ($("#shadow-switch").is(":checked")) {
    color = $("#shadow-color-picker").spectrum("get").toRgbString();
    blur = $("#shadow-blur-slider")[0].value;
    offset = $("#shadow-offset-slider")[0].value;
    utils.setShadow(color, blur, offset, offset);
  }

  if ($("#glow-switch").is(":checked")) {
    color = $("#glow-color-picker").spectrum("get").toHexString();
    blur = $("#glow-size-slider")[0].value;
    utils.setShadow(color, blur, 0, 0);
  }
}

function resizeHandler() {
  // Resize the canvas size
  var width = $("#content").width() - 100;
  canvas.setWidth(width);
  $("#canvas-container").css({left: "50px", top: "40px", width: width});
  canvas.setHeight(window.innerHeight - $("#toolbar").height() - 150);

  // Resize the search results panel
  page.fitArtworkResultsHeight();
}

var getUrlParameter = function getUrlParameter(sParam) {
  var sPageURL = decodeURIComponent(window.location.search.substring(1)),
    sURLVariables = sPageURL.split('&'),
    sParameterName,
    i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : sParameterName[1];
    }
  }
};

function popupCenter(url, title, w, h) {
	// Fixes dual-screen position                         Most browsers      Firefox
	var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
	var dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;

	var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
	var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

	var left = ((width / 2) - (w / 2)) + dualScreenLeft;
	var top = ((height / 3) - (h / 3)) + dualScreenTop;

	var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

	// Puts focus on the newWindow
	if (newWindow && newWindow.focus) {
		newWindow.focus();
	}
}

/* ----- exports ----- */

function HandlersModule() {
  if (!(this instanceof HandlersModule)) return new HandlersModule();

  // Show loading spinner until sample image has been loaded
  $("#loading-spinner").removeClass("noshow");

  // Initialize canvas
  fabric.Object.prototype.transparentCorners = false;
  window.addEventListener('resize', resizeHandler, false);
  resizeHandler();

  // Change fabric.js selection styles
  fabric.Object.prototype.set({
    borderColor: "#1c55d5",
    cornerColor: "#1c55d5",
    cornerSize: 8,
    rotatingPointOffset: 30
  });

  // Preserve object layer order when selecting objects
  canvas.preserveObjectStacking = true;

  // Setup handlers
  deleteHandler();
  rightClick();
  listeners();

  // Load image
  var logoFile = getUrlParameter('i');
  if (logoFile !== null && logoFile !== undefined && logoFile !== "") {
    try {
      var url = config.icons.host + "/shared/" + logoFile;
      importExport.loadRemoteFile(url, function(decoded_data) {
        if (decoded_data !== null) {
          canvas.clear();
          canvas.loadFromJSON(decoded_data);
          utils.centerContent();
        }
        $("#loading-spinner").addClass("noshow");
      });
    } catch (err) {
      $("#loading-spinner").addClass("noshow");
    }
  } else {
    try {
      canvas.clear();
      //canvas.loadFromJSON(sampleImage); -- use this to load a default image
      //utils.centerContent();
      $("#loading-spinner").addClass("noshow");
    } catch (err) {
      $("#loading-spinner").addClass("noshow");
    }

    // Show popup tooltip on artwork search button when the page loads
    /*
    $("#sidebar-artwork > .inactive > img").tooltipster({
      theme: 'tooltipster-daring',
      contentAsHTML: true,
      animation: 'grow',     // fade, grow, swing, slide, fall
      speed: 150,
      hideOnClick: true,
      interactive: false,
      interactiveTolerance: 350,
      onlyOne: true,
      position: 'right',
      content: "<p class='onload-tooltip'><strong>Start here!</strong> Search for an image <br/> to begin making your image.</p>",
      trigger: 'custom',
      offsetX: 18,
      offsetY: 5,
      functionReady: function(){
        $(document).click(function() {
          $("#sidebar-artwork > .inactive > img").tooltipster('hide');
        });
    }
    });
    window.setTimeout(function() {
      $("#sidebar-artwork > .inactive > img").tooltipster('show');
    }, 400);
    */

  }

  // Undo redo
  canvas.on("object:modified", function() {
    state.save();
  });

  canvas.on("object:removed", function() {
    state.save();
  });

  canvas.on("object:statechange", function() {
    state.save();
  });

  isAppLoading = false;
}

module.exports = HandlersModule;
