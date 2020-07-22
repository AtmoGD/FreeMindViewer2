namespace FreeMindViewer {

  interface URLObject {
    code: string;
    state: string;
    path: string;
    map: string;
    list: string;
  }
  window.addEventListener("load", init);

  let params: URLObject;

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let focusedNode: FMVNode | null;

  export let loginButton: HTMLButtonElement;
  export let loginSpan: HTMLSpanElement;

  export let rootNodeX: number;
  export let rootNodeY: number;
  let states: Element[] = [];
  let mindmapData: XMLDocument;
  let docNode: Element; // document node is the first node in a xml file
  let rootNode: Element; // first actual node of the mindmap
  let root: FMVRootNode;
  let fmvNodes: FMVNode[];

  let activeTextField: HTMLInputElement = null;

  function init(): void {
    fmvNodes = [];

    params = getUrlSearchJson();

    if (getCookie("at"))
      login();
    else if (params.code && params.state)
      fetchAccesstokenAndLogin(params.code, params.state);

    if (params.path == undefined || params.path == "") {
      params.path = "./mm";
      params.map = "README.mm";
      params.list = "false";
    }

    fetchXML();

    window.addEventListener("resize", resizecanvas, false);
    loginButton = document.querySelector("#loginOutbutton");
    loginSpan = document.querySelector("#userName");
    loginButton.addEventListener("click", authorize);
    document.querySelector("#fetchFileButton").addEventListener("click", fetchFile);
    document.querySelector("#saveFileButton").addEventListener("click", uploadFile);
  }

  function uploadFile(): void {
    saveFile(XMLToString(mindmapData));
  }

  function XMLToString(_data: XMLDocument): string {
    return new XMLSerializer().serializeToString(_data.documentElement);
  }

  async function loadData(): Promise<void> {
    docNode = mindmapData.documentElement;
    rootNode = docNode.firstElementChild;
    if (params.list == "true") {
      //createList();
    } else if (params.list == "false" || !params.list) {
      createCanvas();
      createMindmap();

      // Little hack -> change side 2 times so every node has a POSITION attribute
      root.children.forEach(child => {
        child.changeSide();
        child.changeSide();
      })
    }
  }

  export async function fetchXML(_path?: string): Promise<void> {
    let response: Response | null = null;
    if (_path)
      response = await fetch(_path);
    else
      response = await fetch(params.path + "/" + params.map);

    const xmlText: string = await response.text();
    mindmapData = StringToXML(xmlText); // Save xml in letiable

    loadData();

    saveState();
  }

  // parses a string to XML
  function StringToXML(xString: string): XMLDocument {
    return new DOMParser().parseFromString(xString, "text/xml");
  }

  function createCanvas(): void {

    canvas = document.getElementsByTagName("canvas")[0];
    canvas.setAttribute("height", "window.innerHeight");
    canvas.setAttribute("width", "window.innerWidth");

    ctx = <CanvasRenderingContext2D>canvas.getContext("2d");

    // match Canvas dimensions to browser window
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    // determine the center of the canvas
    rootNodeX = ctx.canvas.width / 2;
    rootNodeY = ctx.canvas.height / 2;

    // Eventlistener for draggable canvas
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", keyboardInput);
  }

  function resizecanvas(): void {
    createCanvas();

    root.drawFMVNode();
  }

  function createMindmap(): void {

    clearMap();
    mindmapData = createXMLFile();
    fmvNodes.length = 0;

    // create root FMVNode
    root = new FMVRootNode(
      ctx,
      rootNode.getAttribute("TEXT")
    );
    fmvNodes.push(root);

    // Use root FMVNode as starting point and create all subFMVNodes
    createFMVNodes(rootNode, root);
    root.calculateVisibleChildren();
    root.setPosition(0);
    root.drawFMVNode();
  }

  function createFMVNodes(rootNode: Element, parentFMVNode: FMVNode): void {
    // only continue if current root has children
    if (rootNode.hasChildNodes()) {
      let children: Element[] = getChildElements(rootNode);
      // FMVNodes array used for sibling relations
      let childFMVNodes: FMVNode[] = new Array();

      for (let i: number = 0; i < children.length; i++) {
        // use only children with rootNode as parent
        if (children[i].parentElement == rootNode) {
          let fmvNodeContent: string = children[i].getAttribute("TEXT");
          let fmvNodeMapPosition: string = children[i].getAttribute("POSITION");

          if (fmvNodeMapPosition == null) {
            fmvNodeMapPosition = parentFMVNode.mapPosition;
          }

          let fmvNodeFolded: string = children[i].getAttribute("FOLDED");
          let fmvNodeFoldedBool: boolean = fmvNodeFolded == "true" ? true : false;
          let fmvNode: FMVNode = new FMVNode(
            parentFMVNode,
            ctx,
            fmvNodeContent,
            fmvNodeMapPosition,
            fmvNodeFoldedBool
          );
          fmvNode.node = children[i];
          childFMVNodes.push(fmvNode);
          fmvNodes.push(fmvNode);
          parentFMVNode.children = childFMVNodes;

          // do it all again for all the children of rootNode
          createFMVNodes(children[i], fmvNode);
        }
      }
    } else {
      return;
    }
  }

  function getChildElements(parent: Element): Element[] {
    let childElementsCollection: HTMLCollectionOf<Element>;
    let childElements: Element[] = new Array();
    // get all children of parent as Element collection. Gets ALL children!
    childElementsCollection = parent.getElementsByTagName("node");
    for (let i: number = 0; i < childElementsCollection.length; i++) {
      if (childElementsCollection[i].parentElement == parent) {
        // save only the children with correct parent element
        childElements.push(childElementsCollection[i]);
      }

    }
    return childElements;
  }

  function redrawWithoutChildren(): void {
    clearMap();
    root.setPosition(0);
    root.drawFMVNode();
  }

  function keyboardInput(_event: KeyboardEvent): void {
    // console.log(_event);

    switch (_event.code) {
      case "Space":
        if (document.activeElement.nodeName.toLowerCase() != "input") {
          // prevent default spacebar event (scrolling to bottom)
          _event.preventDefault();
          rootNodeX = canvas.width / 2;
          rootNodeY = canvas.height / 2;
          redrawWithoutChildren();
        }
        break;
      case "F2":
        createTextFieldOnNode();
        break;
      case "ArrowUp":
        if (_event.ctrlKey)
          changeOrder(1);
        else
          focusSibling(-1);
        break;
      case "ArrowDown":
        if (_event.ctrlKey)
          changeOrder(-1);
        else
          focusSibling(1);
        break;
      case "ArrowLeft":
        if (_event.ctrlKey)
          setParent(-1);
        else
          focusParent(-1);
        break;
      case "ArrowRight":
        if (_event.ctrlKey)
          setParent(1);
        else
          focusParent(1);
        break;
      case "Enter":
        if (activeTextField)
          activeTextField.blur();
        else
          createNewNode();
        break;
      case "Delete":
        deleteNode();
        break;
      case "Escape":
        if (activeTextField) {
          activeTextField.value = focusedNode.content;
          activeTextField.blur();
        } else {
          focusNode(null);
        }
        break;
      case "KeyY":
        if (_event.ctrlKey)
          loadState();
        break;
    }
  }

  function saveState(): void {
    states.push(<Element>rootNode.cloneNode(true));

    if (states.length >= 10)
      states.shift();
  }

  function loadState(): void {
    if (states.length <= 0)
      return;

    rootNode = states.pop();
    mindmapData = createXMLFile();
    createMindmap();
    redrawWithoutChildren();
  }

  function createXMLFile(): XMLDocument {
    let doc: XMLDocument = document.implementation.createDocument(null, "node", null);
    doc.documentElement.appendChild(rootNode);
    return doc;
  }

  function changeOrder(_dir: number): void {
    // if (!focusedNode)
    //   return;

    // console.log("Here");
  }

  function setParent(_dir: number): void {
    // if (!focusedNode || focusedNode.mapPosition == "root")
    //   return;

    // let node: FMVNode = focusedNode;

    // if (node.mapPosition == "left") {
    //   if (_dir < 0) {
    //     if (node.children.length > 0) {
    //       node.children.forEach(child => {
    //         changeParent(child, node.parent);
    //       })
    //     }
    //   } else {
    //     if (node.parent === root)
    //       node.changeSide();
    //     else
    //       changeParent(node, node.parent.parent);
    //   }
    // } else {
    //   if (_dir > 0) {
    //     if (node.children.length > 0) {
    //       node.children.forEach(child => {
    //         changeParent(child, node.parent);
    //       })
    //     }
    //   } else {
    //     if (node.parent === root)
    //       node.changeSide();
    //     else
    //       changeParent(node, node.parent.parent);
    //   }
    // }
  }

  function deleteNode(): void {
    if (!focusedNode)
      return;

    if (focusedNode.parent === root)
      rootNode.removeChild(focusedNode.node);
    else
      focusedNode.parent.node.removeChild(focusedNode.node);

    createMindmap();
  }

  function createNewNode(): void {
    let parent: FMVNode = focusedNode ? focusedNode : root;

    let newNode: Element = document.createElement("node");
    if (parent === root)
      rootNode.appendChild(newNode);
    else
      parent.node.appendChild(newNode);

    let newFMVNode: FMVNode = new FMVNode(parent, ctx, "new Node", parent.mapPosition == "root" ? "left" : parent.mapPosition, false);
    newFMVNode.node = newNode;
    newFMVNode.node.setAttribute("TEXT", "new Node");
    newFMVNode.node.setAttribute("POSITION", parent.mapPosition == "root" ? "left" : parent.mapPosition);

    newFMVNode.parent = parent;
    parent.children.push(newFMVNode);

    root.calculateVisibleChildren();
    root.setPosition(0);

    createMindmap();
    redrawWithoutChildren();

    focusNode(newFMVNode);
    createTextFieldOnNode();
  }

  function onMouseDown(_event: MouseEvent): void {
    for (let i: number = 0; i < fmvNodes.length; i++) {
      if (fmvNodes[i].pfadrect) {
        if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
          focusNode(fmvNodes[i]);
          return;
        }
      }
    }
    focusNode(null);
  }

  function onMouseUp(_event: MouseEvent): void {
    if (!focusedNode) return;

    for (let i: number = 0; i < fmvNodes.length; i++) {
      if (fmvNodes[i].pfadrect) {
        if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
          if (fmvNodes[i] != focusedNode && activeTextField == null) {
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

  function onPointerMove(_event: MouseEvent): void {
    if (_event.buttons == 1 && focusedNode == null) {
      rootNodeY += _event.movementY;
      rootNodeX += _event.movementX;
      redrawWithoutChildren();
    }
  }

  function changeParent(_of: FMVNode, _to: FMVNode): void {
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

    focusNode(_of);
    redrawWithoutChildren();

    saveState();
  }

  function focusParent(_dir: number) {
    if (!focusedNode)
      return;


    if (focusedNode === root) {
      root.children.forEach(el => {
        if (el.mapPosition == (_dir > 0 ? "right" : "left"))
          focusNode(el);
      })
      return;
    }

    _dir = focusedNode.mapPosition == "right" ? _dir : -_dir;

    if (_dir < 0) {
      if (focusedNode.parent)
        focusNode(focusedNode.parent);
    } else {
      if (focusedNode.children.length > 0)
        focusNode(focusedNode.children[0]);
    }
  }

  function focusSibling(_dir: number): void {
    if (!focusedNode)
      return;

    for (let i: number = 0; i < focusedNode.parent.children.length; i++) {
      if (focusedNode.parent.children[i] === focusedNode) {
        if (_dir < 0) {
          focusNode(focusedNode.parent.children[(i == 0 ? focusedNode.parent.children.length - 1 : i - 1)]);
          return;
        } else {
          focusNode(focusedNode.parent.children[(i == focusedNode.parent.children.length - 1 ? 0 : i + 1)]);
          return;
        }
      }
    }
  }

  function focusNode(_node: FMVNode): void {
    if (focusedNode)
      focusedNode.strokeStile = "black";

    focusedNode = _node;

    if (focusedNode)
      focusedNode.strokeStile = "blue";
    redrawWithoutChildren();
  }

  function createTextFieldOnNode(): void {
    if (!focusedNode)
      return;

    let textField: HTMLInputElement = document.createElement("input");
    textField.style.position = "fixed";

    if (focusedNode.mapPosition == "left")
      textField.style.left = (focusedNode.posX - ctx.measureText(focusedNode.content).width) + "px";
    else
      textField.style.left = focusedNode.posX + "px";

    textField.style.top = focusedNode.posY - (focusedNode.childHight / 2) + "px";
    textField.style.zIndex = "5";
    document.querySelector("#canvasContainer").appendChild(textField);
    textField.focus();

    activeTextField = textField;

    let node: FMVNode = focusedNode;
    textField.onblur = () => {
      updateNode(node);
    }

    function updateNode(_node: FMVNode): void {
      if (textField.value != "")
        _node.node.setAttribute("TEXT", textField.value);

      activeTextField = null;
      textField.remove();

      mindmapData = createXMLFile();
      createMindmap();

      focusNode(_node);

      saveState();
    }
  }

  function clearMap(): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clears the canvas
  }

  function getUrlSearchJson(): URLObject {
    try {
      let j: string = decodeURI(location.search);
      j = j
        .substring(1)
        .split("&")
        .join("\",\"")
        .split("=")
        .join("\":\"");
      return JSON.parse("{\"" + j + "\"}");
    } catch (_e) {
      console.log("Error in URL-Parameters: " + _e);
      return JSON.parse("{}");
    }
  }
}