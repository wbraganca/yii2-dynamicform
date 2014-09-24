yii2-dynamicform
===================
Is a jquery plugin to clone form elements in a nested manner, maintaining accessibility.

Installation
------------

The preferred way to install this extension is through [composer](http://getcomposer.org/download/).

Either run

```
php composer.phar require --prefer-dist wbraganca/yii2-dynamicform "*"
```

or add

```
"wbraganca/yii2-dynamicform": "*"
```

to the require section of your `composer.json` file.


How to use
----------

On your view file.

```php
<?php
use yii\helpers\Html;
use yii\widgets\ActiveForm;
use wbraganca\dynamicform\DynamicFormWidget;
use kartik\widgets\DatePicker;
?>

<?php $form = ActiveForm::begin([
     'options' => [
        'id' => 'dynamic-form'
    ]
]); ?>
...

<?php DynamicFormWidget::begin([
    'cloneContainer' => '.clone-item',
    'model' => $modelsMultipleItem[0],
    'formId' => 'dynamic-form',
    'formFields' => [
        'nome'
    ],
    'options' => [
        'limit' => 4, // the maximum times, an element can be cloned (default 999)
    ]
]); ?>

<?php foreach ($modelsMultipleItem as $i => $modelMultipleItem): ?>
    <div class="clone-item panel panel-default">
        <div class="panel-heading">
            <h3 class="panel-title pull-left" style="padding-top: 7px;">Item</h3>
            <div class="pull-right">
                <button type="button" class="clone btn btn-success btn-sm">Clone</button>
                <button type="button" class="delete btn btn-danger btn-sm">Delete</button>
            </div>
            <div class="clearfix"></div>
        </div>
        <div class="panel-body">
            <?= $form->field($modelMultipleItem, "[{$i}]text")->textInput(['maxlength' => 64]) ?>
            <?= $form->field($modelMultipleItem, "[{$i}]date")->widget(DatePicker::classname(), [
                'pluginOptions' => [
                    'autoclose'=>true
                ]
            ]) ?>
        </div>
    </div>
<?php endforeach; ?>

<?php DynamicFormWidget::end(); ?>
...

<?php ActiveForm::end(); ?>
```
