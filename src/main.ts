import { createApp } from 'vue';
import './index.css';
import ApexNebula from './ApexNebula.vue';
import GameInfo from './GameInfo.vue';

// Ensure the components are in the main dependency graph for Vite federation
export { ApexNebula, GameInfo };

const mountApp = async () => {
    const isStandalone = import.meta.env.DEV || new URLSearchParams(window.location.search).has('standalone') || new URLSearchParams(window.location.search).has('sim');

    if (isStandalone) {
        const { default: StandaloneApexNebula } = await import('./StandaloneApexNebula.vue');
        const app = createApp(StandaloneApexNebula);
        app.mount('#root');
    } else {
        const app = createApp(GameInfo);
        app.mount('#root');
    }
};

mountApp();
