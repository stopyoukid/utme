module.exports = {
    "elementWithClick": {
        "test": "fires click event",
        "scenario": {
            "steps": [{
                "eventName": "click",
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            }]
        },
        "html": "<div></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "click"
        }]
    },
    "elementWithNoImportantEvents": {
        "test": "does not fire events, if no important events are found",
        "scenario": {
            "steps": [{
                "eventName": "mouseenter",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "mouseover",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 20,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 30,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div></div>",
        "expect": []
    },
    "elementWithNoImportantEventsButHighHoverTime":  {
        "test": "fire non important events when the user has interacted with the element for a long time",
        "description": "This is useful for hover behaviors, menus that show up on hover",
        "scenario": {
            "steps": [{
                "eventName": "mouseenter",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "mouseover",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 4000,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 4010,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "mouseenter"
        },{
            "selector": "#testArea div",
            "event": "mouseover"

        },{
            "selector": "#testArea div",
            "event": "mouseout"

        },{
            "selector": "#testArea div",
            "event": "mouseleave"
        }]
    },
    "elementWithPartialClick": {
        "test": "fire click event on element, with a short user interaction period",
        "description": "This happens when clicking on a button goes to another page, but before mouse up is fired, the page is changed, so a mouse up isn't registered",
        "scenario": {
            "steps": [{
                "eventName": "mousedown",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "click",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "blur",
                    "timeStamp": 20,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "click"
        }]
    },
    "nonImportantElementInsideImportantElement": {
        "test": "does not fire events for an element that the user has not really interacted with",
        "description": "This is useful for when the user is just moving their mouse over an element to get to another, but not really interacting with that element",
        "scenario": {
            "steps": [{
                "eventName": "mouseenter",
                "timeStamp": 0,
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            },
                {
                    "eventName": "mouseover",
                    "timeStamp": 10,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseenter",
                    "timeStamp": 20,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseover",
                    "timeStamp": 30,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 40,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 50,
                    "data": {
                        "locator": {
                            "uniqueId": "2",
                            "selectors": [
                                "#testArea span"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseout",
                    "timeStamp": 4000,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                },
                {
                    "eventName": "mouseleave",
                    "timeStamp": 4001,
                    "data": {
                        "locator": {
                            "uniqueId": "1",
                            "selectors": [
                                "#testArea div"
                            ]
                        }
                    }
                }]
        },
        "html": "<div><span></span></div>",
        "expect": [{
            "selector": "#testArea div",
            "event": "mouseenter"
        },{
            "selector": "#testArea div",
            "event": "mouseover"
        },{
            "selector": "#testArea div",
            "event": "mouseout"
        },{
            "selector": "#testArea div",
            "event": "mouseleave"
        }]
    },
    "scenarioWithPreconditions": {
        "scenario": {
            "steps": [{
                "eventName": "click",
                "data": {
                    "locator": {
                        "uniqueId": "1",
                        "selectors": [
                            "#testArea div"
                        ]
                    }
                }
            }],
            "setup": {
                "scenarios": [
                    "setup-scenario"
                ]
            }
        }
    }
}