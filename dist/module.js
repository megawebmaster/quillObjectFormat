var quillObjectFormat;

quillObjectFormat = angular.module('QuillObjectFormat', ['ngQuill']);

var QuillObjectFormat,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

QuillObjectFormat = (function() {
  var events;

  events = {
    'search': [
      '$q', function($q) {
        return function(text) {
          var promise;
          promise = $q.defer();
          promise.resolve(text);
          return promise.promise;
        };
      }
    ],
    'node.add': function() {
      return function(node, value) {
        node.className = 'object label label-default';
        node.setAttribute('data-object', value.label);
        node.setAttribute('data-id', value.id);
        return node;
      };
    },
    'node.remove': function() {
      return function(node) {
        node.removeAttribute('class');
        node.removeAttribute('data-object');
        node.removeAttribute('data-id');
        return node;
      };
    },
    'node.value': function() {
      return function(node) {
        return {
          id: node.getAttribute('data-id'),
          label: node.getAttribute('data-object')
        };
      };
    }
  };

  QuillObjectFormat.prototype.when = function(event, service) {
    return events[event] = service;
  };

  function QuillObjectFormat() {
    this.$get = ['$injector', '$rootScope', this.factory];
  }

  QuillObjectFormat.prototype.factory = function($injector, $rootScope) {
    var Format, event, resolved, service;
    resolved = {};
    for (event in events) {
      service = events[event];
      resolved[event] = $injector.invoke(service);
    }
    Format = (function() {
      function Format(quill, options) {
        this.quill = quill;
        this.removeFormatting = bind(this.removeFormatting, this);
        this.applyFormatting = bind(this.applyFormatting, this);
        this.bindToolbar = bind(this.bindToolbar, this);
        this.selectionChange = bind(this.selectionChange, this);
        this.textChange = bind(this.textChange, this);
        this.utils = new QuillObjectFormatUtils(this.quill, options);
        this.utils.hide();
        this.quill.on('text-change', this.textChange);
        this.quill.on('selection-change', this.selectionChange);
        this.quill.onModuleLoad('toolbar', this.bindToolbar);
        jQuery('.remove', this.utils.container).on('click', (function(_this) {
          return function(event) {
            event.preventDefault();
            return _this.removeFormatting();
          };
        })(this));
      }

      Format.prototype.textChange = function() {
        if (!this.utils.isHidden()) {
          return this.utils.hide();
        }
      };

      Format.prototype.selectionChange = function(range) {
        var object;
        if (!((range != null) && range.isCollapsed())) {
          return;
        }
        object = this.utils.findObject(range);
        if (object) {
          return this.utils.show(object, range);
        } else if (!this.utils.isHidden()) {
          return this.utils.hide();
        }
      };

      Format.prototype.bindToolbar = function(toolbar) {
        this.toolbar = toolbar;
        return this.toolbar.initFormat('object', this.applyFormatting);
      };

      Format.prototype.applyFormatting = function(range, value) {
        var text;
        if (!range) {
          return;
        }
        if (!value) {
          return this.quill.formatText(range, 'object', null, 'user');
        } else if (!range.isCollapsed()) {
          text = this.quill.getText(range.start, range.end);
          return resolved['search'](text).then((function(_this) {
            return function(item) {
              if (!range) {
                return;
              }
              return _this.quill.formatText(range, 'object', item, 'user');
            };
          })(this));
        }
      };

      Format.prototype.removeFormatting = function() {
        var range;
        range = this.utils.container.data('range');
        if (range == null) {
          return;
        }
        if (range.isCollapsed()) {
          range = this.utils.expandRange(range);
        }
        this.quill.formatText(range, 'object', null, 'user');
        if (this.toolbar != null) {
          this.toolbar.setActive('object', false);
        }
        return this.utils.hide();
      };

      return Format;

    })();
    return {
      register: function() {
        Quill.registerModule('object-format', Format);
        return $rootScope.$on('quill.created', function(event, editor) {
          editor.addFormat('object', {
            tag: 'SPAN',
            add: resolved['node.add'],
            remove: function(node) {
              return resolved['node.remove'](node.node);
            },
            value: resolved['node.value']
          });
          editor.addModule('object-format');
          return editor.addModule('toolbar', {
            container: document.querySelector('#quill-toolbar'),
            formats: {
              tooltip: {
                object: 'object'
              }
            }
          });
        });
      }
    };
  };

  return QuillObjectFormat;

})();

