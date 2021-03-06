export class StrangeRecursionItem extends Item {
    static get type() {
        return "recursion";
    }

    prepareData() {
	    // Override common default icon
	    if (!this.data.img) this.data.img = 'icons/svg/circle.svg';

        super.prepareData();

        let itemData = this.data;
        if (itemData.hasOwnProperty("data"))
          itemData = itemData.data;

        const desc = Object.getOwnPropertyDescriptor(itemData, "name");
        if (desc && desc.writable)
          itemData.name = this.data.name || game.i18n.localize("NUMENERA.item.recursion.newRecursion");

        itemData.active = itemData.active || false;
        itemData.level = itemData.level || 0;
        itemData.laws = itemData.laws || "";
        itemData.race = itemData.race || "";
        itemData.trait = itemData.trait || "";
        itemData.focus = itemData.focus || "";
        itemData.focusAbilities = itemData.focusAbilities || "";
      }
}
