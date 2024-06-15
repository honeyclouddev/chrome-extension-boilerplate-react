import React from 'react';
import { createRoot } from 'react-dom/client';
import TabTree from '../Components/TabTree';
import Initializer from '../Utils/Initializer';
import './index.css';

const container = document.getElementById('app-container');
const root = createRoot(container);

const chromeInstance = chrome; // Replace 'chrome' with the actual chrome instance
const initializer = new Initializer(chromeInstance);

root.render(
    <TabTree
        chrome={chromeInstance}
        initializer={initializer}
    />
);