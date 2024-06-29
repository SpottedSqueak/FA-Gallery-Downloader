import getRelativeTime from './relative-time.js';

export default {
  name: 'submission-view',
  template: `
    <div class="submission-view" @click.prevent="possibleOpen">
      <div class="submission-container">
        <div class="submission-hero">
          <div v-if="error" class="download-link" @click="downloadContent">File possibly corrupted!<br>Redownload?</div>
          <img v-else-if="isImg" :src="computedContentPath" @click.self="openInNewWindow" :alt="altText" :title="altText" @error="error = true" />
          <object v-else-if="isPDF" class="pdf-embed" :data="computedContentPath" type="application/pdf" @error="error = true"></object>
          <object v-else-if="isSWF" class="swf-embed" type="application/x-shockwave-flash" :data="computedContentPath" id="applicationID">
            <param name="movie" :value="computedContentPath" />
            <param name="wmode" value="transparent" />
            <param name="FlashVars" value="" />
            <param name="quality" value="high" />
            <param name="menu" value="false" />
          </object>
          <object v-else-if="isTxt" class="pdf-embed txt" :data="computedContentPath" type="text/plain" @error="error = true"></object>
          <audio v-else-if="isMusic" class="music-embed" controls :src="computedContentPath" @error="error = true"></audio>
          <div v-else-if="isDoc" class="download-link" @click="openInNewWindow">Content not embedded. Download to view!</div>
          <div v-else-if="isUnknown" class="music-embed">Invalid/Blank filetype: "{{submission.content_name}}"<br>This file cannot be displayed or downloaded, due to it's missing filetype</div>
          <div v-else-if="isMissing" class="music-embed">Content missing: "{{submission.content_name}}"<br>This file cannot be downloaded, as it is missing on FA</div>
          <div v-else-if="isDownloadable" class="music-embed">Content: "{{submission.content_name}}" not displayable</div>
          <div v-else class="download-link" @click="downloadContent">Content not downloaded!<br>Download now?</div>
        </div>
        <div class="submission-metadata">
          <button class="close-btn" @click="close">✖ Close</button>
          <button class="full-size-btn" :disabled="!isDownloadable" @click.self="openInNewWindow">View Full Size</button>
          <div class="submission-metadata__info">
            <h3>Rating</h3>
            <div :class="[cleanRating]">{{submission.rating || '[Missing]'}}</div>
          </div>
          <div class="submission-metadata__info">
            <h3>Category</h3>
            <div>{{submission.category  || '[Missing]'}}</div>
          </div>
          <div class="submission-metadata__info">
            <h3>Tags</h3>
            <ul class="submission-metadata__tags">
              <li v-for="tag in cleanTags">
                {{tag}}
              </li>
            </ul>
            <div v-if="!cleanTags.length">No Tags</div>
          </div>
        </div>
        <div class="submission-info">
          <div class="submission-info__header">
            <div class="submission-info__user-icon">
              <img :src="getCleanUserImg(submission.username)" @error="fixIcon"/>
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
            <div class="comment-icon"><img :src="getCleanUserImg(comment.username)" @error="fixIcon" /></div>
            <div class="comment-header">
              <div class="comment-user">
                {{getCleanUsername(comment.username)}}
                <span :alt="comment.date" :title="comment.date">{{getCommentDate(comment.date)}}</span>
              </div>
              <div class="comment-subtitle">{{comment.subtitle}}</div>
            </div>
            <div class="comment-desc" v-html="getCleanDesc(comment.desc)"></div>
          </div>
        </template>
      </div>
    </div>
  `,
  props: ['submission', 'comments'],
  emits: ['clearSubmission', 'downloadComments', 'downloadContent'],
  data() {
    return {
      contentPath: '',
      altText: 'Click to open in a new tab!',
      error: false,
    };
  },
  beforeMount() {
   this.getContentPath();
  },
  watch: {
    submission() {
      this.error = false;
    }
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
    isDoc() {
      return (
        this.contentPath
        && this.submission.is_content_saved
        && /(doc|docx)$/i.test(this.submission.content_name)
      );
    },
    isMusic() {
      return (
        this.contentPath
        && this.submission.is_content_saved
        && /(mp3|wav|ogg)$/i.test(this.submission.content_name)
      );
    },
    isSWF() {
      return (
        this.contentPath
        && this.submission.is_content_saved
        && /(swf)$/i.test(this.submission.content_name)
      );
    },
    isUnknown() {
      return /\.$/i.test(this.submission.content_name);
    },
    isMissing() {
      return !!this.submission.content_missing;
    },
    isDownloadable() {
      return this.submission.is_content_saved &&
        !(this.isUnknown && this.isMissing);
    },
    cleanAccountName() {
      return this.submission.account_name.replace(/\.$/, '._');
    },
    computedContentPath() {
      return `${this.contentPath}\\${this.cleanAccountName}\\${this.submission.content_name}`;
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
      return this.submission.tags?.split(',') || [];
    },
    cleanRating() {
      return this.submission.rating?.toLowerCase() || '';
    }
  },
  methods: {
    getCleanUsername(name) {
      return name.replace(/\bOP\b/gi, ' [OP] ');
    },
    getCleanUserImg(name) {
      const cleanName = name.split(' ')[0].toLowerCase().replace(/[_]/g, '');
      return `https://a.furaffinity.net/${cleanName}.gif`;
    },
    getCleanDesc(desc = '') {
      return desc
        .replace(/"\/\//gi, '"https://')
        .replace(/"\/user/gi, '"https://www.furaffinity.net/user')
        .replace(/img src/gi, `img onerror='this.src="../html/resources/_default.gif"' src`);
    },
    getCommentDate(date) {
      if (!date) return '';
      return getRelativeTime(+new Date(date));
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
      this.$emit('downloadContent', this.submission);
    },
    openInNewWindow() {
      window.open(this.computedContentPath, '_blank');
    },
    fixIcon(e) {
      e.target.src = '../html/resources/_default.gif';
    },
    possibleOpen(e) {
      const url = e.target.closest('a')?.href;
      if (url) window.openUrl?.(url);
    }
  },
}
