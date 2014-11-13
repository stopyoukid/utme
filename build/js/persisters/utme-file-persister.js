var saveAs = saveAs || "undefined" != typeof navigator && navigator.msSaveOrOpenBlob && navigator.msSaveOrOpenBlob.bind(navigator) || function(view) {
    "use strict";
    if ("undefined" == typeof navigator || !/MSIE [1-9]\./.test(navigator.userAgent)) {
        var doc = view.document, get_URL = function() {
            return view.URL || view.webkitURL || view;
        }, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a"), can_use_save_link = "download" in save_link, click = function(node) {
            var event = doc.createEvent("MouseEvents");
            event.initMouseEvent("click", !0, !1, view, 0, 0, 0, 0, 0, !1, !1, !1, !1, 0, null), 
            node.dispatchEvent(event);
        }, webkit_req_fs = view.webkitRequestFileSystem, req_fs = view.requestFileSystem || webkit_req_fs || view.mozRequestFileSystem, throw_outside = function(ex) {
            (view.setImmediate || view.setTimeout)(function() {
                throw ex;
            }, 0);
        }, force_saveable_type = "application/octet-stream", fs_min_size = 0, arbitrary_revoke_timeout = 10, revoke = function(file) {
            var revoker = function() {
                "string" == typeof file ? get_URL().revokeObjectURL(file) : file.remove();
            };
            view.chrome ? revoker() : setTimeout(revoker, arbitrary_revoke_timeout);
        }, dispatch = function(filesaver, event_types, event) {
            event_types = [].concat(event_types);
            for (var i = event_types.length; i--; ) {
                var listener = filesaver["on" + event_types[i]];
                if ("function" == typeof listener) try {
                    listener.call(filesaver, event || filesaver);
                } catch (ex) {
                    throw_outside(ex);
                }
            }
        }, FileSaver = function(blob, name) {
            var object_url, target_view, slice, filesaver = this, type = blob.type, blob_changed = !1, dispatch_all = function() {
                dispatch(filesaver, "writestart progress write writeend".split(" "));
            }, fs_error = function() {
                if ((blob_changed || !object_url) && (object_url = get_URL().createObjectURL(blob)), 
                target_view) target_view.location.href = object_url; else {
                    var new_tab = view.open(object_url, "_blank");
                    void 0 == new_tab && "undefined" != typeof safari && (view.location.href = object_url);
                }
                filesaver.readyState = filesaver.DONE, dispatch_all(), revoke(object_url);
            }, abortable = function(func) {
                return function() {
                    return filesaver.readyState !== filesaver.DONE ? func.apply(this, arguments) : void 0;
                };
            }, create_if_not_found = {
                create: !0,
                exclusive: !1
            };
            return filesaver.readyState = filesaver.INIT, name || (name = "download"), can_use_save_link ? (object_url = get_URL().createObjectURL(blob), 
            save_link.href = object_url, save_link.download = name, click(save_link), filesaver.readyState = filesaver.DONE, 
            dispatch_all(), void revoke(object_url)) : (view.chrome && type && type !== force_saveable_type && (slice = blob.slice || blob.webkitSlice, 
            blob = slice.call(blob, 0, blob.size, force_saveable_type), blob_changed = !0), 
            webkit_req_fs && "download" !== name && (name += ".download"), (type === force_saveable_type || webkit_req_fs) && (target_view = view), 
            req_fs ? (fs_min_size += blob.size, void req_fs(view.TEMPORARY, fs_min_size, abortable(function(fs) {
                fs.root.getDirectory("saved", create_if_not_found, abortable(function(dir) {
                    var save = function() {
                        dir.getFile(name, create_if_not_found, abortable(function(file) {
                            file.createWriter(abortable(function(writer) {
                                writer.onwriteend = function(event) {
                                    target_view.location.href = file.toURL(), filesaver.readyState = filesaver.DONE, 
                                    dispatch(filesaver, "writeend", event), revoke(file);
                                }, writer.onerror = function() {
                                    var error = writer.error;
                                    error.code !== error.ABORT_ERR && fs_error();
                                }, "writestart progress write abort".split(" ").forEach(function(event) {
                                    writer["on" + event] = filesaver["on" + event];
                                }), writer.write(blob), filesaver.abort = function() {
                                    writer.abort(), filesaver.readyState = filesaver.DONE;
                                }, filesaver.readyState = filesaver.WRITING;
                            }), fs_error);
                        }), fs_error);
                    };
                    dir.getFile(name, {
                        create: !1
                    }, abortable(function(file) {
                        file.remove(), save();
                    }), abortable(function(ex) {
                        ex.code === ex.NOT_FOUND_ERR ? save() : fs_error();
                    }));
                }), fs_error);
            }), fs_error)) : void fs_error());
        }, FS_proto = FileSaver.prototype, saveAs = function(blob, name) {
            return new FileSaver(blob, name);
        };
        return FS_proto.abort = function() {
            var filesaver = this;
            filesaver.readyState = filesaver.DONE, dispatch(filesaver, "abort");
        }, FS_proto.readyState = FS_proto.INIT = 0, FS_proto.WRITING = 1, FS_proto.DONE = 2, 
        FS_proto.error = FS_proto.onwritestart = FS_proto.onprogress = FS_proto.onwrite = FS_proto.onabort = FS_proto.onerror = FS_proto.onwriteend = null, 
        saveAs;
    }
}("undefined" != typeof self && self || "undefined" != typeof window && window || this.content);

"undefined" != typeof module && null !== module ? module.exports = saveAs : "undefined" != typeof define && null !== define && null != define.amd && define([], function() {
    return saveAs;
}), function(utme) {
    utme.registerSaveHandler(function(scenario) {
        var blob = new Blob([ JSON.stringify(scenario) ], {
            type: "text/plain;charset=utf-8"
        });
        saveAs(blob, scenario.name + ".json");
    });
}(utme);