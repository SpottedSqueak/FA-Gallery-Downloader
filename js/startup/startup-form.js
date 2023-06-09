export default {
  name: 'status-form',
  template: `
  <div class="user-input-container">
    <form class="user-input" @submit.prevent="sendData">
      <p class="user-input__gallery-options">
        <label for="username">Gallery to download:</label>
        <input type="text" id="username" v-model="username" placeholder="Enter a username:" />
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
        <button id="login" @click.prevent="login">{{loginBtnText}}</button>
        <button id="view-gallery" @click.prevent="viewGallery">View Gallery</button>
        <button id="stop-all" :disabled="notActive" @click.prevent="stopAll">Stop</button>
      </div>
    </form>
    <div class="account-list">
      <h3>Verified Accounts</h3>
      <p>Login to an account to see it listed here!</p>
      <ul>
        <template v-for="name in accounts">
          <li>{{name}}</li>
        </template>
      </ul>
    </div>
  </div>
  `,
  emits: ['sendData', 'sendEvent'],
  props: ['outsideUsername', 'isLoggedIn', 'outsideActive', 'accounts'],
  data() {
    return {
      username: '',
      scrapeGallery: true,
      scrapeComments: true,
      scrapeFavorites: false,
      notActive: true,
    };
  },
  watch: {
    outsideUsername(newName) {
      if (newName) this.username = newName;
    },
    outsideActive(val) {
      if (val) this.notActive = false;
    },
  },
  computed: {
    name() {
      return this.username.toLowerCase().trim();
    },
    loginBtnText() {
      return this.isLoggedIn ? 'Switch Accounts': 'Login';
    },
    downloadText() {
      return (this.username) ? 'Download User Gallery' : 'Continue Previous Download';
    }
  },
  methods: {
    login() {
      this.$emit('sendEvent', 'login');
    },
    viewGallery() {
      this.$emit('sendEvent', 'view-gallery');
    },
    stopAll() {
      this.notActive = true;
      this.$emit('sendEvent', 'stop-all');
    },
    sendData() {
      this.notActive = false;
      const { name, scrapeGallery, scrapeComments, scrapeFavorites } = this;
      this.$emit('sendData',  { name, scrapeGallery, scrapeComments, scrapeFavorites });
    }
  }
}
