import { MODULE_ID } from "../main.mjs";
// import { PageFlip } from "../scripts/pageFlip-HexoVN-RnD.module.mjs";
import { PageFlip } from "../scripts/page-flip.module.mjs";

const bookSizeCorrection = 1;
const bookWidth = 1390;
const bookHeight = 937;

export class StorySheet extends JournalSheet {
  pageFlip = `modules/${MODULE_ID}/sounds/paper-flip.mp3`;
  static classes = ["sheet", "story-sheet"];

  static get defaultOptions() {
    /*
    if (game.settings.get(`${MODULE_ID}`, "enableScroll")) {
      this.classes.push("scrollable");
    }
      */

    return foundry.utils.mergeObject(super.defaultOptions, {
      baseApplication: "JournalSheet",
      classes: this.classes,
      template: `modules/${MODULE_ID}/templates/story-sheet.html`,
      width: getBookWidth(),
      height: getBookHeight(),
      resizable: false,
      closeOnSubmit: false,
      submitOnClose: true,
    });
  }

  sound() {
    if (game.settings.get(`${MODULE_ID}`, "bookOpenSound")) {
      AudioHelper.play(
        { src: this.pageFlip, volume: 0.8, autoplay: true, loop: false },
        false
      );
    }
  }

  /** @inheritdoc */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    if (game.user.isGM) {
      buttons.unshift({
        label: "STORYTELLER2.CopyID",
        class: "switch-copyid",
        icon: "fas fa-crosshairs",
        onclick: (ev) => this._onCopyID(ev),
      });
    }

    return buttons;
  }

  _onCopyID(event) {
    let savedPage = getPage(this.getData().data._id);

    const text =
      `game.StoryTeller2.showStoryByIDToAll("` +
      this.object.id +
      `", ` +
      savedPage +
      `)`;

    let aux = document.createElement("input");
    aux.setAttribute("value", text);
    document.body.appendChild(aux);
    aux.select();
    document.execCommand("copy");
    document.body.removeChild(aux);

    ui.notifications.info(
      game.i18n.format("STORYTELLER2.CopyIDMessage", {
        mode: "text",
        title: "Info",
        which: "authorized",
      })
    );
  }

  /** @inheritdoc */
  async _render(force, options = {}) {
    this.sound();
    await super._render(force, options);
    var journalEntryPages = document.querySelector(".journal-entry-pages");
    var jepHeight = journalEntryPages.offsetHeight;
    var jepWidth = journalEntryPages.offsetWidth / 2;

    let data = this.getData().data;
    let startPage = data.pages.length >= 1 ? 2 : 1;

    let savedPage = getPage(data._id);
    if (savedPage > data.pages.length) {
      savedPage = data.pages.length - 1;
    }
    this.pageFlipElement = new PageFlip(
      document.getElementById("story-" + data._id),
      {
        width: jepWidth, // getBookWidth(), // bookWidth,  // 550, // base page width
        height: jepHeight, //getBookHeight(), // bookHeight, //733, // base page height

        size: "fixed",
        //startPage: 0,
        // set threshold values:
        //minWidth: 315,
        //maxWidth: 1000,
        //orientation: portrait,

        disableFlipByClick: true,
        useMouseEvents: false,
        showPageCorners: false,
        maxShadowOpacity: 0.5, // Half shadow intensity
        showCover: true,
        mobileScrollSupport: false, // disable content scrolling on mobile devices

        clickEventClasses: [
          "storyteller2-page-entry-nav",
          "journal-entry-pages-nav",
        ],
      }
    );

    this.pageFlipElement.loadFromHTML(document.querySelectorAll(".page-num"));
    if (options.pageId != undefined) {
      //this.goToPage(options.pageId);
    }

    this.pageFlipElement.on("flip", (e) => {
      // callback code
      var newPageNumber = e.data;

      // total pages in the Table of Contents(NOT the book array!!!)
      var totalPages = document.querySelectorAll(
        ".journal-entry-pages .pagelookup li"
      );
      let count = totalPages?.length;
      let ajustednewPageNumber =
        newPageNumber != 0 && !(newPageNumber > count)
          ? newPageNumber - 1
          : newPageNumber;

      var pageState = "toc";
      var pageClass = ajustednewPageNumber;
      if (newPageNumber === 0) {
        pageState = "toc";
        pageClass = "num-start";
      }
      if (newPageNumber === count) {
        pageState = "last";
      }
      if (newPageNumber > 0 && newPageNumber < count) {
        pageState = "middle";
      }

      this.stylePageTurnButtons(pageState, pageClass);
    });
  }

  stylePageTurnButtons(pageType, pageClass) {
    let leftArrow = document.querySelector(
      `.page-num.${CSS.escape(pageClass)} .journal-page-arrow-left`
    );
    let rightArrow = document.querySelector(
      `.page-num.${CSS.escape(pageClass)} .journal-page-arrow-right`
    );

    switch (pageType) {
      case "toc":
        leftArrow.style.display = "none";
        rightArrow.style.display = "block";
        break;
      case "middle":
        leftArrow.style.display = "block";
        rightArrow.style.display = "block";
        break;
      case "last":
        leftArrow.style.display = "block";
        rightArrow.style.display = "none";
        break;
    }
    return;
  }

  /** @inheritdoc */
  async _updateObject(event, formData) {
    if (formData.img === "") {
      formData.img = this.object.data.img;
    }
    return super._updateObject(event, formData);
  }

  async _onShowPlayers(event) {
    let id = this.getData().data._id;
    // Save current page to global storage
    game.socket.emit("module.storyteller", {
      action: "setPageToOpen",
      id: id,
      page: getPage(id),
    });

    return super._onShowPlayers(event);
  }

  /** Меняем анимацию скрытия книги */
  /** @inheritdoc */
  async close(options = {}) {
    let el = this.element;
    super.close(options);
    return new Promise((resolve) => {
      el.fadeOut(200, () => {
        el.remove();

        // Clean up data
        this._element = null;
        delete ui.windows[this.appId];
        this._minimized = false;
        this._scrollPositions = null;
        this._state = Application.RENDER_STATES.CLOSED;
        resolve();
      });
    });
  }
}

function getBookWidth() {
  let height = getBookHeight();
  return (bookWidth / bookHeight) * height;
}

function getBookHeight() {
  let bookSize = game.settings.get(`${MODULE_ID}`, "size") / 100;
  return window.innerHeight * bookSize * bookSizeCorrection;
}

async function setPage(id, page) {
  let pages = game.settings.get(`${MODULE_ID}`, "pages");
  pages[id] = page;
  await game.settings.set(`${MODULE_ID}`, "pages", pages);
}

function getPage(id) {
  let pages = game.settings.get(`${MODULE_ID}`, "pages");
  if (pages[id] === 0) {
    return 1;
  }

  return pages[id];
}
