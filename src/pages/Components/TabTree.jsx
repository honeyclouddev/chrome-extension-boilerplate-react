import React from 'react';
import { Input } from 'antd';
import TabTreeView from './TabTreeView';
import TabTreeNode from '../Utils/TabTreeNode';
import TabSequenceHelper from '../Utils/TabSequenceHelper';
import GoogleSuggestHelper from '../Utils/GoogleSuggestHelper';

export default class TabTree extends React.Component {
    constructor(props) {
        super(props);

        // Initializing class properties
        this.initializer = this.props.initializer;
        
        // Setting initial state with root nodes and selected tab
        this.state = {
            selectedTab: { id: -1 }, // No tab selected initially
            keyword: "", // Initial search keyword is empty
            rootNode: new TabTreeNode(), // Root node for tabs
            googleSuggestRootNode: new TabTreeNode(), // Root node for Google suggestions
        };

        // References for search field and container
        this.initailKeyword = "";
        this.searchFieldRef = React.createRef();
        this.selfRef = React.createRef();

        // Helpers for tab sequence and Google suggestions
        this.TabSequenceHelper = new TabSequenceHelper(
            this.state.rootNode,
            this.state.googleSuggestRootNode
        );
        this.googleSuggestHelper = new GoogleSuggestHelper();
        this.altKeyDown = false; // Flag for Alt key press
        this.searchInputInComposition = false; // Flag for input composition state (e.g., IME input)

        // Event listeners for Chrome tabs updates and removals
        this.props.chrome.tabs.onUpdated.addListener(this.onTabUpdate);
        this.props.chrome.tabs.onRemoved.addListener(this.onTabRemoved);

        // Initial load of root nodes
        this.refreshRootNode();
    }

    componentDidMount() {
        // Focus on search field when the component mounts
        this.focusSearchField();
        // Add keydown and keyup event listeners
        document.addEventListener("keydown", this.onKeyDown, false);
        document.addEventListener("keyup", this.onKeyUp, false);
    }

    componentWillUnmount() {
        // Remove event listeners when the component unmounts
        document.removeEventListener("keydown", this.onKeyDown, false);
        document.removeEventListener("keyup", this.onKeyUp, false);
    }

    // Focus the search input field
    focusSearchField = () => {
        this.searchFieldRef.current.focus();
    }

    // Blur (unfocus) the search input field
    blurSearchField = () => {
        this.searchFieldRef.current.blur();
    }

    // Refresh the root nodes (tabs, and Google suggestions)
    refreshRootNode = async (keyword = undefined) => {
        const rootNode = await this.initializer.getTree(keyword);
        const activeTab = await this.initializer.getActiveTab();

        this.setState({
            rootNode: rootNode,
            selectedTab: keyword ? { id: -1 } : activeTab,
        });

        // Optionally fetch Google search suggestions here
    }

    // Handle tab updates (e.g., title, favicon, status changes)
    onTabUpdate = (tabId, changeInfo, tab) => {
        const rootNode = this.state.rootNode;

        if (changeInfo.title) rootNode.setTitleById(tabId, changeInfo.title);
        if (changeInfo.favIconUrl) rootNode.setFavIconUrlById(tabId, changeInfo.favIconUrl);
        if (changeInfo.status) rootNode.setStatusById(tabId, changeInfo.status);

        this.setState({ rootNode });
    }

    // Handle tab removal
    onTabRemoved = () => {
        this.refreshRootNode(this.state.keyword);
    }

    // Handle key down events
    onKeyDown = (e) => {
        if (e.key === 'ArrowDown') this.focusNextTabItem();
        if (e.key === 'ArrowUp') this.focusPrevTabItem();
        if (e.key === 'Enter' && !this.searchInputInComposition) {
            this.onContainerClick(this.state.selectedTab);
        }
        if (e.key === 'Alt') {
            this.altKeyDown = true;
            this.searchFieldRef.current.blur();
        }
        if (this.altKeyDown && (e.key.toLowerCase() === 'w' || e.key === '∑')) {
            if (this.state.selectedTab.id !== -1) {
                this.onCloseAllTabs(this.TabSequenceHelper.getNodeByTabId(this.state.selectedTab.id, this.state.rootNode));
            }
        }
        this.focusSearchField();
    }

    // Handle key up events
    onKeyUp = (e) => {
        if (e.key === 'Alt') {
            this.altKeyDown = false;
            this.focusSearchField();
        }
    }

    // Focus on the next tab item in the sequence
    focusNextTabItem = () => {
        const selectedTab = this.TabSequenceHelper.getNextTab();
        if (selectedTab) {
            this.setState({ selectedTab });
        }
    }

