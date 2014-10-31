<?php
/**
 * @link      https://github.com/wbraganca/yii2-dynamicform
 * @copyright Copyright (c) 2014 Wanderson Bragança
 * @license   https://github.com/wbraganca/yii2-dynamicform/blob/master/LICENSE
 */

namespace wbraganca\dynamicform;

use Symfony\Component\DomCrawler\Crawler;
use Symfony\Component\CssSelector\CssSelector;
use yii\helpers\Json;
use yii\helpers\Html;
use yii\base\InvalidConfigException;

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
    public $dynamicItems;
    /**
     * @var string
     */
    public $dynamicItem;
    /**
     * @var boolean
     */
    public $initWithItems = true;
     /**
     * @var Model|ActiveRecord the model used for the form
     */
    public $model;
    /**
     * @var string form ID
     */
    public $formId;
    /**
     * @var array fields to be validated.
     */
    public $formFields;
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
        if (empty($this->dynamicItems)) {
            throw new InvalidConfigException("The 'dynamicItems' property must be set.");
        }
        if (empty($this->dynamicItem)) {
            throw new InvalidConfigException("The 'dynamicItem' property must be set.");
        }
        if (empty($this->model) || !$this->model instanceof \yii\base\Model) {
            throw new InvalidConfigException("The 'model' property must be set and must extend from '\\yii\\base\\Model'.");
        }
        if (empty($this->formId)) {
            throw new InvalidConfigException("The 'formId' property must be set.");
        }
        if (empty($this->formFields) || !is_array($this->formFields)) {
            throw new InvalidConfigException("The 'formFields' property must be set.");
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
        $this->options['dynamicItems'] = $this->dynamicItems;
        $this->options['dynamicItem'] = $this->dynamicItem;
        $this->options['template'] = '#' . $this->templateID;
        $this->options['fields'] = [];
        foreach ($this->formFields as $field) {
             $this->options['fields'][] = [
                'id' => Html::getInputId($this->model, '[{}]' . $field),
                'name' => Html::getInputName($this->model, '[{}]' . $field)
            ];
        }
        $this->options['formId'] = $this->formId;
        $options = Json::encode($this->options);
        $view->registerJs('$("#' . $this->id . '").yiiDynamicForm(' .$options .')');
    }

    public function run()
    {
        $content = ob_get_clean();
        $crawler = new Crawler();
        $crawler->addHTMLContent($content, \Yii::$app->charset);
        $results = $crawler->filter($this->dynamicItem);
        $document = new \DOMDocument('1.0', \Yii::$app->charset);
        $document->appendChild($document->importNode($results->first()->getNode(0), true));
        $htmlFirstItem = "\n" . trim($document->saveHTML())."\n";
        $template = Html::tag('template', $htmlFirstItem, ['id' => $this->templateID, 'style' => 'display: none;']);
        $content = ($this->initWithItems === true) ? $content : $this->removeItems($content);
        $output =  $content . $template . "\n";
        echo Html::tag('div', $output, ['id' => $this->id]);
    }

    private function removeItems($content)
    {
        $document = new \DOMDocument('1.0', \Yii::$app->charset);
        $crawler = new Crawler();
        $crawler->addHTMLContent($content, \Yii::$app->charset);
        $root = $document->appendChild($document->createElement('_root'));
        $crawler->rewind();
        $root->appendChild($document->importNode($crawler->current(), true));
        $domxpath = new \DOMXPath($document);

        $crawlerInverse = $domxpath->query(CssSelector::toXPath($this->dynamicItem));
        foreach ($crawlerInverse as $elementToRemove) {
            $parent = $elementToRemove->parentNode;
            $parent->removeChild($elementToRemove);
        }

        $crawler->clear();
        $crawler->add($document);
        return $crawler->filter('body')->eq(0)->html();
    }
}
