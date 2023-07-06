import galleryTile from "./gallery-tile.js";
import submissionView from './submission-view.js';
import galleryControls from './gallery-controls.js';

export default {
  name: 'gallery-hub',
  components: {
    galleryTile,
    submissionView,
    galleryControls,
  },
  template: `
  <div class="gallery-wrapper">
    <transition>
      <div v-show="!submissionData" class="gallery-container">
        <h2 class="gallery-title">🐾FA Gallery Viewer 🐾</h2>
        <gallery-controls @start-search="startSearch" :outside-username="outsideUsername"
        :outside-fav-usernames="favUsernames"
        :outside-usernames="usernames"></gallery-controls>
        <div class="gallery-navigation">
          <button class="gallery-prev" :disabled="!offset" @click="previous">Prev</button>
          <h2 class="gallery-search-title">{{galleryTitle}}</h2>
          <button class="gallery-next" :disabled="!results.length || results.length < count" @click="next">Next</button>
        </div>
        <div class="gallery-results-container">
          <div class="sort-order-container">
            <label for="sort-order">Sort: </label>
            <select id="sort-order" v-model="sortOrder" @change="getResults">
              <option value="DESC">Newest to oldest</option>
              <option value="ASC">Oldest to newest</option>
            </select>
          </div>
          <template v-for="result in results" :key="result.content_name">
            <gallery-tile @load-submission="loadSubmission" v-bind="result" @search-user="searchUser"></gallery-tile>
          </template>
          <p v-if="!results.length">No results!</p>
        </div>
        <div class="gallery-navigation">
          <button class="gallery-prev" :disabled="!offset" @click="previous">Prev</button>
          <h2 class="gallery-search-title">{{galleryTitle}}</h2>
          <button class="gallery-next" :disabled="!results.length || results.length < count" @click="next">Next</button>
        </div>
      </div>
    </transition>
    <submission-view v-if="submissionData" v-bind="submissionData" @clear-submission="goBack" @download-comments="downloadComments" @download-content="downloadContent"></submission-view>
  </div>
  `,
  data() {
    return {
      count: 28,
      offset: 0,
      results: [],
      contentPath: '',
      submissionData: null,
      query: {},
      outsideUsername: '',
      sortOrder: 'DESC',
      favUsernames: [],
      usernames: [],
    };
  },
  beforeCreate() {
    window.setPageInfo = (data) => {
      if (data.favUsernames) this.favUsernames = data.favUsernames;
      if (data.usernames) this.usernames = data.usernames;
    }
  },
  mounted() {
    history.replaceState('', null, location.href.split('#')[0]);
    const _this = this;
    this.getResults();
    window.addEventListener('hashchange', () => {
      if(!location.hash) _this.clearSubmission();
    });
  },
  computed: {
    galleryTitle() {
      let title = 'Search Results';
      if (this.query.username) {
        let galleryType = this.query.galleryType ? `Showing ${this.query.galleryType}` : 'Search Results';
        title = `${galleryType} for User: "${this.query.username}"`;
      } else if (this.query.galleryType) {
        return 'Need a username for favorites!';
      }
      return title;
    },
  },
  methods: {
    previous() {
      this.offset -= this.count;
      this.getResults();
    },
    async next() {
      this.offset += this.count;
      this.getResults();
    },
    async getResults() {
      const _this = this;
      const payload = { 
        offset: this.offset,
        count: this.count,
        query: this.query,
        sortOrder: this.sortOrder,
      };
      return window.getGalleryPage(payload)
      .then(results => _this.results = results);
    },
    async loadSubmission(id, noScroll) {
      console.log(`Loading submission: ${id}`);
      const data = await window.getSubmissionPage(id);
      this.submissionData = data;
      window.location.hash = `view/${id}`;
      if (!noScroll) window.scrollTo(0, 0);
    },
    goBack() {
      window.history.back();
    },
    clearSubmission() {
      this.submissionData = null;
    },
    async downloadComments(id, url) {
      await window.downloadComments(id, url);
      this.loadSubmission(id, true);
    },
    async downloadContent({ id, content_url, content_name, username }) {
      await window.downloadContent({ content_url, content_name, username });
      this.loadSubmission(id, true);
      this.getResults();
    },
    async startSearch(query) {
      this.query = query;
      this.offset = 0;
      if (this.query.galleryType && !this.query.username) {
        this.results = [];
        return;
      }
      this.getResults();
    },
    searchUser(username) {
      this.outsideUsername = username;
    },
  }
}
