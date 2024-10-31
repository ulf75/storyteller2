import { SingleSheetClean } from "./sheets/single-sheet-clean.js";
import { SingleSheetMinimal } from "./sheets/single-sheet-minimal.js";

import { StorySheet } from "./sheets/story-sheet.js";
import { registerHotkeys } from "./scripts/config.js";

export const MODULE_ID = "storyteller2";
export const SHEET_TYPES = [
  "SingleSheetClean",
  "SingleSheetMinimal",
  "StorySheet",
];

class StoryTeller2Journal {
  init() {
    this._activateSocketListeners(game.socket);
    registerHotkeys();
  }

  _activateSocketListeners(socket) {
    socket.on("module.storyteller2journal", this._setPageToOpen.bind(this));
  }

  registerObjects(types, labels) {
    for (let [k, v] of Object.entries(labels)) {
      if (k === "default") continue;

      Journal.registerSheet("journals", types[k], {
        types: ["base"],
        makeDefault: false,
        label: game.i18n.localize(v),
      });
    }

    //game.system.documentTypes.JournalEntry = game.system.documentTypes.JournalEntry.concat(Object.keys(types)).sort();
    //game.system.documentTypes["JournalEntry"] = (Object.keys(types)).sort();
    //CONFIG.JournalEntry.typeLabels = mergeObject((CONFIG.JournalEntry.typeLabels || {}), labels)
  }

  async _setPageToOpen(data) {
    if (data.action !== "setPageToOpen" || data.id === "") {
      return;
    }

    let pages = game.settings.get("storyteller2journal", "pages");
    pages[data.id] = data.page;
    await game.settings.set("storyteller2journal", "pages", pages);
  }
  registerAddonSheet(s) {
    let types = {};
    let labels = {};

    types[s.key] = s.sheet;
    labels[s.key] = s.label;

    this.registerObjects(types, labels);

    //FantasyBookJournal.types[s.key] = s.sheet
    //FantasyBookJournal.labels[s.key] = s.label
  }
}

class StoryTeller2JournalModel extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["StoryTeller2Journal.path"];

  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.SchemaField({
        long: new fields.HTMLField({ required: false, blank: true }),
        short: new fields.HTMLField({ required: false, blank: true }),
      }),
      img: new fields.FilePathField({ required: false, categories: ["IMAGE"] }),
      steps: new fields.ArrayField(new fields.StringField({ blank: true })),
    };
  }

  prepareDerivedData() {
    this.nSteps = this.steps.length;
  }
}

class StoryTeller2JournalPageSheet extends JournalTextPageSheet {
  get template() {
    return `modules/${MODULE_ID}/templates/storyteller2-sheet-${
      this.isEditable ? "edit" : "view"
    }.html`;
  }

  async getData(options = {}) {
    const context = await super.getData(options);
    context.description = {
      long: await TextEditor.enrichHTML(this.object.system.description.long, {
        async: true,
        secrets: this.object.isOwner,
        relativeTo: this.object,
      }),
      short: await TextEditor.enrichHTML(this.object.system.description.short, {
        async: true,
        secrets: this.object.isOwner,
        relativeTo: this.object,
      }),
    };
    return context;
  }
}

Hooks.on("init", () => {
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    "storyteller2.bookpage": StoryTeller2JournalModel,
  });
});

Hooks.on("init", () => {
  DocumentSheetConfig.registerSheet(
    JournalEntryPage,
    "storyteller2",
    StoryTeller2JournalPageSheet,
    {
      types: ["storyteller2.bookpage"],
      makeDefault: false,
    }
  );
});
//`journal.pages.some(p => p.type === 'fantasybookjournal.bookpage')` basic way to check if a journal has one of your pages
//Hooks.on("renderStoryTeller2JournalPageSheet" () =>{
//});

function getBookWidth() {
  let height = getBookHeight();
  return (bookWidth / bookHeight) * height;
}

function getBookHeight() {
  let bookSize = game.settings.get(`${MODULE_ID}`, "size") / 100;
  return window.innerHeight * bookSize * bookSizeCorrection;
}

