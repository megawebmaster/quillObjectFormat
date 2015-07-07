class QuillObjectFormatUtils
  DEFAULTS =
    offset: 3
    template: "<span class='object'></span> <a class='remove'>Remove object</a>"
  HIDE_MARGIN = -10000

  constructor: (@quill, options) ->
    @options = jQuery.extend(options, DEFAULTS)
    @container = jQuery(@quill.addContainer('ql-tooltip'))
    @container.addClass('ql-object-tooltip').html(@options.template)
    @object = jQuery('.object', @container)

  isHidden: ->
    @container.offset().left == HIDE_MARGIN

  hide: ->
    @container.offset(left: HIDE_MARGIN)
    @container.data('range', null)

  show: (reference, range) =>
    position = @findText(reference)
    @container.css(left: position.left, top: position.top)
    @object.text(jQuery(reference).data('object')) unless reference.startOffset?
    @container.data('range', range)
    @container.focus()

  expandRange: (range) ->
    ref = @quill.editor.doc.findLeafAt(range.start, true)
    start = range.start - ref[1]
    end = start + ref[0].length

    start: start
    end: end

  findObject: (range) ->
    ref = @quill.editor.doc.findLeafAt(range.start, true)
    leaf = ref[0]

    node = leaf.node if leaf?
    while node != null && node != @quill.root
      if node.tagName == 'SPAN' && node.className.split(' ').indexOf('object') != -1
        return node
      node = node.parentNode

    return null

  findText: (reference) =>
    container = @container.get(0)
    if reference?
      referenceBounds = reference.getBoundingClientRect()
      parentBounds = @quill.container.getBoundingClientRect()
      offsetLeft = referenceBounds.left - parentBounds.left
      offsetTop = referenceBounds.top - parentBounds.top
      left = offsetLeft + referenceBounds.width / 2 - container.offsetWidth / 2
      top = offsetTop + referenceBounds.height + @options.offset
      if top + container.offsetHeight > @quill.container.offsetHeight
        top = offsetTop - container.offsetHeight - @options.offset
      left = Math.min(left, @quill.container.offsetWidth - container.offsetWidth)
      top = Math.min(top, @quill.container.offsetHeight - container.offsetHeight)
    else
      left = @quill.container.offsetWidth / 2 - container.offsetWidth / 2
      top = @quill.container.offsetHeight / 2 - container.offsetHeight / 2

    top += @quill.container.scrollTop

    left: left
    top: top
