import getRelativeTime from './relative-time.js';

export default {
  name: 'submission-view',
  template: `
    <div class="submission-container">
      <div class="submission-hero">
        <img v-if="isImg" :src="computedContentPath" @click="openInNewWindow" :alt="altText" :title="altText"/>
        <object v-else-if="isPDF" class="pdf-embed" :data="computedContentPath" type="application/pdf"></object>
        <object v-else-if="isTxt" class="pdf-embed" :data="computedContentPath" type="text/plain"></object>
        <div v-else class="download-link" @click="downloadContent">Content not downloaded!<br>Download now?</div>
      </div>
      <div class="submission-metadata">
        <h3>Tags</h3>
        <ul class="submission-metadata__tags">
          <li v-for="tag in cleanTags">
            {{tag}}
          </li>
        </ul>
      </div>
      <div class="submission-info">
        <div class="submission-info__header">
          <div class="submission-info__user-icon">
            <img :src="getCleanUserImg(submission.username)" onerror="this.src='./css/_default.gif'"/>
          </div>
          <div class="submission-info__title">{{submission.title}}</div>
          <div class="submission-info__user">
            <span>By {{submission.username}} | </span>
            <b :title="dateUploaded" :alt="dateUploaded">Uploaded: {{relativeDate}}</b>
          </div>
        </div>
        <div class="submission-info__content">
          <div class="submission-info__desc" v-html="cleanDesc"></div>
        </div>
      </div>
    </div>
    <button class="download-comments" @click="downloadComments">Download Comments</button>
    <div class="comment-container">
      <template v-for="comment in comments">
        <div class="comment" :style="comment.width">
          <div class="comment-icon"><img :src="getCleanUserImg(comment.username)" onerror="this.src='./css/_default.gif'" /></div>
          <div class="comment-header">
            <div class="comment-user">{{getCleanUsername(comment.username)}}</div>
            <div class="comment-subtitle">{{comment.subtitle}}</div>
          </div>
          <div class="comment-desc" v-html="getCleanDesc(comment.desc)"></div>
        </div>
      </template>
    </div>
  `,
  props: ['submission', 'comments'],
  emits: ['clearSubmission', 'downloadComments', 'downloadContent'],
  data() {
    return {
      contentPath: '',
      altText: 'Click to open in a new tab!',
    };
  },
  beforeMount() {
   this.getContentPath();
  },
  computed: {
    isImg() {
      return (
        this.contentPath
        && this.submission.is_content_saved
        && /(png|jpg|gif|webp|jpeg)$/i.test(this.submission.content_name)
      );
    },
    isPDF() {
      return (
        this.contentPath
        && this.submission.is_content_saved
        && /(pdf)$/i.test(this.submission.content_name)
      );
    },
    isTxt() {
      return (
        this.contentPath
        && this.submission.is_content_saved
        && /(text|txt|rtf)$/i.test(this.submission.content_name)
      );
    },
    computedContentPath() {
      return `${this.contentPath}\\${this.submission.content_name}`;
    },
    fileExtension() {
      return this.submission.content_name.split('.').pop();
    },
    relativeDate() {
      return getRelativeTime(+new Date(this.submission.date_uploaded));
    },
    dateUploaded() {
      return this.submission.date_uploaded;
    },
    cleanDesc() {
      return this.getCleanDesc(this.submission.desc);
    },
    cleanTags() {
      return this.submission.tags.split(',');
    },
  },
  methods: {
    getCleanUsername(name) {
      return name.replace(/\bOP\b/gi, ' [OP] ');
    },
    getCleanUserImg(name) {
      return `https://a.furaffinity.net/${name.split(' ')[0].toLowerCase()}.gif`;
    },
    getCleanDesc(desc) {
      return desc
        .replace('a href', 'a target="_blank" href')
        .replace(/"\/\//gi, '"https://')
        .replace(/"\/user/gi, '"https://www.furaffinity.net/user');
    },
    async getContentPath() {
      this.contentPath = await window.getContentPath();
    },
    close() {
      this.$emit('clearSubmission');
    },
    downloadComments() {
      const { id, url } = this.submission;
      this.$emit('downloadComments', id, url);
    },
    downloadContent() {
      const { id, content_url, content_name } = this.submission;
      this.$emit('downloadContent', id, content_url, content_name);
    },
    openInNewWindow() {
      window.open(this.computedContentPath, '_blank');
    }
  },
}
