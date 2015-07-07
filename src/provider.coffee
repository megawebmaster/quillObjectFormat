class QuillObjectFormat
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
        id: node.getAttribute('data-id')
        label: node.getAttribute('data-object')
  when: (event, service) ->
    events[event] = service

  constructor: ->
    @$get = ['$injector', '$rootScope', @factory]

  factory: ($injector, $rootScope) ->
    resolved = {}
    for event, service of events
      resolved[event] = $injector.invoke(service)

    class Format
      constructor: (@quill, options) ->
        @utils = new QuillObjectFormatUtils(@quill, options)
        @utils.hide()

        @quill.on('text-change', @textChange)
        @quill.on('selection-change', @selectionChange)
        @quill.onModuleLoad('toolbar', @bindToolbar)

        jQuery('.remove', @utils.container).on('click', (event) =>
          event.preventDefault()
          @removeFormatting()
        )

      textChange: =>
        @utils.hide() unless @utils.isHidden()

      selectionChange: (range) =>
        return if !(range? && range.isCollapsed())

        object = @utils.findObject(range)
        if (object)
          @utils.show(object, range)
        else if !@utils.isHidden()
          @utils.hide()

      bindToolbar: (@toolbar) =>
        @toolbar.initFormat('object', @applyFormatting)

      applyFormatting: (range, value) =>
        return unless range

        if !value
          @quill.formatText(range, 'object', null, 'user')
        else if !range.isCollapsed()
          text = @quill.getText(range.start, range.end)
          resolved['search'](text).then((item) =>
            return unless range
            @quill.formatText(range, 'object', item, 'user')
          )

      removeFormatting: =>
        range = @utils.container.data('range')
        return unless range?

        range = @utils.expandRange(range) if range.isCollapsed()
        @quill.formatText(range, 'object', null, 'user')
        @toolbar.setActive('object', false) if @toolbar?
        @utils.hide()

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
