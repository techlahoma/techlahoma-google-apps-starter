import {markReady} from './app';
import './style.css';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('App root is missing');
markReady(app);
