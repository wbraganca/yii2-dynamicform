<?php
/**
 * @link      https://github.com/wbraganca/yii2-dynamicform
 * @copyright Copyright (c) 2014 Wanderson Bragança
 * @license   https://github.com/wbraganca/yii2-dynamicform/blob/master/LICENSE
 */

namespace wbraganca\dynamicform;

use Symfony\Component\DomCrawler\Crawler;
use yii\helpers\Json;
use yii\helpers\Html;

/**
 * yii2-dynamicform is a jquery plugin to clone form elements in a nested manner, maintaining accessibility.
 *
 * @author Wanderson Bragança <wanderson.wbc@gmail.com>
 */
class DynamicFormWidget extends \yii\base\Widget
{
    /**
     * @var array
     */
    public $options = [];
    /**
     * @var string
     */
    public $cloneContainer;
    /**
     * @var string
     */
    private $templateID;

    /**
     * Initializes the widget
     *
     * @throws \yii\base\InvalidConfigException
     */
    public function init()
    {
        parent::init();
         if (empty($this->cloneContainer)) {
            throw new InvalidConfigException("The 'cloneContainer' property must be set.");
        }
        $this->initOptions();
    }

    /**
     * Initializes the widget options
     */
    protected function initOptions()
    {
        $this->templateID = 'template-' . $this->id;
        $this->registerAssets();
        ob_start();
        ob_implicit_flush(false);
    }

    /**
     * Registers the needed assets
     */
    public function registerAssets()
    {
        $view = $this->getView();
        DynamicFormAsset::register($view);
        $this->options['cloneContainer'] = $this->cloneContainer;
        $this->options['cloneFromTemplate'] = '#' . $this->templateID;
        $options = Json::encode($this->options);
        $view->registerJs('$("#' . $this->id . '").yiiDynamicForm(' .$options .')');
    }

    public function run()
    {
        $content = ob_get_clean();
        $crawler = new Crawler($content);
        $results = $crawler->filter($this->cloneContainer);
        $document = new \DOMDocument('1.0', 'UTF-8');
        $document->appendChild($document->importNode($results->first()->getNode(0), true));
        $htmlFirstItem = "\n" . rtrim($document->saveHTML())."\n";
        $template = Html::tag('template', $htmlFirstItem, ['id' => $this->templateID, 'style' => 'display: none;']);
        $output = $content . $template . "\n";
        echo Html::tag('div', $output, ['id' => $this->id]);
    }
}
