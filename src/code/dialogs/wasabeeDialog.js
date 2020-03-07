import { Feature } from "../leafletDrawImports";
import WasabeeMe from "../me";
import Sortable from "../../lib/sortable";
import store from "../../lib/store";
import {
  GetWasabeeServer,
  SetTeamState,
  locationPromise,
  logoutPromise,
  leaveTeamPromise
} from "../server";
import PromptDialog from "./promptDialog";
import AuthDialog from "./authDialog";
import AboutDialog from "./about";
import TeamMembershipList from "./teamMembershipList";
import { getSelectedOperation } from "../selectedOp";
import ConfirmDialog from "./confirmDialog";

const WasabeeDialog = Feature.extend({
  statics: {
    TYPE: "wasabeeButton"
  },

  initialize: function(map, options) {
    if (!map) map = window.map;
    this.type = WasabeeDialog.TYPE;
    Feature.prototype.initialize.call(this, map, options);
  },

  addHooks: function() {
    if (!this._map) return;
    this._me = WasabeeMe.get(true);
    Feature.prototype.addHooks.call(this);
    this._displayDialog();
  },

  _buildContent: function() {
    const teamlist = new Sortable();
    teamlist.fields = [
      {
        name: "Team Name",
        value: team => team.Name,
        sort: (a, b) => a.localeCompare(b),
        format: (row, value, team) => {
          const link = L.DomUtil.create("a", null, row);
          link.href = "#";
          link.innerHTML = value;
          if (team.State == "On") {
            L.DomUtil.addClass(link, "enl");
            L.DomEvent.on(link, "click", () => {
              const td = new TeamMembershipList();
              td.setup(team.ID);
              td.enable();
            });
          }
        }
      },
      {
        name: "State",
        value: team => team.State,
        sort: (a, b) => a.localeCompare(b),
        format: (row, value, obj) => {
          const link = L.DomUtil.create("a", null, row);
          let curstate = obj.State;
          link.innerHTML = curstate;
          if (curstate == "On") L.DomUtil.addClass(link, "enl");
          link.onclick = async () => {
            curstate = await this.toggleTeam(obj.ID, curstate);
            link.innerHTML = curstate;
          };
        }
      },
      {
        name: "Leave",
        value: team => team.State,
        sort: (a, b) => a.localeCompare(b),
        format: (row, value, obj) => {
          const link = L.DomUtil.create("a", null, row);
          link.innerHTML = "Leave";
          link.onclick = () => {
            const cd = new ConfirmDialog();
            cd.setup(
              `Leave ${obj.Name}?`,
              `If you leave <span class="enl">${obj.Name}</span> you cannot rejoin unless the owner re-adds you.`,
              () => {
                leaveTeamPromise(obj.ID).then(
                  () => {
                    // the lazy way
                    this._me = WasabeeMe.get(true);
                    this._dialog.dialog("close");
                    this._displayDialog();
                  },
                  err => {
                    console.log(err);
                    alert(err);
                  }
                );
              }
            );
            cd.enable();
          };
        }
      }
    ];
    teamlist.sortBy = 0;

    const html = L.DomUtil.create("div", "temp-op-dialog");
    this.serverInfo = L.DomUtil.create("div", "", html);
    this.serverInfo.innerHTML = "Server: " + GetWasabeeServer() + "<br/><br/>";
    L.DomEvent.on(this.serverInfo, "click", this.setServer);

    const options = L.DomUtil.create("div", "temp-op-dialog", html);
    const locbutton = L.DomUtil.create("a", null, options);
    locbutton.style.align = "center";
    locbutton.textContent = "Send Location";
    L.DomEvent.on(locbutton, "click", () => {
      navigator.geolocation.getCurrentPosition(
        position => {
          locationPromise(
            position.coords.latitude,
            position.coords.longitude
          ).then(
            () => {
              alert("location processed");
            },
            err => {
              console.log(err);
            }
          );
        },
        err => {
          console.log(err);
          console.log("unable to get location");
        }
      );
    });

    html.appendChild(teamlist.table);
    teamlist.items = this._me.Teams;
    this._html = html;
  },

  _displayDialog: function() {
    this._buildContent();

    if (this._me) {
      this._dialog = window.dialog({
        title: "Current User Information",
        width: "auto",
        height: "auto",
        html: this._html,
        dialogClass: "wasabee-dialog-mustauth",
        buttons: {
          OK: () => {
            this._dialog.dialog("close");
          },
          About: () => {
            const ad = new AboutDialog();
            ad.enable();
          },
          Logout: async () => {
            await logoutPromise();
            //logoutPromise calls WasabeeMe.purge, which runs this, but do it twice just in case
            window.runHooks("wasabeeUIUpdate", getSelectedOperation());
            window.runHooks("wasabeeDkeys");
            this._dialog.dialog("close");
          }
        },

        closeCallback: () => {
          this.disable();
          delete this._dialog;
        },
        id: window.plugin.wasabee.static.dialogNames.wasabeeButton
      });
    } else {
      this.disable();
      const ad = new AuthDialog();
      ad.enable();
    }
  },

  toggleTeam: async function(teamID, currentState) {
    let newState = "Off";
    if (currentState == "Off") newState = "On";

    SetTeamState(teamID, newState);
    this._me = await WasabeeMe.get(true);
    // instead of just changing the display, trigger a full redraw?
    return newState;
  },

  removeHooks: function() {
    Feature.prototype.removeHooks.call(this);
  },

  setServer: function() {
    const serverDialog = new PromptDialog(window.map);
    serverDialog.setup("Change Wasabee Server", "New Waasbee Server", () => {
      if (serverDialog.inputField.value) {
        store.set(
          window.plugin.wasabee.static.constants.SERVER_BASE_KEY,
          serverDialog.inputField.value
        );
        store.remove(window.plugin.wasabee.static.constants.AGENT_INFO_KEY);
      }
    });
    serverDialog.current = GetWasabeeServer();
    serverDialog.placeholder = "https://server.wasabee.rocks/";
    serverDialog.enable();
  }
});

export default WasabeeDialog;
