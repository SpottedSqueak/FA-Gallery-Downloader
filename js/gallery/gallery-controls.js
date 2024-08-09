export default {
  name: 'gallery-controls',
  emits: ['startSearch'],
  props: ['outsideUsername', 'outsideFavUsernames', 'outsideUsernames'],
  template: `
    <div class="gallery-controls">
      <div class="gallery-controls__search-container">
        <label for="galleryType">Gallery:</label>
        <select id="galleryType" v-model="galleryType" @change="startSearch">
          <option value="">Main</option>
          <option value="favorites">Favorites</option>
        </select>
      </div>
      <div class="gallery-controls__search-container">
        <label for="username">User:</label>
        <input id="username" list="usernameList" ref="username" type="text" placeholder="Search for username" v-model="username" @input="startSearch"
        autocomplete="off" />
        <datalist id="usernameList">
          <option v-for="n in listInfo">{{n}}</option>
        </datalist>
      </div>
      <div class="gallery-controls__search-container">
        <label for="search">Search:</label>
        <input id="search" ref="search" type="text" placeholder="Press enter to search..." v-model="search" @input="startSearch" />
      </div>
    </div>
  `,
  data() {
    return {
      search: '',
      username: '',
      galleryType: '',
      favUsernames: [],
      usernames: [],
    };
  },
  watch: {
    outsideUsername(newName) {
      this.username = newName;
      this.galleryType = '';
      this.startSearch();
    },
    outsideFavUsernames(newNames) {
      this.favUsernames = newNames;
    },
    outsideUsernames(newNames) {
      this.usernames = newNames;
    }
  },
  computed: {
    listInfo() {
      let names = this.galleryType ? this.favUsernames : this.usernames; 
      return [...new Set(names.map(n => n.username))];
    }
  },
  methods: {
    startSearch() {
      const searchTerm = this.search.trim();
      const username = this.username.trim();
      const galleryType = this.galleryType;
      this.$emit('startSearch', { searchTerm, username, galleryType });
    }
  },
}