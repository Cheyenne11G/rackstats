import React from 'react';
import { createRoot } from 'react-dom/client';
import RackStats from './RackStats.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><RackStats /></React.StrictMode>);