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
  //let body: HTMLBodyElement = document.getElementsByTagName("body")[0];
  //let list: HTMLElement;
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let focusedNode: FMVNode | null;

  export let loginButton: HTMLButtonElement;
  export let loginSpan: HTMLSpanElement;
  //let ishidden: boolean = true; // canvas sichtbar bei false

  export let rootNodeX: number;
  export let rootNodeY: number;
  let mindmapData: XMLDocument;
  let docNode: Element; // document node is the first node in a xml file
  let rootNode: Element; // first actual node of the mindmap
  let root: FMVRootNode;
  let fmvNodes: FMVNode[];
  let hasMouseBeenMoved: boolean = false;

  //let url: string;

  function init(): void {
    fmvNodes = [];

    params = getUrlSearchJson();

    if (getCookie("at"))
      login();
    else if (params.code && params.state)
      fetchAccesstokenAndLogin(params.code, params.state);

    if (params.list == undefined) {
      params.list = "false";
    }
    if (params.path == undefined || params.path == "") {
      params.path = "./mm";
      params.map = "README.mm";
      params.list = "false";
    }
    //url = params.path + "/" + params.map;

    fetchXML();

    // fetchXML().then(() => {
    //   docNode = mindmapData.documentElement;
    //   rootNode = docNode.firstElementChild;
    //   if (params.list == "true") {
    //     //createList();
    //   } else if (params.list == "false" || !params.list) {
    //     createCanvas();
    //     createMindmap();
    //   }
    // });
    //document.getElementById('hideit').addEventListener('click', toggleHide);
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
  }

  // parses a string to XML
  function StringToXML(xString: string): XMLDocument {
    return new DOMParser().parseFromString(xString, "text/xml");
  }

  function createCanvas(): void {

    canvas = document.getElementsByTagName("canvas")[0];
    /* canvas = document.createElement("canvas");
    canvas.id = "fmcanvas"; */
    canvas.setAttribute("height", "window.innerHeight");
    canvas.setAttribute("width", "window.innerWidth");
    //body.appendChild(canvas);

    ctx = <CanvasRenderingContext2D>canvas.getContext("2d");


    // match Canvas dimensions to browser window
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    // determine the center of the canvas
    rootNodeX = ctx.canvas.width / 2;
    rootNodeY = ctx.canvas.height / 2;

    // Eventlistener for draggable canvas
    //canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", keyboardInput);
    // canvas.addEventListener("touchstart", handleStart, false);
    // canvas.addEventListener("touchend", handleEnd, false);
    // canvas.addEventListener("touchcancel", handleCancel, false);
    // canvas.addEventListener("touchmove", handleMove, false);
    //  canvas.addEventListener("touchend",)
  }

  function resizecanvas(): void {
    createCanvas();

    root.drawFMVNode();
  }

  function createMindmap(): void {
    clearMap();
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
  /*  function createNewEntry(_x: number, _y: number) {
 
     for (let i: number; i < fmvNodes.length; i++) {
       console.log(fmvNodes[i].pfadrect);
       if (ctx.isPointInPath(fmvNodes[i].pfadrect, _x, _y)) {
         console.log("new entry possible");
       }
     }
   } */

  function keyboardInput(_event: KeyboardEvent): void {
    //console.log(_event.keyCode);

    console.log(_event);

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
        if (focusedNode)
          createTextFieldOnNode();
        break;
      case "ArrowUp":
        if (focusedNode)
          focusSibling(-1);
        break;
      case "ArrowDown":
        if (focusedNode)
          focusSibling(1);
        break;
      case "ArrowLeft":
        if (focusedNode)
          focusParent(-1);
        break;
      case "ArrowRight":
        if (focusedNode)
          focusParent(1);
        break;
      case "Enter":
        createNewNode();
        break;
    }
  }

  function createNewNode(): void {
    let parent: FMVNode = focusedNode ? focusedNode : root;
    let xmlParent: Element = mindmapData.getElementById(parent.node.getAttribute("ID"));
    console.log(xmlParent);
    let xmlNode: Element = mindmapData.createElement("NODE");
    xmlNode.setAttribute("TEXT", "New Node");
    xmlParent.appendChild(xmlNode);
    // let newNode: FMVNode = new FMVNode(parent, ctx, "", parent.mapPosition == "root" ? "left" : parent.mapPosition, false);
    // parent.children.push(newNode);
    redrawWithoutChildren();
  }
  function onMouseDown(_event: MouseEvent): void {
    hasMouseBeenMoved = false;

    for (let i: number = 0; i < fmvNodes.length; i++) {
      if (fmvNodes[i].pfadrect) {
        if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {
          focusNode(fmvNodes[i]);
          return;
          // fmvNodes[i].folded = !fmvNodes[i].folded;
          // redrawWithoutChildren();
        }
      }
    }

    focusNode(null);


    // if (focusedNode)
    //   return;

    // let focused: boolean = false;
    // for (let i: number = 0; i < fmvNodes.length; i++) {
    //   if (fmvNodes[i].pfadrect) {
    //     if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY - fmvNodes[i].childHight)) {
    //       console.log("here");
    //       focusNode(fmvNodes[i]);
    //       focused = true;
    //     }
    //   }
    // }

    // if (!focused)
    //   focusNode(null);

    // redrawWithoutChildren();
  }


  function onMouseUp(_event: MouseEvent): void {
    // if (hasMouseBeenMoved) {
    //   return;
    // }

    // focusNode(null);

    if (!focusedNode) return;

    for (let i: number = 0; i < fmvNodes.length; i++) {
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
          // fmvNodes[i].folded = !fmvNodes[i].folded;
          // redrawWithoutChildren();
        }
      }
    }


    // if (!focused)
    //   focusNode(null);

    // if (ctx.isPointInPath(root.pfadrect, _event.clientX, _event.clientY - (root.childHight * 2))) {
    //   // root.hiddenFoldedValue = !root.hiddenFoldedValue;
    //   // let newFold: boolean = root.hiddenFoldedValue;
    //   focusNode(root);
    //   focused = true;
    //   // for (let i: number = 1; i < fmvNodes.length; i++) {
    //   //   fmvNodes[i].folded = newFold;
    //   // }

    // } else {
    //   for (let i: number = 0; i < fmvNodes.length; i++) {
    //     if (fmvNodes[i].pfadrect) {
    //       if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY - (fmvNodes[i].childHight * 2))) {
    //         focusNode(fmvNodes[i]);
    //         focused = true;
    //         // fmvNodes[i].folded = !fmvNodes[i].folded;
    //         redrawWithoutChildren();
    //       }
    //     }
    //   }
    // }

    // if (!focused)
    //   focusNode(null);

    // root.folded = false;
    // root.calculateVisibleChildren();

  }

  function onPointerMove(_event: MouseEvent): void {
    hasMouseBeenMoved = true;

    if (_event.buttons == 1 && focusedNode == null) {
      rootNodeY += _event.movementY;
      rootNodeX += _event.movementX;
      redrawWithoutChildren();
    }
  }

  function changeParent(_from: FMVNode, _to: FMVNode): void {
    for (let i: number = 0; i < _from.parent.children.length; i++) {
      if (_from.parent.children[i] === _from)
        _from.parent.children.splice(i, 1);
    }

    _from.parent = _to;
    _to.children.push(_from);
    redrawWithoutChildren();
  }

  function focusParent(_dir: number) {
    if (!focusedNode)
      return;

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
          if (i == 0)
            return;

          focusNode(focusedNode.parent.children[i - 1]);
          return;
        } else {
          if (i == focusedNode.parent.children.length - 1)
            return;

          focusNode(focusedNode.parent.children[i + 1]);
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
    textField.style.left = focusedNode.posX + "px";
    textField.style.top = focusedNode.posY - (focusedNode.childHight / 2) + "px";
    document.querySelector("#canvasContainer").appendChild(textField);
    textField.focus();
    let node: FMVNode = focusedNode;
    textField.onblur = () => {
      updateNode(node);
    }

    function updateNode(_node: FMVNode): void {
      _node.node.setAttribute("TEXT", textField.value);
      _node.content = textField.value;
      textField.remove();
      redrawWithoutChildren();
    }
  }

  //<----------------------------------------------------------------------Variablen mitten im Code------------------------------------------------------>
  // let ongoingTouches: any[] = [];


  // let cordX: number;
  // let cordY: number;
  // //<----------------------------------------------------------------------Variablen mitten im Code------------------------------------------------------>
  // function handleStart(_event: TouchEvent): void {
  //   _event.preventDefault();
  //   console.log(" touchstart");
  //   let theTouchlist: TouchList = _event.touches;

  //   for (let i: number = 0; i < theTouchlist.length; i++) {
  //     console.log("touchstart:" + i + "...");
  //     ongoingTouches.push(copyTouch(theTouchlist[i]));
  //     cordX = theTouchlist[i].clientX;
  //     cordY = theTouchlist[i].clientY;
  //     console.log("touchstart:" + i + ".");
  //   }
  // }
  // function handleMove(_event: TouchEvent): void {
  //   let touches: TouchList = _event.changedTouches;
  //   console.log(touches.length);
  //   for (let i: number = 0; i < touches.length; i++) {
  //     let idx: number = ongoingTouchIndexById(touches[i].identifier);
  //     console.log(idx + " idx");
  //     let deltaX: number;
  //     let deltaY: number;

  //     let xStrich: number = touches[i].clientX;
  //     let yStrich: number = touches[i].clientY;
  //     deltaX = xStrich - cordX;
  //     deltaY = yStrich - cordY;
  //     rootNodeX += deltaX;
  //     rootNodeY += deltaY;

  //     console.log(deltaX, deltaY, cordX, cordY, xStrich, yStrich);
  //     cordX = xStrich;
  //     cordY = yStrich;
  //     redrawWithoutChildren();


  //     if (idx >= 0) {
  //       ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record

  //     } else {
  //       console.log("can't figure out which touch to continue");
  //     }
  //   }

  // }

  // function handleEnd(_event: TouchEvent): void {
  //   _event.preventDefault();
  //   let theTouchlist: TouchList = _event.changedTouches;
  //   for (var i: number = 0; i < theTouchlist.length; i++) {

  //     var idx: number = ongoingTouchIndexById(theTouchlist[i].identifier);

  //     if (idx >= 0) {
  //       console.log(" end of touch");

  //       ongoingTouches.splice(idx, 1);  // remove it; we're done

  //     } else {
  //       console.log("can't figure out which touch to end");
  //     }

  //   }
  // }
  // function handleCancel(_event: TouchEvent): void {
  //   _event.preventDefault();
  //   console.log("touchcancel.");
  //   let touches: TouchList = _event.changedTouches;

  //   for (var i: number = 0; i < touches.length; i++) {
  //     var idx: number = ongoingTouchIndexById(touches[i].identifier);
  //     ongoingTouches.splice(idx, 1);  // remove it; we're done

  //   }
  // }
  // function copyTouch(touch: Touch): {} {
  //   return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
  // }
  function clearMap(): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clears the canvas
  }
  // function ongoingTouchIndexById(idToFind: any): number {
  //   for (let i: number = 0; i < ongoingTouches.length; i++) {
  //     let id: any = ongoingTouches[i].identifier;
  //     console.log(id + " id");
  //     if (id == idToFind) {
  //       return i;
  //     }
  //   }
  //   return -1;    // not found
  // }

  // parses URL parameters to object
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