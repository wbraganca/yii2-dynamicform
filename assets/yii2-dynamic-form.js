/**
 * yii2-dynamic-form
 *
 * A jQuery plugin to clone form elements in a nested manner, maintaining accessibility.
 *
 * @author Wanderson Bragança <wanderson.wbc@gmail.com>
 */
(function ($) {
    var pluginName = 'yiiDynamicForm';

    var regexID = /^(.+?)([-\d-]{1,})(.+)$/i;

    var regexName = /(^.+?)([\[\d{1,}\]]{1,})(\[.+\]$)/i;

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
        beforeInsert: 'beforeInsert',
        afterInsert: 'afterInsert',
        beforeDelete: 'beforeDelete',
        afterDelete: 'afterDelete',
        limitReached: 'limitReached'
    };

    var methods = {
        init: function (settings) {
            return this.each(function () {
                var $this = $(this);
                var widgetData = {};

                if ($('body').data(pluginName) !== undefined) {
                    widgetData = $('body').data(pluginName);
                }

                if (widgetData[settings.widgetContainer] === undefined) {
                    widgetData = (widgetData[settings.widgetContainer] = settings, widgetData);
                    settings.template = _parseTemplate(settings);

                    $('body').data(pluginName, widgetData);

                    // add a click handler for the clone button
                    $('#' + settings.formId).on('click', settings.insertButton, function(e) {
                        e.preventDefault();
                        $('.' + settings.widgetContainer).triggerHandler(events.beforeInsert, [$(this)]);
                        _addItem(settings.widgetContainer, e, $(this));
                    });

                    // add a click handler for the remove button
                    $('#' + settings.formId).on('click', settings.deleteButton, function(e) {
                        e.preventDefault();
                        _deleteItem(settings.widgetContainer, e, $(this));
                    });
                }
            });
        },

        updateContainer: function () {
            var widgetContainer = $(this).attr('data-dynamicform');
            _updateAttributes(widgetContainer);
            _restoreSpecialJs(widgetContainer);
            _fixFormValidaton(widgetContainer);
        }
    };

    var _parseTemplate = function(settings) {
        var $template = $(settings.template);
        $template.find('div[data-dynamicform]').each(function(){
            var widgetData = $('body').data(pluginName)[$(this).attr('data-dynamicform')];
            if ($(widgetData.widgetItem).length > 1) {
                var item = $(this).find(widgetData.widgetItem).first()[0].outerHTML;
                $(this).find(widgetData.widgetBody).html(item);
            }
        });

        $template.find('input, textarea, select').each(function() {
            $(this).val('');
        });

        $template.find('input[type="checkbox"]').each(function() {
            var inputName = $(this).attr('name');
            var $inputHidden = $template.find('input[type="hidden"][name="' + inputName + '"]').first();
            if ($inputHidden) {
                $(this).val(1);
                $inputHidden.val(0);
            }
        });

        return $template;
    };

    var _getDataWidgetRoot = function(widgetContainer) {
        var widgetData = $('body').data(pluginName)[widgetContainer];
        var widgetContainerRoot = $(widgetData.widgetBody).parents('div[data-dynamicform]').last().attr('data-dynamicform');
        return $('body').data(pluginName)[widgetContainerRoot];
    };

    var _getLevel = function($elem) {
        var level = $elem.parents('div[data-dynamicform]').length;
        level = (level < 0) ? 0 : level;
        return level;
    };

    var _count = function($elem, widgetContainer) {
        var widgetData = $('body').data(pluginName)[widgetContainer];
        return $elem.closest('.' + widgetContainer).find(widgetData.widgetItem).length;
    };

    var _creatIdentifiers = function(level) {
        return new Array(level + 2).join('0').split('');
    };

    var _addItem = function(widgetContainer, e, $elem) {
        var widgetData = $('body').data(pluginName)[widgetContainer];
        var count = _count($elem, widgetContainer);

        if (count < widgetData.limit) {
            $toclone = widgetData.template;
            $newclone = $toclone.clone(false, false);

            if (widgetData.insertPosition === 'top') {
                $elem.closest('.' + widgetData.widgetContainer).find(widgetData.widgetBody).prepend($newclone);
            } else {
                $elem.closest('.' + widgetData.widgetContainer).find(widgetData.widgetBody).append($newclone);
            }

            _updateAttributes(widgetContainer);
            _restoreSpecialJs(widgetContainer);
            _fixFormValidaton(widgetContainer);
            $elem.closest('.' + widgetContainer).triggerHandler(events.afterInsert, $newclone);
        } else {
            // trigger a custom event for hooking
            $elem.closest('.' + widgetContainer).triggerHandler(events.limitReached, widgetData.limit);
        }
    };

    var _removeValidations = function($elem, widgetData, count) {
        if (count > 1) {
            $elem.find('div[data-dynamicform]').each(function() {
                var currentAttrData = $('body').data(pluginName)[$(this).attr('data-dynamicform')];
                var level           = _getLevel($(this));
                var identifiers     = _creatIdentifiers(level);
                var numItems        = $(this).find(currentAttrData.widgetItem).length;

                for (var i = 1; i <= numItems -1; i++) {
                    var aux = identifiers;
                    aux[level] = i;
                    currentAttrData.fields.forEach(function(input) {
                        var id = input.id.replace("{}", aux.join('-'));
                        if ($("#" + currentAttrData.formId).yiiActiveForm("find", id) !== "undefined") {
                            $("#" + currentAttrData.formId).yiiActiveForm("remove", id);
                        }
                    });
                }
            });

            var level          = _getLevel($elem.closest('.' + widgetData.widgetContainer));
            var rootData       = _getDataWidgetRoot(widgetData.widgetContainer);
            var identifiers    = _creatIdentifiers(level);
            identifiers[0]     = $(rootData.widgetItem).length - 1;
            identifiers[level] = count - 1;

            widgetData.fields.forEach(function(input) {
                var id = input.id.replace("{}", identifiers.join('-'));
                if ($("#" + widgetData.formId).yiiActiveForm("find", id) !== "undefined") {
                    $("#" + widgetData.formId).yiiActiveForm("remove", id);
                }
            });
        }
    };

    var _deleteItem = function(widgetContainer, e, $elem) {
        var widgetData = $('body').data(pluginName)[widgetContainer];
        var count = _count($elem, widgetContainer);

        if (count > widgetData.min) {
            $todelete = $elem.closest(widgetData.widgetItem);

            // trigger a custom event for hooking
            var eventResult = $('.' + widgetData.widgetContainer).triggerHandler(events.beforeDelete, $todelete);
            if (eventResult !== false) {
                _removeValidations($todelete, widgetData, count);
                $todelete.remove();
                _updateAttributes(widgetContainer);
                _restoreSpecialJs(widgetContainer);
                _fixFormValidaton(widgetContainer);
                $('.' + widgetData.widgetContainer).triggerHandler(events.afterDelete);
            }
        }
    };

    var _updateAttrID = function($item, $elem, index, currentAttrData, level) {
        var id = $elem.attr('id');
        var newID = id;

        if (id !== undefined) {
            var matches = id.match(regexID);

            if (matches && matches.length === 4) {
                matches[2] = matches[2].substring(1, matches[2].length - 1);
                var identifiers = matches[2].split('-');
                identifiers[0] = index;

                if (level > 0 && identifiers[level] !== undefined) {
                    identifiers[level] = $elem.closest(currentAttrData.widgetItem).index();
                }

                newID = matches[1] + '-' + identifiers.join('-') + '-' + matches[3];
                $elem.attr('id', newID);
            } else {
                newID = id + index;
                $elem.attr('id', newID);
            }
        }

        if (id !== newID) {
            $item.find('.field-' + id).each(function() {
                $(this).removeClass('field-' + id).addClass('field-' + newID);
            });
            // update "for" attribute
            $elem.closest($item).find("label[for='" + id + "']").attr('for',newID); 
        }

        return newID;
    };

    var _updateAttrName = function($item, $elem, index, currentAttrData, level) {
        var name = $elem.attr('name');

        if (name !== undefined) {
            var matches = name.match(regexName);

            if (matches && matches.length === 4) {
                matches[2] = matches[2].replace(/\]\[/g, "-").replace(/\]|\[/g, '');
                var identifiers = matches[2].split('-');
                identifiers[0] = index;

                if (level > 0 && identifiers[level] !== undefined) {
                    identifiers[level] = $elem.closest(currentAttrData.widgetItem).index();
                }

                name = matches[1] + '[' + identifiers.join('][') + ']' + matches[3];
                $elem.attr('name', name);
            }
        }

        return name;
    };

    var _updateAttributes = function(widgetContainer) {
        var rootData = _getDataWidgetRoot(widgetContainer);

        $(rootData.widgetItem).each(function(index) {
            var $item = $(this);
            var level = 0;
            var currentAttrData = rootData;

            $(this).find('*').each(function() {
                if ($(this).attr('data-dynamicform') !== undefined) {
                    currentAttrData = $('body').data(pluginName)[$(this).attr('data-dynamicform')];
                    level = _getLevel($(this));
                }

                // update "id" attribute
                _updateAttrID($item, $(this), index, currentAttrData, level);

                // update "name" attribute
                _updateAttrName($item, $(this), index, currentAttrData, level);
            });
        });
    };

    var _fixFormValidatonInput = function(widgetData, input, index, id, name) {
        var attribute = input.baseConfig;

        if (attribute !== undefined) {
            attribute = $.extend(true, {}, attribute);
            attribute.id = id;
            attribute.container = ".field-" + id;
            attribute.input = "#" + id;
            attribute.name = input.name.replace("{}", index);
            attribute.value = $("#" + id).val();
            attribute.status = 0;

            if ($("#" + widgetData.formId).yiiActiveForm("find", id) !== "undefined") {
                $("#" + widgetData.formId).yiiActiveForm("remove", id);
            }

            $("#" + widgetData.formId).yiiActiveForm("add", attribute);
        }
    };

    var _fixFormValidatonInputs = function(widgetData, level, index, i) {
         widgetData.fields.forEach(function(input) {
            var identifiers    = _creatIdentifiers(level);
            var yiiActiveFormAttribute = $("#" + widgetData.formId).yiiActiveForm("find", input.id.replace("{}", identifiers.join('-')));

            if (yiiActiveFormAttribute !== undefined) {
                input.baseConfig       = yiiActiveFormAttribute;
                identifiers[0]     = index;
                identifiers[level] = i;
                var id             = input.id.replace("{}", identifiers.join('-'));
                var name           = input.name.replace("{}", identifiers.join(']['));
                _fixFormValidatonInput(widgetData, input, i, id, name);
            }
        });
    };

    var _fixFormValidaton = function(widgetContainer) {
        var rootData = _getDataWidgetRoot(widgetContainer);

        $(rootData.widgetItem).each(function(index) {
            var $item = $(this);
            var level = 0;
            var currentAttrData = rootData;
            _fixFormValidatonInputs(rootData, level, index, index);

            $(this).find('div[data-dynamicform]').each(function() {
                currentAttrData = $('body').data(pluginName)[$(this).attr('data-dynamicform')];
                level = _getLevel($(this));

                if (level > 0) {
                    $(this).find(currentAttrData.widgetItem).each(function(i) {
                         _fixFormValidatonInputs(currentAttrData, level, index, i);
                    });
                }
            });
        });
    };

    var _restoreSpecialJs = function(widgetContainer) {
        var rootData = _getDataWidgetRoot(widgetContainer);

        // "kartik-v/yii2-widget-datepicker"
        var $hasDatepicker = $(rootData.widgetItem).find('[data-krajee-datepicker]');
        if ($hasDatepicker.length > 0) {
            $hasDatepicker.each(function() {
                $(this).parent().removeData().datepicker('remove');
                $(this).parent().datepicker(eval($(this).attr('data-krajee-datepicker')));
            });
        }

        // "kartik-v/yii2-widget-timepicker"
        var $hasTimepicker = $(rootData.widgetItem).find('[data-krajee-timepicker]');
        if ($hasTimepicker.length > 0) {
            $hasTimepicker.each(function() {
                $(this).removeData().off();
                $(this).parent().find('.bootstrap-timepicker-widget').remove();
                $(this).unbind();
                $(this).timepicker(eval($(this).attr('data-krajee-timepicker')));
            });
        }

        // "kartik-v/yii2-money"
        var $hasMaskmoney = $(rootData.widgetItem).find('[data-krajee-maskMoney]');
        if ($hasMaskmoney.length > 0) {
            $hasMaskmoney.each(function() {
                $(this).parent().find('input').removeData().off();
                var id = '#' + $(this).attr('id');
                var displayID  = id + '-disp';
                $(displayID).maskMoney('destroy');
                $(displayID).maskMoney(eval($(this).attr('data-krajee-maskMoney')));
                $(displayID).maskMoney('mask', parseFloat($(id).val()));
                $(displayID).on('change', function () {
                    var numDecimal = $(displayID).maskMoney('unmasked')[0];
                    $(id).val(numDecimal);
                    $(id).trigger('change');
                });
            });
        }

        // "kartik-v/yii2-widget-fileinput"
        var $hasFileinput = $(rootData.widgetItem).find('[data-krajee-fileinput]');
        if ($hasFileinput.length > 0) {
            $hasFileinput.each(function() {
                $(this).fileinput(eval($(this).attr('data-krajee-fileinput')));
            });
        }

        // "kartik-v/yii2-widget-touchspin"
        var $hasTouchSpin = $(rootData.widgetItem).find('[data-krajee-TouchSpin]');
        if ($hasTouchSpin.length > 0) {
            $hasTouchSpin.each(function() {
                $(this).TouchSpin('destroy');
                $(this).TouchSpin(eval($(this).attr('data-krajee-TouchSpin')));
            });
        }

        // "kartik-v/yii2-widget-colorinput"
        var $hasSpectrum = $(rootData.widgetItem).find('[data-krajee-spectrum]');
        if ($hasSpectrum.length > 0) {
            $hasSpectrum.each(function() {
                var id = '#' + $(this).attr('id');
                var sourceID  = id + '-source';
                $(sourceID).spectrum('destroy');
                $(sourceID).unbind();
                $(id).unbind();
                var configSpectrum = eval($(this).attr('data-krajee-spectrum'));
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

        // "kartik-v/yii2-widget-depdrop"
        var $hasDepdrop = $(rootData.widgetItem).find('[data-krajee-depdrop]');
        if ($hasDepdrop.length > 0) {
            $hasDepdrop.each(function() {
                $(this).removeData().off();
                $(this).unbind();
                var configDepdrop = eval($(this).attr('data-krajee-depdrop'));
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

        // "kartik-v/yii2-widget-select2"
        var $hasSelect2 = $(rootData.widgetItem).find('[data-krajee-select2]');
        if ($hasSelect2.length > 0) {
            $hasSelect2.each(function() {
                var id = $(this).attr('id');
                var configSelect2 = eval($(this).attr('data-krajee-select2'));
                $(this).select2('destroy');
                $.when($('#' + id).select2(configSelect2)).done(initSelect2Loading(id));
                $('#' + id).on('select2-open', function() {
                    initSelect2DropStyle(id)
                });
                if ($(this).attr('data-krajee-depdrop')) {
                    $(this).on('depdrop.beforeChange', function(e,i,v) {
                        var configDepdrop = eval($(this).attr('data-krajee-depdrop'));
                        var loadingText = (configDepdrop.loadingText)? configDepdrop.loadingText : 'Loading ...';
                        $('#' + id).select2('data', {text: loadingText});
                    });
                    $(this).on('depdrop.change', function(e,i,v,c) {
                        $('#' + id).select2('val', $('#' + id).val());
                    });
                }
            });
        }
    };

})(window.jQuery);
