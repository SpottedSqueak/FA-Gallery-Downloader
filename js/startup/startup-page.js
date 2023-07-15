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
        <h2 class="startup-title">
          🐾 FA Gallery Downloader 🐾
          <span>by SpottedSqueak</span>
        </h2>
      </div>
      <startup-form :is-logged-in="!!this.username" :outsideUsername="queryName" :outsideActive="isActive" :accounts="accounts" @send-data="sendFormData" @send-event="sendEvent"></startup-form>
      <status-display :msg="msg" :log-progress="logProgress" @clear-msg="clearMsg"></status-display>
      <div class="version">
        <span v-if="!version">Loading version...</span>
        <template v-else>
          <template v-if="hasUpdate">
            <a class="has-update" :href="githubLink" @click.prevent="open">Update available!</a> | 
          </template>
          <span>Current: <b>{{version}}</b></span>
          <span v-if="showVersion"> | Latest: <b>{{newVersion}}</b></span>
        </template>
        |
        <a :href="githubLink" @click.prevent="open"><b>Github Repo</b></a>
      </div>
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
      version: '',
      newVersion: '',
      githubLink: 'https://github.com/SpottedSqueak/FA-Gallery-Downloader/releases',
    };
  },
  beforeCreate() {
    window.logMsg = ({ text, id, replaceLast }) => {
      this.msg = { text, id, replaceLast };
    };
    window.logProgress = ({ bar, value, max, reset, filename }) => {
      this.logProgress = { bar, value, max, reset, filename };
    };
    window.setPageInfo = (data) => {
      if (data.queryName) this.queryName = data.queryName;
      if (data.username) this.username = data.username;
      if (data.accounts) this.accounts = data.accounts;
      if (data.current) this.version = data.current;
      if (data.latest) this.newVersion = data.latest;
    };
    window.setActive = (val = true) => {
      this.isActive = val;
    }
  },
  mounted() {
    setInterval(() => {
      window.userPath({ choice: 'release-check'});
    }, 10 * 60 * 1000);
  },
  computed: {
    loggedInName() {
      return this.username || '???';
    },
    iconSrc() {
      if (!this.username) return '';
      const cleanName = this.username.split(' ')[0].toLowerCase().replace(/[_]/g, '');
      return `https://a.furaffinity.net/${cleanName}.gif`;
    },
    showVersion() {
      return this.version && this.newVersion;
    },
    hasUpdate() {
      if (this.showVersion && this.version !== this.newVersion) {
        const currVersion = this.version.split('.');
        const newVersion = this.newVersion.split('.');
        let i = 0;
        while (i < currVersion.length) {
          if (+newVersion[i] > +currVersion[i]) return true;
          i++;
        }
      }
      return false;
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
    sendEvent(data) {
      if (data.length) data = { choice: data };
      if (data.choice === 'repair') this.isActive = true;
      if (data.choice === 'stop-all') this.isActive = false;
      window.userPath?.(data);  
    },
    fixIcon(e) {
      e.target.src = '../html/resources/_default.gif';
    },
    open(e) {
      const url = e.currentTarget.href;
      window.userPath?.({ choice: 'open', url });
    },
  },
}
