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
 * yii2-dynamicform is widget to yii2 framework to clone form elements in a nested manner, maintaining accessibility.
 *
 * @author Wanderson Bragança <wanderson.wbc@gmail.com>
 */
class DynamicFormWidget extends \yii\base\Widget
{
    /**
     * @var string
     */
    public $widgetContainer;
     /**
     * @var string
     */
    public $widgetBody;
    /**
     * @var string
     */
    public $widgetItem;
    /**
     * @var string
     */
    public $limit = 999;
    /**
     * @var string
     */
    public $insertButton;
     /**
     * @var string
     */
    public $deleteButton;
    /**
     * @var string 'bottom' or 'top';
     */
    public $insertPosition = 'bottom';
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
     * @var integer
     */
    public $min = 1;
    /**
     * @var string
     */
    private $_options;
    /**
     * @var string
     */
    private $_insertPositions = ['bottom', 'top'];

    /**
     * Initializes the widget
     *
     * @throws \yii\base\InvalidConfigException
     */
    public function init()
    {
        parent::init();
        if (empty($this->widgetContainer) || (preg_match('/^\w{1,}$/', $this->widgetContainer) === 0)) {
            throw new InvalidConfigException('Invalid configuration to property "widgetContainer". 
                Allowed only alphanumeric characters plus underline: [A-Za-z0-9_]');
        }
        if (empty($this->widgetBody)) {
            throw new InvalidConfigException("The 'widgetBody' property must be set.");
        }
        if (empty($this->widgetItem)) {
            throw new InvalidConfigException("The 'widgetItem' property must be set.");
        }
        if (empty($this->model) || !$this->model instanceof \yii\base\Model) {
            throw new InvalidConfigException("The 'model' property must be set and must extend from '\\yii\\base\\Model'.");
        }
        if (empty($this->formId)) {
            throw new InvalidConfigException("The 'formId' property must be set.");
        }
        if (empty($this->insertPosition) || ! in_array($this->insertPosition, $this->_insertPositions)) {
            throw new InvalidConfigException("Invalid configuration to property 'insertPosition' (allowed values: 'bottom' or 'top')");
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
        $this->_options['widgetContainer'] = $this->widgetContainer;
        $this->_options['widgetBody']      = $this->widgetBody;
        $this->_options['widgetItem']      = $this->widgetItem;
        $this->_options['limit']           = $this->limit;
        $this->_options['insertButton']    = $this->insertButton;
        $this->_options['deleteButton']    = $this->deleteButton;
        $this->_options['insertPosition']  = $this->insertPosition;
        $this->_options['formId']          = $this->formId;
        $this->_options['min']             = $this->min;
        $this->_options['fields']          = [];

        foreach ($this->formFields as $field) {
             $this->_options['fields'][] = [
                'id' => Html::getInputId($this->model, '[{}]' . $field),
                'name' => Html::getInputName($this->model, '[{}]' . $field)
            ];
        }

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
        $options = Json::encode($this->_options);
        $view->registerJs('$(".' . $this->widgetContainer . '").yiiDynamicForm(' .$options .');', $view::POS_LOAD);
    }

    public function run()
    {
        $content = ob_get_clean();
        $crawler = new Crawler();
        $crawler->addHTMLContent($content, \Yii::$app->charset);
        $results = $crawler->filter($this->widgetItem);
        $document = new \DOMDocument('1.0', \Yii::$app->charset);
        $document->appendChild($document->importNode($results->first()->getNode(0), true));
        $this->_options['template'] = trim($document->saveHTML());

        if (isset($this->_options['min']) && $this->_options['min'] === 0 && $this->model->isNewRecord) {
            $content = $this->removeItems($content);
        }

        $this->registerAssets();
        echo Html::tag('div', $content, ['class' => $this->widgetContainer, 'data-dynamicform' => $this->widgetContainer]);
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
        $crawlerInverse = $domxpath->query(CssSelector::toXPath($this->widgetItem));

        foreach ($crawlerInverse as $elementToRemove) {
            $parent = $elementToRemove->parentNode;
            $parent->removeChild($elementToRemove);
        }

        $crawler->clear();
        $crawler->add($document);
        return $crawler->filter('body')->eq(0)->html();
    }
}
