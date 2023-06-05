import galleryTile from "./gallery-tile.js";
import submissionView from './submission-view.js';

export default {
  name: 'gallery-hub',
  components: {
    galleryTile,
    submissionView
  },
  template: `
  <transition>
    <div v-show="!submissionData" class="gallery-container">
      <h2 class="gallery-title">🐾FA Gallery Viewer 🐾</h2>
      <div class="gallery-controls">
        <div class="gallery_controls__search-container">
          <label for="search">Search:</label>
          <input id="search" type="text" placeholder="Press enter to search..." @change="startSearch" />
        </div>
      </div>
      <div class="gallery-navigation">
        <button class="gallery-prev" :disabled="!offset" @click="previous">Prev</button>
        <button class="gallery-next" :disabled="!results.length || results.length < count" @click="next">Next</button>
      </div>
      <div class="gallery-results-container">
        <template v-for="result in results" :key="result.content_name">
          <gallery-tile @load-submission="loadSubmission" v-bind="result"></gallery-tile>
        </template>
        <p v-if="!results.length">No results!</p>
      </div>
      <div class="gallery-navigation">
        <button class="gallery-prev" :disabled="!offset" @click="previous">Prev</button>
        <button class="gallery-next" :disabled="!results.length || results.length < count" @click="next">Next</button>
      </div>
    </div>
  </transition>
    <submission-view v-if="submissionData" v-bind="submissionData" @clear-submission="goBack" @download-comments="downloadComments" @download-content="downloadContent"></submission-view>
  `,
  data() {
    return {
      count: 28,
      offset: 0,
      results: {},
      contentPath: '',
      submissionData: null,
      searchTerm: '',
    };
  },
  mounted() {
    history.replaceState('', null, location.href.split('#')[0]);
    const _this = this;
    this.getResults();
    window.addEventListener('hashchange', () => {
      if(!location.hash) _this.clearSubmission();
    });
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
      return window.getGalleryPage(this.offset, this.count, this.searchTerm)
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
    async downloadContent(id, url, name) {
      await window.downloadContent(url, name);
      this.loadSubmission(id, true);
      this.getResults();
    },
    async startSearch(e) {
      this.searchTerm = e.target.value;
      this.offset = 0;
      this.getResults();
    }
  }
}