quillObjectFormat.provider('QuillObjectFormat', QuillObjectFormat);

var QuillObjectFormatUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

QuillObjectFormatUtils = (function() {
  var DEFAULTS, HIDE_MARGIN;

  DEFAULTS = {
    offset: 3,
    template: "<span class='object'></span> <a class='remove'>Remove object</a>"
  };

  HIDE_MARGIN = -10000;

  function QuillObjectFormatUtils(quill, options) {
    this.quill = quill;
    this.findText = bind(this.findText, this);
    this.show = bind(this.show, this);
    this.options = jQuery.extend(options, DEFAULTS);
    this.container = jQuery(this.quill.addContainer('ql-tooltip'));
    this.container.addClass('ql-object-tooltip').html(this.options.template);
    this.object = jQuery('.object', this.container);
  }

  QuillObjectFormatUtils.prototype.isHidden = function() {
    return this.container.offset().left === HIDE_MARGIN;
  };

  QuillObjectFormatUtils.prototype.hide = function() {
    this.container.offset({
      left: HIDE_MARGIN
    });
    return this.container.data('range', null);
  };

  QuillObjectFormatUtils.prototype.show = function(reference, range) {
    var position;
    position = this.findText(reference);
    this.container.css({
      left: position.left,
      top: position.top
    });
    if (reference.startOffset == null) {
      this.object.text(jQuery(reference).data('object'));
    }
    this.container.data('range', range);
    return this.container.focus();
  };

  QuillObjectFormatUtils.prototype.expandRange = function(range) {
    var end, ref, start;
    ref = this.quill.editor.doc.findLeafAt(range.start, true);
    start = range.start - ref[1];
    end = start + ref[0].length;
    return {
      start: start,
      end: end
    };
  };

  QuillObjectFormatUtils.prototype.findObject = function(range) {
    var leaf, node, ref;
    ref = this.quill.editor.doc.findLeafAt(range.start, true);
    leaf = ref[0];
    if (leaf != null) {
      node = leaf.node;
    }
    while (node !== null && node !== this.quill.root) {
      if (node.tagName === 'SPAN' && node.className.split(' ').indexOf('object') !== -1) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  };

  QuillObjectFormatUtils.prototype.findText = function(reference) {
    var container, left, offsetLeft, offsetTop, parentBounds, referenceBounds, top;
    container = this.container.get(0);
    if (reference != null) {
      referenceBounds = reference.getBoundingClientRect();
      parentBounds = this.quill.container.getBoundingClientRect();
      offsetLeft = referenceBounds.left - parentBounds.left;
      offsetTop = referenceBounds.top - parentBounds.top;
      left = offsetLeft + referenceBounds.width / 2 - container.offsetWidth / 2;
      top = offsetTop + referenceBounds.height + this.options.offset;
      if (top + container.offsetHeight > this.quill.container.offsetHeight) {
        top = offsetTop - container.offsetHeight - this.options.offset;
      }
      left = Math.min(left, this.quill.container.offsetWidth - container.offsetWidth);
      top = Math.min(top, this.quill.container.offsetHeight - container.offsetHeight);
    } else {
      left = this.quill.container.offsetWidth / 2 - container.offsetWidth / 2;
      top = this.quill.container.offsetHeight / 2 - container.offsetHeight / 2;
    }
    top += this.quill.container.scrollTop;
    return {
      left: left,
      top: top
    };
  };

  return QuillObjectFormatUtils;

})();
