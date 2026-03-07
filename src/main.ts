import { createApp } from 'vue';
import './index.css';

if (import.meta.env.DEV) {
    import('./StandaloneApexNebula.vue').then(({ default: StandaloneApexNebula }) => {
        const app = createApp(StandaloneApexNebula);
        app.mount('#root');
    });
}
