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
                if (!data) {
                    var settings = $.extend({}, defaults, options || {});

                    settings.fields.forEach(function(attribute) {
                        var yiiActiveFormAttribute = $("#" + settings.formId).yiiActiveForm("find", attribute.id.replace("{}", 0));
                        if (yiiActiveFormAttribute !== undefined) {
                           attribute.baseConfig = yiiActiveFormAttribute;
                        }
                    });

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

                    if ($container.find(settings.dynamicItem).length === 0) {
                        settings.fields.forEach(function(attribute) {
                            var id = attribute.id.replace("{}", 0);
                            if ($("#" + settings.formId).yiiActiveForm("find", id) !== undefined) {
                               $("#" + settings.formId).yiiActiveForm("remove", id);
                            }
                        });
                    }
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
                var attribute = v.baseConfig;
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
            if (cloneCount > 0) {
                config.fields.forEach(function(v) {
                    var id = v.id.replace("{}", (cloneCount - 1));
                    if ($("#" + config.formId).yiiActiveForm("find", id) !== "undefined") {
                        $("#" + config.formId).yiiActiveForm("remove", id);
                    }
                });
            }
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

        // "kartik-v/yii2-widget-datepicker"
        var $hasDatepicker = $(config.dynamicItems).find('[data-plugin-name=datepicker]');
        if ($hasDatepicker.length > 0) {
            $hasDatepicker.each(function() {
                $(this).parent().removeData().datepicker('remove');
                $(this).parent().datepicker(eval($(this).attr('data-plugin-options')));
            });
        }

        // "kartik-v/yii2-widget-timepicker"
        var $hasTimepicker = $(config.dynamicItems).find('[data-plugin-name=timepicker]');
        if ($hasTimepicker.length > 0) {
            $hasTimepicker.each(function() {
                $(this).removeData().off();
                $(this).parent().find('.bootstrap-timepicker-widget').remove();
                $(this).unbind();
                $(this).timepicker(eval($(this).attr('data-plugin-options')));
            });
        }

        // "kartik-v/yii2-money"
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

        // "kartik-v/yii2-widget-fileinput"
        var $hasFileinput = $(config.dynamicItems).find('[data-plugin-name=fileinput]');
        if ($hasFileinput.length > 0) {
            $hasFileinput.each(function() {
                $(this).fileinput(eval($(this).attr('data-plugin-options')));
            });
        }

        // "kartik-v/yii2-widget-touchspin"
        var $hasTouchSpin = $(config.dynamicItems).find('[data-plugin-name=TouchSpin]');
        if ($hasTouchSpin.length > 0) {
            $hasTouchSpin.each(function() {
                $(this).TouchSpin('destroy');
                $(this).TouchSpin(eval($(this).attr('data-plugin-options')));
            });
        }

        // "kartik-v/yii2-widget-colorinput"
        var $hasSpectrum = $(config.dynamicItems).find('[data-plugin-name=spectrum]');
        if ($hasSpectrum.length > 0) {
            $hasSpectrum.each(function() {
                var id = '#' + $(this).attr('id');
                var sourceID  = id + '-source';
                $(sourceID).spectrum('destroy');
                $(sourceID).unbind();
                $(id).unbind();
                var configSpectrum = eval($(this).attr('data-plugin-options'));
                configSpectrum.change = function (color) {
                    jQuery(id).val(color.toString());
                };
                $(sourceID).attr('name', $(sourceID).attr('id'));
                $(sourceID).spectrum(configSpectrum);
                $(sourceID).spectrum('set', jQuery(id).val());
                $(id).on('change', function(){
                    $(sourceID).spectrum('set', jQuery(id).val());
                });
            });
        }

        // "kartik-v/yii2-widget-select2"
        var $hasSelect2 = $(config.dynamicItems).find('[data-plugin-name=select2]');
        if ($hasSelect2.length > 0) {
            $hasSelect2.each(function() {
                var id = $(this).attr('id');
                var configSelect2 = eval($(this).attr('data-plugin-options'));
                $(this).select2('destroy');
                $.when($('#' + id).select2(configSelect2)).done(initSelect2Loading(id));
                $('#' + id).on('select2-open', function(){initSelect2DropStyle(id)});
            });
        }

        // "kartik-v/yii2-widget-depdrop"
        var $hasDepdrop = $(config.dynamicItems).find('[data-plugin-name=depdrop]');
        if ($hasDepdrop.length > 0) {
            $hasDepdrop.each(function() {
                $(this).removeData().off();
                $(this).unbind();
                var configDepdrop = eval($(this).attr('data-plugin-options'));
                var inputID = $(this).attr('id');
                var matchID = inputID.match(regex);
                if (matchID && matchID.length === 4) {
                    for (index = 0; index < configDepdrop.depends.length; ++index) {
                        var match = configDepdrop.depends[index].match(regex);
                        if (match && match.length === 4) {
                            configDepdrop.depends[index] = match[1] + matchID[2] + match[3];
                        }
                    }
                }
                $(this).depdrop(configDepdrop);
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
                // "for" attribute 
                var elmLabel = $(this).attr('for');
                if (elmLabel) {
                    var match = elmLabel.match(regex);
                    if (match && match.length === 4) {
                        $(this).attr('for', match[1] + i + match[3]);
                    } else {
                        $(this).attr('for', elmLabel + i);
                    }
                }
                // "name" attribute 
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
