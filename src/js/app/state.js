"use strict";

var states = [];
var currentState = 0;
var restoring = false;
var getState, setState;

function pushState() {
  if (restoring) {
    return;
  }

  var state = getState();
  if (state === states[currentState]) {
    // nothing has changed
    return;
  }

  // Cap the number of states
  if (currentState > 99) {
    currentState--;
    states.shift();
  }

  if (currentState < states.length - 1) {
    // Forking stack
    var remove = (states.length - 1) - currentState;
    states = states.slice(0, states.length - remove);
  }

  currentState++;
  states.push(state);
}

function restore(state) {
  restoring = true;
  setState(state);
  restoring = false;
}

function undo() {
  if (currentState > 0) {
    currentState--;
    restore(states[currentState]);
  }
}

function redo() {
  if (currentState < (states.length - 1)) {
    currentState++;
    restore(states[currentState]);
  }
}

/* ----- exports ----- */

function StateModule(_getState, _setState) {
  if (!(this instanceof StateModule)) return new StateModule();
  getState = _getState;
  setState = _setState;
	states.push(getState());
}

StateModule.prototype.save = pushState;
StateModule.prototype.undo = undo;
StateModule.prototype.redo = redo;

module.exports = StateModule;
