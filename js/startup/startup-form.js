export default {
  name: 'status-form',
  template: `
  <div class="user-input-container">
    <form class="user-input" @submit.prevent="sendData">
      <p class="user-input__gallery-options">
        <label for="username">Galleries to download:</label>
        <input type="text" id="username" v-model.trim="username" placeholder="username1, username2, etc..." />
        <button id="start-download">{{downloadText}}</button>
      </p>
      <div class="user-input__scrape-options">
        <input type="checkbox" id="scrape-gallery" v-model="scrapeGallery" />
        <label for="scrape-gallery">Gallery</label>
        <input type="checkbox" id="scrape-comments" v-model="scrapeComments" />
        <label for="scrape-comments">Comments</label>
        <input type="checkbox" id="scrape-favorites" v-model="scrapeFavorites" />
        <label for="scrape-favorites">Favorites</label>
        <div class="warning">(WARNING: This can be a HUGE amount!!)</div>
      </div>
      <div class="user-choices">
        <button id="repair" @click.prevent="repair" :alt="repairAlt" :title="repairAlt">Repair Database</button>
        <button id="login" @click.prevent="login">{{loginBtnText}}</button>
        <button id="view-gallery" @click.prevent="viewGallery">View Gallery</button>
        <button id="stop-all" :disabled="notActive" @click.prevent="stopAll">Stop</button>
      </div>
      <div class="user-input__old_downloads">
        <label for="old_downloads"><span class="warning">Missing Data?</span> Import data from a previous install:</label>
        <br/>
        <button class="user-input__file" type="file" id="old_downloads" @click.prevent="importData">Import data</button>
        <i class="user-input__file-path">(Previous data should be in the same folder as this program)</i>
      </div>
    </form>
    <div class="account-list" ref="tabContainer">
      <div class="tab-container" @click.prevent="tabClick">
        <h3 class="tab active">Verified Accounts</h3>
        <h3 class="tab">All Accounts</h3>
      </div>
      <div class="tab-content-container active">
        <p>Login to an account to see it listed here!</p>
        <ul>
          <template v-for="(name, i) in accounts">
            <li>
              <span>{{name}}</span>
              <button @click.prevent="exportData(name, i)" alt="Export to Postybirb" title="Export to Postybirb">Export: Postybirb</button>
              <button @click.prevent="deleteAccount(name)" alt="Delete account name" title="Delete account name">❌</button>
              <div class="export-info"><input :id="'export-date_' + i" :ref="'export-date_' + i"type="checkbox" checked /><label :for="'export-date_' + i" >Include original post dates for submissions</label></div>
            </li>
          </template>
        </ul>
      </div>
      <div class="tab-content-container">
        <p>All downloaded accounts</p>
        <ul>
          <template v-for="name in computedDownloadAccounts">
            <li>
              <span>{{name}}</span><button @click.prevent="deleteUserAccount(name)" alt="Delete account" title="Delete account">❌</button>
            </li>
          </template>
        </ul>
      </div>
    </div>
  </div>
  `,
  emits: ['sendData', 'sendEvent'],
  props: ['outsideUsername', 'isLoggedIn', 'outsideActive', 'accounts', 'downloadAccounts'],
  data() {
    return {
      username: '',
      scrapeGallery: true,
      scrapeComments: true,
      scrapeFavorites: false,
      notActive: true,
      repairAlt: 'Check and repair submission data (tags, ratings, etc.)',
    };
  },
  watch: {
    outsideUsername(newName) {
      if (newName) this.username = newName;
    },
    outsideActive(val) {
      this.notActive = !val;
    },
  },
  computed: {
    name() {
      return this.username.toLowerCase().trim().replace(/_/gi, '');
    },
    loginBtnText() {
      return this.isLoggedIn ? 'Switch Accounts': 'Login';
    },
    downloadText() {
      return (this.username) ? 'Download User Galleries' : 'Continue Previous Download';
    },
    computedDownloadAccounts() {
      if (!this.downloadAccounts?.length) return [];
      return [...new Set(this.downloadAccounts.map(d => d.username))];
    },
  },
  methods: {
    login() {
      this.$emit('sendEvent', 'login');
    },
    viewGallery() {
      this.$emit('sendEvent', 'view-gallery');
    },
    repair() {
      this.$emit('sendEvent', 'repair');
    },
    stopAll() {
      this.notActive = true;
      this.$emit('sendEvent', 'stop-all');
    },
    sendData() {
      // this.notActive = false;
      const { name, scrapeGallery, scrapeComments, scrapeFavorites } = this;
      this.$emit('sendData',  { name, scrapeGallery, scrapeComments, scrapeFavorites });
    },
    exportData(name, i) {
      const includeDate = this.$refs['export-date_' + i][0].checked;
      this.$emit('sendEvent', { choice: 'export-data', name, includeDate });
    },
    deleteAccount(name) {
      if (window.confirm(`Remove account: [${name}]? \nNOTE: You'll need to login again to access it.`)) {
        this.$emit('sendEvent', { choice: 'delete-account', name });
      }
    },
    deleteUserAccount(name) {
      if (window.confirm(`Remove account: [${name}]? \nNOTE: Will delete all associated submissions and favorites.`)) {
        this.$emit('sendEvent', { choice: 'delete-user-account', name });
      }
    },
    importData() {
      this.$emit('sendEvent', { choice: 'import-old-data' });
    },
    tabClick(e) {
      if (!e.target.classList.contains('tab')) return;
      const divs = [...e.target.parentNode.children];
      divs.forEach(e => e.classList.remove('active'));
      e.target.classList.add('active');
      divs.some((e, i) => {
        if (e.classList.contains('active')) {
          this.activateTab(i);
          return true;
        }
      });
    },
    activateTab(index) {
      const divs = this.$refs.tabContainer.querySelectorAll('.tab-content-container');
      divs.forEach(e => e.classList.remove('active'));
      divs[index].classList.add('active');
    }
  }
}
