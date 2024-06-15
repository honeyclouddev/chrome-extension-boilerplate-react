import TabTreeNode from './TabTreeNode';

class TreeGenerator {

    constructor(tabs, tabParentMap) {
        this.tabs = tabs;
        this.tabParentMap = tabParentMap;
        this.nodeMap = {};
        this.tabMap = {};
        this.rootNode = new TabTreeNode();
        
        // Create a map of tab IDs to tab objects
        tabs.forEach(tab => {
            this.tabMap[tab.id] = tab;
        });
    }

    // Generate the tree structure from tabs and parent map
    getTree() {
        this.tabs.forEach(tab => {
            let node = this.getNode(tab);
            let parentNode = this.getNode(this.getParentTab(tab.id));
            node.parent = parentNode;
            parentNode.children.push(node);
        });
        return this.rootNode;
    }

    // Get the parent tab object by tab ID
    getParentTab(tabId) {
        let parentTabId = this.tabParentMap[tabId];
        if (this.tabMap[parentTabId]) {
            return this.tabMap[parentTabId];
        } else if (parentTabId && this.tabParentMap[parentTabId]) {
            return this.getParentTab(parentTabId);
        } else {
            return undefined;
        }
    }

    // Get or create a node for the given tab
    getNode(tab) {
        if (tab === undefined) {
            return this.rootNode;
        }
        if (!this.nodeMap[tab.id]) {
            this.nodeMap[tab.id] = new TabTreeNode(tab);
        }
        return this.nodeMap[tab.id];
    }

    // Clean the tab parent map by removing invalid entries
    cleanTabParentMap(tabs, tabParentMap) {
        const currentTabMap = tabs.reduce((map, tab) => {
            map[tab.id] = true;
            return map;
        }, {});

        let cleanedMap = {};
        for (let key in tabParentMap) {
            if (currentTabMap[key]) {
                cleanedMap[key] = tabParentMap[key];
            }
        }
        return cleanedMap;
    }
}

export default TreeGenerator;
