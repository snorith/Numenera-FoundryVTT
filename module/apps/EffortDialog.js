import { NUMENERA } from "../config.js";
import { getShortStat } from "../utils.js";
import { RollData } from "../dice/RollData.js";
import { NumeneraPCActor } from "../actor/NumeneraPCActor.js";
import { NumeneraSkillItem } from "../item/NumeneraSkillItem.js";

export class EffortDialog extends FormApplication {
  /**
   * @inheritdoc
   */
  static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
      classes: ["numenera"],
      title: "Roll with Effort",
      template: "systems/numenera/templates/dialog/effort.html",
      closeOnSubmit: false,
      submitOnChange: true,
      submitOnClose: false,
      editable: true,
      width: 800,
      height: 450,
    });
  }
/**
 *Creates an instance of EffortDialog.
 * @param {NumeneraPCActor} actor
 * @param {string} [stat=null]
 * @param {NumeneraSkillItem} [skill=null]
 * @memberof EffortDialog
 */
constructor(actor, stat=null, skill=null) {
    if (!stat && skill)
      stat = skill.data.data.stat;

    super({
      actor,
      stat,
      skill: skill ? skill._id : null,
      assets: 0,
      currentEffort: 0,
      cost: 0,
      taskLevel: 1,
    }, {});
  }

  get warning() {
    if (!this.object.stat)
    {
      return "You must provide a stat before using Effort";
    }

    const actor = this.object.actor;
    const shortStat = getShortStat(this.object.stat);
    const poolValue = actor.data.data.stats[shortStat].pool.value;
    const cost = actor.getEffortCostFromStat(shortStat, this.object.currentEffort);
    
    if (cost > poolValue)
    {
      return "Insufficient points in this pool for this level of Effort";
    }

    return null;
  }

  get finalLevel() {
    let level = this.object.taskLevel - this.object.currentEffort - this.object.assets;

    if (this.object.skill) {
      level = level - this.object.skill.data.data.skillLevel
                    + (this.object.skill.data.data.inability ? 1 : 0);
    }

    return Math.max(level, 0); //Level cannot be negative
  }

  get taskModifiers() {
    const modifiers = [];

    if (this.object.skill) {
      if (this.object.skill.data.data.skillLevel == 1) {
        modifiers.push({
          title: this.object.skill.name + " training",
          value: (-this.object.skill.data.data.skillLevel).toString(),
        });
      }
      else if (this.object.skill.data.data.skillLevel == 2) {
        modifiers.push({
          title: this.object.skill.name + " specialization",
          value: (-this.object.skill.data.data.skillLevel).toString(),
        });
      }

      if (this.object.skill.data.data.inability) {
        modifiers.push({
          title: this.object.skill.name + " inability",
          value: "+ 1",
        });
      }
    }

    if (this.object.assets) {
      modifiers.push({
        title: this.object.assets + " Asset(s)",
        value: `- ${this.object.assets}`,
      });
    }

    if (this.object.currentEffort) {
      modifiers.push({
        title: this.object.assets + " Effort",
        value: "- " + this.object.currentEffort,
      });
    }

    return modifiers;
  }

  /**
   * @inheritdoc
   */
  getData() {
    const data = super.getData();

    data.stats = NUMENERA.stats;
    data.skills = this.object.actor.getEmbeddedCollection("OwnedItem")
      .filter(i => i.type === "skill")
      .map(sk => {
        return {
          id: sk._id,
          name: sk.name,
        };
      });
    data.skill = this.object.skill;

    let shortStat = null,
        stat = null;

    if (this.object.stat) {
      shortStat = getShortStat(this.object.stat);
      stat = this.object.actor.data.data.stats[shortStat];

      data.stat = this.object.stat;
    }
    
    data.warning = this.warning;
    data.displayWarning = !!data.warning;
    data.assets = this.object.assets;
    data.currentEffort = this.object.currentEffort;
    data.maxEffortLevel = this.object.actor.data.data.effort;
    data.taskLevel = this.object.taskLevel;
    data.finalLevel = this.finalLevel;
    data.taskModifiers = this.taskModifiers;

    if (data.stat) {
      data.current = stat.pool.value;
      data.cost = this.object.actor.getEffortCostFromStat(shortStat, this.object.currentEffort);
      data.remaining = data.current - data.cost;
    }
    else {
      data.cost = 0;
      data.current = null;
      data.remaining = null;
    }

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#roll-with-effort").click(this._rollWithEffort.bind(this));
  }

  async _rollWithEffort(event) {
    const actor = this.object.actor;
    const shortStat = getShortStat(this.object.stat);

    if (!this.object.stat)
      throw new Error("You must provide a stat before using Effort");

    const poolValue = actor.data.data.stats[shortStat].pool.value;
    const cost = actor.getEffortCostFromStat(shortStat, this.object.currentEffort);
    
    if (cost > poolValue)
      throw new Error("You must provide a stat before using Effort");

    const rollData = new RollData();
    rollData.effortLevel = this.object.currentEffort;
    rollData.taskLevel = this.finalLevel;

    if (this.object.skill) {
      actor.rollSkill(this.object.skill, rollData);
    }
    else {
      actor.rollAttribute(shortStat, rollData);
    }

    if (cost <= 0)
      return;

    const poolProp = `data.stats.${shortStat}.pool.value`;

    const data = { _id: actor._id };
    data[poolProp] = poolValue - cost;

    //TIME TO PAY THE PRICE MWAHAHAHAHAHAHAH
    actor.update(data);
  }

  _updateObject(event, formData) {
    this.object.assets = formData.assets;
    this.object.currentEffort = formData.currentEffort;
    this.object.taskLevel = formData.taskLevel;

    // Did the skill change?
    if (formData.skill && (this.object.skill == null || formData.skill !== this.object.skill._id)) {
      //In that case, update the stat to be the skill's stat
      this.object.skill = this.object.actor.getOwnedItem(formData.skill);

      if (this.object.skill) {
        this.object.stat = this.object.skill.data.data.stat;
      }
    }
    // Otherwise, did the stat change?
    else if (formData.stat && formData.stat !== this.object.stat) {
      this.object.stat = formData.stat;
    } else if (!formData.skill) {
      //Skill deselected
      this.object.skill = null;
    }
    
    //Re-render the form since it's not provided for free in FormApplications
    this.render();
  }
}