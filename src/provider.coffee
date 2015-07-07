class QuillObjectFormat
  DEFAULTS =
    offset: 3
    template: "<span class='object'></span> <a class='remove'>Remove object</a>"
  HIDE_MARGIN = -10000

  events =
    'search': ['$q', ($q) ->
      (text) ->
        promise = $q.defer()
        promise.resolve(text)
        return promise.promise
    ]
    'node.add': ->
      (node, value) ->
        node.className = 'object label label-default'
        node.setAttribute('data-object', value.label)
        node.setAttribute('data-id', value.id)
        return node
    'node.remove': ->
      (node) ->
        node.removeAttribute('class')
        node.removeAttribute('data-object')
        node.removeAttribute('data-id')
        return node
    'node.value': ->
      (node) ->
        return node.getAttribute('data-id')
  when: (event, service) ->
    events[event] = service

  constructor: ->
    @$get = ['$rootScope', '$injector', @factory]

  factory: ($rootScope, $injector) ->
    resolved = {}
    for event, service of events
      resolved[event] = $injector.invoke(service)

    class Format
      constructor: (@quill, options) ->
        @options = jQuery.extend(options, DEFAULTS)
        container = jQuery(@quill.addContainer('ql-tooltip'))
        container.addClass('ql-object-tooltip').html(@options.template)
        @utils = new QuillObjectFormatUtils(container, @quill)
        @utils.hide()

        @quill.on('text-change', @textChange)
        @quill.on('selection-change', @selectionChange)
        @quill.onModuleLoad('toolbar', @bindToolbar)

        jQuery('.remove', container).on('click', @removeFormatting)

      textChange: =>
        if !@utils.isHidden()
          @utils.hide()

      selectionChange: (range) =>
        return if !(range? && range.isCollapsed())

        object = @utils.findObject(range)
        if (object)
          @utils.show(object)
        else if @utils.isHidden()
          @utils.hide()

      removeFormatting: (event) =>
        event.preventDefault()

        range = @quill.getSelection()
        if range.isCollapsed()
          range = @_expandRange(range)

        @quill.formatText(range, 'object', null, 'user')
        @toolbar.setActive('object', false) if @toolbar?

      bindToolbar: (@toolbar) =>
        @toolbar.initFormat('object', @applyFormatting)

      applyFormatting: (range, value) =>
        return unless range

        if !value
          @quill.formatText(range, 'object', null, 'user')
        else if !range.isCollapsed()
          text = @quill.getText(range.start, range.end)
          resolved['search'](text).then((item) =>
            @formatElement(range, item)
          )

      formatElement: (range, item) =>
        return unless range
        @quill.formatText(range, 'object', item, 'user')

    return {
      register: ->
        Quill.registerModule('object-format', Format)
        $rootScope.$on('quill.created', (event, editor) ->
          editor.addFormat('object',
            tag: 'SPAN'
            add: resolved['node.add']
            remove: (node) ->
              return resolved['node.remove'](node.node)
            value: resolved['node.value']
          )
          editor.addModule('object-format')
          editor.addModule('toolbar',
            container: document.querySelector('#quill-toolbar')
            formats:
              tooltip:
                object: 'object'
          )
        )
    }

quillObjectFormat.provider('QuillObjectFormat', QuillObjectFormat)
