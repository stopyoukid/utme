var utme = require('../js/utme');
var body = require('./body');
var ControlPanel = require('./components/control-panel.jsx');
var utmeui = {};

function toggleHighlight(ele, value) {
    $(ele).toggleClass('utme-verify', value);
}

function initEventListeners() {
    var events = ['mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'click'];

    for (var i = 0; i < events.length; i++) {
        document.addEventListener(events[i], (function (evt) {
            var handler = function (e) {
                if (e.isTrigger)
                    return;

                if (utme.isValidating() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore') && $(e.target).parents("[data-ignore]").length == 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (evt == 'mouseover') {
                        toggleHighlight(e.target, true);
                    }
                    if (evt == 'mouseout') {
                        toggleHighlight(e.target, false);
                    }
                    if (evt == 'mousedown') {
                        utme.registerEvent('validate', {
                            locator: utme.createElementLocator(e.target),
                            text: $(e.target).text()
                        });
                    }
                    return false;
                }
            };
            return handler;
        })(events[i]), true);
    }

    // Add in some validation hot keys
    document.addEventListener('keydown', function (e) {
        var evtobj = window.event? event : e
        if (utme.isValidating() || utme.isRecording()) {
            if (evtobj.keyCode == 86 && evtobj.ctrlKey && evtobj.altKey) {
                utme.isValidating(!utme.isValidating());
            }
        }


        if (evtobj.keyCode == 82 && evtobj.ctrlKey && evtobj.altKey) {
            if (utme.isRecording() || utme.isValidating()) {
                showScenarioForm(function(info, form) {
                    destroyScenarioForm();
                    utme.stopRecording(info ? info : false);
                });
            } else if (!utme.isRecording())  {
                utme.startRecording();
            }
        }
    });
}

function initControls() {
    body.appendComponent(ControlPanel, 'utme-bar');
}

if (utme) {
    if (!utme.state || utme.state.status != 'INITIALIZED') {
        utme.registerListener(function(eventName) {
            if (eventName == 'INITIALIZED') {
                initControls();
            }
        });
    } else {
        initControls();
    }
}

module.exports = utmeui;