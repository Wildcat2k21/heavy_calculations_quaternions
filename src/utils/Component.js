class Component {
    constructor(html = '', { onMount, store } = {}) {
        this.container = document.createElement('div');

        const template = document.createElement('template');
        template.innerHTML = html.trim();
        this.container.appendChild(template.content);

        this.onMount = onMount;

        this.store = {
            ...store,
            children: []
        };

        // 🔥 event system
        this.events = {};
        this.parent = null;
    }

    mount(parent) {
        this.parent = parent?.__component || null;

        parent.appendChild(this.container);
        this.onMount?.(this);
    }

    render(child) {
        // связываем родителя
        child.parent = this;

        child.mount(this.container);

        this.store.children.push(child.store);
    }

    unmount() {
        this.container.remove();
    }

    on(event, cb) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(cb);
    }

    emit(event, data) {
        // 1. local listeners
        (this.events[event] || []).forEach(cb => cb(data));

        // 2. bubble вверх
        if (this.parent) {
            this.parent.emit(event, data);
        }
    }
}

export default Component;