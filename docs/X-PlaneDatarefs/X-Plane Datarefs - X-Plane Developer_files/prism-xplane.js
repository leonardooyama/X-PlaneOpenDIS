(function($) {
    /* http://prismjs.com/download.html?themes=prism-okaidia&languages=clike+c+cpp&plugins=toolbar+copy-to-clipboard */
    var _self = (typeof window !== 'undefined')
        ? window   // if in browser
        : (
            (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
                ? self // if in worker
                : {}   // if in node js
        );

    /**
     * Prism: Lightweight, robust, elegant syntax highlighting
     * MIT license http://www.opensource.org/licenses/mit-license.php/
     * @author Lea Verou http://lea.verou.me
     */

    var Prism = (function(){

// Private helper vars
        var lang = /\blang(?:uage)?-(\w+)\b/i;
        var uniqueId = 0;

        var _ = _self.Prism = {
            manual: _self.Prism && _self.Prism.manual,
            util: {
                encode: function (tokens) {
                    if (tokens instanceof Token) {
                        return new Token(tokens.type, _.util.encode(tokens.content), tokens.alias);
                    } else if (_.util.type(tokens) === 'Array') {
                        return tokens.map(_.util.encode);
                    } else {
                        return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
                    }
                },

                type: function (o) {
                    return Object.prototype.toString.call(o).match(/\[object (\w+)\]/)[1];
                },

                objId: function (obj) {
                    if (!obj['__id']) {
                        Object.defineProperty(obj, '__id', { value: ++uniqueId });
                    }
                    return obj['__id'];
                },

                // Deep clone a language definition (e.g. to extend it)
                clone: function (o) {
                    var type = _.util.type(o);

                    switch (type) {
                        case 'Object':
                            var clone = {};

                            for (var key in o) {
                                if (o.hasOwnProperty(key)) {
                                    clone[key] = _.util.clone(o[key]);
                                }
                            }

                            return clone;

                        case 'Array':
                            // Check for existence for IE8
                            return o.map && o.map(function(v) { return _.util.clone(v); });
                    }

                    return o;
                }
            },

            languages: {
                extend: function (id, redef) {
                    var lang = _.util.clone(_.languages[id]);

                    for (var key in redef) {
                        lang[key] = redef[key];
                    }

                    return lang;
                },

                /**
                 * Insert a token before another token in a language literal
                 * As this needs to recreate the object (we cannot actually insert before keys in object literals),
                 * we cannot just provide an object, we need anobject and a key.
                 * @param inside The key (or language id) of the parent
                 * @param before The key to insert before. If not provided, the function appends instead.
                 * @param insert Object with the key/value pairs to insert
                 * @param root The object that contains `inside`. If equal to Prism.languages, it can be omitted.
                 */
                insertBefore: function (inside, before, insert, root) {
                    root = root || _.languages;
                    var grammar = root[inside];

                    if (arguments.length == 2) {
                        insert = arguments[1];

                        for (var newToken in insert) {
                            if (insert.hasOwnProperty(newToken)) {
                                grammar[newToken] = insert[newToken];
                            }
                        }

                        return grammar;
                    }

                    var ret = {};

                    for (var token in grammar) {

                        if (grammar.hasOwnProperty(token)) {

                            if (token == before) {

                                for (var newToken in insert) {

                                    if (insert.hasOwnProperty(newToken)) {
                                        ret[newToken] = insert[newToken];
                                    }
                                }
                            }

                            ret[token] = grammar[token];
                        }
                    }

                    // Update references in other language definitions
                    _.languages.DFS(_.languages, function(key, value) {
                        if (value === root[inside] && key != inside) {
                            this[key] = ret;
                        }
                    });

                    return root[inside] = ret;
                },

                // Traverse a language definition with Depth First Search
                DFS: function(o, callback, type, visited) {
                    visited = visited || {};
                    for (var i in o) {
                        if (o.hasOwnProperty(i)) {
                            callback.call(o, i, o[i], type || i);

                            if (_.util.type(o[i]) === 'Object' && !visited[_.util.objId(o[i])]) {
                                visited[_.util.objId(o[i])] = true;
                                _.languages.DFS(o[i], callback, null, visited);
                            }
                            else if (_.util.type(o[i]) === 'Array' && !visited[_.util.objId(o[i])]) {
                                visited[_.util.objId(o[i])] = true;
                                _.languages.DFS(o[i], callback, i, visited);
                            }
                        }
                    }
                }
            },
            plugins: {},

            highlightAll: function(async, callback) {
                var env = {
                    callback: callback,
                    selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
                };

                _.hooks.run("before-highlightall", env);

                var elements = env.elements || document.querySelectorAll(env.selector);

                for (var i=0, element; element = elements[i++];) {
                    _.highlightElement(element, async === true, env.callback);
                }
            },

            highlightElement: function(element, async, callback) {
                // Find language
                var language, grammar, parent = element;

                while (parent && !lang.test(parent.className)) {
                    parent = parent.parentNode;
                }

                if (parent) {
                    language = (parent.className.match(lang) || [,''])[1].toLowerCase();
                    grammar = _.languages[language];
                }

                // Set language on the element, if not present
                element.className = element.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;

                // Set language on the parent, for styling
                parent = element.parentNode;

                if (/pre/i.test(parent.nodeName)) {
                    parent.className = parent.className.replace(lang, '').replace(/\s+/g, ' ') + ' language-' + language;
                }

                var code = element.textContent;

                var env = {
                    element: element,
                    language: language,
                    grammar: grammar,
                    code: code
                };

                _.hooks.run('before-sanity-check', env);

                if (!env.code || !env.grammar) {
                    if (env.code) {
                        _.hooks.run('before-highlight', env);
                        env.element.textContent = env.code;
                        _.hooks.run('after-highlight', env);
                    }
                    _.hooks.run('complete', env);
                    return;
                }

                _.hooks.run('before-highlight', env);

                if (async && _self.Worker) {
                    var worker = new Worker(_.filename);

                    worker.onmessage = function(evt) {
                        env.highlightedCode = evt.data;

                        _.hooks.run('before-insert', env);

                        env.element.innerHTML = env.highlightedCode;

                        callback && callback.call(env.element);
                        _.hooks.run('after-highlight', env);
                        _.hooks.run('complete', env);
                    };

                    worker.postMessage(JSON.stringify({
                        language: env.language,
                        code: env.code,
                        immediateClose: true
                    }));
                }
                else {
                    env.highlightedCode = _.highlight(env.code, env.grammar, env.language);

                    _.hooks.run('before-insert', env);

                    env.element.innerHTML = env.highlightedCode;

                    callback && callback.call(element);

                    _.hooks.run('after-highlight', env);
                    _.hooks.run('complete', env);
                }
            },

            highlight: function (text, grammar, language) {
                var tokens = _.tokenize(text, grammar);
                return Token.stringify(_.util.encode(tokens), language);
            },

            matchGrammar: function (text, strarr, grammar, index, startPos, oneshot, target) {
                var Token = _.Token;

                for (var token in grammar) {
                    if(!grammar.hasOwnProperty(token) || !grammar[token]) {
                        continue;
                    }

                    if (token == target) {
                        return;
                    }

                    var patterns = grammar[token];
                    patterns = (_.util.type(patterns) === "Array") ? patterns : [patterns];

                    for (var j = 0; j < patterns.length; ++j) {
                        var pattern = patterns[j],
                            inside = pattern.inside,
                            lookbehind = !!pattern.lookbehind,
                            greedy = !!pattern.greedy,
                            lookbehindLength = 0,
                            alias = pattern.alias;

                        if (greedy && !pattern.pattern.global) {
                            // Without the global flag, lastIndex won't work
                            var flags = pattern.pattern.toString().match(/[imuy]*$/)[0];
                            pattern.pattern = RegExp(pattern.pattern.source, flags + "g");
                        }

                        pattern = pattern.pattern || pattern;

                        // Don’t cache length as it changes during the loop
                        for (var i = index, pos = startPos; i < strarr.length; pos += strarr[i].length, ++i) {

                            var str = strarr[i];

                            if (strarr.length > text.length) {
                                // Something went terribly wrong, ABORT, ABORT!
                                return;
                            }

                            if (str instanceof Token) {
                                continue;
                            }

                            pattern.lastIndex = 0;

                            var match = pattern.exec(str),
                                delNum = 1;

                            // Greedy patterns can override/remove up to two previously matched tokens
                            if (!match && greedy && i != strarr.length - 1) {
                                pattern.lastIndex = pos;
                                match = pattern.exec(text);
                                if (!match) {
                                    break;
                                }

                                var from = match.index + (lookbehind ? match[1].length : 0),
                                    to = match.index + match[0].length,
                                    k = i,
                                    p = pos;

                                for (var len = strarr.length; k < len && (p < to || (!strarr[k].type && !strarr[k - 1].greedy)); ++k) {
                                    p += strarr[k].length;
                                    // Move the index i to the element in strarr that is closest to from
                                    if (from >= p) {
                                        ++i;
                                        pos = p;
                                    }
                                }

                                /*
                                 * If strarr[i] is a Token, then the match starts inside another Token, which is invalid
                                 * If strarr[k - 1] is greedy we are in conflict with another greedy pattern
                                 */
                                if (strarr[i] instanceof Token || strarr[k - 1].greedy) {
                                    continue;
                                }

                                // Number of tokens to delete and replace with the new match
                                delNum = k - i;
                                str = text.slice(pos, p);
                                match.index -= pos;
                            }

                            if (!match) {
                                if (oneshot) {
                                    break;
                                }

                                continue;
                            }

                            if(lookbehind) {
                                lookbehindLength = match[1].length;
                            }

                            var from = match.index + lookbehindLength,
                                match = match[0].slice(lookbehindLength),
                                to = from + match.length,
                                before = str.slice(0, from),
                                after = str.slice(to);

                            var args = [i, delNum];

                            if (before) {
                                ++i;
                                pos += before.length;
                                args.push(before);
                            }

                            var wrapped = new Token(token, inside? _.tokenize(match, inside) : match, alias, match, greedy);

                            args.push(wrapped);

                            if (after) {
                                args.push(after);
                            }

                            Array.prototype.splice.apply(strarr, args);

                            if (delNum != 1)
                                _.matchGrammar(text, strarr, grammar, i, pos, true, token);

                            if (oneshot)
                                break;
                        }
                    }
                }
            },

            tokenize: function(text, grammar, language) {
                var strarr = [text];

                var rest = grammar.rest;

                if (rest) {
                    for (var token in rest) {
                        grammar[token] = rest[token];
                    }

                    delete grammar.rest;
                }

                _.matchGrammar(text, strarr, grammar, 0, 0, false);

                return strarr;
            },

            hooks: {
                all: {},

                add: function (name, callback) {
                    var hooks = _.hooks.all;

                    hooks[name] = hooks[name] || [];

                    hooks[name].push(callback);
                },

                run: function (name, env) {
                    var callbacks = _.hooks.all[name];

                    if (!callbacks || !callbacks.length) {
                        return;
                    }

                    for (var i=0, callback; callback = callbacks[i++];) {
                        callback(env);
                    }
                }
            }
        };

        var Token = _.Token = function(type, content, alias, matchedStr, greedy) {
            this.type = type;
            this.content = content;
            this.alias = alias;
            // Copy of the full string this token was created from
            this.length = (matchedStr || "").length|0;
            this.greedy = !!greedy;
        };

        Token.stringify = function(o, language, parent) {
            if (typeof o == 'string') {
                return o;
            }

            if (_.util.type(o) === 'Array') {
                return o.map(function(element) {
                    return Token.stringify(element, language, o);
                }).join('');
            }

            var env = {
                type: o.type,
                content: Token.stringify(o.content, language, parent),
                tag: 'span',
                classes: ['token', o.type],
                attributes: {},
                language: language,
                parent: parent
            };

            if (env.type == 'comment') {
                env.attributes['spellcheck'] = 'true';
            }

            if (o.alias) {
                var aliases = _.util.type(o.alias) === 'Array' ? o.alias : [o.alias];
                Array.prototype.push.apply(env.classes, aliases);
            }

            _.hooks.run('wrap', env);

            var attributes = Object.keys(env.attributes).map(function(name) {
                return name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
            }).join(' ');

            return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + (attributes ? ' ' + attributes : '') + '>' + env.content + '</' + env.tag + '>';

        };

        if (!_self.document) {
            if (!_self.addEventListener) {
                // in Node.js
                return _self.Prism;
            }
            // In worker
            _self.addEventListener('message', function(evt) {
                var message = JSON.parse(evt.data),
                    lang = message.language,
                    code = message.code,
                    immediateClose = message.immediateClose;

                _self.postMessage(_.highlight(code, _.languages[lang], lang));
                if (immediateClose) {
                    _self.close();
                }
            }, false);

            return _self.Prism;
        }

//Get current script and highlight
        var script = document.currentScript || [].slice.call(document.getElementsByTagName("script")).pop();

        if (script) {
            _.filename = script.src;

            if (document.addEventListener && !_.manual && !script.hasAttribute('data-manual')) {
                if(document.readyState !== "loading") {
                    if (window.requestAnimationFrame) {
                        window.requestAnimationFrame(_.highlightAll);
                    } else {
                        window.setTimeout(_.highlightAll, 16);
                    }
                }
                else {
                    document.addEventListener('DOMContentLoaded', _.highlightAll);
                }
            }
        }

        return _self.Prism;

    })();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Prism;
    }

// hack for components to work correctly in node.js
    if (typeof global !== 'undefined') {
        global.Prism = Prism;
    }
    ;
    Prism.languages.clike = {
        'comment': [
            {
                pattern: /(^|[^\\])\/\*[\s\S]*?\*\//,
                lookbehind: true
            },
            {
                pattern: /(^|[^\\:])\/\/.*/,
                lookbehind: true
            }
        ],
        'string': {
            pattern: /(["'])(\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
            greedy: true
        },
        'class-name': {
            pattern: /((?:\b(?:class|interface|extends|implements|trait|instanceof|new)\s+)|(?:catch\s+\())[a-z0-9_\.\\]+/i,
            lookbehind: true,
            inside: {
                punctuation: /(\.|\\)/
            }
        },
        'keyword': /\b(if|else|while|do|for|return|in|instanceof|function|new|try|throw|catch|finally|null|break|continue)\b/,
        'boolean': /\b(true|false)\b/,
        'function': /[a-z0-9_]+(?=\()/i,
        'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)\b/i,
        'operator': /--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&?|\|\|?|\?|\*|\/|~|\^|%/,
        'punctuation': /[{}[\];(),.:]/
    };

    Prism.languages.c = Prism.languages.extend('clike', {
        'keyword': /\b(asm|typeof|inline|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|union|unsigned|void|volatile|while)\b/,
        'operator': /\-[>-]?|\+\+?|!=?|<<?=?|>>?=?|==?|&&?|\|?\||[~^%?*\/]/,
        'number': /\b-?(?:0x[\da-f]+|\d*\.?\d+(?:e[+-]?\d+)?)[ful]*\b/i
    });

    Prism.languages.insertBefore('c', 'string', {
        'macro': {
            // allow for multiline macro definitions
            // spaces after the # character compile fine with gcc
            pattern: /(^\s*)#\s*[a-z]+([^\r\n\\]|\\.|\\(?:\r\n?|\n))*/im,
            lookbehind: true,
            alias: 'property',
            inside: {
                // highlight the path of the include statement as a string
                'string': {
                    pattern: /(#\s*include\s*)(<.+?>|("|')(\\?.)+?\3)/,
                    lookbehind: true
                },
                // highlight macro directives as keywords
                'directive': {
                    pattern: /(#\s*)\b(define|elif|else|endif|error|ifdef|ifndef|if|import|include|line|pragma|undef|using)\b/,
                    lookbehind: true,
                    alias: 'keyword'
                }
            }
        },
        // highlight predefined macros as constants
        'constant': /\b(__FILE__|__LINE__|__DATE__|__TIME__|__TIMESTAMP__|__func__|EOF|NULL|stdin|stdout|stderr)\b/
    });

    delete Prism.languages.c['class-name'];
    delete Prism.languages.c['boolean'];

    Prism.languages.cpp = Prism.languages.extend('c', {
        'keyword': /\b(alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|class|compl|const|constexpr|const_cast|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|float|for|friend|goto|if|inline|int|long|mutable|namespace|new|noexcept|nullptr|operator|private|protected|public|register|reinterpret_cast|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/,
        'boolean': /\b(true|false)\b/,
        'operator': /[-+]{1,2}|!=?|<{1,2}=?|>{1,2}=?|\->|:{1,2}|={1,2}|\^|~|%|&{1,2}|\|?\||\?|\*|\/|\b(and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/,
        'function': /[a-z0-9_]+(?=\()|XPLMCameraControl_f|XPLMControlCamera|XPLMDontControlCamera|XPLMIsCameraBeingControlled|XPLMReadCameraPosition|XPLMFindDataRef|XPLMCanWriteDataRef|XPLMIsDataRefGood|XPLMGetDataRefTypes|XPLMGetDatai|XPLMSetDatai|XPLMGetDataf|XPLMSetDataf|XPLMGetDatad|XPLMSetDatad|XPLMGetDatavi|XPLMSetDatavi|XPLMGetDatavf|XPLMSetDatavf|XPLMGetDatab|XPLMSetDatab|XPLMGetDatai_f|XPLMSetDatai_f|XPLMGetDataf_f|XPLMSetDataf_f|XPLMGetDatad_f|XPLMSetDatad_f|XPLMGetDatavi_f|XPLMSetDatavi_f|XPLMGetDatavf_f|XPLMSetDatavf_f|XPLMGetDatab_f|XPLMSetDatab_f|XPLMRegisterDataAccessor|XPLMUnregisterDataAccessor|XPLMDataChanged_f|XPLMShareData|XPLMUnshareData|XPLMDrawCallback_f|XPLMKeySniffer_f|XPLMRegisterDrawCallback|XPLMUnregisterDrawCallback|XPLMRegisterKeySniffer|XPLMUnregisterKeySniffer|XPLMDrawWindow_f|XPLMReceiveMonitorBoundsGlobal_f|XPLMReceiveMonitorBoundsOS_f|XPLMHandleKey_f|XPLMHandleMouseClick_f|XPLMHandleCursor_f|XPLMHandleMouseWheel_f|XPLMCreateWindowEx|XPLMCreateWindow|XPLMDestroyWindow|XPLMGetScreenSize|XPLMGetScreenBoundsGlobal|XPLMGetAllMonitorBoundsGlobal|XPLMGetAllMonitorBoundsOS|XPLMGetMouseLocation|XPLMGetMouseLocationGlobal|XPLMGetWindowGeometry|XPLMSetWindowGeometry|XPLMGetWindowGeometryOS|XPLMSetWindowGeometryOS|XPLMGetWindowIsVisible|XPLMSetWindowIsVisible|XPLMWindowIsPoppedOut|XPLMSetWindowGravity|XPLMSetWindowResizingLimits|XPLMSetWindowPositioningMode|XPLMSetWindowTitle|XPLMGetWindowRefCon|XPLMSetWindowRefCon|XPLMTakeKeyboardFocus|XPLMBringWindowToFront|XPLMIsWindowInFront|XPLMHotKey_f|XPLMRegisterHotKey|XPLMUnregisterHotKey|XPLMCountHotKeys|XPLMGetNthHotKey|XPLMGetHotKeyInfo|XPLMSetHotKeyCombination|XPLMSetGraphicsState|XPLMBindTexture2d|XPLMGenerateTextureNumbers|XPLMGetTexture|XPLMWorldToLocal|XPLMLocalToWorld|XPLMDrawTranslucentDarkBox|XPLMDrawString|XPLMDrawNumber|XPLMGetFontDimensions|XPLMMeasureString|XPLMMapDrawingCallback_f|XPLMMapIconDrawingCallback_f|XPLMMapLabelDrawingCallback_f|XPLMMapPrepareCacheCallback_f|XPLMMapWillBeDeletedCallback_f|XPLMCreateMapLayer|XPLMDestroyMapLayer|XPLMMapCreatedCallback_f|XPLMRegisterMapCreationHook|XPLMMapExists|XPLMDrawMapIconFromSheet|XPLMDrawMapLabel|XPLMMapProject|XPLMMapUnproject|XPLMMapScaleMeter|XPLMMapGetNorthHeading|XPLMMenuHandler_f|XPLMFindPluginsMenu|XPLMFindAircraftMenu|XPLMCreateMenu|XPLMDestroyMenu|XPLMClearAllMenuItems|XPLMAppendMenuItem|XPLMAppendMenuItemWithCommand|XPLMAppendMenuSeparator|XPLMSetMenuItemName|XPLMCheckMenuItem|XPLMCheckMenuItemState|XPLMEnableMenuItem|XPLMRemoveMenuItem|XPLMGetFirstNavAid|XPLMGetNextNavAid|XPLMFindFirstNavAidOfType|XPLMFindLastNavAidOfType|XPLMFindNavAid|XPLMGetNavAidInfo|XPLMCountFMSEntries|XPLMGetDisplayedFMSEntry|XPLMGetDestinationFMSEntry|XPLMSetDisplayedFMSEntry|XPLMSetDestinationFMSEntry|XPLMGetFMSEntryInfo|XPLMSetFMSEntryInfo|XPLMSetFMSEntryLatLon|XPLMClearFMSEntry|XPLMGetGPSDestinationType|XPLMGetGPSDestination|XPLMSetUsersAircraft|XPLMPlaceUserAtAirport|XPLMCountAircraft|XPLMGetNthAircraftModel|XPLMPlanesAvailable_f|XPLMAcquirePlanes|XPLMReleasePlanes|XPLMSetActiveAircraftCount|XPLMSetAircraftModel|XPLMDisableAIForPlane|XPLMDrawAircraft|XPLMReinitUsersPlane|XPLMGetMyID|XPLMCountPlugins|XPLMGetNthPlugin|XPLMFindPluginByPath|XPLMFindPluginBySignature|XPLMGetPluginInfo|XPLMIsPluginEnabled|XPLMEnablePlugin|XPLMDisablePlugin|XPLMReloadPlugins|XPLMSendMessageToPlugin|XPLMFeatureEnumerator_f|XPLMHasFeature|XPLMIsFeatureEnabled|XPLMEnableFeature|XPLMEnumerateFeatures|XPLMFlightLoop_f|XPLMGetElapsedTime|XPLMGetCycleNumber|XPLMRegisterFlightLoopCallback|XPLMUnregisterFlightLoopCallback|XPLMSetFlightLoopCallbackInterval|XPLMCreateFlightLoop|XPLMDestroyFlightLoop|XPLMScheduleFlightLoop|XPLMCreateProbe|XPLMDestroyProbe|XPLMProbeTerrainXYZ|XPLMGetMagneticVariation|XPLMDegTrueToDegMagnetic|XPLMDegMagneticToDegTrue|XPLMObjectLoaded_f|XPLMLoadObject|XPLMLoadObjectAsync|XPLMDrawObjects|XPLMUnloadObject|XPLMLibraryEnumerator_f|XPLMLookupObjects|XPLMError_f|XPLMSimulateKeyPress|XPLMSpeakString|XPLMCommandKeyStroke|XPLMCommandButtonPress|XPLMCommandButtonRelease|XPLMGetVirtualKeyDescription|XPLMReloadScenery|XPLMGetSystemPath|XPLMGetPrefsPath|XPLMGetDirectorySeparator|XPLMExtractFileAndPath|XPLMGetDirectoryContents|XPLMInitialized|XPLMGetVersions|XPLMGetLanguage|XPLMDebugString|XPLMSetErrorCallback|XPLMFindSymbol|XPLMLoadDataFile|XPLMSaveDataFile|XPLMCommandCallback_f|XPLMFindCommand|XPLMCommandBegin|XPLMCommandEnd|XPLMCommandOnce|XPLMCreateCommand|XPLMRegisterCommandHandler|XPLMUnregisterCommandHandler|XPDrawWindow|XPGetWindowDefaultDimensions|XPDrawElement|XPGetElementDefaultDimensions|XPDrawTrack|XPGetTrackDefaultDimensions|XPGetTrackMetrics|XPWidgetFunc_t|XPUCreateWidgets|XPUMoveWidgetBy|XPUFixedLayout|XPUSelectIfNeeded|XPUDefocusKeyboard|XPUDragWidget|XPCreateWidget|XPCreateCustomWidget|XPDestroyWidget|XPSendMessageToWidget|XPPlaceWidgetWithin|XPCountChildWidgets|XPGetNthChildWidget|XPGetParentWidget|XPShowWidget|XPHideWidget|XPIsWidgetVisible|XPFindRootWidget|XPBringRootWidgetToFront|XPIsWidgetInFront|XPGetWidgetGeometry|XPSetWidgetGeometry|XPGetWidgetForLocation|XPGetWidgetExposedGeometry|XPSetWidgetDescriptor|XPGetWidgetDescriptor|XPSetWidgetProperty|XPGetWidgetProperty|XPSetKeyboardFocus|XPLoseKeyboardFocus|XPGetWidgetWithFocus|XPAddWidgetCallback|XPGetWidgetClassFunc/i,
        'entity': /|XPLMCameraControlDuration|xplm_ControlCameraUntilViewChanges|xplm_ControlCameraForever|XPLMCameraPosition_t|XPLMDataRef|XPLMDataTypeID|xplmType_Unknown|xplmType_Int|xplmType_Float|xplmType_Double|xplmType_FloatArray|xplmType_IntArray|xplmType_Data|XPLMPluginID|XPLM_NO_PLUGIN_ID|XPLM_PLUGIN_XPLANE|kXPLM_Version|XPLMKeyFlags|xplm_ShiftFlag|xplm_OptionAltFlag|xplm_ControlFlag |xplm_DownFlag|xplm_UpFlag|XPLM_KEY_RETURN|XPLM_KEY_ESCAPE|XPLM_KEY_TAB|XPLM_KEY_DELETE|XPLM_KEY_LEFT|XPLM_KEY_RIGHT|XPLM_KEY_UP|XPLM_KEY_DOWN|XPLM_KEY_0|XPLM_KEY_1|XPLM_KEY_2|XPLM_KEY_3|XPLM_KEY_4|XPLM_KEY_5|XPLM_KEY_6|XPLM_KEY_7|XPLM_KEY_8|XPLM_KEY_9|XPLM_KEY_DECIMAL|XPLM_VK_BACK|XPLM_VK_TAB|XPLM_VK_CLEAR|XPLM_VK_RETURN|XPLM_VK_ESCAPE|XPLM_VK_SPACE|XPLM_VK_PRIOR|XPLM_VK_NEXT|XPLM_VK_END|XPLM_VK_HOME|XPLM_VK_LEFT|XPLM_VK_UP|XPLM_VK_RIGHT|XPLM_VK_DOWN|XPLM_VK_SELECT|XPLM_VK_PRINT|XPLM_VK_EXECUTE|XPLM_VK_SNAPSHOT|XPLM_VK_INSERT|XPLM_VK_DELETE|XPLM_VK_HELP|XPLM_VK_0|XPLM_VK_1|XPLM_VK_2|XPLM_VK_3|XPLM_VK_4|XPLM_VK_5|XPLM_VK_6|XPLM_VK_7|XPLM_VK_8|XPLM_VK_9|XPLM_VK_A|XPLM_VK_B|XPLM_VK_C|XPLM_VK_D|XPLM_VK_E|XPLM_VK_F|XPLM_VK_G|XPLM_VK_H|XPLM_VK_I|XPLM_VK_J|XPLM_VK_K|XPLM_VK_L|XPLM_VK_M|XPLM_VK_N|XPLM_VK_O|XPLM_VK_P|XPLM_VK_Q|XPLM_VK_R|XPLM_VK_S|XPLM_VK_T|XPLM_VK_U|XPLM_VK_V|XPLM_VK_W|XPLM_VK_X|XPLM_VK_Y|XPLM_VK_Z|XPLM_VK_NUMPAD0|XPLM_VK_NUMPAD1|XPLM_VK_NUMPAD2|XPLM_VK_NUMPAD3|XPLM_VK_NUMPAD4|XPLM_VK_NUMPAD5|XPLM_VK_NUMPAD6|XPLM_VK_NUMPAD7|XPLM_VK_NUMPAD8|XPLM_VK_NUMPAD9|XPLM_VK_MULTIPLY|XPLM_VK_ADD|XPLM_VK_SEPARATOR|XPLM_VK_SUBTRACT|XPLM_VK_DECIMAL|XPLM_VK_DIVIDE|XPLM_VK_F1|XPLM_VK_F2|XPLM_VK_F3|XPLM_VK_F4|XPLM_VK_F5|XPLM_VK_F6|XPLM_VK_F7|XPLM_VK_F8|XPLM_VK_F9|XPLM_VK_F10|XPLM_VK_F11|XPLM_VK_F12|XPLM_VK_F13|XPLM_VK_F14|XPLM_VK_F15|XPLM_VK_F16|XPLM_VK_F17|XPLM_VK_F18|XPLM_VK_F19|XPLM_VK_F20|XPLM_VK_F21|XPLM_VK_F22|XPLM_VK_F23|XPLM_VK_F24|XPLM_VK_EQUAL|XPLM_VK_MINUS|XPLM_VK_RBRACE|XPLM_VK_LBRACE|XPLM_VK_QUOTE|XPLM_VK_SEMICOLON|XPLM_VK_BACKSLASH|XPLM_VK_COMMA|XPLM_VK_SLASH|XPLM_VK_PERIOD|XPLM_VK_BACKQUOTE|XPLM_VK_ENTER|XPLM_VK_NUMPAD_ENT|XPLM_VK_NUMPAD_EQ|XPLMDrawingPhase|xplm_Phase_FirstScene|xplm_Phase_Terrain|xplm_Phase_Airports|xplm_Phase_Vectors|xplm_Phase_Objects|xplm_Phase_Airplanes|xplm_Phase_LastScene|xplm_Phase_FirstCockpit|xplm_Phase_Panel|xplm_Phase_Gauges|xplm_Phase_Window|xplm_Phase_LastCockpit|xplm_Phase_LocalMap3D|xplm_Phase_LocalMap2D|xplm_Phase_LocalMapProfile|XPLMMouseStatus|xplm_MouseDown|xplm_MouseDrag|xplm_MouseUp|XPLMCursorStatus|xplm_CursorDefault|xplm_CursorHidden|xplm_CursorArrow|xplm_CursorCustom|XPLMWindowID|XPLMWindowLayer|xplm_WindowLayerFlightOverlay|xplm_WindowLayerFloatingWindows|xplm_WindowLayerModal|xplm_WindowLayerGrowlNotifications|XPLMCreateWindow_t|XPLMWindowPositioningMode|xplm_WindowPositionFree|xplm_WindowCenterOnMonitor|xplm_WindowFullScreenOnMonitor|xplm_WindowFullScreenOnAllMonitors|xplm_WindowPopOut|XPLMHotKeyID|XPLMTextureID|xplm_Tex_GeneralInterface|xplm_Tex_AircraftPaint|xplm_Tex_AircraftLiteMap|XPLMFontID|xplmFont_Basic|xplmFont_Menus|xplmFont_Metal |xplmFont_Led|xplmFont_LedWide|xplmFont_PanelHUD|xplmFont_PanelEFIS|xplmFont_PanelGPS|xplmFont_RadiosGA|xplmFont_RadiosBC|xplmFont_RadiosHM|xplmFont_RadiosGANarrow|xplmFont_RadiosBCNarrow|xplmFont_RadiosHMNarrow|xplmFont_Timer |xplmFont_FullRound|xplmFont_SmallRound|xplmFont_Menus_Localized |xplmFont_Proportional|XPLMMapLayerID|XPLMMapProjectionID|XPLMMapStyle|xplm_MapStyle_VFR_Sectional|xplm_MapStyle_IFR_LowEnroute|xplm_MapStyle_IFR_HighEnroute|XPLMMapLayerType|xplm_MapLayer_Fill|xplm_MapLayer_Markings|XPLM_MAP_USER_INTERFACE|XPLM_MAP_IOS|XPLMCreateMapLayer_t|XPLMMapOrientation|xplm_MapOrientation_Map|xplm_MapOrientation_UI|XPLMMenuCheck|xplm_Menu_NoCheck|xplm_Menu_Unchecked|xplm_Menu_Checked|XPLMMenuID|XPLMNavType|xplm_Nav_Unknown|xplm_Nav_Airport|xplm_Nav_NDB|xplm_Nav_VOR|xplm_Nav_ILS|xplm_Nav_Localizer|xplm_Nav_GlideSlope|xplm_Nav_OuterMarker|xplm_Nav_MiddleMarker|xplm_Nav_InnerMarker|xplm_Nav_Fix|xplm_Nav_DME|xplm_Nav_LatLon|XPLMNavRef|XPLM_NAV_NOT_FOUND|XPLM_USER_AIRCRAFT|XPLMPlaneDrawState_t|XPLM_MSG_PLANE_CRASHED|XPLM_MSG_PLANE_LOADED|XPLM_MSG_AIRPORT_LOADED|XPLM_MSG_SCENERY_LOADED|XPLM_MSG_AIRPLANE_COUNT_CHANGED|XPLM_MSG_PLANE_UNLOADED|XPLM_MSG_WILL_WRITE_PREFS|XPLM_MSG_LIVERY_LOADED|XPLMFlightLoopPhaseType|xplm_FlightLoop_Phase_BeforeFlightModel|xplm_FlightLoop_Phase_AfterFlightModel|XPLMFlightLoopID|XPLMCreateFlightLoop_t|XPLMProbeType|xplm_ProbeY|XPLMProbeResult|xplm_ProbeHitTerrain|xplm_ProbeError|xplm_ProbeMissed|XPLMProbeRef|XPLMProbeInfo_t|XPLMObjectRef|XPLMDrawInfo_t|XPLMHostApplicationID|xplm_Host_Unknown|xplm_Host_XPlane|xplm_Host_PlaneMaker|xplm_Host_WorldMaker|xplm_Host_Briefer|xplm_Host_PartMaker|xplm_Host_YoungsMod|xplm_Host_XAuto|XPLMLanguageCode|xplm_Language_Unknown|xplm_Language_English|xplm_Language_French|xplm_Language_German|xplm_Language_Italian|xplm_Language_Spanish|xplm_Language_Korean|xplm_Language_Russian|xplm_Language_Greek|xplm_Language_Japanese|xplm_Language_Chinese|XPLMDataFileType|xplm_DataFile_Situation|xplm_DataFile_ReplayMovie|XPLMCommandPhase|xplm_CommandBegin|xplm_CommandContinue|xplm_CommandEnd|XPLMCommandRef|xpWidgetClass_MainWindow|Main Window Type Values|xpMainWindowStyle_MainWindow|xpMainWindowStyle_Translucent|Main Window Properties|xpProperty_MainWindowType|xpProperty_MainWindowHasCloseBoxes|MainWindow Messages|xpMessage_CloseButtonPushed|xpWidgetClass_SubWindow|SubWindow Type Values|xpSubWindowStyle_SubWindow|xpSubWindowStyle_Screen|xpSubWindowStyle_ListView|SubWindow Properties|xpProperty_SubWindowType|xpWidgetClass_Button|Button Types|xpPushButton|xpRadioButton|xpWindowCloseBox|xpLittleDownArrow|xpLittleUpArrow|Button Behavior Values|xpButtonBehaviorPushButton|xpButtonBehaviorCheckBox|xpButtonBehaviorRadioButton|Button Properties|xpProperty_ButtonType|xpProperty_ButtonBehavior|xpProperty_ButtonState|Button Messages|xpMsg_PushButtonPressed|xpMsg_ButtonStateChanged|xpWidgetClass_TextField|Text Field Type Values|xpTextEntryField|xpTextTransparent|xpTextTranslucent|Text Field Properties|xpProperty_EditFieldSelStart|xpProperty_EditFieldSelEnd|xpProperty_EditFieldSelDragStart|xpProperty_TextFieldType|xpProperty_PasswordMode|xpProperty_MaxCharacters|xpProperty_ScrollPosition|xpProperty_Font|xpProperty_ActiveEditSide|Text Field Messages|xpMsg_TextFieldChanged|xpWidgetClass_ScrollBar|Scroll Bar Type Values|xpScrollBarTypeScrollBar|xpScrollBarTypeSlider|Scroll Bar Properties|xpProperty_ScrollBarSliderPosition|xpProperty_ScrollBarMin|xpProperty_ScrollBarMax|xpProperty_ScrollBarPageAmount|xpProperty_ScrollBarType|xpProperty_ScrollBarSlop|Scroll Bar Messages|xpMsg_ScrollBarSliderPositionChanged|xpWidgetClass_Caption|Caption Properties|xpProperty_CaptionLit|xpWidgetClass_GeneralGraphics|General Graphics Types Values|xpShip|xpILSGlideScope|xpMarkerLeft|xp_Airport|xpNDB|xpVOR|xpRadioTower|xpAircraftCarrier|xpFire|xpMarkerRight|xpCustomObject|xpCoolingTower|xpSmokeStack|xpBuilding|xpPowerLine|xpVORWithCompassRose|xpOilPlatform|xpOilPlatformSmall|xpWayPoint|General Graphics Properties|xpProperty_GeneralGraphicsType|xpWidgetClass_Progress|Progress Indicator Properties|xpProperty_ProgressPosition|xpProperty_ProgressMin|xpProperty_ProgressMax|XPWindowStyle|xpWindow_Help|xpWindow_MainWindow|xpWindow_SubWindow|xpWindow_Screen|xpWindow_ListView|XPElementStyle|xpElement_TextField|xpElement_CheckBox|xpElement_CheckBoxLit|xpElement_WindowCloseBox|xpElement_WindowCloseBoxPressed|xpElement_PushButton|xpElement_PushButtonLit|xpElement_OilPlatform|xpElement_OilPlatformSmall|xpElement_Ship|xpElement_ILSGlideScope|xpElement_MarkerLeft|xpElement_Airport|xpElement_Waypoint|xpElement_NDB|xpElement_VOR|xpElement_RadioTower|xpElement_AircraftCarrier|xpElement_Fire|xpElement_MarkerRight|xpElement_CustomObject|xpElement_CoolingTower|xpElement_SmokeStack|xpElement_Building|xpElement_PowerLine|xpElement_CopyButtons|xpElement_CopyButtonsWithEditingGrid|xpElement_EditingGrid|xpElement_ScrollBar|xpElement_VORWithCompassRose|xpElement_Zoomer|xpElement_TextFieldMiddle|xpElement_LittleDownArrow|xpElement_LittleUpArrow|xpElement_WindowDragBar|xpElement_WindowDragBarSmooth|XPTrackStyle|xpTrack_ScrollBar|xpTrack_Slider|xpTrack_Progress|XPWidgetID|XPWidgetPropertyID|xpProperty_Refcon|xpProperty_Dragging|xpProperty_DragXOff|xpProperty_DragYOff|xpProperty_Hilited|xpProperty_Object|xpProperty_Clip|xpProperty_Enabled|xpProperty_UserStart|XPMouseState_t|XPKeyState_t|XPWidgetGeometryChange_t|XPDispatchMode|xpMode_Direct|xpMode_UpChain|xpMode_Recursive|xpMode_DirectAllCallbacks|xpMode_Once|XPWidgetClass|xpWidgetClass_None|XPWidgetMessage|xpMsg_None|xpMsg_Create|xpMsg_Destroy|xpMsg_Paint|xpMsg_Draw|xpMsg_KeyPress|xpMsg_KeyTakeFocus|xpMsg_KeyLoseFocus|xpMsg_MouseDown|xpMsg_MouseDrag|xpMsg_MouseUp|xpMsg_Reshape|xpMsg_ExposedChanged|xpMsg_AcceptChild|xpMsg_LoseChild|xpMsg_AcceptParent|xpMsg_Shown|xpMsg_Hidden|xpMsg_DescriptorChanged|xpMsg_PropertyChanged|xpMsg_MouseWheel|xpMsg_CursorAdjust|xpMsg_UserStart|XPWidgetCreate_t|NO_PARENT|PARAM_PARENT/i,
    });

    Prism.languages.insertBefore('cpp', 'keyword', {
        'class-name': {
            pattern: /(class\s+)[a-z0-9_]+/i,
            lookbehind: true
        }
    });

    Prism.hooks.add('before-highlight', function(env) {
        env.links_to_replace = {};
        $(env.element).find('a').each(function(index, el) {
            env.links_to_replace[el.text] = el.href;
        });
    });
    Prism.hooks.add('after-highlight', function post(env) {
        var $el = $(env.element);
        var new_html = $el.html();

        var pre_regex = "([^A-Za-z0-9_\/<])(";
        var post_regex  = ")([^A-Za-z0-9_\/>])";
        for(var link_text in env.links_to_replace) {
            var re = new RegExp(pre_regex + link_text + post_regex, 'g');
            var replacement = '$1<a href="' + env.links_to_replace[link_text] + '">$2</a>$3';
            new_html = new_html.replace(re, replacement);
        }
        $el.html(new_html);
    });
})(jQuery);

