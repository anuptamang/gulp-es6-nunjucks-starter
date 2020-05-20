jQuery(function() {
  initResizeHandler();
});

export default function initResizeHandler() {
  var win = jQuery(window),
    doc = jQuery('html'),
    resizeClass = 'resize-active',
    flag,
    timer;
  var removeClassHandler = function() {
    flag = false;
    doc.removeClass(resizeClass);
  };
  var resizeHandler = function() {
    if (!flag) {
      flag = true;
      doc.addClass(resizeClass);
    }
    clearTimeout(timer);
    timer = setTimeout(removeClassHandler, 500);
  };

  win.on('resize orientationchange', resizeHandler);
}
