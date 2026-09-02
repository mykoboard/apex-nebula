import { createApp } from 'vue';
import './index.css';
import StandaloneApexNebula from './StandaloneApexNebula.vue';
import ApexNebula from './ApexNebula.vue';
import GameInfo from './GameInfo.vue';

export { ApexNebula, GameInfo, StandaloneApexNebula };

const app = createApp(StandaloneApexNebula);
app.mount('#root');

