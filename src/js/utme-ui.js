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
        var events = ['mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'click'];

        for (var i = 0; i < events.length; i++) {
            document.addEventListener(events[i], (function (evt) {
                var handler = function (e) {
                    if (e.isTrigger)
                        return;

                    if (utme.isValidating() && e.target.hasAttribute && !e.target.hasAttribute('data-ignore')) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
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
                            });
                        }
                        return false;
                    }
                };
                return handler;
            })(events[i]), true);
        }
    }

    function createLabeledInput(text, classes) {
        var div = document.createElement("div");
        var label = document.createElement("label");
        var input = document.createElement("input");
        input.type = 'text';

        label.innerHTML = "<span>" + text + "</span>";
        div.appendChild(label);

        var inputDiv = document.createElement("div");
        inputDiv.appendChild(input);

        div.appendChild(inputDiv);

        div.className = 'utme-input ' + classes;

        return div;
    }

    function createLabeledTextArea(text, classes) {
      var div = document.createElement("div");
      var label = document.createElement("label");
      var input = document.createElement("textarea");
      label.innerHTML = "<span>" + text + "</span>";
      div.appendChild(label);

      var inputDiv = document.createElement("div");
      inputDiv.appendChild(input);

      div.appendChild(inputDiv);
      
      div.className = 'utme-input ' + classes;

      return div;
    }

    function showScenarioForm(callback) {
        var form = document.createElement('div');
        form.className = 'utme-scenario-form';
        form.setAttribute('data-ignore', true);

        var nameInput = createLabeledInput('Scenario Name:', '');
        form.appendChild(nameInput);

        var descriptionInput = createLabeledTextArea('Description (Optional):', '');
        form.appendChild(descriptionInput);

        var setupInput = createLabeledTextArea('Setup Scenarios (Optional, Newline separated):', '');
        form.appendChild(setupInput);

        form.appendChild(createButton('Save', 'okButton', function(e) {
          var name = nameInput.querySelector("input").value;
          var description = descriptionInput.querySelector("textarea").value;
          var setup = setupInput.querySelector("textarea").value;

          var info = {};
          if (name) {
              info.name = name;
          }

          if (description) {
              info.description = description;
          }

          if (setup) {
              info.setup = {
                  scenarios: setup.split("\n")
              };
          }

          e.stopPropagation();
          callback(info);
        }));

        form.appendChild(createButton('Cancel', 'cancelButton', function(e) {
          e.stopPropagation();
          callback();
        }));

        var overlay = document.createElement('div');
        overlay.className = 'utme-scenario-form-background';
        overlay.setAttribute('data-ignore', true);

        document.body.appendChild(overlay);
        document.body.appendChild(form);
        return overlay;
    }

    function destroyScenarioForm() {
        var form = document.querySelectorAll('.utme-scenario-form')[0];
        var overlay = document.querySelectorAll('.utme-scenario-form-background')[0];

        form.parentNode.removeChild(form);
        overlay.parentNode.removeChild(overlay);
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
                showScenarioForm(function(info, form) {
                    destroyScenarioForm();
                    utme.stopRecording(info ? info : false);
                });
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
