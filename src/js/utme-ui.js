(function (utme) {

    function createButton(text, classes, callback) {
        var button = document.createElement('a');
        button.className = 'utme-button ' + classes;
        button.setAttribute('data-ignore', true);
        button.innerHTML = text;
        button.addEventListener('click', callback);
        return button;
    }

    function toggleHighlight(ele, value) {
        $(ele).toggleClass('utme-verify', value);
    }


    function updateButton(ele, text, disabled) {
        if (disabled) {
            ele.className = ele.className + " " + "disabled";
        } else {
            ele.className = (ele.className || "").replace(/ disabled/g, "");
        }

        ele.innerHTML = text;
    }

    function initEventListeners() {
        var events = ['mouseover', 'mouseout'];

        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function (evt) {
                var handler = function (e) {
                    if (e.isTrigger)
                        return;

                    if (utme.isValidating() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore')) {
                        e.preventDefault();
                        if (evt == 'mouseover') {
                            toggleHighlight(e.target, true);
                        }
                        if (evt == 'mouseout') {
                            toggleHighlight(e.target, false);
                        }
                        if (evt == 'click' || evt == 'mousedown') {
                            utme.registerEvent('validate', {
                                locator: utme.createElementLocator(e.target),
                                text: $(e.target).text()
                            }, idx);
                        }
                        return false;
                    }
                };
                return handler;
            })(events[i]), true);
        }
    }

    function initControls() {
        initEventListeners();

        var buttonBar = document.createElement('div');
        buttonBar.className = 'utme-bar';
        buttonBar.setAttribute('data-ignore', true);

        function updateButtonStates() {
            updateButton(recordButton, utme.isRecording() || utme.isValidating() ? 'Stop Recording' : 'Record Scenario', utme.isPlaying());
            updateButton(runButton, utme.isPlaying() ? 'Stop Running' : 'Run Scenario', utme.isValidating() || utme.isRecording());
            updateButton(validateButton, utme.isValidating() ? 'Done Validating' : 'Validate', !(utme.isRecording() || utme.isValidating()));
            updateButton(timeoutButton, 'Add Timeout', !utme.isRecording());
            updateButton(pauseButton, utme.state.autoRun ? 'Pause' : "Resume", !utme.isPlaying());
            updateButton(stepButton, 'Step', !utme.isPlaying() || utme.state.autoRun);
        }

        utme.registerListener(updateButtonStates);

        var pauseButton = createButton('Pause', 'pause', function () {
            utme.state.autoRun = !utme.state.autoRun;
        });

        var stepButton = createButton('Step', 'stepButton', function (e) {
            utme.runNextStep(utme.state.runningScenario, utme.state.runningStep);
            return false;
        });

        var timeoutButton = createButton('Add Timeout', 'timeout', function () {
            var oldStatus = utme.isRecording();
            if (oldStatus) {
                utme.registerEvent('timeout', {
                    amount: parseInt(prompt("How long in ms?"), 10)
                });
            }
        });

        var recordButton = createButton('Record Scenario', 'start', function () {
            if (utme.isRecording() || utme.isValidating()) {
                utme.stopRecording();
            } else {
                utme.startRecording();
            }
        });

        var runButton = createButton('Run Scenario', 'run', function () {
            if (!(utme.isRecording() || utme.isPlaying() || utme.isValidating())) {
                utme.runScenario();
            } else {
                utme.stopScenario(false);
            }
        });

        var validateButton = createButton('Validate', 'verify', function () {
            var isValidating = utme.isValidating();
            if (utme.isRecording() || isValidating) {
                if (isValidating) {
                    toggleHighlight($('.utme-verify'), false);
                }
                utme.isValidating(!isValidating);
            }

            updateButtonStates();
        });

        updateButtonStates();

        buttonBar.appendChild(recordButton);
        buttonBar.appendChild(timeoutButton);
        buttonBar.appendChild(validateButton);
        buttonBar.appendChild(runButton);
        buttonBar.appendChild(pauseButton);
        buttonBar.appendChild(stepButton);

        document.body.appendChild(buttonBar);
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
})(window.utme);
