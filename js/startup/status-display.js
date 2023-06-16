export default {
  name: 'status-display',
  template: `
    <div class="status-container">
      <div id="progress-bars">
        <div class="progress-desc">{{computedDataProgress}}</div>
        <label for="data-progress-bar">Data:</label>
        <progress id="data-progress-bar" :value="data.value" :max="data.max"></progress>
        <br>
        <div class="progress-desc">{{computedFilename}}</div>
        <label for="file-progress-bar">File:</label>
        <progress id="file-progress-bar" :value="file.value" :max="file.max"></progress>
      </div>
      <h3>Status log:</h3>
      <div id="status">
      <template v-for="(msg, index) in msgs" :key="index">
        <p :style="{ order: '-' + index}">{{msg.text}}</p>
      </template>
      </div>
    </div>
  `,
  props: ['msg', 'logProgress'],
  emits: ['clearMsg'],
  data() {
    return {
      msgs: [],
      // Progress bar
      data: {
        value: 0,
        max: 1,
      },
      file: {
        value: 0,
        max: 1
      },
      filename: '',
    };
  },
  computed: {
    computedDataProgress() {
      if (!this.data.value) return '';
      return `[${this.data.value}/${this.data.max}]`;
    },
    computedFilename() {
      if (!this.filename) return '';
      const diff = this.filename.length - 30;
      if (!diff) return this.filename;
      return`...${this.filename.slice(diff)}`;
    },
  },
  watch: {
    msg(newMsg) {
      if (!newMsg) return;
      this.addToStatus(newMsg);
    },
    logProgress(val) {
      if (val.reset) {
        this[val.bar].value = null;
      } else {
        this[val.bar].value = val.value;
        this[val.bar].max = val.max
        this.filename = val.filename || '';
        const _this = this;
        const bar = val.bar
        if (val.value >= val.max) {
          setTimeout(() => {
            const cBar = _this[bar];
            cBar.value = 0;
            if (bar === 'file') _this.filename = '';
          }, 500);
        }
      }
    },
  },
  methods: {
    getOrder(index) {
      return `order: -${{index}};`;
    },
    prune() {
      if (this.msgs.length > 100) 
        this.msgs.shift();
    },
    addToStatus(msg) {
      if (msg.id && msg.replaceLast) {
        const index = this.msgs.indexOf((val) => val.id === msg.id);
        if(index) this.msgs[index].text = msg.text;
        else this.msgs.push(msg);
      } else if (msg.replaceLast) {
        this.msgs[this.msgs.length - 1].text = msg.text
      } else this.msgs.push(msg);
      this.$emit('clearMsg');
      this.prune();
    }
  }
}