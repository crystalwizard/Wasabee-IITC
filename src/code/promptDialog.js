import { Feature } from "./leafletDrawImports";

// generic prompt screen

const PromptDialog = Feature.extend({
  statics: {
    TYPE: "promptDialog"
  },

  initialize: function(map, options) {
    if (!map) map = window.map;
    this.type = PromptDialog.TYPE;
    Feature.prototype.initialize.call(this, map, options);
    this._title = "No title set";
    this._label = "No label set";
    this.placeholder = "";
    this.current = "";
  },

  addHooks: function() {
    if (!this._map) return;
    Feature.prototype.addHooks.call(this);
    this._displayDialog();
  },

  removeHooks: function() {
    Feature.prototype.removeHooks.call(this);
  },

  _displayDialog: function() {
    if (!this._map) return;
    const promptDialog = this;
    this._dialog = window.dialog({
      title: this._title,
      width: "auto",
      height: "auto",
      html: this._buildContent(),
      dialogClass: "wasabee-dialog",
      buttons: {
        OK: () => {
          console.log(this.inputField.value);
          if (this._callback) this._callback();
          this._dialog.dialog("close");
        },
        Cancel: () => {
          if (this._cancelCallback) this._cancelCallback();
          this._dialog.dialog("close");
        }
      },
      closeCallback: () => {
        window.runHooks(
          "wasabeeUIUpdate",
          window.plugin.wasabee.getSelectedOperation()
        );
        promptDialog.disable();
        delete promptDialog._dialog;
      }
      // id: window.plugin.Wasabee.static.dialogNames.XXX
    });
  },

  setup: function(title, label, callback, cancelCallback) {
    this._title = title;
    this._label = label;
    if (callback) this._callback = callback;
    if (cancelCallback) this._cancelCallback = cancelCallback;
  },

  _buildContent: function() {
    const content = document.createElement("div");
    if (typeof this._label == "string") {
      content.innerText = this._label;
    } else {
      content.appendChild(this._label);
    }
    const d = content.appendChild(document.createElement("div"));
    this.inputField = d.appendChild(document.createElement("input"));
    this.inputField.id = "inputField";
    this.inputField.placeholder = this.placeholder;
    this.inputField.value = this.current;
    return content;
  }
});

export default PromptDialog;
