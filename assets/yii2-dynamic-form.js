/**
 * yii2-dynamic-form
 *
 * A jQuery plugin to clone form elements in a nested manner, maintaining accessibility.
 *
 * @author Wanderson Bragança <wanderson.wbc@gmail.com>
 */
(function ($) {
    var pluginName = 'yiiDynamicForm';
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
        min: 1,
        dynamicItems: '.dynamic-items',
        dynamicItem: '.dynamic-item',
        cloneButton: '.clone',
        deleteButton: '.delete',
        clonePosition: 'after', // or 'before'
        template: false
    };

    var regex = /(.*-)(\d)(-.*)/i;

    var methods = {
        init: function (options) {
            return this.each(function () {
                var $container = $(this);

                var data = $container.data(pluginName);
                if (!data){
                    var settings = $.extend({}, defaults, options || {});

                    $container.data(pluginName, {
                        target : $container,
                        settings: settings
                    });
                    if ($container.find(settings.cloneButton).length) {
                        // add a click handler for the clone button
                        $container.on('click', settings.cloneButton, function(event) {
                            event.preventDefault();
                            $container.triggerHandler(events.beforeClone, [$(this)]);
                            startClone(event, $(this), $container);
                        });
                    }
                    $container.on('click', settings.deleteButton, function(event) {
                        event.preventDefault();
                        removeItem($container, $(this));
                    });
                }

            });
        },

        updateContainer: function () {
            var $container = $(this);
            redoIDs($container);
            restoreSpecialJs($container);
            fixFormValidaton($container);
        }
    };

    var startClone = function(event, $btnAdd, $container) {
        var config = $container.data(pluginName).settings;

        // get the count of all the clones
        var cloneCount = $container.find(config.dynamicItem).length;
        // check if we've reached the maximum limit
        if (cloneCount < config.limit) {
            $toclone = $($(config.template).html());
            // clone it
            $newclone = $toclone.clone(false, false);
            $newclone.find('input, textarea, select').each(function() {
                $(this).val('');
            });
            if (config.clonePosition != 'after') {
                $(config.dynamicItems).prepend($newclone);
            } else {
                $(config.dynamicItems).append($newclone);
            }
            redoIDs($container);
            removeErrorCssClass($newclone);
            restoreSpecialJs($container);
            fixFormValidaton($container);
            $container.triggerHandler(events.afterClone, $newclone);
        } else {
            // trigger a custom event for hooking
            $container.triggerHandler(events.limitReached, config.limit);
        }
    };

    var fixFormValidaton = function($container) {
        var config = $container.data(pluginName).settings;
        $(config.dynamicItem).each(function(i) {
            config.fields.forEach(function(v) {
                var id = v.id.replace("{}", i);
                var attribute = $("#" + config.formId).yiiActiveForm("find", v.id.replace("{}", 0));
                if (attribute !== undefined) {
                    attribute = $.extend(true, {}, attribute);
                    attribute.id = id;
                    attribute.container = ".field-" + id;
                    attribute.input = "#" + id;
                    attribute.name = v.name.replace("{}", i);
                    attribute.value = $("#" + id).val();
                    attribute.status = 0;
                    if ($("#" + config.formId).yiiActiveForm("find", id) !== "undefined") {
                        $("#" + config.formId).yiiActiveForm("remove", id);
                    }
                    $("#" + config.formId).yiiActiveForm("add", attribute);
                }
            });
        });
    };

    var removeItem = function($container, $item) {
        var config = $container.data(pluginName).settings;
        var cloneCount = $container.find(config.dynamicItem).length;
        if (cloneCount > config.min) {
            // get the closest parent clone
            $todelete = $item.closest(config.dynamicItem);
            $todelete.remove();
            redoIDs($container);
            restoreSpecialJs($container);
            fixFormValidaton($container);
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
        var config = $container.data(pluginName).settings;
        // datepicker
        var $hasDatepicker = $(config.dynamicItems).find('[data-plugin-name=datepicker]');
        if ($hasDatepicker.length > 0) {
            $hasDatepicker.each(function() {
                $(this).parent().removeData().datepicker('remove');
                $(this).parent().datepicker($(this).attr('data-plugin-options'));
            });
        }

        // maskmoney
        var $hasMaskmoney = $(config.dynamicItems).find('[data-plugin-name=maskMoney]');
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
        var $hasFileinput = $(config.dynamicItems).find('[data-plugin-name=fileinput]');
        if ($hasFileinput.length > 0) {
            $hasFileinput.each(function() {
                $(this).fileinput(eval($(this).attr('data-plugin-options')));
            });
        }

        // TouchSpin
        var $hasTouchSpin = $(config.dynamicItems).find('[data-plugin-name=TouchSpin]');
        if ($hasTouchSpin.length > 0) {
            $hasTouchSpin.each(function() {
                $(this).TouchSpin('destroy');
                $(this).TouchSpin(eval($(this).attr('data-plugin-options')));
            });
        }
    };

    var redoIDs = function($container) {
        var config = $container.data(pluginName).settings;
        $container.find(config.dynamicItem).each(function(i) {
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
