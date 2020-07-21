namespace FreeMindViewer {

  export class FMVNode {
    public pfadrect: Path2D;
    public parent: FMVNode;
    public children: FMVNode[];
    public ctx: CanvasRenderingContext2D;
    public node: Element;
    public content: string;
    public weightVisibleChildrenRight: number;
    public weightVisibleChildrenLeft: number;
    public posX: number;
    public posY: number;
    public bezPtX1: number = 30;
    public bezPtX2: number = 30;
    public bezPtY1: number = 0;
    public bezPtY2: number = 0;
    public contentWidth: number = 0;
    public mapPosition: string;
    public childNumber: number;
    public folded: boolean;
    public childHight: number = 30;
    public strokeStile: string = "black";

    constructor(
      parent: FMVNode,
      ctx: CanvasRenderingContext2D,
      content: string,
      side: string,
      folded: boolean
    ) {
      this.parent = parent;
      this.children = new Array();
      this.ctx = ctx;

      this.content = content;
      this.mapPosition = side;

      this.folded = folded;
    }

    public changeSide(): void {
      this.mapPosition = this.mapPosition == "left" ? "right" : "left";
      this.node.setAttribute("POSITION", this.mapPosition);
      
      if(this.children.length <= 0) return;

      this.children.forEach(child => {
        child.changeSide();
      });
    }
    public setPosition(_previousSiblingsWeight: number): void {
      if (this.mapPosition == "right") {
        this.posX = this.parent.posX + this.parent.content.length * 7 + 70;
        this.posY = this.calculateHighestPoint(this.parent.posY, this.parent.weightVisibleChildrenRight, this.childHight, _previousSiblingsWeight, this.weightVisibleChildrenRight);
      }
      if (this.mapPosition == "left") {
        this.posX = this.parent.posX - this.parent.content.length * 7 - 70;
        this.posY = this.calculateHighestPoint(this.parent.posY, this.parent.weightVisibleChildrenLeft, this.childHight, _previousSiblingsWeight, this.weightVisibleChildrenLeft);
      }
      let weightPreviousSiblingsRight: number = 0;
      let weightPreviousSiblingsLeft: number = 0;
      for (let i: number = 0; i < this.children.length; i++) {
        if (this.children[i].mapPosition == "right") {
          this.children[i].setPosition(weightPreviousSiblingsRight);
          weightPreviousSiblingsRight += this.children[i].weightVisibleChildrenRight;

        } else {
          this.children[i].setPosition(weightPreviousSiblingsLeft);
          weightPreviousSiblingsLeft += this.children[i].weightVisibleChildrenLeft;
        }
      }
    }

    calculateHighestPoint(_parentPositionY: number, _parentWeightVisibleChildren: number, _childHight: number, _previousSiblingsWeight: number, _weightVisibleChildren: number): number {
      let highestPoint: number = _parentPositionY - _parentWeightVisibleChildren * _childHight / 2 + (_childHight / 2);
      let yPx: number = highestPoint + _previousSiblingsWeight * _childHight + (_weightVisibleChildren * _childHight) / 2 - (_childHight / 2);
      this.posY = yPx;
      return yPx;
    }
    
    calculateVisibleChildren(): number {
      if (this.children.length <= 0 || this.folded) {
        if (this.mapPosition == "right")
          this.weightVisibleChildrenRight = 1;
        else
          this.weightVisibleChildrenLeft = 1;
        return 1;
      }
      this.weightVisibleChildrenRight = 0;
      this.weightVisibleChildrenLeft = 0;
      for (let child of this.children) {
        if (child.mapPosition == "right")
          this.weightVisibleChildrenRight += child.calculateVisibleChildren();
        else
          this.weightVisibleChildrenLeft += child.calculateVisibleChildren();
      }
      if (this.mapPosition == "right")
        return this.weightVisibleChildrenRight;
      return this.weightVisibleChildrenLeft;
    }

    drawFMVNode(): void {
      this.ctx.font = "14px sans-serif";
      this.ctx.fillStyle = this.strokeStile;
      this.ctx.strokeStyle = "transparent";
      let startX: number;
      this.contentWidth = this.ctx.measureText(this.content).width;
      //rectangles um den text
      if (this.mapPosition == "left") {
        startX = this.posX;

        this.pfadrect = new Path2D();
        this.pfadrect.rect(startX, this.posY + 5, -this.contentWidth, -25);
        this.ctx.stroke(this.pfadrect);
      } else if (this.mapPosition == "right") {
        startX = this.posX;
        this.pfadrect = new Path2D();
        this.pfadrect.rect(startX, this.posY + 5, this.contentWidth, -25);
        this.ctx.stroke(this.pfadrect);
      }
      if (this.parent) {

        // verbindungslinie von kasten zu kasten
        this.ctx.beginPath();
        this.ctx.moveTo(this.posX, this.posY);
        if (this.parent.mapPosition == "root" && this.mapPosition == "right") {
          this.ctx.beginPath();
          this.ctx.moveTo(this.posX, this.posY);
          this.ctx.bezierCurveTo(this.posX - this.bezPtX1, this.posY, this.parent.posX + this.parent.contentWidth + this.bezPtX2, this.parent.posY, this.parent.posX + this.parent.contentWidth, this.parent.posY);
        } else if (this.parent.mapPosition == "root" && this.mapPosition == "left") {
          this.ctx.beginPath();
          this.ctx.moveTo(this.posX, this.posY);
          this.ctx.bezierCurveTo(this.posX + this.bezPtX1, this.posY, this.parent.posX - this.parent.contentWidth - this.bezPtX2, this.parent.posY, this.parent.posX - this.parent.contentWidth, this.parent.posY);
        } else if (this.mapPosition == "right") {
          this.ctx.beginPath();
          this.ctx.moveTo(this.posX, this.posY);
          this.ctx.bezierCurveTo(this.posX - this.bezPtX1, this.posY, this.parent.posX + this.parent.contentWidth + this.bezPtX2, this.parent.posY, this.parent.posX + this.parent.contentWidth, this.parent.posY);
        } else {
          //this.ctx.lineTo(this.parent.posX + this.parent.content.length * -7, this.parent.posY);
          this.ctx.beginPath();
          this.ctx.moveTo(this.posX, this.posY);
          this.ctx.bezierCurveTo(this.posX + this.bezPtX1, this.posY, this.parent.posX - this.parent.contentWidth - this.bezPtX2, this.parent.posY, this.parent.posX - this.parent.contentWidth, this.parent.posY);
        }
      }
      this.ctx.strokeStyle = this.strokeStile;
      this.ctx.stroke();
      /* this.ctx.closePath(); */

      this.ctx.beginPath();
      if (this.mapPosition == "root") {
        this.ctx.textAlign = "center";

      } else if (this.mapPosition == "right") {
        this.ctx.textAlign = "left";
      } else {
        this.ctx.textAlign = "right";
      }
      this.ctx.fillText(this.content, this.posX, this.posY + 3);
      this.ctx.closePath();

      for (let i: number = 0; this.children.length > i && !this.folded; i++) {
        this.children[i].drawFMVNode();
      }
    }
  }

  export class FMVRootNode extends FMVNode {
    hiddenFoldedValue: boolean = false;
    constructor(
      ctx: CanvasRenderingContext2D,
      content: string

    ) {
      super(null, ctx, content, "root", false);
      if (this.parent == null) {

        this.mapPosition = "root";
      }
    }

    drawFMVNode(): void {
      this.ctx.font = "14px sans-serif";
      this.ctx.fillStyle = "black";
      this.ctx.strokeStyle = this.strokeStile;
      this.contentWidth = this.ctx.measureText(this.content).width;
      this.pfadrect = new Path2D();
      this.pfadrect.ellipse(this.posX, this.posY, this.contentWidth, this.contentWidth / 2, 0, 0, 2 * Math.PI);
      this.ctx.stroke(this.pfadrect);

      super.drawFMVNode();
    }
    setPosition(_previousSiblingsWeight: number): void {

      this.posX = rootNodeX;
      this.posY = rootNodeY;


      super.setPosition(_previousSiblingsWeight);
    }
  }
}