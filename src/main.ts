import { createApp } from 'vue';
import './index.css';
import ApexNebula from './ApexNebula.vue';
import GameInfo from './GameInfo.vue';

// Ensure the components are in the main dependency graph for Vite federation
export { ApexNebula, GameInfo };

if (import.meta.env.DEV) {
    import('./StandaloneApexNebula.vue').then(({ default: StandaloneApexNebula }) => {
        const app = createApp(StandaloneApexNebula);
        app.mount('#root');
    });
} else {
    const app = createApp(GameInfo);
    app.mount('#root');
}
