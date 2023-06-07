export default {
  name: 'gallery-controls',
  emits: ['startSearch'],
  template: `
    <div class="gallery-controls">
      <div class="gallery-controls__search-container">
        <label for="galleryType">Gallery:</label>
        <select id="galleryType" v-model="galleryType" @change="startSearch">
          <option value="">Main</option>
          <option :disabled="!username" value="favorites">Favorites</option>
        </select>
      </div>
      <div class="gallery-controls__search-container">
        <label for="username">User:</label>
        <input id="username" ref="username" type="text" placeholder="Username?" v-model="username" @input="startSearch" />
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
    };
  },
  computed: {

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