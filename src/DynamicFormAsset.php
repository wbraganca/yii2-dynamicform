<?php
/**
 * @link      https://github.com/wbraganca/yii2-dynamicform
 * @copyright Copyright (c) 2014 Wanderson Bragança
 * @license   https://github.com/wbraganca/yii2-dynamicform/blob/master/LICENSE
 */

namespace wbraganca\dynamicform;

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
    public $sourcePath = '@vendor/wbraganca/yii2-dynamicform/assets';

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
    public function init()
    {
        if (YII_DEBUG) {
            $this->js = ['yii2-dynamic-form.js'];
        } else {
            $this->js = ['yii2-dynamic-form.min.js'];
        }

        parent::init();
    }
}
