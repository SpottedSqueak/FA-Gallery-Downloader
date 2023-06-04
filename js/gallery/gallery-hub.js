export default {
  name: 'Gallery',
  template: `
  <div class="try" @click="check">{{message}}</div>
  `,
  data() {
    return { message: `What's up Danger?!`};
  },
  methods: {
    check() {
      this.message = 'Spiderverse';
    }
  }
}