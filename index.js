var JSONStream = require('JSONStream');
var Stream = require('stream').Stream;
var es = require('event-stream');
var vm = require('vm');

var transfuse = module.exports = function (keyPath, fn) {
    if (typeof keyPath === 'function') {
        fn = keyPath;
        keyPath = [ /./ ];
    }
    
    if (typeof fn === 'function' && fn.length === 1) {
        return transfuse.sync(keyPath, fn);
    }
    else {
        return transfuse.async(keyPath, fn);
    }
};

transfuse.async = transform(function (fn, doc, map) {
    fn.call(this, doc, map);
});

transfuse.sync = transform(function (fn, doc, map) {
    map(fn.call(this, doc));
});

function transform (cb) {
    return function (keyPath, fn) {
        if (fn === undefined) {
            fn = keyPath;
            keyPath = undefined;
        }
        if (!keyPath) keyPath = [ /./ ];
        
        if (typeof fn !== 'function') {
            var fn_ = vm.runInNewContext('(' + fn.toString() + ')', {});
            return typeof fn_ === 'function'
                ? transfuse(keyPath, fn_)
                : undefined
            ;
        }
        
        return es.connect(
            JSONStream.parse(keyPath),
            es.map(function (doc, map) {
                var context = {
                    update : map.bind(null, null),
                };
                cb.call(context, fn, doc, map.bind(null, null));
            }),
            JSONStream.stringify()
        );
    };
}
