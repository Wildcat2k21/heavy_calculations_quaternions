function createRotationItem(container = {}, rotationItems = [], comp = {}){
    let next_id = rotationItems.length;
    let cmp = comp(`rot-${next_id}`);

    let rotationItem = {
        id: next_id,
        state: cmp.store.state,
        params: cmp.store.params,
        remove: () => cmp.unmount()
    }

    rotationItems.push(rotationItem);

    // Удаление элемента
    cmp.on("delete", (_) => {
        rotationItem.remove();
        rotationItems.splice(rotationItems.findIndex(rotationItem => rotationItem.id === next_id), 1);
    });

    cmp.mount(container.querySelector('.panel'));
}

export { createRotationItem };