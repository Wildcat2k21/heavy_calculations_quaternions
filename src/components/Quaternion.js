import Component from "../utils/Component.js";
import './Quaternion.style.css';

function Quaternion(key = "", { anim, amin, amax, progress, ui, uj, uk } = {
    anim: true,
    amin: -Math.PI / 4,
    amax: Math.PI / 4,
    progress: 0,
    ui: 1,
    uj: 0,
    uk: 0
}){
    const item = new Component(/*html*/`
        <div class="q-rot-units">
            <div class="rot-q-unit">
                <div class="rot-q-unit--angle">
                    
                    <label class="control-label">
                        <span>Анимировать</span>
                        <input type="checkbox" ${anim ? 'checked' : ''} param="anim" class="control control--check" value="Анимировать"></input>
                    </label>

                    <label class="control-label">
                        <span>мин.&#10240;</span>    
                        <input type="number" param="amin" class="control control--number" value="${amin}" step="0.01"></input>
                    </label>
                    
                    <input type="range" param="progress" min="0" max="1" step="0.01" class="control control--range" value="${progress}"></input>

                    <label class="control-label">
                        <span>макс.&#10240;</span>    
                        <input type="number" param="amax" class="control control--number" value="${amax}" step="0.01"></input>
                    </label>

                    <input type="button" value="Удалить" action="delete" class="control control--btn"></input>

                </div>
                <div class="rot-q-unit--unit">
                    <label for="">&#10240;i&#10240;=&#10240;</label>            
                    <input type="number" param="ui" class="control control--number" value="${ui}" step="0.01"></input>
                    
                    <label for="">&#10240;j&#10240;=&#10240;</label>                
                    <input type="number" param="uj" class="control control--number" value="${uj}" step="0.01"></input>
                    
                    <label for="">&#10240;k&#10240;=&#10240;</label>                
                    <input type="number" param="uk" class="control control--number" value="${uk}" step="0.01"></input>
                </div>
            </div>
        <div/>
    `);

    item.store = {
        state: {
            anim,
            amin,
            amax,
            progress,
            ui,
            uj,
            uk
        },
        params: {}
    };

    item.onMount = async ({ container }) => {
        let $params = container.querySelectorAll("[param]");

        let $delete = container.querySelector("[action]");

        // Действие удаление элемента
        $delete.addEventListener("click", () => {
            item.emit("delete", item.store.state);
        });

        // Добавление параметров в store
        $params.forEach(el => {

            let paramName = el.getAttribute('param');

            item.store.params[paramName] = el;

            el.addEventListener("input", ({ target }) => {

                let paramName = el.getAttribute('param');

                if(target.type === "checkbox") {
                    item.store.state[paramName] = target.checked;
                }
                else if(target.type === "number" || target.type === "range") {
                    item.store.state[paramName] = parseFloat(target.value);
                }
                else {
                    item.store.state[paramName] = target.value;
                }

                // Событие при изменение элемента
                // item.emit("change", item.store.state);
            });
        });
    };

    return item;
}

export default Quaternion;