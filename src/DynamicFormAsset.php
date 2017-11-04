<?php
/**
 * @link      https://github.com/wbraganca/yii2-dynamicform
 * @copyright Copyright (c) 2014 Wanderson Bragança
 * @license   https://github.com/wbraganca/yii2-dynamicform/blob/master/LICENSE
 */

namespace mabentley85\dynamicform;

use yii\web\AssetBundle;

/**
 * Asset bundle for dynamicform Widget
 *
 * @author Wanderson Bragança <wanderson.wbc@gmail.com>
 */
class DynamicFormAsset extends AssetBundle
{
    /**
     * @inheritdoc
     */
    public $depends = [
        'yii\web\JqueryAsset',
        'yii\widgets\ActiveFormAsset'
    ];

    /**
     * @inheritdoc
     */
    public $sourcePath = '@vendor/mabentley85/yii2-dynamicform/src/assets';

    /**
     * @inheritdoc
     */
    public $js = ['yii2-dynamic-form.js'];
}
