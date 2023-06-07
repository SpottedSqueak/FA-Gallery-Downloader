import getRelativeTime from './relative-time.js';

export default {
  name: 'gallery-tile',
  template: `
    <div class="gallery-tile">
      <div class="gallery-tile__thumbnail" @click="loadSubmission">
        <img v-if="isImg" :class="{'too-wide': isTooWide}" :src="computedImgPath" @load="onImgLoad" />
        <div v-else-if="!is_content_saved" class="gallery-tile__thumbnail-other not-downloaded"><span>File not yet downloaded!<br>Type: {{fileExtension}}</span></div>
        <div v-else class="gallery-tile__thumbnail-other file-type"><span>{{fileExtension}}</span></div>
      </div>
      <div class="gallery-tile__info">
        <div class="gallery-tile__title" @click="loadSubmission">{{title}}</div>
        <div class="gallery-tile__user">by <span>{{username}}</span></div>
        <div class="gallery-tile__date" :title="date_uploaded" :alt="date_uploaded">Uploaded: {{relativeDate}}</div>
      </div>
    </div>
  `,
  props: ['id', 'title', 'username', 'content_name', 'date_uploaded', 'is_content_saved'],
  emits: ['loadSubmission'],
  data() {
    return {
      contentPath: '',
      isTooWide: false,
    };
  },
  beforeMount() {
   this.getContentPath();
  },
  computed: {
    isImg() {
      return (
        this.contentPath
        && this.is_content_saved
        && /(png|jpg|gif|webp|jpeg)$/i.test(this.content_name)
      );
    },
    computedImgPath() {
      return `${this.contentPath}\\${this.username}\\${this.content_name}`;
    },
    fileExtension() {
      return this.content_name.split('.').pop().toUpperCase();
    },
    relativeDate() {
      return getRelativeTime(+new Date(this.date_uploaded));
    },
  },
  methods: {
    async getContentPath() {
      this.contentPath = await window.getContentPath();
    },
    onImgLoad(l) {
      const img = l.target;
      this.isTooWide = img.height < img.parentElement.offsetHeight/2;
    },
    loadSubmission() {
      this.$emit('loadSubmission', this.id);
    }
  },
}
