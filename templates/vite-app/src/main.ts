import {readyMessage} from './app';
import './style.css';

const status = document.querySelector<HTMLOutputElement>('#status');
if (!status) throw new Error('Status output is missing');
status.value = readyMessage('__APP_TITLE__');
