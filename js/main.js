var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var FreeMindViewer;
(function (FreeMindViewer) {
    window.addEventListener("load", init);
    let params;
    let canvas;
    let ctx;
    let focusedNode;
    let mindmapData;
    let docNode; // document node is the first node in a xml file
    let rootNode; // first actual node of the mindmap
    let root;
    let fmvNodes;
    function init() {
        fmvNodes = [];
        params = getUrlSearchJson();
        if (FreeMindViewer.getCookie("at"))
            FreeMindViewer.login();
        else if (params.code && params.state)
            FreeMindViewer.fetchAccesstokenAndLogin(params.code, params.state);
        if (params.path == undefined || params.path == "") {
            params.path = "./mm";
            params.map = "README.mm";
            params.list = "false";
        }
        fetchXML();
        window.addEventListener("resize", resizecanvas, false);
        FreeMindViewer.loginButton = document.querySelector("#loginOutbutton");
        FreeMindViewer.loginSpan = document.querySelector("#userName");
        FreeMindViewer.loginButton.addEventListener("click", FreeMindViewer.authorize);
        document.querySelector("#fetchFileButton").addEventListener("click", FreeMindViewer.fetchFile);
        document.querySelector("#saveFileButton").addEventListener("click", uploadFile);
    }
    function uploadFile() {
        FreeMindViewer.saveFile(XMLToString(mindmapData));
    }
    function XMLToString(_data) {
        return new XMLSerializer().serializeToString(_data.documentElement);
    }
    function loadData() {
        return __awaiter(this, void 0, void 0, function* () {
            docNode = mindmapData.documentElement;
            rootNode = docNode.firstElementChild;
            if (params.list == "true") {
                //createList();
            }
            else if (params.list == "false" || !params.list) {
                createCanvas();
                createMindmap();
                console.log(rootNode);
                root.children.forEach(child => {
                    child.changeSide();
                    child.changeSide();
                });
                console.log(rootNode);
            }
        });
    }
    function fetchXML(_path) {
        return __awaiter(this, void 0, void 0, function* () {
            let response = null;
            if (_path)
                response = yield fetch(_path);
            else
                response = yield fetch(params.path + "/" + params.map);
            const xmlText = yield response.text();
            mindmapData = StringToXML(xmlText); // Save xml in letiable
            loadData();
        });
    }
    FreeMindViewer.fetchXML = fetchXML;
    // parses a string to XML
    function StringToXML(xString) {
        return new DOMParser().parseFromString(xString, "text/xml");
    }
    function createCanvas() {
        canvas = document.getElementsByTagName("canvas")[0];
        canvas.setAttribute("height", "window.innerHeight");
        canvas.setAttribute("width", "window.innerWidth");
        ctx = canvas.getContext("2d");
        // match Canvas dimensions to browser window
        ctx.canvas.width = window.innerWidth;
        ctx.canvas.height = window.innerHeight;
        // determine the center of the canvas
        FreeMindViewer.rootNodeX = ctx.canvas.width / 2;
        FreeMindViewer.rootNodeY = ctx.canvas.height / 2;
        // Eventlistener for draggable canvas
        canvas.addEventListener("mousemove", onPointerMove);
        canvas.addEventListener("mousedown", onMouseDown);
        canvas.addEventListener("mouseup", onMouseUp);
        window.addEventListener("keydown", keyboardInput);
    }
    function resizecanvas() {
        createCanvas();
        root.drawFMVNode();
    }
    function createMindmap() {
        clearMap();
        mindmapData = createXMLFile();
        fmvNodes.length = 0;
        // create root FMVNode
        root = new FreeMindViewer.FMVRootNode(ctx, rootNode.getAttribute("TEXT"));
        fmvNodes.push(root);
        // Use root FMVNode as starting point and create all subFMVNodes
        createFMVNodes(rootNode, root);
        root.calculateVisibleChildren();
        root.setPosition(0);
        root.drawFMVNode();
    }
    function createFMVNodes(rootNode, parentFMVNode) {
        // only continue if current root has children
        if (rootNode.hasChildNodes()) {
            let children = getChildElements(rootNode);
            // FMVNodes array used for sibling relations
            let childFMVNodes = new Array();
            for (let i = 0; i < children.length; i++) {
                // use only children with rootNode as parent
                if (children[i].parentElement == rootNode) {
                    let fmvNodeContent = children[i].getAttribute("TEXT");
                    let fmvNodeMapPosition = children[i].getAttribute("POSITION");
                    if (fmvNodeMapPosition == null) {
                        fmvNodeMapPosition = parentFMVNode.mapPosition;
                    }
                    let fmvNodeFolded = children[i].getAttribute("FOLDED");
                    let fmvNodeFoldedBool = fmvNodeFolded == "true" ? true : false;
                    let fmvNode = new FreeMindViewer.FMVNode(parentFMVNode, ctx, fmvNodeContent, fmvNodeMapPosition, fmvNodeFoldedBool);
                    fmvNode.node = children[i];
                    childFMVNodes.push(fmvNode);
                    fmvNodes.push(fmvNode);
                    parentFMVNode.children = childFMVNodes;
                    // do it all again for all the children of rootNode
                    createFMVNodes(children[i], fmvNode);
                }
            }
        }
        else {
            return;
        }
    }
    function getChildElements(parent) {
        let childElementsCollection;
        let childElements = new Array();
        // get all children of parent as Element collection. Gets ALL children!
        childElementsCollection = parent.getElementsByTagName("node");
        for (let i = 0; i < childElementsCollection.length; i++) {
            if (childElementsCollection[i].parentElement == parent) {
                // save only the children with correct parent element
                childElements.push(childElementsCollection[i]);
            }
        }
        return childElements;
    }
    function redrawWithoutChildren() {
        clearMap();
        root.setPosition(0);
        root.drawFMVNode();
    }
    function keyboardInput(_event) {
        console.log(_event);
        switch (_event.code) {
            case "Space":
                if (document.activeElement.nodeName.toLowerCase() != "input") {
                    // prevent default spacebar event (scrolling to bottom)
                    _event.preventDefault();
                    FreeMindViewer.rootNodeX = canvas.width / 2;
                    FreeMindViewer.rootNodeY = canvas.height / 2;
                    redrawWithoutChildren();
                }
                break;
            case "F2":
                createTextFieldOnNode();
                break;
            case "ArrowUp":
                focusSibling(-1);
                break;
            case "ArrowDown":
                focusSibling(1);
                break;
            case "ArrowLeft":
                focusParent(-1);
                break;
            case "ArrowRight":
                focusParent(1);
                break;
            case "Enter":
                createNewNode();
                break;
            case "Delete":
                deleteNode();
                break;
        }
    }
    function createXMLFile() {
        let doc = document.implementation.createDocument(null, "node", null);
        doc.documentElement.appendChild(rootNode);
        return doc;
    }
    function deleteNode() {
        if (!focusedNode)
            return;
        if (focusedNode.parent === root)
            rootNode.removeChild(focusedNode.node);
        else
            focusedNode.parent.node.removeChild(focusedNode.node);
        createMindmap();
    }
    function createNewNode() {
        let parent = focusedNode ? focusedNode : root;
        let newNode = document.createElement("node");
        if (parent === root)
            rootNode.appendChild(newNode);
        else
            parent.node.appendChild(newNode);
        let newFMVNode = new FreeMindViewer.FMVNode(parent, ctx, "new Node", parent.mapPosition == "root" ? "left" : parent.mapPosition, false);
        newFMVNode.node = newNode;
        newFMVNode.node.setAttribute("TEXT", "");
        newFMVNode.node.setAttribute("POSITION", parent.mapPosition == "root" ? "left" : parent.mapPosition);
        parent.children.push(newFMVNode);
        createMindmap();
        focusNode(newFMVNode);
        createTextFieldOnNode();
    }
    function onMouseDown(_event) {
        for (let i = 0; i < fmvNodes.length; i++) {
            if (fmvNodes[i].pfadrect) {
                if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
                    focusNode(fmvNodes[i]);
                    return;
                }
            }
        }
        focusNode(null);
    }
    function onMouseUp(_event) {
        if (!focusedNode)
            return;
        for (let i = 0; i < fmvNodes.length; i++) {
            if (fmvNodes[i].pfadrect) {
                if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
                    if (fmvNodes[i] != focusedNode) {
                        changeParent(focusedNode, fmvNodes[i]);
                        if (fmvNodes[i] === root) {
                            focusedNode.changeSide();
                            root.setPosition(0);
                        }
                        redrawWithoutChildren();
                        return;
                    }
                }
            }
        }
    }
    function onPointerMove(_event) {
        if (_event.buttons == 1 && focusedNode == null) {
            FreeMindViewer.rootNodeY += _event.movementY;
            FreeMindViewer.rootNodeX += _event.movementX;
            redrawWithoutChildren();
        }
    }
    function changeParent(_of, _to) {
        if (_of.node.contains(_to.node))
            return;
        if (_to === root) {
            _of.changeSide();
            rootNode.appendChild(_of.node);
        }
        else
            _to.node.appendChild(_of.node);
        mindmapData = createXMLFile();
        createMindmap();
    }
    function focusParent(_dir) {
        if (!focusedNode)
            return;
        _dir = focusedNode.mapPosition == "right" ? _dir : -_dir;
        if (_dir < 0) {
            if (focusedNode.parent)
                focusNode(focusedNode.parent);
        }
        else {
            if (focusedNode.children.length > 0)
                focusNode(focusedNode.children[0]);
        }
    }
    function focusSibling(_dir) {
        if (!focusedNode)
            return;
        for (let i = 0; i < focusedNode.parent.children.length; i++) {
            if (focusedNode.parent.children[i] === focusedNode) {
                if (_dir < 0) {
                    if (i == 0)
                        return;
                    focusNode(focusedNode.parent.children[i - 1]);
                    return;
                }
                else {
                    if (i == focusedNode.parent.children.length - 1)
                        return;
                    focusNode(focusedNode.parent.children[i + 1]);
                    return;
                }
            }
        }
    }
    function focusNode(_node) {
        if (focusedNode)
            focusedNode.strokeStile = "black";
        focusedNode = _node;
        if (focusedNode)
            focusedNode.strokeStile = "blue";
        redrawWithoutChildren();
    }
    function createTextFieldOnNode() {
        if (!focusedNode)
            return;
        let textField = document.createElement("input");
        textField.style.position = "fixed";
        textField.style.left = focusedNode.posX + "px";
        textField.style.top = focusedNode.posY - (focusedNode.childHight / 2) + "px";
        textField.style.zIndex = "5";
        document.querySelector("#canvasContainer").appendChild(textField);
        textField.focus();
        let node = focusedNode;
        textField.onblur = () => {
            updateNode(node);
        };
        function updateNode(_node) {
            if (textField.value != "")
                _node.node.setAttribute("TEXT", textField.value);
            textField.remove();
            mindmapData = createXMLFile();
            createMindmap();
        }
    }
    function clearMap() {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clears the canvas
    }
    function getUrlSearchJson() {
        try {
            let j = decodeURI(location.search);
            j = j
                .substring(1)
                .split("&")
                .join("\",\"")
                .split("=")
                .join("\":\"");
            return JSON.parse("{\"" + j + "\"}");
        }
        catch (_e) {
            console.log("Error in URL-Parameters: " + _e);
            return JSON.parse("{}");
        }
    }
})(FreeMindViewer || (FreeMindViewer = {}));
//# sourceMappingURL=main.js.map