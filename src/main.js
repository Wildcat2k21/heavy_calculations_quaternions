import './index.css'
import Component from './utils/Component';
import Sketch from './components/WebGL';

const root = new Component();
root.container.id = 'app';
root.mount(document.body);

Sketch.container.className = "sketch";
root.render(Sketch);