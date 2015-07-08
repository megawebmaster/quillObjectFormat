class TaggableObjectQuillFormat
  events =
    'search': ->
      (text) -> return text
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

  on: (event, service) ->
    events[event] = service

  constructor: ->
    @$get = ['$injector', '$rootScope', '$q', @factory]

  registerFormat: (event, quill) =>
    if !('object' of quill.editor.doc.formats)
      quill.addFormat('object',
        tag: 'SPAN'
        add: @resolved['node.add']
        remove: (node) =>
          return @resolved['node.remove'](node.node)
        value: @resolved['node.value']
      )
    quill.addModule('object-format')
    quill.addModule('toolbar',
      container: document.querySelector('#quill-toolbar')
      formats:
        tooltip:
          object: 'object'
    )

  resolveEvents: ($injector) =>
    @resolved = {}
    for event, service of events
      @resolved[event] = $injector.invoke(service)

  factory: ($injector, $rootScope, $q) =>
    @resolveEvents($injector)
    resolved = @resolved

    class Format
      constructor: (@quill, options) ->
        @utils = new TaggableObjectQuillFormatUtils(@quill, options)
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
          $q.when(resolved['search'](text)).then((item) =>
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

    isRegistered = false

    register: =>
      return if isRegistered

      Quill.registerModule('object-format', Format)
      isRegistered = true
      $rootScope.$on('quill.created', @registerFormat)

taggableObjectQuillFormat.provider('TaggableObjectQuillFormat', TaggableObjectQuillFormat)
