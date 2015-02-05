/**
 * Polyfills
 */

module.exports = {

    extend: function extend(dst, src){
        if (src) {
            for (var key in src) {
                if (src.hasOwnProperty(key)) {
                    dst[key] = src[key];
                }
            }
        }
        return dst;
    },

    map: function(obj, callback, thisArg) {
        var len = obj.length >>> 0;
        var newArray = new Array(len);
        var key = 0;
        if (!thisArg) {
            thisArg = obj;
        }
        while (key < len) {
            newArray[key] = callback.call(thisArg, this[key], key, obj);
            key++;
        }
        return newArray;
    }

};