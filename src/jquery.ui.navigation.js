/**
 * Menu Widget
 *
 * @author    Michael van Engelshoven <mve@brainbits.net>
 * @copyright 2011 Brainbits GmbH
 * @version   $id$
 */
(function ($, undefined) {

$.widget('phlex.navigation', {

    /**
     * Widget options
     */
    options: {
        position: {
            my: 'left top',
            at: 'left bottom'
        },
        timeout: 350,
        sensity: 10,
        itemSelector: 'li',
        submenuSelector: 'ul'
    },
    
    /**
     * Indicates that the menu is open
     */
    _isOpen: false,
    
    /**
     * jQuery object wich contains all navigation items
     */
    _items: [],
    
    /**
     * ID returned by setTimeoput for the close timer
     */
    _closeTimer: null,

    /**
     * ID returned by setInterval for the mouse tracking
     */    
    _trackTimer: null,

    /**
     * Inititializes the navigation widget
     */
    _create: function () {
    
        var self    = this,
            options = this.options
            menu    = this.element;
            items   = this._items = menu.find(options.itemSelector);
            
        self._setCurrent(items.first());
        
        menu.bind('mouseenter.' + self.widgetEventPrefix, $.proxy(self._handleHover, self))
            .bind('mouseleave.' + self.widgetEventPrefix, $.proxy(self._handleLeave, self))
            .bind('keydown.' + self.widgetEventPrefix, function (event){
            	switch (event.keyCode) {
                    case $.ui.keyCode.UP:
                    	self._handleToPrevious(event);
                    	event.preventDefault();
                    	break;
                    case $.ui.keyCode.DOWN:
                    	self._handleToNext(event);
                    	event.preventDefault();
                    	break;
                	case $.ui.keyCode.LEFT:
                		self._handleToParent(event);
                		event.preventDefault();
                		break;
                	case $.ui.keyCode.RIGHT:
                		self._handleToSubmenu(event);
                		event.preventDefault();
                		break;
            	};
            });
             
        items.each(function(){
        
            var item    = $(this),
                button  = item.children('a').first(),
                submenu = item.children(options.submenuSelector);
                                
            button.button();
            
            button.attr('role', 'menuitem');
            
            button.bind('mouseenter.' + self.widgetEventPrefix + ' focus.' + self.widgetEventPrefix, function(event) {
                self._setCurrent(item);
                if (event.type === 'focus') {
                    self.open();
                }
            });
            
            // This is a workaroud for touch devices. The button can only be clicked, if the submenu is visible
            button.bind('click.' + self.widgetEventPrefix, function() {
                if (submenu.length && !submenu.is(':visible')) {
                    return false;
                }
            });
            
            if (submenu.length) {
                button.button('option', 'icons', {secondary: "icon-arrow-down"})
                      .attr('aria-haspopup', 'true');
            }
            
        });
    },
    
    /**
     * Create option object for specified depth
     *
     * Some options can be configured as array, with differen values for different nestings. This method
     * resolved the actual option values for the given depth. If given depth is not configured in array,
     * the most recent one will be used.
     *
     * @param  {integer} depth Nesting depth of item
     * @return {object} Option object
     */
    _getOptionsForDepth: function (depth) {
        
        var depthOptions = $.extend({}, this.options),
            index;
            
        if ($.isArray(depthOptions.position)) {
            index = Math.min(depth, depthOptions.position.length) - 1;            
            depthOptions.position = depthOptions.position[index];
        }
        
        return depthOptions;
    },
    
    _setCurrent: function(elem) {
    
        link = elem.children('a').removeAttr('tabindex');
               
        this._items.children('a')
                   .not(link)
                   .attr('tabindex', '-1');
        
        this._current = elem;
        this._refresh();
    },
    
    /**
     * Refreshes the display status of sub menues
     */
    _refresh: function () {
    
        var options     = this.options,
            items       = this._items,
            menu        = this.element,
            current     = this._current,
            link        = current.children('a').first(),
            depth       = current.parents(options.submenuSelector).not(menu.parents()).length
            currentPath = current.parents(options.itemSelector).andSelf();

        options = this._getOptionsForDepth(depth);
        
        this._trigger('refresh');
        
        if (this._isOpen) {
            current.children(options.submenuSelector)
                   .show()
                   .position($.extend({
                       of: link,
                       collision: 'none'
                   }, options.position));
            
            items.not(currentPath)
                 .children(options.submenuSelector)
                 .hide();
        } else {
            items.children(options.submenuSelector).hide();
        }
    },
    
    /**
     * Handles action when mouse enters the menu
     *
     * @param {eventObject} event jQuery event object
     */
    _handleHover: function (event) {
       
        clearTimeout(this._closeTimer);
        
        if (!this._isOpen) {
            this._trackMousemove(event);
        }
    },
    
    /**
     * Handles action when mouse leave the menu
     *
     * @param {eventObject} event jQuery event object
     */
    _handleLeave: function (event) {
    
        var self = this;
        
        // Reset mouse tracking for opening
        self.element.unbind('mousemove.' + self.widgetEventPefix);
        clearInterval(self._trackTimer);
        
        if (self._isOpen) {
            self._closeTimer = setTimeout(function () {
                self.close();
            }, self.options.timeout);
        }
    },
    
    /**
     * Handles keydown for the up key
     */
    _handleToPrevious: function (event) {
        this._current
            .prev()
            .children('a')
            .focus();  
    },

    /**
     * Handles keydown for the down key
     */    
    _handleToNext: function (event) {
        this._current
            .next()
            .children('a')
            .focus();
    },
    
    /**
     * Handles keydown for the left key
     */    
    _handleToParent: function (event) {
        this._current
            .parent(this.options.submenuSelector)
            .prev('a')
            .focus();
    },
    
    /**
     * Handles keydown for the right key
     */    
    _handleToSubmenu: function (event) {
        this.open();
        this._current
            .children(this.options.submenuSelector)
            .children(this.options.itemSelector)
            .first()
            .children('a')
            .focus();
    },
    
    /**
     * Checks if user intend to open the menu.
     *
     * @param {eventObject} event jQuery event object
     */    
    _trackMousemove: function (event) {
    
        var self    = this,
            menu    = self.element,
            start   = {x: event.clientX, y: event.clientY},
            current = {x: event.clientX, y: event.clientY};

        menu.bind('mousemove.' + self.widgetEventPefix, function (event) {
            current.x = event.clientX;
            current.y = event.clientY;
        });
        
        self._trackTimer = setInterval(function () {
            
            var distance     = Math.sqrt(Math.pow(start.x - current.x, 2) + Math.pow(start.y - current.y, 2)),
                mouseTooSlow = self.options.sensity > distance;
                
            if (!mouseTooSlow) {
                start.x = current.x;
                start.y = current.y;            
            } else {
                // Stop tracking
                clearInterval(self._trackTimer);
                menu.unbind('mousemove.' + self.widgetEventPefix);
                // Open menu
                self.open();
            }
            
        }, 100);
    },
    
    /**
     * Opens the menu
     */
    open: function () {
    
        if (this._trigger('beforeopen') === false){
    		return;
    	}
        
        this._trigger('open');
        this._isOpen = true;
        this._refresh();   
    },
    
    /**
     * Closes the menu
     */
    close: function () {
      
        if (this._trigger('beforeclose') === false){
    		return;
    	}
    	
        this._setCurrent(this._items.first());    
        this._trigger('close');
        this._isOpen = false;
        this._refresh();
    }
    
});

}(jQuery));