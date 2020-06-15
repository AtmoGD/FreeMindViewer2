namespace Freemindtesting {

  interface URLObject {
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
    if (params.list == undefined) {
      params.list = "false";
    }
    if (params.path == undefined || params.path == "") {
      params.path = "/mm";
      params.map = "README.mm";
      params.list = "false";
    }
    //url = params.path + "/" + params.map;
    
    fetchXML().then(() => {
      docNode = mindmapData.documentElement;
      rootNode = docNode.firstElementChild;
      if (params.list == "true") {
        //createList();
        //<----------------------------------------------------------------------Hier wird nichts gemacht------------------------------------------------------>
      } else if (params.list == "false" || !params.list) {
        
        createCanvas();
        createMindmap();
        
      }
    });
    //document.getElementById('hideit').addEventListener('click', toggleHide);
    window.addEventListener("resize", resizecanvas, false);
  }

  async function fetchXML(): Promise<void> {
    const response: Response = await fetch(params.path + "/" + params.map);
    
    const xmlText: string = await response.text();
    mindmapData = StringToXML(xmlText); // Save xml in letiable
  }
  
  // parses a string to XML
  function StringToXML(xString: string): XMLDocument {
    return new DOMParser().parseFromString(xString, "text/xml");
  }
  
  function createCanvas(): void {
    
    //<----------------------------------------------------------------------querySelector------------------------------------------------------>
    canvas = document.getElementsByTagName("canvas")[0];
    /* canvas = document.createElement("canvas");
    canvas.id = "fmcanvas"; */
    //<----------------------------------------------------------------------Doppelt??? (Zeile 91 & 92)------------------------------------------------------>
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
    //<----------------------------------------------------------------------Funktion------------------------------------------------------>
    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", keyboardInput);
    canvas.addEventListener("touchstart", handleStart, false);
    canvas.addEventListener("touchend", handleEnd, false);
    canvas.addEventListener("touchcancel", handleCancel, false);
    canvas.addEventListener("touchmove", handleMove, false);
    //<----------------------------------------------------------------------Funktion------------------------------------------------------>
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
      //<----------------------------------------------------------------------Komma weg------------------------------------------------------>
      rootNode.getAttribute("TEXT"),
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
        //<----------------------------------------------------------------------Wurde in "getChildElements" schon abgefragt------------------------------------------------------>
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
    //<----------------------------------------------------------------------Es werden durch ALLE Elemente iteriert------------------------------------------------------>
    for (let i: number = 0; i < childElementsCollection.length; i++) {
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
  /*  function createNewEntry(_x: number, _y: number) {
 
     for (let i: number; i < fmvNodes.length; i++) {
       console.log(fmvNodes[i].pfadrect);
       if (ctx.isPointInPath(fmvNodes[i].pfadrect, _x, _y)) {
         console.log("new entry possible");
       }
     }
   } */

  function keyboardInput(_event: KeyboardEvent): void {
    console.log(_event.keyCode);
    if (_event.code == "Space") {

      // check if an input is currently in focus
      if (document.activeElement.nodeName.toLowerCase() != "input") {
        // prevent default spacebar event (scrolling to bottom)
        _event.preventDefault();
        rootNodeX = canvas.width / 2;
        rootNodeY = canvas.height / 2;
        redrawWithoutChildren();
      }
    }
  }

  function onMouseDown(_event: MouseEvent): void {
    hasMouseBeenMoved = false;
  }
  function onMouseUp(_event: MouseEvent): void {
    if (hasMouseBeenMoved) {
      return;
    }

    if (ctx.isPointInPath(root.pfadrect, _event.clientX, _event.clientY)) {
      root.hiddenFoldedValue = !root.hiddenFoldedValue;
      let newFold: boolean = root.hiddenFoldedValue;
      for (let i: number = 1; i < fmvNodes.length; i++) {
        fmvNodes[i].folded = newFold;
      }

    } else {
      for (let i: number = 1; i < fmvNodes.length; i++) {
        console.log(fmvNodes[i].pfadrect + " pfadrect " + _event.clientX, _event.clientY, i + " i");
        if (fmvNodes[i].pfadrect) {
          if (ctx.isPointInPath(fmvNodes[i].pfadrect, _event.clientX, _event.clientY)) {

            fmvNodes[i].folded = !fmvNodes[i].folded;
          }
        }
      }
    }
    root.folded = false;
    root.calculateVisibleChildren();
    redrawWithoutChildren();

  }
  function onPointerMove(_event: MouseEvent): void {
    hasMouseBeenMoved = true;

    if (_event.buttons == 1) {
      rootNodeY += _event.movementY;
      rootNodeX += _event.movementX;
      redrawWithoutChildren();
    }
  }
  //<----------------------------------------------------------------------Variablen mitten im Code------------------------------------------------------>
  let ongoingTouches: any[] = [];


  let cordX: number;
  let cordY: number;
   //<----------------------------------------------------------------------Variablen mitten im Code------------------------------------------------------>
  function handleStart(_event: TouchEvent) {
    _event.preventDefault();
    console.log(" touchstart");
    let theTouchlist: TouchList = _event.touches;

    for (let i = 0; i < theTouchlist.length; i++) {
      console.log("touchstart:" + i + "...");
      ongoingTouches.push(copyTouch(theTouchlist[i]));
      cordX = theTouchlist[i].clientX;
      cordY = theTouchlist[i].clientY;
      console.log("touchstart:" + i + ".");
    }
  }
  function handleMove(_event: TouchEvent) {
    let touches = _event.changedTouches;
    console.log(touches.length);
    for (let i = 0; i < touches.length; i++) {
      let idx = ongoingTouchIndexById(touches[i].identifier);
      console.log(idx + " idx");
      let deltaX: number;
      let deltaY: number;

      let xStrich: number = touches[i].clientX;
      let yStrich: number = touches[i].clientY;
      deltaX = xStrich - cordX;
      deltaY = yStrich - cordY;
      rootNodeX += deltaX;
      rootNodeY += deltaY;

      console.log(deltaX, deltaY, cordX, cordY, xStrich, yStrich);
      cordX = xStrich;
      cordY = yStrich;
      redrawWithoutChildren();


      if (idx >= 0) {
        ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record

      } else {
        console.log("can't figure out which touch to continue");
      }
    }

  }

  function handleEnd(_event: TouchEvent) {
    _event.preventDefault();
    let theTouchlist = _event.changedTouches;
    for (var i = 0; i < theTouchlist.length; i++) {

      var idx = ongoingTouchIndexById(theTouchlist[i].identifier);

      if (idx >= 0) {
        console.log(" end of touch");

        ongoingTouches.splice(idx, 1);  // remove it; we're done

      } else {
        console.log("can't figure out which touch to end");
      }

    }
  }
  function handleCancel(_event: TouchEvent) {
    _event.preventDefault();
    console.log("touchcancel.");
    let touches: TouchList = _event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
      var idx = ongoingTouchIndexById(touches[i].identifier);
      ongoingTouches.splice(idx, 1);  // remove it; we're done

    }
  }
  function copyTouch(touch: Touch) {
    return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
  }
  function clearMap(): void {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clears the canvas
  }
  function ongoingTouchIndexById(idToFind: any) {
    for (let i = 0; i < ongoingTouches.length; i++) {
      let id = ongoingTouches[i].identifier;
      console.log(id + " id");
      if (id == idToFind) {
        return i;
      }
    }
    return -1;    // not found
  }

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