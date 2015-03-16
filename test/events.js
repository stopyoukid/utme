module.exports = {
    "checkboxesCheckProperly": {
        "test": "Click a checkbox and replay it properly",
        "html": "<input type='checkbox'/>",
        "events": [{
            "selector": "#testArea input",
            "event": "change",
            "checked": true
        }, {
            "selector": "#testArea input",
            "event": "click",
            "checked": true
        }]
    }
};