    // Focus on the previous tab item in the sequence
    focusPrevTabItem = () => {
        const selectedTab = this.TabSequenceHelper.getPreviousTab();
        if (selectedTab) {
            this.setState({ selectedTab });
        }
    }

    // Handle search text change
    onSearchTextChanged = (e) => {
        const keyword = this.normalizeString(e.target.value);
        this.setState({ keyword });
        this.refreshRootNode(keyword);
    }

    // Normalize string to escape backslashes
    normalizeString = (str) => {
        return str.replace(/\\/g, "\\\\");
    }

    // Handle tab item selection (e.g., scrolling into view)
    onTabItemSelected = (rect) => {
        const selfRect = this.selfRef.current.getBoundingClientRect();
        if (rect.bottom > selfRect.bottom) {
            this.selfRef.current.scrollTop += (rect.bottom - selfRect.bottom);
        } else if (rect.top < selfRect.top) {
            this.selfRef.current.scrollTop -= (selfRect.top - rect.top);
        }
    }

    // Handle container click (open tab or search)
    onContainerClick = (tab) => {
        if (this.noTabSelected(tab)) {
            this.searchByGoogle(this.state.keyword);
        } else if (tab.isGoogleSearch) {
            this.searchByGoogle(tab.title);
        } else {
            this.props.chrome.tabs.update(tab.id, { active: true });
        }
    }

    // Check if no tab is selected
    noTabSelected = (tab) => {
        return tab.id === -1;
    }

    // Perform a Google search with the given query
    searchByGoogle = (query) => {
        const url = `https://www.google.com/search?q=${query}`;
        this.props.chrome.tabs.create({ url });
    }

    // Handle close button click to remove a tab
    onClosedButtonClick = (tab) => {
        this.props.chrome.tabs.remove(tab.id);
    }

    // Close all tabs related to a given tab node
    onCloseAllTabs = (tNode) => {
        this.props.chrome.tabs.remove(tNode.getAllTabIds());
    }

    // Handle input composition start (e.g., IME input)
    searchInputCompositionStart = () => {
        this.searchInputInComposition = true;
    }

    // Handle input composition end (e.g., IME input)
    searchInputCompositionEnd = () => {
        this.searchInputInComposition = false;
    }

    // Update tab sequence based on the current state
    updateTabSequence = () => {
        this.TabSequenceHelper.refreshQueue(
            this.state.rootNode,
            this.state.googleSuggestRootNode
        );
        this.TabSequenceHelper.setCurrentIdx(this.state.selectedTab);
    }

    // Check if search tip should be shown
    showSearchTip = () => {
        return this.googleSearchEnabled() && 
               this.state.rootNode.children.length === 0
    }

    // Check if Google suggestions should be shown
    showGoogleSuggest = () => {
        return false;
    }

    // Check if Google search is enabled
    googleSearchEnabled = () => {
        return true;
    }

    // Check if Google search suggestions are enabled
    googleSearchSuggestEnabled = () => {
        return true;
    }

    render() {
        this.updateTabSequence();

        // Placeholder text for search input
        const inputPlaceholder = "Filter ".padEnd(110, ' ') + '↑ and ↓ to select         ⏎ to switch/search';

        let googleSearchTip = null;
        if (this.showSearchTip()) {
            googleSearchTip = (
                <div>
                    <div className="operationTip">
                        <span className="kbd">ENTER</span>
                        <span> to search on the Internet</span>
                    </div>
                </div>
            );
        }

        let googleSearchSuggest = null;
        if (this.showGoogleSuggest()) {
            googleSearchSuggest = (
                <div>
                    <TabTreeView
                        onTabItemSelected={this.onTabItemSelected}
                        selectedTabId={this.state.selectedTab.id}
                        rootNode={this.state.googleSuggestRootNode}
                        onContainerClick={this.onContainerClick}
                        keyword={this.state.keyword}
                    />
                </div>
            );
        }

        return (
            <div className="outContainer">
                <Input
                    onChange={this.onSearchTextChanged}
                    onCompositionStart={this.searchInputCompositionStart}
                    onCompositionEnd={this.searchInputCompositionEnd}
                    ref={this.searchFieldRef}
                    placeholder={inputPlaceholder}
                />
                <div className="tabTreeViewContainer" ref={this.selfRef}>
                    <TabTreeView
                        onTabItemSelected={this.onTabItemSelected}
                        selectedTabId={this.state.selectedTab.id}
                        rootNode={this.state.rootNode}
                        keyword={this.state.keyword}
                        onContainerClick={this.onContainerClick}
                        onClosedButtonClick={this.onCloseAllTabs}
                    />
                    {googleSearchSuggest}
                    {googleSearchTip}
                </div>
            </div>
        );
    }
}
