var taggableObjectQuillFormat;

taggableObjectQuillFormat = angular.module('TaggableObjectQuillFormat', ['ngQuill']);

var TaggableObjectQuillFormat,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

TaggableObjectQuillFormat = (function() {
  var events;

  events = {
    'search': function() {
      return function(text) {
        return text;
      };
    },
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

  TaggableObjectQuillFormat.prototype.on = function(event, service) {
    return events[event] = service;
  };

  function TaggableObjectQuillFormat() {
    this.factory = bind(this.factory, this);
    this.resolveEvents = bind(this.resolveEvents, this);
    this.registerFormat = bind(this.registerFormat, this);
    this.$get = ['$injector', '$rootScope', '$q', this.factory];
  }

  TaggableObjectQuillFormat.prototype.registerFormat = function(event, quill) {
    if (!('object' in quill.editor.doc.formats)) {
      quill.addFormat('object', {
        tag: 'SPAN',
        add: this.resolved['node.add'],
        remove: (function(_this) {
          return function(node) {
            return _this.resolved['node.remove'](node.node);
          };
        })(this),
        value: this.resolved['node.value']
      });
    }
    quill.addModule('object-format');
    return quill.addModule('toolbar', {
      container: document.querySelector('#quill-toolbar'),
      formats: {
        tooltip: {
          object: 'object'
        }
      }
    });
  };

  TaggableObjectQuillFormat.prototype.resolveEvents = function($injector) {
    var event, results, service;
    this.resolved = {};
    results = [];
    for (event in events) {
      service = events[event];
      results.push(this.resolved[event] = $injector.invoke(service));
    }
    return results;
  };

  TaggableObjectQuillFormat.prototype.factory = function($injector, $rootScope, $q) {
    var Format, isRegistered, resolved;
    this.resolveEvents($injector);
    resolved = this.resolved;
    Format = (function() {
      function Format(quill1, options) {
        this.quill = quill1;
        this.removeFormatting = bind(this.removeFormatting, this);
        this.applyFormatting = bind(this.applyFormatting, this);
        this.bindToolbar = bind(this.bindToolbar, this);
        this.selectionChange = bind(this.selectionChange, this);
        this.textChange = bind(this.textChange, this);
        this.utils = new TaggableObjectQuillFormatUtils(this.quill, options);
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
          return $q.when(resolved['search'](text)).then((function(_this) {
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
    isRegistered = false;
    return {
      register: (function(_this) {
        return function() {
          if (isRegistered) {
            return;
          }
          Quill.registerModule('object-format', Format);
          isRegistered = true;
          return $rootScope.$on('quill.created', _this.registerFormat);
        };
      })(this)
    };
  };

  return TaggableObjectQuillFormat;

})();

taggableObjectQuillFormat.provider('TaggableObjectQuillFormat', TaggableObjectQuillFormat);

var TaggableObjectQuillFormatUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

TaggableObjectQuillFormatUtils = (function() {
  var DEFAULTS, HIDE_MARGIN;

  DEFAULTS = {
    offset: 3,
    template: "<span class='object'></span> <a class='remove'>Remove object</a>"
  };

  HIDE_MARGIN = -10000;

  function TaggableObjectQuillFormatUtils(quill, options) {
    this.quill = quill;
    this.findText = bind(this.findText, this);
    this.show = bind(this.show, this);
    this.options = jQuery.extend(options, DEFAULTS);
    this.container = jQuery(this.quill.addContainer('ql-tooltip'));
    this.container.addClass('ql-object-tooltip').html(this.options.template);
    this.object = jQuery('.object', this.container);
  }

  TaggableObjectQuillFormatUtils.prototype.isHidden = function() {
    return this.container.offset().left === HIDE_MARGIN;
  };

  TaggableObjectQuillFormatUtils.prototype.hide = function() {
    this.container.offset({
      left: HIDE_MARGIN
    });
    return this.container.data('range', null);
  };

  TaggableObjectQuillFormatUtils.prototype.show = function(reference, range) {
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

  TaggableObjectQuillFormatUtils.prototype.expandRange = function(range) {
    var end, ref, start;
    ref = this.quill.editor.doc.findLeafAt(range.start, true);
    start = range.start - ref[1];
    end = start + ref[0].length;
    return {
      start: start,
      end: end
    };
  };

  TaggableObjectQuillFormatUtils.prototype.findObject = function(range) {
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

  TaggableObjectQuillFormatUtils.prototype.findText = function(reference) {
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

  return TaggableObjectQuillFormatUtils;

})();