Hooks.on("ready", () => {
  game.StoryTeller2Journal.registerAddonSheet({
    /* Unique key, must not overlap with other keys. It is used to access the object. */
    key: "StorySheet",
    /* The class that implements the settings for the new journal. You don't need to create an instance, the class description itself is passed. */
    sheet: StorySheet,
    /* Key-identifier of the string for translation. */
    label: "TYPES.STORY_TELLER2.StorySheet",
  });

  game.StoryTeller2Journal.registerAddonSheet({
    /* Unique key, must not overlap with other keys. It is used to access the object. */
    key: "clean",
    /* The class that implements the settings for the new journal. You don't need to create an instance, the class description itself is passed. */
    sheet: SingleSheetMinimal,
    /* Key-identifier of the string for translation. */
    label: "TYPES.STORY_TELLER2.SingleSheetClean",
  });

  game.StoryTeller2Journal.registerAddonSheet({
    /* Unique key, must not overlap with other keys. It is used to access the object. */
    key: "minimal",
    /* The class that implements the settings for the new journal. You don't need to create an instance, the class description itself is passed. */
    sheet: SingleSheetMinimal,
    /* Key-identifier of the string for translation. */
    label: "TYPES.STORY_TELLER2.SingleSheetMinimal",
  });
  console.log("Story Teller 2 Journal | Ready");
});

Hooks.on("renderJournalSheet", (app, [html], context) => {
  const isBookJournalSheet = app.document.getFlag(
    "storyteller2",
    "isBookJournal"
  );
  const hasBookJournalPages = app.document.pages.some(
    (p) => p.type === "storyteller2.bookpage"
  );
  if (isBookJournalSheet) {
    if (!html.classList.contains("storyteller2")) {
      html.classList.add("storyteller2");
    }
    console.log("This Journal is of type Book Journal!");
  }
  if (app.document.pages.some((p) => p.type === "storyteller2.bookpage")) {
    if (!html.classList.contains("storyteller2")) {
      html.classList.add("storyteller2");
      app.document.setFlag("storyteller2", "isBookJournal", true);
    }
  }
  //app.setPosition({ scale: 1.1 });
});

Hooks.on("init", () => {
  registerSettings();
  game.StoryTeller2Journal = new StoryTeller2Journal();
  game.StoryTeller2Journal.init();
});

Hooks.once("init", function () {
  //CONFIG.debug.hooks = true;
});

function registerSettings() {
  game.settings.register(`${MODULE_ID}`, "size", {
    name: game.i18n.localize("storyteller2.Settings.Size"),
    hint: game.i18n.localize("storyteller2.Settings.SizeHint"),
    scope: "client",
    type: Number,
    choices: {
      70: "70%",
      80: "80%",
      90: "90%",
      100: "100%",
    },
    default: 80,
    config: true,
  });

  game.settings.register(`${MODULE_ID}`, "bookOpenSound", {
    name: game.i18n.localize("STORYTELLER.BookOpenSound"),
    hint: game.i18n.localize("STORYTELLER.BookOpenSoundHint"),
    scope: "client",
    type: Boolean,
    default: true,
    config: true,
  });

  game.settings.register(`${MODULE_ID}`, "pages", {
    scope: "client",
    type: Object,
    default: {},
    config: false,
  });

  game.settings.register(`${MODULE_ID}`, "background", {
    name: game.i18n.localize(
      "STORYTELLER_ADDON_SINGLE.Settings.ImageBackground"
    ),
    hint: game.i18n.localize(
      "STORYTELLER_ADDON_SINGLE.Settings.ImageBackgroundHint"
    ),
    scope: "world",
    type: Boolean,
    default: true,
    config: true,
  });

  game.settings.register(`${MODULE_ID}`, "dontOpen", {
    name: game.i18n.localize(
      "STORYTELLER_ADDON_SINGLE.Settings.DontOpenImages"
    ),
    hint: game.i18n.localize(
      "STORYTELLER_ADDON_SINGLE.Settings.DontOpenImagesHint"
    ),
    scope: "world",
    type: Boolean,
    default: true,
    config: true,
  });
}

Handlebars.registerHelper("offset", function (value) {
  return parseInt(value) + 1;
});

Handlebars.registerHelper("getIdByIndex", function (array, index) {
  return array[index].id;
});

Handlebars.registerHelper("getDontOpen", function () {
  let addClass = "";
  if (game.settings.get(`${MODULE_ID}`, "dontOpen")) {
    addClass = "dontopen";
  }
  return addClass;
});
