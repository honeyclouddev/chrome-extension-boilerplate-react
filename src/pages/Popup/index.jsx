import React from 'react';
import { createRoot } from 'react-dom/client';
import TabTree from '../Components/TabTree';
import Initializer from '../Utils/Initializer';

// import Popup from './Popup';
import './index.css';

const container = document.getElementById('app-container');
const root = createRoot(container); // createRoot(container!) if you use TypeScript
// root.render(<Popup />);

root.render(
    <TabTree
        chrome={chrome}
        initializer={new Initializer(chrome)}
    />
);