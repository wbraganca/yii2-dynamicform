/**
 * yii2-dynamic-form
 *
 * A jQuery plugin to clone form elements in a nested manner, maintaining accessibility.
 *
 * @author Wanderson Bragança <wanderson.wbc@gmail.com>
 */
(function ($) {
    $.fn.yiiDynamicForm = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.yiiDynamicForm');
            return false;
        }
    };

    var events = {
        beforeClone: 'beforeClone',
        afterClone: 'afterClone',
        limitReached: 'limitReached',
        afterRemove: 'afterRemove'
    };

    var defaults = {
        // the maximum times, an element can be cloned
        limit: 999, //setting it to a high number, by default
        cloneContainer: '.clone-container',
        // a valid jQuery selector for the element that triggers cloning
        // must be a child of the cloneContainer selector
        cloneButton: '.clone',
        // a valid jQuery selector for the element that triggers removal
        // must be a child of the cloneContainer selector
        deleteButton: '.delete',
        // the position the clone will be inserted
        // relative to the original element
        clonePosition: 'after', // or 'before'
        // a valid jQuery selector for the element to be cloned
        cloneFromTemplate: false
    };

    var config;

    var regex = /(.*-)(\d)(-.*)/i;

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $container = $(this);
                if ($container.data('yiiDynamicForm')) {
                    return;
                }
                config = $.extend({}, defaults, options || {});
                if ($container.find(config.cloneButton).length) {
                    // add a click handler for the clone button
                    $container.on('click', config.cloneButton, function(event) {
                        event.preventDefault();
                        $container.triggerHandler(events.beforeClone, [$(this)]);
                        startClone(event, $(this), $container);
                        if ($container.find(config.deleteButton).length) {
                            $container.on('click', config.deleteButton, function(event) {
                                event.preventDefault();
                                removeItem($container, $(this));
                            });
                        }
                    });
                }
            });
        },

        updateContainer: function () {
            var $container = $(this);
            redoIDs($container);
            restoreSpecialJs($container);
        }
    };

    var startClone = function(event, $btnAdd, $container) {
        // get the count of all the clones
        var cloneCount = $container.find(config.cloneContainer).length;
        // check if we've reached the maximum limit
        if (cloneCount < config.limit) {
            // get the closest parent clone
            //$toclone = $this.closest(config.cloneContainer);
            if (config.cloneFromTemplate !== false) {
                $toclone = $($(config.cloneFromTemplate).html());
            } else{
                $toclone = $(config.cloneContainer).first();
            }
            // clone it
            $newclone = $toclone.clone(false, false);
            $newclone.find('input, textarea, select').each(function() {
                $(this).val('');
            });
            if (config.clonePosition != 'after') {
                $(config.cloneContainer).firt().before($newclone);
            } else {
                $(config.cloneContainer).last().after($newclone);
            }
            // reformat the id attributes
            redoIDs($container);
            removeErrorCssClass($newclone);
            restoreSpecialJs($container);
            $container.triggerHandler(events.afterClone, $newclone);
        } else {
            // trigger a custom event for hooking
            $container.triggerHandler(events.limitReached, config.limit);
        }
    };

    var removeItem = function($container, $item) {
        var cloneCount = $container.find(config.cloneContainer).length;
        // never delete all the clones
        // at least one must remain
        if (cloneCount > 1) {
            // get the closest parent clone
            $todelete = $item.closest(config.cloneContainer);
            $todelete.remove();
            redoIDs($container);
            restoreSpecialJs($container);
            $container.triggerHandler(events.afterRemove);
        }
    }

    var removeErrorCssClass = function($container) {
        $container.find('.has-success').each(function() {
            $(this).removeClass('has-success');
        });
        $container.find('.has-error').each(function() {
            $(this).removeClass('has-error');
        });
    };

    var restoreSpecialJs = function($container) {
        // datepicker
        var $hasDatepicker = $(config.cloneContainer).find('[data-plugin-name=datepicker]');
        if ($hasDatepicker.length > 0) {
            $hasDatepicker.each(function() {
                $(this).parent().removeData().datepicker('remove');
                $(this).parent().datepicker($(this).attr('data-plugin-options'));
            });
        }

        // maskmoney
        var $hasMaskmoney = $(config.cloneContainer).find('[data-plugin-name=maskMoney]');
        if ($hasMaskmoney.length > 0) {
            $hasMaskmoney.each(function() {
                $(this).parent().find('input').removeData().off();
                var id = '#' + $(this).attr('id');
                var displayID  = id + '-disp';
                $(displayID).maskMoney('destroy');
                $(displayID).maskMoney(eval($(this).attr('data-plugin-options')));
                $(displayID).maskMoney('mask', parseFloat($(displayID).val()));
                $(displayID).on('change', function () {
                    var numDecimal = $(displayID).maskMoney('unmasked')[0];
                    $(id).val(numDecimal);
                    $(id).trigger('change');
                });
            });
        }

        // fileinput
        var $hasFileinput = $(config.cloneContainer).find('[data-plugin-name=fileinput]');
        if ($hasFileinput.length > 0) {
            $hasFileinput.each(function() {
                $(this).fileinput(eval($(this).attr('data-plugin-options')));
            });
        }

        // TouchSpin
        var $hasTouchSpin = $(config.cloneContainer).find('[data-plugin-name=TouchSpin]');
        if ($hasTouchSpin.length > 0) {
            $hasTouchSpin.each(function() {
                $(this).TouchSpin('destroy');
                $(this).TouchSpin(eval($(this).attr('data-plugin-options')));
            });
        }
    };

    var redoIDs = function($container) {
        $container.find(config.cloneContainer).each(function(i) {
            // first modify the clone id
            var j = i;
            var $obj = $(this);
            $(this).find('*').each(function() {
                var id = $(this).attr('id');
                if (id) {
                    var newID = id;
                    var match = id.match(regex);
                    if (match && match.length === 4) {
                        newID = match[1] + i + match[3];
                        $(this).attr('id', newID);
                    } else {
                        newID = id + i;
                        $(this).attr('id', newID);
                    }
                    if (id !== newID) {
                        $obj.find('.field-' + id).each(function() {
                            $(this).removeClass('field-' + id).addClass('field-' + newID);
                        });
                    }
                }
                // attribute for
                var elmLabel = $(this).attr('for');
                if (elmLabel) {
                    var match = elmLabel.match(regex);
                    if (match && match.length === 4) {
                        $(this).attr('for', match[1] + i + match[3]);
                    } else {
                        $(this).attr('for', elmLabel + i);
                    }
                }
                // attribute name
                var name = $(this).attr('name');
                // This will increment the numeric array index for cloned field names
                if (name) {
                    var matches = name.match(/\[([^}]+)\]/);
                    if (matches && matches.length >= 1) {
                        var st = name;
                        name = [].map.call(st, function(s, i) {
                            return (!isNaN(+s) && st[i - 1] === '[' && st[i + 1] === ']') ? j : s;
                        }).join('');
                        $(this).attr('name', name);
                    }
                }
            });
        });
    };

})(window.jQuery);
