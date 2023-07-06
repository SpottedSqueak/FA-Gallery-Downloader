import getRelativeTime from './relative-time.js';

export default {
  name: 'gallery-tile',
  template: `
    <div class="gallery-tile">
      <div class="gallery-tile__thumbnail" :class="[classRating]" @click="loadSubmission" :alt="altText" :title="altText">
        <div class="gallery-tile__thumbnail_wrapper">
          <div v-if="error" class="gallery-tile__thumbnail-other">⚠ ERROR! ⚠<br>Possible<br>corrupt file!</div>
          <img v-else-if="isImg" :class="{'too-wide': isTooWide, 'too-small': isTooSmall }" :src="computedImgPath" @load="onImgLoad" @error="onError"/>
          <div v-else-if="!is_content_saved" class="gallery-tile__thumbnail-other not-downloaded"><span>File not downloaded!<br>Type: {{fileExtension}}</span></div>
          <div v-else class="gallery-tile__thumbnail-other file-type"><span>Filetype:<br>{{fileExtension}}</span></div>
        </div>
      </div>
      <div class="gallery-tile__info">
        <div class="gallery-tile__title" @click="loadSubmission" :alt="altText" :title="altText">{{title}}</div>
        <div class="gallery-tile__user">by <span @click="searchUser" :alt="userAltText" :title="userAltText">{{username}}</span></div>
        <div class="gallery-tile__date" :title="date_uploaded" :alt="date_uploaded">Uploaded: {{relativeDate}}</div>
      </div>
    </div>
  `,
  props: ['id', 'title', 'username', 'content_name', 'date_uploaded', 'is_content_saved', 'thumbnail_name', 'is_thumbnail_saved', 'rating'],
  emits: ['loadSubmission', 'searchUser'],
  data() {
    return {
      contentPath: '',
      isTooWide: false,
      isTooSmall: false,
      altText: 'View this submission!',
      userAltText: 'Search for this user!',
      error: false,
      isDefaultThumbnail: false,
    };
  },
  beforeMount() {
   this.getContentPath();
   this.error = false;
  },
  computed: {
    isImg() {
      return (
        this.contentPath
        && this.is_content_saved
        && (/(png|jpg|gif|webp|jpeg)$/i.test(this.content_name)
            || this.isThumbnail
        ) && !this.isDefaultThumbnail
      );
    },
    isThumbnail() {
      return this.thumbnail_name && this.is_thumbnail_saved;
    },
    computedImgPath() {
      if (this.thumbnail_name && this.is_thumbnail_saved)
        return `${this.contentPath}\\${this.username}\\thumbnail\\${this.thumbnail_name}`;
      return `${this.contentPath}\\${this.username}\\${this.content_name}`;
    },
    fileExtension() {
      const fileExtension = this.content_name.split('.').pop().toUpperCase();
      return fileExtension ? fileExtension : '???';
    },
    relativeDate() {
      return getRelativeTime(+new Date(this.date_uploaded));
    },
    classRating() {
      return this?.rating?.toLowerCase();
    }
  },
  methods: {
    async getContentPath() {
      this.contentPath = await window.getContentPath();
    },
    async onImgLoad(l) {
      this.error = false;
      const img = l.target;
      const parent = img.parentElement;
      // Nothing should ever be this perfectly tiny
      if (!img.clientWidth) {
        await this.waitFor();
        return this.onImgLoad({ target: img });
      }
      this.isDefaultThumbnail = img.clientWidth === 50 && img.clientHeight === 50;
      this.isTooSmall = !this.isDefaultThumbnail && img.clientHeight <= parent.offsetHeight/2;
      this.isTooWide = !this.isDefaultThumbnail && img.clientWidth > parent.offsetWidth;
    },
    onError() {
      this.error = true;
    },
    loadSubmission() {
      this.$emit('loadSubmission', this.id);
    },
    searchUser() {
      this.$emit('searchUser', this.username);
    },
    waitFor(t = 1000) {
      return new Promise(r => setTimeout(r, t));
    }
  },
}
