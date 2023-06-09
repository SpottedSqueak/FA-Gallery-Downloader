import statusDisplay from "./status-display.js";
import startupForm from "./startup-form.js";

export default {
  name: 'startup-page',
  components: { statusDisplay, startupForm },
  template: `
    <div class="startup-container">
      <div class="startup-header">
        <div class="logged-in-status">Logged in as: 
          <span>{{loggedInName}}</span>
          <div class="user-icon">
            <img v-if="iconSrc" :src="iconSrc" @error="fixIcon"/>
          </div>
        </div>
        <h2 class="startup-title">🐾FA Gallery Downloader🐾</h2>
      </div>
      <startup-form :is-logged-in="!!this.username" :outsideUsername="queryName" :outsideActive="isActive" :accounts="accounts" @send-data="sendFormData" @send-event="sendEvent"></startup-form>
      <status-display :msg="msg" :log-progress="logProgress" @clear-msg="clearMsg"></status-display>
    </div>
  `,
  data() {
    return {
      queryName: '',
      username: '',
      msg: '',
      logProgress: {},
      isActive: false,
      accounts: [],
    };
  },
  beforeCreate() {
    window.logMsg = ({ text, id, replaceLast }) => {
      this.msg = { text, id, replaceLast };
    }
    window.setUsername = (name) => {
      this.username = name;
    }
    window.setSearchName = (name) => {
      this.queryName = name;
    }
    window.logProgress = ({ bar, value, max, reset, filename }) => {
      this.isActive = true;
      this.logProgress = { bar, value, max, reset, filename };
    }
    window.setPageInfo = (data) => {
      this.accounts = data.accounts;
    }
  },
  computed: {
    loggedInName() {
      return this.username || '???';
    },
    iconSrc() {
      if (!this.username) return '';
      const cleanName = this.username.split(' ')[0].toLowerCase().replace(/[_]/g, '');
      return `https://a.furaffinity.net/${cleanName}.gif`;
    }
  },
  methods: {
    clearMsg() {
      this.msg = '';
    },
    sendFormData(data) {
      this.isActive = true;
      data.choice = 'start-download';
      window.userPath?.(data);
    },
    sendEvent(choice) {
      // this.isActive = true;
      // this.msg = { text: `[Data] Firing "${choice}" event!`};
      window.userPath?.({ choice });  
    },
    fixIcon(e) {
      e.target.src = '../html/resources/_default.gif';
    }
  },
}
